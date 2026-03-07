import { getActor } from './actors.js';

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
      mediaType: 'image/x-icon',
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

// GET /ap/actors/:name/outbox
export function handleOutbox(name: string, baseUrl: string): Response {
  const actor = getActor(name);
  if (!actor) {
    return new Response('Not found', { status: 404 });
  }

  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;

  const outbox = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorUrl}/outbox`,
    type: 'OrderedCollection',
    totalItems: 0,
    first: `${actorUrl}/outbox?page=1`,
  };

  return new Response(JSON.stringify(outbox, null, 2), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

// GET /ap/actors/:name/followers
export function handleFollowers(name: string, baseUrl: string): Response {
  const actor = getActor(name);
  if (!actor) {
    return new Response('Not found', { status: 404 });
  }

  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;

  // Phase 1: return totalItems only (privacy — don't expose follower list)
  const followers = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${actorUrl}/followers`,
    type: 'OrderedCollection',
    totalItems: 0,
  };

  return new Response(JSON.stringify(followers, null, 2), {
    headers: {
      'Content-Type': 'application/activity+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
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
