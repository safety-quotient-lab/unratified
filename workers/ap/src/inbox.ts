import { getActor } from './actors.js';
import { verifySignature, signRequest } from './signing.js';

export interface Env {
  DB: D1Database;
  AP_BASE_URL: string;
  AP_PRIVATE_KEY_OBSERVATORY?: string;
  AP_PRIVATE_KEY_BLOG?: string;
}

function getPrivateKey(env: Env, actorName: string): string | undefined {
  if (actorName === 'observatory') return env.AP_PRIVATE_KEY_OBSERVATORY;
  if (actorName === 'blog') return env.AP_PRIVATE_KEY_BLOG;
  return undefined;
}

export async function handleInbox(
  actorName: string,
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const actor = getActor(actorName);
  if (!actor) return new Response('Not found', { status: 404 });

  // Verify HTTP Signature
  const valid = await verifySignature(request);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let activity: Record<string, unknown>;
  try {
    activity = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const type = activity['type'] as string;

  if (type === 'Follow') {
    await handleFollow(actorName, actor, activity, env);
    return new Response(null, { status: 202 });
  }

  if (type === 'Undo') {
    const obj = activity['object'] as Record<string, unknown> | undefined;
    if (obj && obj['type'] === 'Follow') {
      await handleUnfollow(actorName, activity, env);
    }
    return new Response(null, { status: 202 });
  }

  // Delete and other activities — accept silently
  return new Response(null, { status: 202 });
}

async function handleFollow(
  actorName: string,
  _actor: { username: string },
  activity: Record<string, unknown>,
  env: Env,
): Promise<void> {
  const remoteActorUrl = activity['actor'] as string;
  if (!remoteActorUrl) return;

  // Fetch remote actor to get their inbox URL
  let remoteInboxUrl: string;
  let sharedInboxUrl: string | null = null;
  try {
    const res = await fetch(remoteActorUrl, {
      headers: { accept: 'application/activity+json' },
    });
    if (!res.ok) return;
    const remoteActor = (await res.json()) as {
      inbox?: string;
      endpoints?: { sharedInbox?: string };
    };
    remoteInboxUrl = remoteActor.inbox ?? '';
    sharedInboxUrl = remoteActor.endpoints?.sharedInbox ?? null;
    if (!remoteInboxUrl) return;
  } catch {
    return;
  }

  // Store follower
  await env.DB.prepare(
    `INSERT OR IGNORE INTO ap_followers
       (actor_name, remote_actor_url, remote_inbox_url, shared_inbox_url)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(actorName, remoteActorUrl, remoteInboxUrl, sharedInboxUrl)
    .run();

  // Send Accept
  const privateKey = getPrivateKey(env, actorName);
  if (!privateKey) return;

  const baseUrl = env.AP_BASE_URL;
  const ourActorUrl = `${baseUrl}/ap/actors/${actorName}`;
  const accept = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${ourActorUrl}#accept-${Date.now()}`,
    type: 'Accept',
    actor: ourActorUrl,
    object: activity,
  };

  const body = JSON.stringify(accept);
  const keyId = `${ourActorUrl}#main-key`;
  try {
    const headers = await signRequest('POST', remoteInboxUrl, body, keyId, privateKey);
    await fetch(remoteInboxUrl, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/activity+json' },
      body,
    });
  } catch {
    // Best-effort — follower stored regardless
  }
}

async function handleUnfollow(
  actorName: string,
  activity: Record<string, unknown>,
  env: Env,
): Promise<void> {
  const remoteActorUrl = activity['actor'] as string;
  if (!remoteActorUrl) return;
  await env.DB.prepare(
    `DELETE FROM ap_followers WHERE actor_name = ? AND remote_actor_url = ?`,
  )
    .bind(actorName, remoteActorUrl)
    .run();
}
