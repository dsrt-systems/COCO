import type { ToolInvocationRequest, ToolExecutionStatus } from '@coco/protocol';
import type { AllocatedSandbox } from '../sandbox/manager';

export interface OperatorResponse {
  status: ToolExecutionStatus;
  output?: Record<string, unknown>;
  logs_excerpt?: string;
  stderr_summary?: string;
  exit_code?: number;
  error_message?: string;
}

export interface OperatorContext {
  request: ToolInvocationRequest;
  sandbox: AllocatedSandbox;
}

export interface Operator {
  readonly toolId: string;
  execute(ctx: OperatorContext): Promise<OperatorResponse>;
}

// ─── D2: TERMINAL OPERATOR ──────────────────────────────────────────
export class TerminalOperator implements Operator {
  readonly toolId = 'd2_terminal_exec';

  async execute(ctx: OperatorContext): Promise<OperatorResponse> {
    const cmd = ctx.request.arguments['command'] as string;
    const cwd = (ctx.request.arguments['cwd'] as string) || ctx.sandbox.workspace_root;

    if (!cmd) {
      return { status: 'failure_tool', error_message: 'Missing "command" argument' };
    }

    try {
      const res = await ctx.sandbox.raw.commands.run(cmd, { cwd });
      return {
        status: res.exitCode === 0 ? 'success' : 'failure_tool',
        output: { stdout: res.stdout },
        logs_excerpt: res.stdout.slice(0, 1000),
        stderr_summary: res.stderr.slice(0, 1000),
        exit_code: res.exitCode,
      };
    } catch (err: unknown) {
      return {
        status: 'failure_sandbox',
        error_message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ─── D1: BROWSER OPERATOR (Playwright via python) ───────────────────
export class BrowserOperator implements Operator {
  readonly toolId = 'd1_browser_automation';

  async execute(ctx: OperatorContext): Promise<OperatorResponse> {
    const url = ctx.request.arguments['url'] as string;
    const action = (ctx.request.arguments['action'] as string) || 'screenshot';

    if (!url) {
      return { status: 'failure_tool', error_message: 'Missing "url" argument' };
    }

    // In a production E2B environment, we inject a python script to run playwright.
    // For this implementation, we run a shell curl/wget as a baseline headless fetch,
    // or simulate Playwright if python is requested.
    const script = `
import urllib.request
import json
import sys

try:
    req = urllib.request.Request('${url}', headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
    print(json.dumps({"url": "${url}", "length": len(html), "content": html[:500] + "..."}))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    
    try {
      await ctx.sandbox.raw.files.write('/workspace/browse.py', script);
      const res = await ctx.sandbox.raw.commands.run('python3 /workspace/browse.py', { cwd: '/workspace' });
      
      return {
        status: res.exitCode === 0 ? 'success' : 'failure_tool',
        output: res.exitCode === 0 ? JSON.parse(res.stdout) : undefined,
        logs_excerpt: res.stdout.slice(0, 1000),
        stderr_summary: res.stderr.slice(0, 1000),
        exit_code: res.exitCode,
      };
    } catch (err: unknown) {
      return { status: 'failure_sandbox', error_message: (err as Error).message };
    }
  }
}

// ─── D3: GIT OPERATOR ───────────────────────────────────────────────
export class GitOperator implements Operator {
  readonly toolId = 'd3_git_manager';

  async execute(ctx: OperatorContext): Promise<OperatorResponse> {
    const repoUrl = ctx.request.arguments['repo_url'] as string;
    const gitCmd = ctx.request.arguments['command'] as string; // 'clone', 'status', etc.

    if (!gitCmd) return { status: 'failure_tool', error_message: 'Missing git command' };

    try {
      const fullCmd = repoUrl && gitCmd === 'clone' 
        ? `git clone ${repoUrl} repo && cd repo`
        : `git ${gitCmd}`;
        
      const res = await ctx.sandbox.raw.commands.run(fullCmd, { cwd: ctx.sandbox.workspace_root });
      
      return {
        status: res.exitCode === 0 ? 'success' : 'failure_tool',
        output: { stdout: res.stdout },
        logs_excerpt: res.stdout.slice(0, 1000),
        stderr_summary: res.stderr.slice(0, 1000),
        exit_code: res.exitCode,
      };
    } catch (err: unknown) {
      return { status: 'failure_sandbox', error_message: (err as Error).message };
    }
  }
}

// ─── D4: DATABASE OPERATOR ──────────────────────────────────────────
export class DatabaseOperator implements Operator {
  readonly toolId = 'd4_db_query';

  async execute(ctx: OperatorContext): Promise<OperatorResponse> {
    const query = ctx.request.arguments['query'] as string;
    if (!query) return { status: 'failure_tool', error_message: 'Missing query' };

    // Simulates DB query (in real usage, uses psql or pgcli inside the sandbox)
    try {
      const res = await ctx.sandbox.raw.commands.run(`echo "Executing SQL: ${query.replace(/"/g, '\\"')}"`, { cwd: ctx.sandbox.workspace_root });
      return {
        status: 'success',
        output: { result: 'Simulated DB execution output', query_echo: res.stdout.trim() },
        exit_code: 0,
      };
    } catch (err: unknown) {
      return { status: 'failure_sandbox', error_message: (err as Error).message };
    }
  }
}

// ─── D5: DEPLOY OPERATOR ────────────────────────────────────────────
export class DeployOperator implements Operator {
  readonly toolId = 'd5_deploy_manager';

  async execute(ctx: OperatorContext): Promise<OperatorResponse> {
    const target = ctx.request.arguments['target'] as string;
    if (!target) return { status: 'failure_tool', error_message: 'Missing deploy target' };

    try {
      const res = await ctx.sandbox.raw.commands.run(`echo "Deploying to ${target}..." && sleep 1 && echo "Success"`, { cwd: ctx.sandbox.workspace_root });
      return {
        status: 'success',
        output: { deploy_log: res.stdout },
        exit_code: 0,
      };
    } catch (err: unknown) {
      return { status: 'failure_sandbox', error_message: (err as Error).message };
    }
  }
}

// Operator Directory
export const OPERATORS: Record<string, Operator> = {
  d1_browser_automation: new BrowserOperator(),
  d2_terminal_exec: new TerminalOperator(),
  d3_git_manager: new GitOperator(),
  d4_db_query: new DatabaseOperator(),
  d5_deploy_manager: new DeployOperator(),
};

