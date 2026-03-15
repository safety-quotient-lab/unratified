/**
 * A2A v1.0.0 Agent Card — unratified-agent (main site)
 *
 * GET /.well-known/agent-card.json
 *
 * Serves the canonical agent card from repo root .well-known/agent-card.json.
 * Edit the canonical file, not this endpoint.
 */

import type { APIRoute } from 'astro';
import agentCard from '../../../.well-known/agent-card.json';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(agentCard, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
