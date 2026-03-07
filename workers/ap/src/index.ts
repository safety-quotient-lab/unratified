import { handleWebFinger } from './webfinger.js';
import { handleActor, handleOutbox, handleFollowers, handleFollowing } from './actor.js';

export interface Env {
  DB: D1Database;
  AP_BASE_URL: string;
  AP_PRIVATE_KEY_OBSERVATORY?: string; // Phase 2+
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const baseUrl = env.AP_BASE_URL;

    // WebFinger
    if (pathname === '/.well-known/webfinger') {
      return handleWebFinger(request, baseUrl);
    }

    // AP actor routes: /ap/actors/:name[/outbox|/followers|/following]
    const actorMatch = pathname.match(/^\/ap\/actors\/([^/]+)(\/.*)?$/);
    if (actorMatch) {
      const [, name, sub] = actorMatch;

      // Require AP content negotiation for actor endpoint (Mastodon sends Accept: application/activity+json)
      const accept = request.headers.get('Accept') ?? '';
      const wantsAp =
        accept.includes('application/activity+json') ||
        accept.includes('application/ld+json') ||
        accept.includes('*/*') ||
        accept === '';

      if (!wantsAp) {
        // Redirect HTML requests to the actor's profile URL
        return Response.redirect(`${baseUrl}/ap/actors/${name}`, 302);
      }

      if (!sub || sub === '/') {
        return handleActor(name, baseUrl);
      }
      if (sub === '/outbox') {
        return handleOutbox(name, baseUrl);
      }
      if (sub === '/followers') {
        return handleFollowers(name, baseUrl);
      }
      if (sub === '/following') {
        return handleFollowing(name, baseUrl);
      }
      // inbox — Phase 2
      if (sub === '/inbox') {
        return new Response(
          JSON.stringify({ error: 'Inbox not yet implemented (Phase 2)' }),
          { status: 501, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // /ap/publish — Phase 3
    if (pathname === '/ap/publish') {
      return new Response(
        JSON.stringify({ error: 'Publish endpoint not yet implemented (Phase 3)' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
