/**
 * /api/status — Mesh status endpoint for unratified-agent
 *
 * Returns agent identity, transport state, and mesh connectivity info.
 * Consumed by the interagent mesh compositor at interagent.safety-quotient.dev.
 */

import type { EventContext } from "@cloudflare/workers-types";

interface StatusResponse {
  agent_id: string;
  schema_version: number;
  collected_at: string;
  totals: {
    sessions: number;
    messages: number;
    unprocessed: number;
    epistemic_flags_unresolved: number;
  };
  trust_budget: {
    budget_current: number;
    budget_max: number;
  };
  active_gates: unknown[];
  peers: { from_agent: string }[];
  schedule: Record<string, unknown>;
  heartbeat: { timestamp: string };
}

export const onRequest: PagesFunction = async (context) => {
  const now = new Date().toISOString();

  const status: StatusResponse = {
    agent_id: "unratified-agent",
    schema_version: 14,
    collected_at: now,
    totals: {
      sessions: 15,
      messages: 0,
      unprocessed: 0,
      epistemic_flags_unresolved: 0,
    },
    trust_budget: {
      budget_current: 20,
      budget_max: 20,
    },
    active_gates: [],
    peers: [
      { from_agent: "psychology-agent" },
      { from_agent: "observatory-agent" },
      { from_agent: "psq-agent" },
    ],
    schedule: {},
    heartbeat: { timestamp: now },
  };

  return new Response(JSON.stringify(status, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=30",
    },
  });
};
