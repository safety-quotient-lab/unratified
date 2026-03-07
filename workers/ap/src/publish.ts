import { getActor } from './actors.js';

export interface Env {
  DB: D1Database;
  AP_DELIVERY_QUEUE: Queue;
  AP_BASE_URL: string;
  AP_PUBLISH_TOKEN?: string;
}

export interface PublishPayload {
  actor: string;
  post: {
    id: string;          // canonical URL of the blog post
    title: string;
    summary: string;     // plain text excerpt
    url: string;         // same as id for blog posts
    published: string;   // ISO 8601
    tags?: string[];     // hashtags without #
  };
}

const AS_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public';

export async function handlePublish(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Bearer token auth
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!env.AP_PUBLISH_TOKEN || token !== env.AP_PUBLISH_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: PublishPayload;
  try {
    payload = (await request.json()) as PublishPayload;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const actor = getActor(payload.actor);
  if (!actor) {
    return new Response(JSON.stringify({ error: 'Unknown actor' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = env.AP_BASE_URL;
  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;
  const activityId = `${actorUrl}/activities/${Date.now()}`;

  // Build hashtag tags
  const hashtagTags = (payload.post.tags ?? []).map((t) => ({
    type: 'Hashtag',
    name: `#${t}`,
    href: `https://blog.unratified.org/tag/${t}`,
  }));

  const article = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Article',
    id: payload.post.id,
    url: payload.post.url,
    name: payload.post.title,
    content: `<p>${payload.post.summary}</p><p><a href="${payload.post.url}">Read more →</a></p>`,
    published: payload.post.published,
    attributedTo: actorUrl,
    to: [AS_PUBLIC],
    cc: [`${actorUrl}/followers`],
    tag: hashtagTags,
  };

  const createActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    id: activityId,
    actor: actorUrl,
    published: payload.post.published,
    to: [AS_PUBLIC],
    cc: [`${actorUrl}/followers`],
    object: article,
  };

  // Store in outbox
  await env.DB.prepare(
    `INSERT OR IGNORE INTO ap_activities
       (actor_name, activity_id, activity_type, object_json)
     VALUES (?, ?, 'Create', ?)`,
  )
    .bind(actor.username, activityId, JSON.stringify(createActivity))
    .run();

  // Fetch followers and enqueue delivery
  const { results } = await env.DB.prepare(
    `SELECT remote_inbox_url, shared_inbox_url FROM ap_followers WHERE actor_name = ?`,
  )
    .bind(actor.username)
    .all<{ remote_inbox_url: string; shared_inbox_url: string | null }>();

  // Deduplicate by shared inbox
  const inboxes = new Set<string>();
  for (const row of results) {
    inboxes.add(row.shared_inbox_url ?? row.remote_inbox_url);
  }

  const deliveryMessages = Array.from(inboxes).map((inboxUrl) => ({
    body: JSON.stringify({
      actorName: actor.username,
      inboxUrl,
      activity: createActivity,
    }),
  }));

  if (deliveryMessages.length > 0) {
    await env.AP_DELIVERY_QUEUE.sendBatch(deliveryMessages);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      activityId,
      followers: results.length,
      deliveries: inboxes.size,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}

// GET /ap/actors/:name/outbox — returns stored activities
export async function handleOutboxPaged(
  actorName: string,
  request: Request,
  env: Env,
  baseUrl: string,
): Promise<Response> {
  const actor = getActor(actorName);
  if (!actor) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const page = url.searchParams.get('page');
  const actorUrl = `${baseUrl}/ap/actors/${actorName}`;

  const { results } = await env.DB.prepare(
    `SELECT activity_id, object_json FROM ap_activities
     WHERE actor_name = ?
     ORDER BY published_at DESC LIMIT 20`,
  )
    .bind(actorName)
    .all<{ activity_id: string; object_json: string }>();

  if (page) {
    const items = results.map((r) => JSON.parse(r.object_json));
    return new Response(
      JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `${actorUrl}/outbox?page=1`,
        type: 'OrderedCollectionPage',
        partOf: `${actorUrl}/outbox`,
        orderedItems: items,
      }),
      { headers: { 'Content-Type': 'application/activity+json' } },
    );
  }

  return new Response(
    JSON.stringify({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${actorUrl}/outbox`,
      type: 'OrderedCollection',
      totalItems: results.length,
      first: `${actorUrl}/outbox?page=1`,
    }),
    { headers: { 'Content-Type': 'application/activity+json' } },
  );
}
