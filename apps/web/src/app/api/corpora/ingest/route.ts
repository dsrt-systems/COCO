import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { CorpusIngestInputSchema } from '@coco/protocol';
import { CorpusPipeline } from '@coco/context';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CorpusIngestInputSchema.parse(body);

    const pipeline = new CorpusPipeline({
      supabase: client,
      organizationId,
      userId: user.id,
    });

    const result = await pipeline.ingest(parsed);

    return NextResponse.json({ result }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Corpus ingestion failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
