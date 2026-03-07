import { getActor } from './actors.js';

export interface ActorEnv {
  DB: D1Database;
}

const AP_CONTEXT = [
  'https://www.w3.org/ns/activitystreams',
  'https://w3id.org/security/v1',
];

// GET /ap/actors/:name
export function handleActor(name: string, baseUrl: string): Response {
  const actor = getActor(name);
  if (!actor) {
    return new Response('Not found', { status: 404 });
  }

  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;
  const keyId = `${actorUrl}#main-key`;

  const actorObject = {
    '@context': AP_CONTEXT,
    id: actorUrl,
    type: 'Service',
    preferredUsername: actor.username,
    name: actor.name,
    summary: actor.summary,
    url: actor.url,
    inbox: `${actorUrl}/inbox`,
    outbox: `${actorUrl}/outbox`,
    followers: `${actorUrl}/followers`,
    following: `${actorUrl}/following`,
    icon: {
      type: 'Image',
      mediaType: 'image/svg+xml',
      url: actor.iconUrl,
    },
    publicKey: {
      id: keyId,
      owner: actorUrl,
      publicKeyPem: actor.publicKeyPem,
    },
  };

  return new Response(JSON.stringify(actorObject, null, 2), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

// GET /ap/actors/:name/followers
export async function handleFollowers(name: string, baseUrl: string, env: ActorEnv): Promise<Response> {
  const actor = getActor(name);
  if (!actor) {
    return new Response('Not found', { status: 404 });
  }

  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;
  const { results } = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM ap_followers WHERE actor_name = ?`,
  ).bind(actor.username).all<{ count: number }>();
  const totalItems = results[0]?.count ?? 0;

  const followers = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorUrl}/followers`,
    type: 'OrderedCollection',
    totalItems,
  };

  return new Response(JSON.stringify(followers, null, 2), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}

// GET /ap/actors/:name/following
export function handleFollowing(name: string, baseUrl: string): Response {
  const actor = getActor(name);
  if (!actor) {
    return new Response('Not found', { status: 404 });
  }

  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;

  const following = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorUrl}/following`,
    type: 'OrderedCollection',
    totalItems: 0,
  };

  return new Response(JSON.stringify(following, null, 2), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
