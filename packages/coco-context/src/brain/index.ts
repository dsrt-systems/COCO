import { prefixedId } from '@coco/common';
import type { KnowledgeNodeInput, KnowledgeEdgeInput } from '@coco/protocol';
import type { ContextEnv } from '../env.js';
import { getEmbeddingProvider } from '../embeddings/index.js';

export async function addKnowledgeNode(env: ContextEnv, input: KnowledgeNodeInput) {
  const nodeId = prefixedId('node');
  const provider = getEmbeddingProvider();
  
  let embeddingStr: string | null = null;
  try {
    const vec = await provider.embedOne(`${input.label}: ${input.description ?? ''}`);
    embeddingStr = `[${vec.join(',')}]`;
  } catch (err) {
    console.error('Brain node embedding failed', err);
  }

  const row = {
    node_id: nodeId,
    organization_id: env.organizationId,
    project_id: input.project_id,
    node_type: input.node_type,
    label: input.label,
    description: input.description ?? null,
    properties: input.properties,
    origin_source: input.origin_source,
    origin_ref: input.origin_ref ?? null,
    confidence: input.confidence,
    embedding: embeddingStr,
  };

  const { data, error } = await env.supabase
    .schema('brain')
    .from('knowledge_nodes')
    .insert(row)
    .select('*')
    .single();

  if (error) throw new Error(`Brain node insertion failed: ${error.message}`);
  
  // Best-effort summary update
  await env.supabase.rpc('increment_brain_counts', { 
    p_org_id: env.organizationId, 
    p_proj_id: input.project_id, 
    p_node_type: input.node_type 
  });
  
  return data;
}

export async function addKnowledgeEdge(env: ContextEnv, input: KnowledgeEdgeInput) {
  const edgeId = prefixedId('edge');
  const row = {
    edge_id: edgeId,
    organization_id: env.organizationId,
    project_id: input.project_id,
    from_node_id: input.from_node_id,
    to_node_id: input.to_node_id,
    relation: input.relation,
    properties: input.properties,
    confidence: input.confidence,
    origin_source: input.origin_source,
    origin_ref: input.origin_ref ?? null,
  };

  const { data, error } = await env.supabase
    .schema('brain')
    .from('knowledge_edges')
    .insert(row)
    .select('*')
    .single();

  if (error) throw new Error(`Brain edge insertion failed: ${error.message}`);
  return data;
}
