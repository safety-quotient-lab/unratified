import type { Env, Alert } from '../types';
import { THRESHOLDS } from '../config';
import { insertAlert, getRecentAlertByCategoryMessage } from '../db/queries';

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendAlertIfNeeded(env: Env, alert: Alert): Promise<void> {
  const recent = await getRecentAlertByCategoryMessage(
    env.DB,
    alert.category,
    alert.message,
    THRESHOLDS.alertCooldownHours,
  );

  if (recent) {
    console.log(`[monitor] Alert suppressed (cooldown): ${alert.message}`);
    return;
  }

  await insertAlert(env.DB, alert);

  if (!env.RESEND_API_KEY) {
    console.warn(`[monitor] RESEND_API_KEY not set — alert logged but not emailed: ${alert.message}`);
    return;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: env.ALERT_EMAIL,
        subject: `[${alert.severity.toUpperCase()}] Unratified Monitor: ${alert.message.slice(0, 80)}`,
        html: formatAlertHtml(alert),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[monitor] Resend API error: ${res.status} — ${body}`);
    } else {
      console.log(`[monitor] Alert sent: ${alert.severity} — ${alert.message}`);
    }
  } catch (err) {
    console.error(`[monitor] Email send failed:`, err);
  }
}

function formatAlertHtml(alert: Alert): string {
  const severityColor = {
    info: '#1565c0',
    warning: '#f9a825',
    critical: '#c62828',
  }[alert.severity];

  return `
    <div style="font-family: 'Fira Code', monospace; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${severityColor}; border-bottom: 2px solid ${severityColor}; padding-bottom: 8px;">
        ${alert.severity.toUpperCase()} — ${alert.category}
      </h2>
      <p style="font-size: 16px; color: #37474f;">${alert.message}</p>
      ${alert.details ? `<pre style="background: #eceff1; padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
      <hr style="border: none; border-top: 1px solid #cfd8dc; margin: 24px 0;" />
      <p style="font-size: 12px; color: #546e7a;">
        Sent by <a href="https://unratified.org" style="color: #00695c;">unratified.org</a> monitor
        at ${new Date().toISOString()}
      </p>
    </div>
  `;
}
