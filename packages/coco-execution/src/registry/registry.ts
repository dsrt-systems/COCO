import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolDescriptor } from '@coco/protocol';

export class ToolRegistry {
  private static memoryRegistry = new Map<string, ToolDescriptor>();

  constructor(private readonly supabase?: SupabaseClient) {}

  async register(descriptor: ToolDescriptor): Promise<ToolDescriptor> {
    ToolRegistry.memoryRegistry.set(descriptor.tool_id, descriptor);

    if (this.supabase) {
      const { error } = await this.supabase
        .schema('tools')
        .from('tool_registry')
        .upsert({
          tool_id: descriptor.tool_id,
          tool_version: descriptor.tool_version,
          display_name: descriptor.display_name,
          description: descriptor.description,
          category: descriptor.category,
          operator_agent_id: descriptor.operator_agent_id,
          input_schema_json: descriptor.input_schema_json,
          output_schema_json: descriptor.output_schema_json,
          required_scopes: descriptor.required_scopes,
          requires_human_approval: descriptor.requires_human_approval,
          idempotent: descriptor.idempotent,
          destructive: descriptor.destructive,
          default_limits: descriptor.default_limits,
        }, { onConflict: 'tool_id, tool_version' });

      if (error) {
        // eslint-disable-next-line no-console
        console.warn(`[coco/execution] Failed DB persist for tool ${descriptor.tool_id}:`, error.message);
      }
    }

    return descriptor;
  }

  async get(toolId: string): Promise<ToolDescriptor | null> {
    if (ToolRegistry.memoryRegistry.has(toolId)) {
      return ToolRegistry.memoryRegistry.get(toolId)!;
    }

    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .schema('tools')
      .from('tool_registry')
      .select('*')
      .eq('tool_id', toolId)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const parsed: ToolDescriptor = {
      tool_id: data.tool_id,
      tool_version: data.tool_version,
      display_name: data.display_name,
      description: data.description,
      category: data.category,
      operator_agent_id: data.operator_agent_id,
      input_schema_json: data.input_schema_json,
      output_schema_json: data.output_schema_json,
      required_scopes: data.required_scopes ?? [],
      requires_human_approval: data.requires_human_approval,
      idempotent: data.idempotent,
      destructive: data.destructive,
      default_limits: data.default_limits ?? {
        cpu_cores: 2,
        memory_mb: 1024,
        disk_mb: 2048,
        gpu_count: 0,
        max_wall_seconds: 120,
      },
    };

    ToolRegistry.memoryRegistry.set(toolId, parsed);
    return parsed;
  }

  async list(filters: { category?: string } = {}): Promise<ToolDescriptor[]> {
    if (this.supabase) {
      let q = this.supabase.schema('tools').from('tool_registry').select('*');
      if (filters.category) q = q.eq('category', filters.category);
      const { data } = await q;
      if (data && data.length > 0) {
        return data.map((d) => ({
          tool_id: d.tool_id,
          tool_version: d.tool_version,
          display_name: d.display_name,
          description: d.description,
          category: d.category,
          operator_agent_id: d.operator_agent_id,
          input_schema_json: d.input_schema_json,
          output_schema_json: d.output_schema_json,
          required_scopes: d.required_scopes ?? [],
          requires_human_approval: d.requires_human_approval,
          idempotent: d.idempotent,
          destructive: d.destructive,
          default_limits: d.default_limits ?? {
            cpu_cores: 2,
            memory_mb: 1024,
            disk_mb: 2048,
            gpu_count: 0,
            max_wall_seconds: 120,
          },
        }));
      }
    }

    let all = Array.from(ToolRegistry.memoryRegistry.values());
    if (filters.category) all = all.filter((t) => t.category === filters.category);
    return all;
  }
}
