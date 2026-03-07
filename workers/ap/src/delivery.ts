import { signRequest } from './signing.js';

export interface Env {
  DB: D1Database;
  AP_PRIVATE_KEY_OBSERVATORY?: string;
  AP_PRIVATE_KEY_BLOG?: string;
  AP_BASE_URL: string;
}

interface DeliveryMessage {
  actorName: string;
  inboxUrl: string;
  activity: Record<string, unknown>;
}

function getPrivateKey(env: Env, actorName: string): string | undefined {
  if (actorName === 'observatory') return env.AP_PRIVATE_KEY_OBSERVATORY;
  if (actorName === 'blog') return env.AP_PRIVATE_KEY_BLOG;
  return undefined;
}

export async function handleDeliveryQueue(
  batch: MessageBatch<string>,
  env: Env,
): Promise<void> {
  const deliveries = batch.messages.map(async (msg) => {
    let payload: DeliveryMessage;
    try {
      payload = JSON.parse(msg.body) as DeliveryMessage;
    } catch {
      msg.ack();
      return;
    }

    const { actorName, inboxUrl, activity } = payload;
    const privateKey = getPrivateKey(env, actorName);
    if (!privateKey) {
      msg.ack();
      return;
    }

    const actorUrl = `${env.AP_BASE_URL}/ap/actors/${actorName}`;
    const keyId = `${actorUrl}#main-key`;
    const body = JSON.stringify(activity);

    try {
      const headers = await signRequest('POST', inboxUrl, body, keyId, privateKey);
      const res = await fetch(inboxUrl, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/activity+json' },
        body,
      });

      if (res.ok || res.status === 410) {
        // 410 Gone = remote actor deleted; ack and move on
        msg.ack();
        // Update last_delivery_at
        await env.DB.prepare(
          `UPDATE ap_followers SET last_delivery_at = datetime('now'), delivery_failures = 0
           WHERE actor_name = ? AND (remote_inbox_url = ? OR shared_inbox_url = ?)`,
        )
          .bind(actorName, inboxUrl, inboxUrl)
          .run();
      } else {
        // 4xx client errors: ack (won't succeed on retry)
        // 5xx server errors: retry (don't ack)
        if (res.status >= 400 && res.status < 500) {
          msg.ack();
          await env.DB.prepare(
            `UPDATE ap_followers
             SET delivery_failures = delivery_failures + 1
             WHERE actor_name = ? AND (remote_inbox_url = ? OR shared_inbox_url = ?)`,
          )
            .bind(actorName, inboxUrl, inboxUrl)
            .run();
        } else {
          msg.retry();
        }
      }
    } catch {
      msg.retry();
    }
  });

  await Promise.allSettled(deliveries);
}
