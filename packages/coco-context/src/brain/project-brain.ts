import type { SupabaseClient } from '@supabase/supabase-js';
import { addKnowledgeNode, addKnowledgeEdge } from './index';

export interface AddNodeParams {
  project_id: string;
  node_type: string;
  label: string;
  description?: string;
  organization_id?: string;
  origin_source?: string;
}

export interface AddEdgeParams {
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation: string;
  organization_id?: string;
  origin_source?: string;
}

export class ProjectBrain {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId?: string
  ) {}

  async addNode(
    paramsOrProjectId: AddNodeParams | string,
    nodeType?: string,
    label?: string,
    description?: string,
    originSource?: string
  ) {
    let params: AddNodeParams;
    if (typeof paramsOrProjectId === 'string') {
      params = {
        project_id: paramsOrProjectId,
        node_type: nodeType ?? 'concept',
        label: label ?? 'Unlabeled Node',
        description,
        origin_source: originSource ?? 'user',
      };
    } else {
      params = paramsOrProjectId;
    }

    return addKnowledgeNode(
      { supabase: this.supabase, organizationId: params.organization_id ?? this.organizationId ?? 'org_default' },
      {
        project_id: params.project_id,
        node_type: params.node_type,
        label: params.label,
        description: params.description,
        properties: {},
        origin_source: params.origin_source ?? 'user',
        confidence: 0.8,
      }
    );
  }

  async addEdge(
    paramsOrProjectId: AddEdgeParams | string,
    fromNodeId?: string,
    toNodeId?: string,
    relation?: string
  ) {
    let params: AddEdgeParams;
    if (typeof paramsOrProjectId === 'string') {
      params = {
        project_id: paramsOrProjectId,
        from_node_id: fromNodeId!,
        to_node_id: toNodeId!,
        relation: relation ?? 'relates_to',
      };
    } else {
      params = paramsOrProjectId;
    }

    return addKnowledgeEdge(
      { supabase: this.supabase, organizationId: params.organization_id ?? this.organizationId ?? 'org_default' },
      {
        project_id: params.project_id,
        from_node_id: params.from_node_id,
        to_node_id: params.to_node_id,
        relation: params.relation,
        properties: {},
        confidence: 0.9,
        origin_source: params.origin_source ?? 'user',
      }
    );
  }

  async getGraph(projectId?: string) {
    let nodesQ = this.supabase
      .schema('brain')
      .from('knowledge_nodes')
      .select('node_id, node_type, label, description, properties, confidence, origin_source, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500);

    if (projectId) {
      nodesQ = nodesQ.eq('project_id', projectId);
    }

    let edgesQ = this.supabase
      .schema('brain')
      .from('knowledge_edges')
      .select('edge_id, from_node_id, to_node_id, relation, properties, confidence, status')
      .eq('status', 'active')
      .limit(1000);

    if (projectId) {
      edgesQ = edgesQ.eq('project_id', projectId);
    }

    const [nodesRes, edgesRes] = await Promise.all([nodesQ, edgesQ]);

    return {
      nodes: nodesRes.data ?? [],
      edges: edgesRes.data ?? [],
    };
  }
}
