export type TemplateId =
  | 'approval_required'
  | 'budget_warning'
  | 'mission_completed'
  | 'welcome';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;border-bottom:1px solid #27272a;background:linear-gradient(135deg,#1e1b4b 0%,#18181b 100%);">
            <div style="font-size:18px;font-weight:700;color:#f4f4f5;letter-spacing:0.08em;">COCO</div>
            <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">DSRT Intelligence Operating System</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <h1 style="margin:0 0 16px;font-size:18px;color:#f4f4f5;">${esc(title)}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #27272a;font-size:11px;color:#71717a;">
            This message was sent by COCO. Do not reply to this address.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderEmail(
  templateId: TemplateId,
  vars: Record<string, unknown>
): RenderedEmail {
  switch (templateId) {
    case 'approval_required':
      return renderApprovalRequired(vars);
    case 'budget_warning':
      return renderBudgetWarning(vars);
    case 'mission_completed':
      return renderMissionCompleted(vars);
    case 'welcome':
      return renderWelcome(vars);
    default:
      return {
        subject: 'COCO notification',
        html: shell('Notification', `<pre style="color:#a1a1aa;font-size:12px;">${esc(JSON.stringify(vars, null, 2))}</pre>`),
        text: JSON.stringify(vars, null, 2),
      };
  }
}

function renderApprovalRequired(v: Record<string, unknown>): RenderedEmail {
  const missionId = esc(v['mission_id']);
  const summary = esc(v['request_summary'] ?? 'Action requires your approval');
  const risk = esc(v['risk_severity'] ?? 'MEDIUM');
  const approveUrl = esc(v['approve_url'] ?? '#');
  const ttl = esc(v['ttl_hours'] ?? '24');

  const subject = `[COCO] Approval required — ${String(v['request_summary'] ?? missionId).slice(0, 60)}`;
  const html = shell('Human Approval Required', `
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
      A Ranger mission is blocked waiting for your decision.
    </p>
    <table width="100%" style="margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;color:#71717a;font-size:12px;">Mission</td>
        <td style="padding:8px 0;color:#e4e4e7;font-size:12px;font-family:ui-monospace,monospace;">${missionId}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#71717a;font-size:12px;">Summary</td>
        <td style="padding:8px 0;color:#e4e4e7;font-size:12px;">${summary}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#71717a;font-size:12px;">Risk</td>
        <td style="padding:8px 0;color:#fbbf24;font-size:12px;font-weight:600;">${risk}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#71717a;font-size:12px;">Expires in</td>
        <td style="padding:8px 0;color:#e4e4e7;font-size:12px;">${ttl} hours</td>
      </tr>
    </table>
    <a href="${approveUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
      Review &amp; Decide
    </a>
  `);
  const text = `Approval required for mission ${String(v['mission_id'])}.\n${String(v['request_summary'] ?? '')}\nRisk: ${String(v['risk_severity'] ?? 'MEDIUM')}\nOpen: ${String(v['approve_url'] ?? '')}`;
  return { subject, html, text };
}

function renderBudgetWarning(v: Record<string, unknown>): RenderedEmail {
  const tier = esc(v['tier']);
  const threshold = esc(v['threshold_pct']);
  const spent = esc(v['spent_usd']);
  const cap = esc(v['monthly_cap_usd']);
  const remaining = esc(v['remaining_usd']);

  const subject = `[COCO] Budget alert: ${String(v['threshold_pct'])}% of ${String(v['tier'])} credits used`;
  const html = shell('Monthly Credit Warning', `
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
      Your organization has used <strong style="color:#fbbf24;">${threshold}%</strong> of this month's
      <strong style="color:#e4e4e7;">${tier}</strong> tier compute credits.
    </p>
    <table width="100%" style="margin:16px 0;border-collapse:collapse;background:#09090b;border-radius:8px;">
      <tr>
        <td style="padding:12px;color:#71717a;font-size:12px;">Spent</td>
        <td style="padding:12px;color:#34d399;font-size:14px;font-family:ui-monospace,monospace;text-align:right;">$${spent}</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#71717a;font-size:12px;">Monthly cap</td>
        <td style="padding:12px;color:#e4e4e7;font-size:14px;font-family:ui-monospace,monospace;text-align:right;">$${cap}</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#71717a;font-size:12px;">Remaining</td>
        <td style="padding:12px;color:#818cf8;font-size:14px;font-family:ui-monospace,monospace;text-align:right;">$${remaining}</td>
      </tr>
    </table>
    <p style="color:#71717a;font-size:12px;">
      At 100%, Default tier work pauses. Pro/Ranger may continue on overage depending on your plan.
    </p>
  `);
  const text = `Budget warning: ${String(v['threshold_pct'])}% used. Spent $${String(v['spent_usd'])} of $${String(v['monthly_cap_usd'])}. Remaining $${String(v['remaining_usd'])}.`;
  return { subject, html, text };
}

function renderMissionCompleted(v: Record<string, unknown>): RenderedEmail {
  const missionId = esc(v['mission_id']);
  const objective = esc(v['objective'] ?? 'Mission');
  const phase = esc(v['phase'] ?? 'completed');
  const cost = esc(v['cost_usd'] ?? '0');
  const url = esc(v['mission_url'] ?? '#');

  const subject = `[COCO] Mission ${String(v['phase'] ?? 'completed')}: ${String(v['objective'] ?? missionId).slice(0, 50)}`;
  const html = shell('Mission Update', `
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
      Mission status is now <strong style="color:#34d399;">${phase}</strong>.
    </p>
    <p style="color:#e4e4e7;font-size:14px;"><strong>${objective}</strong></p>
    <p style="color:#71717a;font-size:12px;font-family:ui-monospace,monospace;">${missionId} · cost $${cost}</p>
    <a href="${url}" style="display:inline-block;margin-top:12px;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
      Open Mission
    </a>
  `);
  const text = `Mission ${String(v['mission_id'])} is ${String(v['phase'])}. ${String(v['objective'] ?? '')} Cost: $${String(v['cost_usd'] ?? 0)}`;
  return { subject, html, text };
}

function renderWelcome(v: Record<string, unknown>): RenderedEmail {
  const name = esc(v['display_name'] ?? 'Operator');
  const tier = esc(v['tier'] ?? 'default');
  const subject = 'Welcome to COCO';
  const html = shell('Welcome aboard', `
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
      Hello ${name}, your organization is on the <strong style="color:#818cf8;">${tier}</strong> tier.
    </p>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
      Start a mission from the dashboard, or open the Ranger console for long-running autonomous work.
    </p>
  `);
  const text = `Welcome ${String(v['display_name'] ?? '')}. Your tier is ${String(v['tier'] ?? 'default')}.`;
  return { subject, html, text };
}
