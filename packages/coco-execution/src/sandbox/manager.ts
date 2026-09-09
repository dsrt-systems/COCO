import { prefixedId, sha256Hex } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SandboxSpec, SandboxHandle } from '@coco/protocol';

// E2B SDK import; falls back gracefully if not configured.
type E2bSandbox = {
  sandboxId: string;
  files: {
    write: (path: string, content: string) => Promise<void>;
    read: (path: string) => Promise<string>;
    list: (path: string) => Promise<Array<{ name: string; type: string }>>;
    remove: (path: string) => Promise<void>;
  };
  commands: {
    run: (command: string, options?: { cwd?: string; timeout?: number }) => Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }>;
  };
  kill: () => Promise<void>;
};

export interface SandboxManagerEnv {
  supabase: SupabaseClient;
  organizationId: string;
  missionId?: string;
  agentInstanceId?: string;
}

export interface AllocatedSandbox extends SandboxHandle {
  raw: E2bSandbox;
}

export class SandboxManager {
  private static activeSandboxes = new Map<string, E2bSandbox>();

  constructor(private readonly env: SandboxManagerEnv) {}

  /**
   * Allocates an E2B microVM sandbox with the specified resource limits.
   * Returns a handle for subsequent operator command dispatch.
   */
  async allocate(spec: SandboxSpec): Promise<AllocatedSandbox> {
    const sandboxId = prefixedId('sandbox');
    const environmentHash = sha256Hex(JSON.stringify(spec));

    // 1. Persist sandbox record as 'allocating'
    await this.env.supabase
      .schema('tools')
      .from('sandboxes')
      .insert({
        sandbox_id: sandboxId,
        organization_id: this.env.organizationId,
        mission_id: this.env.missionId ?? null,
        agent_instance_id: this.env.agentInstanceId ?? null,
        runtime_kind: spec.runtime_kind,
        image: spec.image,
        resource_limits: spec.resource_limits,
        network_policy: spec.network_policy,
        workspace_root: spec.workspace_root,
        environment_hash: environmentHash,
        status: 'allocating',
      });

    // 2. Bootstrap E2B sandbox
    let raw: E2bSandbox;
    let externalId: string;

    try {
      const e2bKey = typeof process !== 'undefined' ? process.env['E2B_API_KEY'] : undefined;
      if (!e2bKey || e2bKey.length < 10) {
        // Fallback: In-process stub
        raw = createStubSandbox(sandboxId);
        externalId = `stub-${sandboxId}`;
        // eslint-disable-next-line no-console
        console.warn(
          '[coco/execution] E2B_API_KEY not set — using in-process stub sandbox (dev mode only).'
        );
      } else {
        const { Sandbox } = await import('e2b');
        const created = await Sandbox.create({
          apiKey: e2bKey,
          timeoutMs: spec.ttl_seconds * 1000,
        });
        raw = created as unknown as E2bSandbox;
        externalId = created.sandboxId;
      }
    } catch (err) {
      // Mark failure and rethrow
      await this.env.supabase
        .schema('tools')
        .from('sandboxes')
        .update({ status: 'failed', released_at: new Date().toISOString() })
        .eq('sandbox_id', sandboxId);
      throw new Error(`Sandbox allocation failed: ${(err as Error).message}`);
    }

    // 3. Mark ready and cache in-memory
    await this.env.supabase
      .schema('tools')
      .from('sandboxes')
      .update({ status: 'ready', external_sandbox_id: externalId })
      .eq('sandbox_id', sandboxId);

    SandboxManager.activeSandboxes.set(sandboxId, raw);

    return {
      sandbox_id: sandboxId,
      external_sandbox_id: externalId,
      runtime_kind: spec.runtime_kind,
      workspace_root: spec.workspace_root,
      status: 'ready',
      allocated_at: new Date().toISOString(),
      raw,
    };
  }

  /**
   * Retrieves an active sandbox by ID.
   */
  get(sandboxId: string): E2bSandbox | null {
    return SandboxManager.activeSandboxes.get(sandboxId) ?? null;
  }

  /**
   * Releases (terminates) the sandbox and updates its status.
   */
  async release(sandboxId: string): Promise<void> {
    const raw = SandboxManager.activeSandboxes.get(sandboxId);
    if (raw) {
      try {
        await raw.kill();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[coco/execution] Sandbox kill failed for ${sandboxId}:`, err);
      }
      SandboxManager.activeSandboxes.delete(sandboxId);
    }

    await this.env.supabase
      .schema('tools')
      .from('sandboxes')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('sandbox_id', sandboxId);
  }
}

/**
 * In-process stub sandbox for development environments without E2B credentials.
 * All operations return deterministic stub responses.
 */
function createStubSandbox(sandboxId: string): E2bSandbox {
  const files = new Map<string, string>();

  return {
    sandboxId,
    files: {
      write: async (path: string, content: string) => {
        files.set(path, content);
      },
      read: async (path: string) => {
        return files.get(path) ?? '';
      },
      list: async () => {
        return Array.from(files.keys()).map((name) => ({ name, type: 'file' }));
      },
      remove: async (path: string) => {
        files.delete(path);
      },
    },
    commands: {
      run: async (command: string) => {
        return {
          stdout: `[stub] executed: ${command}\n`,
          stderr: '',
          exitCode: 0,
        };
      },
    },
    kill: async () => {
      files.clear();
    },
  };
}
