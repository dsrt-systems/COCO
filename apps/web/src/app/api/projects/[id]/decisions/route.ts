import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';
import { z } from 'zod';

const CreateDecisionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.object({
    name: z.string(),
    description: z.string(),
    tradeoffs: z.string().optional(),
  })).min(1),
  selected_option: z.string().min(1),
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.8),
  reversible: z.boolean().default(true),
  revisit_criteria: z.string().optional(),
  evidence: z.array(z.unknown()).default([]),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  mission_id: z.string().optional(),
  created_by_agent: z.string().default('user'),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const { data, error } = await client
      .schema('agents')
      .from('decisions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('decision_number', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ count: data?.length ?? 0, decisions: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list decisions';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const parsed = CreateDecisionSchema.parse(body);

    // Next decision number for this project
    const { data: last } = await client
      .schema('agents')
      .from('decisions')
      .select('decision_number')
      .eq('project_id', projectId)
      .order('decision_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const decisionNumber = (last?.decision_number ?? 0) + 1;
    const decisionId = prefixedId('decision');

    const { data, error } = await client
      .schema('agents')
      .from('decisions')
      .insert({
        decision_id: decisionId,
        organization_id: organizationId,
        project_id: projectId,
        mission_id: parsed.mission_id ?? null,
        decision_number: decisionNumber,
        question: parsed.question,
        options: parsed.options,
        selected_option: parsed.selected_option,
        evidence: parsed.evidence,
        assumptions: parsed.assumptions,
        risks: parsed.risks,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence,
        reversible: parsed.reversible,
        revisit_criteria: parsed.revisit_criteria ?? null,
        status: 'active',
        created_by_agent: parsed.created_by_agent,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Bump brain decision_count
    const { data: brain } = await client
      .schema('brain')
      .from('project_brain')
      .select('decision_count')
      .eq('project_id', projectId)
      .maybeSingle();

    await client
      .schema('brain')
      .from('project_brain')
      .upsert({
        project_id: projectId,
        organization_id: organizationId,
        decision_count: (brain?.decision_count ?? 0) + 1,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({ decision: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record decision';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
