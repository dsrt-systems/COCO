-- Memory vector search RPC — respects RLS via SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.memory_vector_search(
  p_organization_id CHAR(26),
  p_query_embedding TEXT,
  p_scopes memory_scope[] DEFAULT NULL,
  p_project_id CHAR(26) DEFAULT NULL,
  p_mission_id CHAR(26) DEFAULT NULL,
  p_conversation_id CHAR(26) DEFAULT NULL,
  p_min_confidence DOUBLE PRECISION DEFAULT 0.0,
  p_min_importance DOUBLE PRECISION DEFAULT 0.0,
  p_limit INT DEFAULT 20,
  p_include_superseded BOOLEAN DEFAULT FALSE,
  p_include_contradicted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  memory_id CHAR(26),
  organization_id CHAR(26),
  scope memory_scope,
  user_id CHAR(26),
  project_id CHAR(26),
  mission_id CHAR(26),
  conversation_id CHAR(26),
  subject TEXT,
  predicate TEXT,
  value TEXT,
  value_structured JSONB,
  source TEXT,
  source_ref TEXT,
  written_by_agent TEXT,
  written_by_run CHAR(26),
  citations JSONB,
  epistemic_status epistemic_status,
  confidence DOUBLE PRECISION,
  evidence_count INT,
  contradicts_ids CHAR(26)[],
  supersedes_ids CHAR(26)[],
  version INT,
  status memory_status,
  expires_at TIMESTAMPTZ,
  importance DOUBLE PRECISION,
  visibility TEXT,
  sensitivity sensitivity_class,
  embedding_model_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_query_vec vector(1536);
BEGIN
  v_query_vec := p_query_embedding::vector(1536);

  RETURN QUERY
  SELECT
    m.memory_id, m.organization_id, m.scope, m.user_id, m.project_id,
    m.mission_id, m.conversation_id, m.subject, m.predicate, m.value,
    m.value_structured, m.source, m.source_ref, m.written_by_agent,
    m.written_by_run, m.citations, m.epistemic_status, m.confidence,
    m.evidence_count, m.contradicts_ids, m.supersedes_ids, m.version,
    m.status, m.expires_at, m.importance, m.visibility, m.sensitivity,
    m.embedding_model_id, m.created_at, m.updated_at,
    (1.0 - (m.embedding <=> v_query_vec))::DOUBLE PRECISION AS similarity
  FROM memory.memories m
  WHERE m.organization_id = p_organization_id
    AND m.embedding IS NOT NULL
    AND (p_scopes IS NULL OR m.scope = ANY (p_scopes))
    AND (p_project_id IS NULL OR m.project_id = p_project_id)
    AND (p_mission_id IS NULL OR m.mission_id = p_mission_id)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND m.confidence >= p_min_confidence
    AND m.importance >= p_min_importance
    AND (p_include_superseded OR m.status != 'superseded')
    AND (p_include_contradicted OR m.status != 'contradicted')
    AND m.status != 'archived'
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY m.embedding <=> v_query_vec
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.memory_vector_search TO authenticated, anon, service_role;

SELECT 'memory_vector_search function created.' AS status;
