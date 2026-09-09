import { prefixedId, sha256Hex } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolInvocationRequest, ToolInvocationResult, SandboxSpec } from '@coco/protocol';
import { SandboxManager } from '../sandbox/manager';
import { ToolRegistry, TokenVerifier } from '../registry/index';
import { OPERATORS } from '../operators/index';

export interface DispatcherEnv {
  supabase: SupabaseClient;
  organizationId: string;
}

export class ToolDispatcher {
  private sandboxManager: SandboxManager;
  private tokenVerifier: TokenVerifier;
  private registry: ToolRegistry;

  constructor(private readonly env: DispatcherEnv) {
    this.sandboxManager = new SandboxManager(env);
    this.tokenVerifier = new TokenVerifier(env.supabase);
    this.registry = new ToolRegistry(env.supabase);
  }

  async dispatch(request: ToolInvocationRequest): Promise<ToolInvocationResult> {
    const invocationId = prefixedId('toolCall');
    const startedAt = new Date().toISOString();
    const argsHash = sha256Hex(JSON.stringify(request.arguments));

    const resultTemplate: ToolInvocationResult = {
      invocation_id: invocationId,
      tool_id: request.tool_id,
      status: 'failure_tool',
      wall_time_ms: 0,
      cpu_time_ms: 0,
      memory_peak_mb: 0,
      started_at: startedAt,
      retryable: false,
    };

    try {
      // 1. Verify Capability Token
      const tokenCheck = await this.tokenVerifier.verify(
        request.capability_token_id,
        request.agent_instance_id,
        request.tool_id
      );

      if (!tokenCheck.valid) {
        resultTemplate.status = 'failure_permission';
        resultTemplate.error_category = 'permission';
        resultTemplate.error_message = `Token verification failed: ${tokenCheck.reason}`;
        await this.persistCall(request, resultTemplate, argsHash);
        return resultTemplate;
      }

      // 2. Fetch Tool Descriptor
      const descriptor = await this.registry.get(request.tool_id);
      if (!descriptor) {
        resultTemplate.status = 'failure_tool';
        resultTemplate.error_message = `Unknown tool: ${request.tool_id}`;
        await this.persistCall(request, resultTemplate, argsHash);
        return resultTemplate;
      }

      // 3. Resolve Operator
      const operator = OPERATORS[request.tool_id];
      if (!operator) {
        resultTemplate.status = 'failure_tool';
        resultTemplate.error_message = `No operator implementation for tool: ${request.tool_id}`;
        await this.persistCall(request, resultTemplate, argsHash);
        return resultTemplate;
      }

      // 4. Allocate or Get Sandbox
      const spec: SandboxSpec = {
        runtime_kind: 'e2b_firecracker',
        image: 'base',
        resource_limits: descriptor.default_limits,
        network_policy: {
          egress_allowed: descriptor.required_scopes.includes('network_egress'),
          allowed_domains: [],
          blocked_domains: [],
          allowed_ports: [],
          proxy_required: false,
          dns_over_https_only: true,
          bytes_per_second_limit: 10485760,
        },
        workspace_root: '/workspace',
        ttl_seconds: descriptor.default_limits.max_wall_seconds,
      };

      const sandbox = await this.sandboxManager.allocate(spec);
      const startTime = Date.now();

      // 5. Execute Operator
      const opResult = await operator.execute({ request, sandbox });

      const wallTime = Date.now() - startTime;

      // 6. Release Sandbox
      await this.sandboxManager.release(sandbox.sandbox_id);

      // 7. Increment Token Usage
      await this.tokenVerifier.incrementUsage(request.capability_token_id);

      // 8. Populate Result
      resultTemplate.status = opResult.status;
      resultTemplate.output = opResult.output;
      resultTemplate.logs_excerpt = opResult.logs_excerpt;
      resultTemplate.stderr_summary = opResult.stderr_summary;
      resultTemplate.exit_code = opResult.exit_code;
      resultTemplate.error_message = opResult.error_message;
      resultTemplate.wall_time_ms = wallTime;
      resultTemplate.completed_at = new Date().toISOString();

      // 9. Persist
      await this.persistCall(request, resultTemplate, argsHash, sandbox.sandbox_id);

      return resultTemplate;
    } catch (err: unknown) {
      resultTemplate.status = 'failure_tool';
      resultTemplate.error_message = err instanceof Error ? err.message : String(err);
      resultTemplate.completed_at = new Date().toISOString();
      await this.persistCall(request, resultTemplate, argsHash).catch(() => {});
      return resultTemplate;
    }
  }

  private async persistCall(
    req: ToolInvocationRequest,
    res: ToolInvocationResult,
    argsHash: string,
    sandboxId?: string
  ) {
    const { error } = await this.env.supabase
      .schema('tools')
      .from('tool_calls')
      .insert({
        invocation_id: res.invocation_id,
        organization_id: this.env.organizationId,
        mission_id: req.mission_id ?? null,
        task_id: req.task_id ?? null,
        run_id: req.run_id ?? null,
        agent_instance_id: req.agent_instance_id,
        tool_id: req.tool_id,
        tool_version: req.tool_version,
        sandbox_id: sandboxId ?? null,
        arguments_json: req.arguments,
        arguments_hash: argsHash,
        capability_token_id: req.capability_token_id,
        status: res.status,
        exit_code: res.exit_code ?? null,
        output_json: res.output ?? null,
        logs_excerpt: res.logs_excerpt ?? null,
        stderr_summary: res.stderr_summary ?? null,
        error_category: res.error_category ?? null,
        error_message: res.error_message ?? null,
        retryable: res.retryable,
        wall_time_ms: res.wall_time_ms,
        cpu_time_ms: res.cpu_time_ms,
        memory_peak_mb: res.memory_peak_mb,
        started_at: res.started_at,
        completed_at: res.completed_at,
      });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[coco/execution] Failed to persist tool call:', error.message);
    }
  }
}

