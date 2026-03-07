import { handleWebFinger } from './webfinger.js';
import { handleActor, handleFollowers, handleFollowing } from './actor.js';
import { handleInbox, Env as InboxEnv } from './inbox.js';
import { handlePublish, handleOutboxPaged, Env as PublishEnv } from './publish.js';
import { handleDeliveryQueue, Env as DeliveryEnv } from './delivery.js';

export interface Env extends InboxEnv, PublishEnv, DeliveryEnv {
  DB: D1Database;
  AP_DELIVERY_QUEUE: Queue;
  AP_BASE_URL: string;
  AP_PRIVATE_KEY_OBSERVATORY?: string;
  AP_PRIVATE_KEY_BLOG?: string;
  AP_PUBLISH_TOKEN?: string;
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

    // /ap/publish — Phase 3
    if (pathname === '/ap/publish') {
      return handlePublish(request, env);
    }

    // AP actor routes: /ap/actors/:name[/inbox|/outbox|/followers|/following]
    const actorMatch = pathname.match(/^\/ap\/actors\/([^/]+)(\/.*)?$/);
    if (actorMatch) {
      const [, name, sub] = actorMatch;

      const accept = request.headers.get('Accept') ?? '';
      const wantsAp =
        accept.includes('application/activity+json') ||
        accept.includes('application/ld+json') ||
        accept.includes('*/*') ||
        accept === '';

      if (!wantsAp) {
        return Response.redirect(`${baseUrl}/ap/actors/${name}`, 302);
      }

      if (!sub || sub === '/') return handleActor(name, baseUrl);
      if (sub === '/outbox') return handleOutboxPaged(name, request, env, baseUrl);
      if (sub === '/followers') return handleFollowers(name, baseUrl, env);
      if (sub === '/following') return handleFollowing(name, baseUrl);
      if (sub === '/inbox') return handleInbox(name, request, env);
    }

    return new Response('Not found', { status: 404 });
  },

  async queue(batch: MessageBatch<string>, env: Env): Promise<void> {
    await handleDeliveryQueue(batch, env);
  },
};
