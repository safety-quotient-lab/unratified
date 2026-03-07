import { getActor } from './actors.js';

// WebFinger (RFC 7033)
// GET /.well-known/webfinger?resource=acct:observatory@unratified.org
export function handleWebFinger(request: Request, baseUrl: string): Response {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource');

  if (!resource) {
    return new Response('Missing resource parameter', { status: 400 });
  }

  // Accept both acct: and https: resource URIs
  const acctMatch = resource.match(/^acct:([^@]+)@(.+)$/);
  if (!acctMatch) {
    return new Response('Unsupported resource format', { status: 400 });
  }

  const [, username, domain] = acctMatch;
  const expectedDomain = new URL(baseUrl).hostname;

  if (domain !== expectedDomain) {
    return new Response('Not found', { status: 404 });
  }

  const actor = getActor(username);
  if (!actor) {
    return new Response('Not found', { status: 404 });
  }

  const actorUrl = `${baseUrl}/ap/actors/${actor.username}`;

  const jrd = {
    subject: `acct:${actor.username}@${expectedDomain}`,
    aliases: [actorUrl],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: actorUrl,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: actor.url,
      },
    ],
  };

  return new Response(JSON.stringify(jrd), {
    headers: {
      'Content-Type': 'application/jrd+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
