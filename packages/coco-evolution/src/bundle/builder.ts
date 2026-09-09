import { prefixedId, sha256Hex, canonicalJson } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PolicyBundleManifest {
  bundle_id: string;
  bundle_version: string;
  created_at: string;
  components: {
    router?: Record<string, unknown>;
    prompts?: Record<string, unknown>;
    agents?: Record<string, unknown>;
    models?: Record<string, unknown>;
    corpora?: Record<string, unknown>;
    verification?: Record<string, unknown>;
  };
  source_proposal_ids: string[];
  notes: string;
}

export interface PublishedBundle {
  bundle_id: string;
  bundle_version: string;
  manifest: PolicyBundleManifest;
  bundle_uri: string;
  signature: string;
  published_at: string;
}

/**
 * PolicyBundleBuilder (Deep Spec 9 §12)
 * Assembles approved proposal state into a versioned, hash-signed bundle.
 * Runtime services load the latest bundle; they never read evolution tables directly.
 *
 * Signature here is HMAC-style content hash. Production wires cosign/Ed25519
 * via Security Fabric key material (COCO_ED25519_*).
 */
export class PolicyBundleBuilder {
  constructor(private readonly supabase: SupabaseClient) {}

  async buildFromApproved(options?: { note?: string }): Promise<PublishedBundle> {
    // 1. Load approved / active proposals
    const { data: proposals, error } = await this.supabase
      .schema('evolution')
      .from('change_proposals')
      .select('*')
      .in('status', ['approved', 'active'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const components: PolicyBundleManifest['components'] = {
      router: {},
      prompts: {},
      agents: {},
      models: {},
      corpora: {},
      verification: {},
    };

    const sourceIds: string[] = [];

    for (const p of proposals ?? []) {
      sourceIds.push(p.proposal_id);
      const state = (p.proposed_state ?? {}) as Record<string, unknown>;

      switch (p.proposal_kind) {
        case 'router_policy':
          components.router = { ...components.router, ...state };
          break;
        case 'prompt_promotion':
          components.prompts = {
            ...components.prompts,
            [p.subject_id]: state,
          };
          break;
        case 'agent_promotion':
          components.agents = {
            ...components.agents,
            [p.subject_id]: state,
          };
          break;
        case 'model_promotion':
        case 'model_deprecation':
          components.models = {
            ...components.models,
            [p.subject_id]: state,
          };
          break;
        case 'corpus_update':
          components.corpora = {
            ...components.corpora,
            [p.subject_id]: state,
          };
          break;
        case 'verification_tuning':
          components.verification = {
            ...components.verification,
            [p.subject_id]: state,
          };
          break;
        default:
          break;
      }
    }

    const now = new Date();
    const bundleId = prefixedId('policy');
    const bundleVersion = `v${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;

    const manifest: PolicyBundleManifest = {
      bundle_id: bundleId,
      bundle_version: bundleVersion,
      created_at: now.toISOString(),
      components,
      source_proposal_ids: sourceIds,
      notes: options?.note ?? 'Nightly evolution bundle',
    };

    const canonical = canonicalJson(manifest);
    const signature = sha256Hex(canonical);
    const bundleUri = `coco://policy-bundles/${bundleVersion}`;

    const published: PublishedBundle = {
      bundle_id: bundleId,
      bundle_version: bundleVersion,
      manifest,
      bundle_uri: bundleUri,
      signature,
      published_at: now.toISOString(),
    };

    const { error: insertErr } = await this.supabase
      .schema('evolution')
      .from('policy_bundles')
      .insert({
        bundle_id: published.bundle_id,
        bundle_version: published.bundle_version,
        manifest: published.manifest,
        bundle_uri: published.bundle_uri,
        signature: published.signature,
        published_at: published.published_at,
      });

    if (insertErr) throw new Error(insertErr.message);

    // Mark contributing approved proposals as active (rolled out into bundle)
    if (sourceIds.length > 0) {
      await this.supabase
        .schema('evolution')
        .from('change_proposals')
        .update({
          status: 'active',
          activated_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .in('proposal_id', sourceIds)
        .eq('status', 'approved');
    }

    return published;
  }

  async getLatest(): Promise<PublishedBundle | null> {
    const { data, error } = await this.supabase
      .schema('evolution')
      .from('policy_bundles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      bundle_id: data.bundle_id,
      bundle_version: data.bundle_version,
      manifest: data.manifest as PolicyBundleManifest,
      bundle_uri: data.bundle_uri,
      signature: data.signature,
      published_at: data.published_at,
    };
  }

  /**
   * Verify bundle integrity: recompute content hash and compare to signature.
   */
  verify(bundle: PublishedBundle): boolean {
    const canonical = canonicalJson(bundle.manifest);
    const expected = sha256Hex(canonical);
    return expected === bundle.signature;
  }
}
