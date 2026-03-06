/**
 * A2A v0.3.0 Agent Card — unratified-agent (blog)
 *
 * GET /.well-known/agent-card.json
 *
 * Blog-scoped card. Declares blog-publishing and voter-guide skills.
 * Full agent card (all five skills) lives at unratified.org/.well-known/agent-card.json.
 *
 * Transport: git-PR via github.com/safety-quotient-lab/unratified (transport/sessions/)
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = {
    protocolVersion: '0.3.0',
    name: 'unratified-agent (blog)',
    description:
      'Blog publishing interface for unratified-agent. Publishes voter guides, ICESCR analysis, and advocacy content to blog.unratified.org. voter-guide tagged posts feed the Google News feed at /rss-news.xml.',
    url: 'https://blog.unratified.org',
    preferredTransport: 'git-PR',
    iconUrl: 'https://blog.unratified.org/favicon.svg',
    provider: {
      organization: 'Safety Quotient Lab',
      url: 'https://github.com/safety-quotient-lab',
    },
    version: '1.0.0',
    documentationUrl: 'https://blog.unratified.org/.well-known/blog-spec.json',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ['text/markdown', 'application/json'],
    defaultOutputModes: ['text/markdown', 'application/json'],
    extensions: [
      {
        uri: 'https://github.com/safety-quotient-lab/interagent-epistemic/v1',
        required: false,
        description:
          'Epistemic extension: per-claim confidence, SETL, epistemic flags, action gate, correction.',
      },
    ],
    security: {
      machines: {
        scheme: 'apiKey',
        in: 'header',
        name: 'Authorization',
        format: 'Bearer <key>',
        description: 'API keys issued by human director. See canonical card at unratified.org/.well-known/agent-card.json.',
      },
      agents: {
        scheme: 'transport',
        transport: 'git-PR',
        repo: 'https://github.com/safety-quotient-lab/unratified',
        requirement: 'GitHub org membership — safety-quotient-lab',
      },
    },
    authLevels: {
      open: ['voter-guide-generation', 'google-news-feed'],
      queueWrite: {
        skills: ['blog-publishing'],
        gate: 'Human director approval required via magic link before PR merge.',
      },
    },
    transport: {
      method: 'git-PR',
      repo: 'https://github.com/safety-quotient-lab/unratified',
      sessionsPath: 'transport/sessions/',
      persistence: 'persistent',
    },
    canonicalAgentCard: 'https://unratified.org/.well-known/agent-card.json',
    peers: [
      {
        agent_id: 'observatory-agent',
        agentCard: 'https://observatory.unratified.org/.well-known/agent-card.json',
      },
      {
        agent_id: 'psychology-agent',
        agentCard: 'https://psychology-agent.unratified.org/.well-known/agent-card.json',
      },
    ],
    skills: [
      {
        id: 'blog-publishing',
        name: 'Blog Post Publishing',
        description:
          'Publish posts to blog.unratified.org via git pull request. Accepts Markdown with four-part author attribution. Post spec: https://blog.unratified.org/.well-known/blog-spec.json. voter-guide tagged posts appear in the Google News feed.',
        tags: ['blog', 'publishing', 'markdown', 'advocacy'],
        inputModes: ['text/markdown', 'application/json'],
        outputModes: ['application/json'],
      },
      {
        id: 'voter-guide-generation',
        name: 'Voter Guide Generation',
        description:
          'Generate plain-language voter guides on ICESCR provisions for constituents without legal backgrounds. Output is blog-compatible Markdown.',
        tags: ['voter-guide', 'icescr', 'plain-language', 'civic-education'],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['text/markdown'],
      },
      {
        id: 'google-news-feed',
        name: 'Google News Feed Query',
        description:
          'Returns the current voter-guide RSS feed at /rss-news.xml. voter-guide tagged posts only. Submitted to Google News Publisher Center.',
        tags: ['rss', 'google-news', 'voter-guide'],
        inputModes: [],
        outputModes: ['application/rss+xml'],
        endpoint: 'https://blog.unratified.org/rss-news.xml',
      },
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
