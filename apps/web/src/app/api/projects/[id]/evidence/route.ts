import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/projects/[id]/evidence
 * Returns evidence + sources linked to this project via:
 * - memories with project_id that have citations
 * - decisions with project_id that reference evidence
 * - research.evidence joined through citations where cited_from is project-scoped
 *
 * For Phase 13 we return org-scoped evidence ordered by recency,
 * optionally filtered by search query. Full citation-graph joins
 * are available when missions produce structured citations.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    // Fetch sources
    let sourcesQ = client
      .schema('research')
      .from('sources')
      .select('*')
      .eq('organization_id', organizationId)
      .order('retrieved_at', { ascending: false })
      .limit(100);

    if (q) {
      sourcesQ = sourcesQ.or(`title.ilike.%${q}%,source_type.ilike.%${q}%`);
    }

    // Fetch evidence
    let evidenceQ = client
      .schema('research')
      .from('evidence')
      .select('*, sources:source_id(source_id, title, url, credibility_class, source_type)')
      .eq('organization_id', organizationId)
      .order('extracted_at', { ascending: false })
      .limit(100);

    if (q) {
      evidenceQ = evidenceQ.ilike('claim', `%${q}%`);
    }

    // Fetch citations
    const citationsQ = client
      .schema('research')
      .from('citations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    // Project-scoped decisions (for appendix cross-links)
    const decisionsQ = client
      .schema('agents')
      .from('decisions')
      .select('decision_id, decision_number, question, selected_option, confidence, created_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('decision_number', { ascending: false })
      .limit(50);

    const [sourcesRes, evidenceRes, citationsRes, decisionsRes] = await Promise.all([
      sourcesQ,
      evidenceQ,
      citationsQ,
      decisionsQ,
    ]);

    if (sourcesRes.error) throw new Error(sourcesRes.error.message);
    if (evidenceRes.error) throw new Error(evidenceRes.error.message);
    if (citationsRes.error) throw new Error(citationsRes.error.message);
    if (decisionsRes.error) throw new Error(decisionsRes.error.message);

    return NextResponse.json({
      project_id: projectId,
      sources: sourcesRes.data ?? [],
      evidence: evidenceRes.data ?? [],
      citations: citationsRes.data ?? [],
      decisions: decisionsRes.data ?? [],
      counts: {
        sources: sourcesRes.data?.length ?? 0,
        evidence: evidenceRes.data?.length ?? 0,
        citations: citationsRes.data?.length ?? 0,
        decisions: decisionsRes.data?.length ?? 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load evidence appendix';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
