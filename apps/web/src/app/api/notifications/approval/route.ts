import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { NotificationService } from '@coco/billing';
import { z } from 'zod';

const BodySchema = z.object({
  recipient_email: z.string().email(),
  mission_id: z.string(),
  request_summary: z.string().min(1),
  risk_severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  approve_url: z.string().url().optional(),
  ttl_hours: z.number().positive().default(24),
});

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = BodySchema.parse(await req.json());
    const notifications = new NotificationService(client);

    const baseUrl =
      (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_APP_URL']) ||
      'http://localhost:3000';

    await notifications.notifyApprovalRequired(organizationId, body.recipient_email, {
      mission_id: body.mission_id,
      request_summary: body.request_summary,
      risk_severity: body.risk_severity,
      approve_url: body.approve_url ?? `${baseUrl}/missions/${body.mission_id}`,
      ttl_hours: body.ttl_hours,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Notification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
