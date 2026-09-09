-- ═══════════════════════════════════════════════════════════════════
-- PHASE 6 — CONTEXT FABRIC SCHEMA UPGRADES
-- Run in Supabase SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Ensure required types exist ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE memory_scope AS ENUM (
    'working','conversation','episodic','semantic',
    'procedural','project','organizational'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE memory_status AS ENUM (
    'active','superseded','contradicted','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epistemic_status AS ENUM (
    'fact','supported','inferred','weak_inference',
    'assumed','unknown','contested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sensitivity_class AS ENUM (
    'public','internal','confidential','restricted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── MEMORY SCHEMA ───────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS memory;

DROP TABLE IF EXISTS memory.memories CASCADE;

CREATE TABLE memory.memories (
  memory_id           CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  scope               memory_scope NOT NULL,

  user_id             CHAR(26),
  project_id          CHAR(26),
  mission_id          CHAR(26),
  conversation_id     CHAR(26),

  subject             TEXT NOT NULL,
  predicate           TEXT NOT NULL,
  value               TEXT NOT NULL,
  value_structured    JSONB,

  source              TEXT NOT NULL,
  source_ref          TEXT,
  written_by_agent    TEXT,
  written_by_run      CHAR(26),
  citations           JSONB NOT NULL DEFAULT '[]'::jsonb,

  epistemic_status    epistemic_status NOT NULL DEFAULT 'assumed',
  confidence          DOUBLE PRECISION NOT NULL DEFAULT 0.8
                      CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count      INT NOT NULL DEFAULT 0,
  contradicts_ids     CHAR(26)[] NOT NULL DEFAULT '{}',
  supersedes_ids      CHAR(26)[] NOT NULL DEFAULT '{}',

  version             INT NOT NULL DEFAULT 1,
  status              memory_status NOT NULL DEFAULT 'active',
  expires_at          TIMESTAMPTZ,
  importance          DOUBLE PRECISION NOT NULL DEFAULT 0.5
                      CHECK (importance >= 0 AND importance <= 1),

  visibility          TEXT NOT NULL DEFAULT 'project'
                      CHECK (visibility IN ('private','project','organization','public')),
  sensitivity         sensitivity_class NOT NULL DEFAULT 'internal',

  embedding           vector(1536),
  embedding_model_id  TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    (scope = 'working'        AND mission_id IS NOT NULL) OR
    (scope = 'conversation'   AND conversation_id IS NOT NULL) OR
    (scope = 'episodic') OR
    (scope = 'semantic') OR
    (scope = 'procedural') OR
    (scope = 'project'        AND project_id IS NOT NULL) OR
    (scope = 'organizational')
  )
);

CREATE INDEX mem_scope_active_idx     ON memory.memories (organization_id, scope) WHERE status = 'active';
CREATE INDEX mem_project_active_idx   ON memory.memories (project_id, status) WHERE project_id IS NOT NULL;
CREATE INDEX mem_mission_active_idx   ON memory.memories (mission_id) WHERE status = 'active' AND mission_id IS NOT NULL;
CREATE INDEX mem_conversation_idx     ON memory.memories (conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX mem_subject_trgm_idx     ON memory.memories USING gin (subject gin_trgm_ops);
CREATE INDEX mem_value_trgm_idx       ON memory.memories USING gin (value gin_trgm_ops);
CREATE INDEX mem_recency_idx          ON memory.memories (organization_id, created_at DESC);
CREATE INDEX mem_importance_idx       ON memory.memories (organization_id, importance DESC) WHERE status = 'active';
CREATE INDEX mem_expiry_idx           ON memory.memories (expires_at) WHERE expires_at IS NOT NULL AND status = 'active';
CREATE INDEX mem_embedding_hnsw_idx   ON memory.memories USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

ALTER TABLE memory.memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mem_tenant_isolation ON memory.memories;
CREATE POLICY mem_tenant_isolation ON memory.memories
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

CREATE OR REPLACE FUNCTION memory.guard_memory_immutable_provenance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source <> OLD.source
     OR NEW.written_by_agent IS DISTINCT FROM OLD.written_by_agent
     OR NEW.written_by_run IS DISTINCT FROM OLD.written_by_run THEN
    RAISE EXCEPTION 'Memory provenance is immutable; create a new memory record instead';
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_memory_immutable ON memory.memories;
CREATE TRIGGER trg_guard_memory_immutable
  BEFORE UPDATE ON memory.memories
  FOR EACH ROW EXECUTE FUNCTION memory.guard_memory_immutable_provenance();

-- ─── CONTEXT PACKETS ─────────────────────────────────────────────
DROP TABLE IF EXISTS memory.context_packets CASCADE;

CREATE TABLE memory.context_packets (
  packet_id           CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  mission_id          CHAR(26),
  run_id              CHAR(26),
  agent_instance_id   CHAR(26),
  agent_definition_id TEXT,

  purpose             TEXT NOT NULL,
  token_count         INT NOT NULL,
  compression_ratio   DOUBLE PRECISION,

  packet_content      TEXT NOT NULL,
  packet_hash         CHAR(64) NOT NULL,

  included_memory_ids CHAR(26)[] NOT NULL DEFAULT '{}',
  included_evidence_ids CHAR(26)[] NOT NULL DEFAULT '{}',
  included_node_ids   CHAR(26)[] NOT NULL DEFAULT '{}',

  sensitivity         sensitivity_class NOT NULL DEFAULT 'internal',

  compiled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX ctx_pkt_mission_idx ON memory.context_packets (mission_id, compiled_at DESC);
CREATE INDEX ctx_pkt_run_idx     ON memory.context_packets (run_id) WHERE run_id IS NOT NULL;
CREATE INDEX ctx_pkt_expiry_idx  ON memory.context_packets (expires_at);

ALTER TABLE memory.context_packets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ctx_pkt_tenant_isolation ON memory.context_packets;
CREATE POLICY ctx_pkt_tenant_isolation ON memory.context_packets
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

-- ─── CONVERSATIONS ───────────────────────────────────────────────
DROP TABLE IF EXISTS memory.conversations CASCADE;

CREATE TABLE memory.conversations (
  conversation_id     CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  user_id             CHAR(26) NOT NULL,
  project_id          CHAR(26),
  title               TEXT,
  summary             TEXT,
  message_count       INT NOT NULL DEFAULT 0,
  last_message_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX conv_user_recent_idx ON memory.conversations (user_id, last_message_at DESC NULLS LAST);
CREATE INDEX conv_project_idx     ON memory.conversations (project_id, last_message_at DESC) WHERE project_id IS NOT NULL;

ALTER TABLE memory.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conv_tenant_isolation ON memory.conversations;
CREATE POLICY conv_tenant_isolation ON memory.conversations
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

-- ─── MESSAGES ────────────────────────────────────────────────────
DROP TABLE IF EXISTS memory.messages CASCADE;

CREATE TABLE memory.messages (
  message_id          CHAR(26) PRIMARY KEY,
  conversation_id     CHAR(26) NOT NULL REFERENCES memory.conversations(conversation_id) ON DELETE CASCADE,
  organization_id     CHAR(26) NOT NULL,
  mission_id          CHAR(26),
  role                TEXT NOT NULL CHECK (role IN ('user','coco','system','tool')),
  content             TEXT NOT NULL,
  content_structured  JSONB,
  attachments         JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_mode       TEXT,
  produced_by_run     CHAR(26),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX msg_conv_order_idx ON memory.messages (conversation_id, created_at);

ALTER TABLE memory.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS msg_tenant_isolation ON memory.messages;
CREATE POLICY msg_tenant_isolation ON memory.messages
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

-- ─── RESEARCH: SOURCES + EVIDENCE + CITATIONS ────────────────────
CREATE SCHEMA IF NOT EXISTS research;

DROP TABLE IF EXISTS research.citations CASCADE;
DROP TABLE IF EXISTS research.evidence CASCADE;
DROP TABLE IF EXISTS research.sources CASCADE;

CREATE TABLE research.sources (
  source_id           CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,

  source_type         TEXT NOT NULL,
  url                 TEXT,
  canonical_uri       TEXT,
  title               TEXT NOT NULL,
  authors             TEXT[] NOT NULL DEFAULT '{}',
  publisher           TEXT,
  published_at        TIMESTAMPTZ,
  retrieved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  content_hash        CHAR(64) NOT NULL,
  content_excerpt     TEXT,
  language            TEXT,

  credibility_class   TEXT NOT NULL DEFAULT 'unverified'
                      CHECK (credibility_class IN ('primary','secondary','unverified','discredited')),
  credibility_score   DOUBLE PRECISION NOT NULL DEFAULT 0.5
                      CHECK (credibility_score >= 0 AND credibility_score <= 1),

  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX source_hash_uidx ON research.sources (organization_id, content_hash);
CREATE INDEX source_type_idx         ON research.sources (source_type);
CREATE INDEX source_title_trgm_idx   ON research.sources USING gin (title gin_trgm_ops);

ALTER TABLE research.sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS src_tenant_isolation ON research.sources;
CREATE POLICY src_tenant_isolation ON research.sources
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

CREATE TABLE research.evidence (
  evidence_id         CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  source_id           CHAR(26) NOT NULL REFERENCES research.sources(source_id) ON DELETE CASCADE,

  claim               TEXT NOT NULL,
  extracted_quote     TEXT,
  quote_hash          CHAR(64),
  location_hint       TEXT,

  extracted_by_run    CHAR(26),
  extracted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  confidence          DOUBLE PRECISION NOT NULL DEFAULT 0.8
                      CHECK (confidence >= 0 AND confidence <= 1),
  triangulation_count INT NOT NULL DEFAULT 1,
  triangulates_with   CHAR(26)[] NOT NULL DEFAULT '{}',

  embedding           vector(1536)
);

CREATE INDEX evidence_source_idx     ON research.evidence (source_id);
CREATE INDEX evidence_claim_trgm_idx ON research.evidence USING gin (claim gin_trgm_ops);
CREATE INDEX evidence_embed_idx      ON research.evidence USING hnsw (embedding vector_cosine_ops);

ALTER TABLE research.evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ev_tenant_isolation ON research.evidence;
CREATE POLICY ev_tenant_isolation ON research.evidence
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

CREATE TABLE research.citations (
  citation_id         CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  cited_from_kind     TEXT NOT NULL,
  cited_from_id       CHAR(26) NOT NULL,
  evidence_id         CHAR(26) NOT NULL REFERENCES research.evidence(evidence_id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX citation_from_idx     ON research.citations (cited_from_kind, cited_from_id);
CREATE INDEX citation_evidence_idx ON research.citations (evidence_id);

ALTER TABLE research.citations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cit_tenant_isolation ON research.citations;
CREATE POLICY cit_tenant_isolation ON research.citations
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

-- ─── BRAIN: KNOWLEDGE NODES + EDGES + PROJECT_BRAIN ─────────────
CREATE SCHEMA IF NOT EXISTS brain;

DROP TABLE IF EXISTS brain.knowledge_edges CASCADE;
DROP TABLE IF EXISTS brain.knowledge_nodes CASCADE;
DROP TABLE IF EXISTS brain.project_brain CASCADE;

CREATE TABLE brain.knowledge_nodes (
  node_id             CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  project_id          CHAR(26) NOT NULL,

  node_type           TEXT NOT NULL,
  label               TEXT NOT NULL,
  description         TEXT,
  properties          JSONB NOT NULL DEFAULT '{}'::jsonb,

  origin_source       TEXT NOT NULL,
  origin_ref          TEXT,
  confidence          DOUBLE PRECISION NOT NULL DEFAULT 0.8
                      CHECK (confidence >= 0 AND confidence <= 1),

  embedding           vector(1536),

  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','deprecated','removed')),
  version             INT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX kn_project_type_idx    ON brain.knowledge_nodes (project_id, node_type) WHERE status = 'active';
CREATE INDEX kn_label_trgm_idx      ON brain.knowledge_nodes USING gin (label gin_trgm_ops);
CREATE INDEX kn_properties_gin_idx  ON brain.knowledge_nodes USING gin (properties);
CREATE INDEX kn_embedding_hnsw_idx  ON brain.knowledge_nodes USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

ALTER TABLE brain.knowledge_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kn_tenant_isolation ON brain.knowledge_nodes;
CREATE POLICY kn_tenant_isolation ON brain.knowledge_nodes
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

CREATE TABLE brain.knowledge_edges (
  edge_id             CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  project_id          CHAR(26) NOT NULL,

  from_node_id        CHAR(26) NOT NULL REFERENCES brain.knowledge_nodes(node_id) ON DELETE CASCADE,
  to_node_id          CHAR(26) NOT NULL REFERENCES brain.knowledge_nodes(node_id) ON DELETE CASCADE,
  relation            TEXT NOT NULL,
  properties          JSONB NOT NULL DEFAULT '{}'::jsonb,

  confidence          DOUBLE PRECISION NOT NULL DEFAULT 0.9
                      CHECK (confidence >= 0 AND confidence <= 1),
  origin_source       TEXT NOT NULL,
  origin_ref          TEXT,

  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','deprecated','removed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_node_id, to_node_id, relation)
);

CREATE INDEX ke_from_relation_idx ON brain.knowledge_edges (from_node_id, relation) WHERE status = 'active';
CREATE INDEX ke_to_relation_idx   ON brain.knowledge_edges (to_node_id, relation) WHERE status = 'active';
CREATE INDEX ke_project_idx       ON brain.knowledge_edges (project_id, relation);

ALTER TABLE brain.knowledge_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ke_tenant_isolation ON brain.knowledge_edges;
CREATE POLICY ke_tenant_isolation ON brain.knowledge_edges
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

CREATE TABLE brain.project_brain (
  project_id          CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,

  node_counts         JSONB NOT NULL DEFAULT '{}'::jsonb,
  edge_counts         JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_count      INT NOT NULL DEFAULT 0,
  requirement_count   INT NOT NULL DEFAULT 0,
  artifact_count      INT NOT NULL DEFAULT 0,

  active_risks        JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_questions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  contradictions      JSONB NOT NULL DEFAULT '[]'::jsonb,

  last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE brain.project_brain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pb_tenant_isolation ON brain.project_brain;
CREATE POLICY pb_tenant_isolation ON brain.project_brain
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

-- ─── AGENTS.DECISIONS (upgrade) ──────────────────────────────────
CREATE SCHEMA IF NOT EXISTS agents;

DROP TABLE IF EXISTS agents.decisions CASCADE;

CREATE TABLE agents.decisions (
  decision_id         CHAR(26) PRIMARY KEY,
  organization_id     CHAR(26) NOT NULL,
  project_id          CHAR(26),
  mission_id          CHAR(26),
  run_id              CHAR(26),

  decision_number     INT NOT NULL,
  question            TEXT NOT NULL,
  options             JSONB NOT NULL,
  selected_option     TEXT NOT NULL,

  evidence            JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions         JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks               JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning           TEXT NOT NULL,

  confidence          DOUBLE PRECISION NOT NULL
                      CHECK (confidence >= 0 AND confidence <= 1),
  reversible          BOOLEAN NOT NULL DEFAULT TRUE,
  revisit_criteria    TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','superseded','revoked')),
  superseded_by       CHAR(26),

  created_by_agent    TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX decision_project_active_idx ON agents.decisions (project_id, status, decision_number DESC) WHERE project_id IS NOT NULL;
CREATE INDEX decision_mission_idx        ON agents.decisions (mission_id) WHERE mission_id IS NOT NULL;
CREATE INDEX decision_question_trgm_idx  ON agents.decisions USING gin (question gin_trgm_ops);
CREATE UNIQUE INDEX decision_project_number_uidx ON agents.decisions (project_id, decision_number) WHERE project_id IS NOT NULL;

ALTER TABLE agents.decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dec_tenant_isolation ON agents.decisions;
CREATE POLICY dec_tenant_isolation ON agents.decisions
  USING (organization_id = ANY (current_user_org_ids()))
  WITH CHECK (organization_id = ANY (current_user_org_ids()));

-- ─── VERIFICATION ──────────────────────────────────────────────
SELECT 'Phase 6 schema applied.' AS status,
       (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema IN ('memory','research','brain','agents')
          AND table_name IN ('memories','context_packets','conversations','messages',
                             'sources','evidence','citations',
                             'knowledge_nodes','knowledge_edges','project_brain',
                             'decisions')) AS tables_created;
