import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailNotification } from '@coco/protocol';
import { renderEmail, type TemplateId } from './templates';

export class NotificationService {
  constructor(private readonly supabase: SupabaseClient) {}

  async sendEmail(organizationId: string, notification: EmailNotification): Promise<void> {
    const notifId = prefixedId('audit');
    const resendKey = typeof process !== 'undefined' ? process.env['RESEND_API_KEY'] : undefined;

    const rendered = renderEmail(
      notification.template_id as TemplateId,
      notification.template_vars ?? {}
    );

    const subject = notification.subject?.trim() ? notification.subject : rendered.subject;

    let externalId: string | undefined;
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | undefined;

    if (!resendKey || resendKey.length < 10) {
      // eslint-disable-next-line no-console
      console.warn(
        `[coco/billing] RESEND_API_KEY not set. Simulated email -> ${notification.recipient_email}\n  Subject: ${subject}`
      );
      externalId = `sim_${notifId}`;
    } else {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);
        const from =
          (typeof process !== 'undefined' && process.env['RESEND_FROM_EMAIL']) ||
          'COCO Intelligence <noreply@dsrtai.com>';

        const res = await resend.emails.send({
          from,
          to: notification.recipient_email,
          subject,
          html: rendered.html,
          text: rendered.text,
        });

        if (res.error) {
          status = 'failed';
          errorMessage = res.error.message;
        } else {
          externalId = res.data?.id;
        }
      } catch (err: unknown) {
        status = 'failed';
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    }

    await this.supabase
      .schema('billing')
      .from('notification_log')
      .insert({
        notification_id: notifId,
        organization_id: organizationId,
        channel: 'email',
        recipient: notification.recipient_email,
        template_id: notification.template_id,
        subject,
        status,
        external_message_id: externalId ?? null,
        error_message: errorMessage ?? null,
      });
  }

  async notifyApprovalRequired(
    organizationId: string,
    recipientEmail: string,
    vars: {
      mission_id: string;
      request_summary: string;
      risk_severity?: string;
      approve_url?: string;
      ttl_hours?: number;
    }
  ): Promise<void> {
    await this.sendEmail(organizationId, {
      recipient_email: recipientEmail,
      subject: `[COCO] Approval required - ${vars.request_summary.slice(0, 60)}`,
      template_id: 'approval_required',
      template_vars: vars,
    });
  }

  async notifyMissionCompleted(
    organizationId: string,
    recipientEmail: string,
    vars: {
      mission_id: string;
      objective?: string;
      phase?: string;
      cost_usd?: number;
      mission_url?: string;
    }
  ): Promise<void> {
    await this.sendEmail(organizationId, {
      recipient_email: recipientEmail,
      subject: `[COCO] Mission ${vars.phase ?? 'completed'}`,
      template_id: 'mission_completed',
      template_vars: vars,
    });
  }
}

export * from './templates';
