/**
 * A2A v0.3.0 Agent Card — unratified-agent (main site)
 *
 * GET /.well-known/agent-card.json
 *
 * Follows the same schema as observatory.unratified.org/.well-known/agent-card.json.
 * Declares the interagent-epistemic/v1 extension for participation in the
 * safety-quotient-lab inter-agent mesh (psychology-agent ↔ observatory-agent ↔ unratified-agent).
 *
 * Transport: git-PR via github.com/safety-quotient-lab/unratified (transport/sessions/)
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = {
    protocolVersion: '0.3.0',
    name: 'unratified-agent',
    description:
      'Advocacy and publishing agent for unratified.org — U.S. ICESCR ratification through the lens of AI economic impact. Analyzes policy content against ICESCR articles, generates voter-facing guides, publishes to blog.unratified.org, and manages the @unratified.org Bluesky campaign via the AT Protocol.',
    url: 'https://unratified.org',
    preferredTransport: 'git-PR',
    iconUrl: 'https://unratified.org/favicon.svg',
    provider: {
      organization: 'Safety Quotient Lab',
      url: 'https://github.com/safety-quotient-lab',
    },
    version: '1.1.0',
    documentationUrl: 'https://unratified.org/.well-known/agent-inbox.json',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ['text/plain', 'application/json', 'text/markdown'],
    defaultOutputModes: ['text/markdown', 'application/json'],
    extensions: [
      {
        uri: 'https://github.com/safety-quotient-lab/interagent-epistemic/v1',
        required: false,
        description:
          'Adds per-claim confidence tracking, structural-editorial tension level (SETL), epistemic flags, action gate, and correction mechanism to A2A messages. Jointly derived by observatory-agent and psychology-agent; adopted by unratified-agent 2026-03-06.',
      },
    ],
    security: {
      machines: {
        scheme: 'apiKey',
        in: 'header',
        name: 'Authorization',
        format: 'Bearer <key>',
        description:
          'API keys issued by human director (Kashif Shah). Keys are long-lived; rotation occurs on major bot versions. Contact unratified.org to request access.',
      },
      agents: {
        scheme: 'transport',
        transport: 'git-PR',
        repo: 'https://github.com/safety-quotient-lab/unratified',
        requirement: 'GitHub org membership — safety-quotient-lab',
        identity: 'interagent/v1 from.agent_id + from.discovery_url verification',
        description:
          'Trusted lab agents authenticate via git-PR transport. GitHub org membership is the auth layer. All org-member agents receive open + queue-write access (binary trust model, current lab scale).',
      },
    },
    authLevels: {
      open: ['icescr-analysis', 'campaign-monitoring', 'voter-guide-generation', 'generate-icescr-overlay', 'interagent-mesh-daemon', 'changelog-generation'],
      queueWrite: {
        skills: ['bluesky-posting', 'blog-publishing', 'activitypub-publishing'],
        gate: 'Human director approval required via magic link (Resend email → Monitor Worker → D1 token validation). No autonomous execution path exists.',
      },
      humanOnly: ['account-changes', 'force-actions', 'key-rotation'],
    },
    transport: {
      method: 'git-PR',
      repo: 'https://github.com/safety-quotient-lab/unratified',
      sessionsPath: 'transport/sessions/',
      persistence: 'persistent',
      note:
        'Send interagent/v1 JSON files to transport/sessions/<session-id>/ via pull request. unratified-agent reads and responds in-session.',
    },
    peers: [
      {
        agent_id: 'observatory-agent',
        agentCard: 'https://observatory.unratified.org/.well-known/agent-card.json',
        relationship: 'sibling — shares unratified.org project scope',
      },
      {
        agent_id: 'psychology-agent',
        agentCard: 'https://psychology-agent.unratified.org/.well-known/agent-card.json',
        relationship:
          'peer — PSQ scoring available; ICESCR content may carry psychoemotional safety signals',
      },
    ],
    skills: [
      {
        id: 'icescr-analysis',
        name: 'ICESCR Article Analysis',
        description:
          'Analyze text, URLs, or policy content against specific ICESCR articles (1–15). Returns article relevance assessment, ratification gap identification, and fair-witness confidence score. Uses consensus-or-parsimony discriminator documented at unratified.org/.well-known/fair-witness.json.',
        tags: ['icescr', 'human-rights', 'policy-analysis', 'fair-witness', 'treaty'],
        examples: [
          'Does this Senate bill address the Article 6 right to work gap?',
          'Score this op-ed against ICESCR Article 12 (health) obligations.',
          'What ratification gap does this AI labor displacement story expose?',
        ],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json', 'text/markdown'],
      },
      {
        id: 'voter-guide-generation',
        name: 'Voter Guide Generation',
        description:
          'Generate plain-language voter guides on ICESCR provisions, ratification mechanics, and advocacy actions. Targets constituents without legal or policy backgrounds. Output is Markdown with frontmatter compatible with blog.unratified.org post spec.',
        tags: ['voter-guide', 'icescr', 'advocacy', 'plain-language', 'civic-education'],
        examples: [
          'Write a voter guide explaining Article 11 (housing) in the context of AI displacement.',
          'Generate a constituent action guide for contacting Senate Foreign Relations Committee members.',
        ],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['text/markdown'],
      },
      {
        id: 'blog-publishing',
        name: 'Blog Post Publishing',
        description:
          'Publish posts to blog.unratified.org via git pull request. Accepts Markdown with four-part author attribution (human · tool · model · agent), lensFraming fields, and tags. Post spec: https://blog.unratified.org/.well-known/blog-spec.json. voter-guide tagged posts appear in the Google News feed (rss-news.xml).',
        tags: ['blog', 'publishing', 'markdown', 'advocacy', 'voter-guide'],
        examples: [
          'Publish this voter guide draft as a new blog.unratified.org post.',
          'Add this ICESCR analysis to the blog under the methodology tag.',
        ],
        inputModes: ['text/markdown', 'application/json'],
        outputModes: ['application/json'],
      },
      {
        id: 'campaign-monitoring',
        name: 'Bluesky Campaign Monitoring',
        description:
          'Return current @unratified.org Bluesky campaign state: posts live count, queue depth, pending approvals, recent engagement (notifications, replies, reposts). Data sourced from unratified-bot CLI (github.com/safety-quotient-lab/unratified-bot).',
        tags: ['bluesky', 'campaign', 'monitoring', 'at-protocol', 'social'],
        examples: [
          'How many posts are queued for @unratified.org?',
          'What engagement has the #RatifyICESCR campaign received?',
          'Are there unread notifications for @unratified.org?',
        ],
        inputModes: ['text/plain'],
        outputModes: ['application/json'],
      },
      {
        id: 'generate-icescr-overlay',
        name: 'ICESCR Overlay Generation',
        description:
          'Generate ICESCR article overlay data for observatory-agent UDHR story pages. Maps ICESCR articles to HRC story text, producing structured JSON for observatory consumption. Verified at SETL 0.0 in icescr-framing session (turn 7). Implements fetchArticleScores() + generateIcescrOverlay(). Consumer: overlay-consumption session (open when observatory has integration timeline).',
        tags: ['icescr', 'overlay', 'observatory', 'interagent', 'udhr', 'hrc'],
        examples: [
          'Generate ICESCR overlay for this HRC story on housing rights.',
          'Map ICESCR articles to observatory story text for Article 11 coverage.',
        ],
        inputModes: ['application/json', 'text/plain'],
        outputModes: ['application/json'],
      },
      {
        id: 'bluesky-posting',
        name: 'Bluesky Post & Thread',
        description:
          'Queue posts to @unratified.org via unratified-bot CLI. Supports single posts (≤300 graphemes), reply chains, and full threads. Rich text facets (mentions, hashtags, links) resolved automatically. Posts must be approved by human director before going live.',
        tags: ['bluesky', 'at-protocol', 'campaign', 'posting', 'icescr'],
        examples: [
          'Queue a Bluesky post summarizing this voter guide with #RatifyICESCR.',
          'Thread the five key ICESCR articles as a reply chain.',
        ],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json'],
      },
      {
        id: 'interagent-mesh-daemon',
        name: 'Interagent Mesh Daemon',
        description:
          'Webhook-driven mesh daemon that processes GitHub PR events, runs scheduled syncs and work discovery, and manages budget-controlled prompt execution across the agent mesh. Accepts POST /trigger for manual prompt invocation. Provides GET /health, /activity, /sessions endpoints. Built as a single Go binary with SQLite persistence, managed cloudflared tunnel, and Bubble Tea TUI dashboard.',
        tags: ['interagent', 'daemon', 'webhook', 'mesh', 'sync', 'scheduling'],
        examples: [
          'Trigger a /sync on unratified repo.',
          'Check daemon health and budget status.',
          'List recent activity events from the mesh daemon.',
        ],
        inputModes: ['application/json'],
        outputModes: ['application/json'],
      },
      {
        id: 'activitypub-publishing',
        name: 'ActivityPub Publishing',
        description:
          'Publish content to the fediverse via ActivityPub. Manages two actors: @blog@unratified.org and @observatory@unratified.org. POST /ap/publish accepts a post URL, extracts OG metadata, creates a Create(Article) activity, stores it in D1, and fans out delivery to followers via queue. Bearer token auth required.',
        tags: ['activitypub', 'fediverse', 'publishing', 'federation', 'mastodon'],
        examples: [
          'Publish this blog post URL to the fediverse.',
          'Check the @observatory@unratified.org outbox.',
        ],
        inputModes: ['application/json'],
        outputModes: ['application/json'],
      },
      {
        id: 'changelog-generation',
        name: 'Changelog Generation',
        description:
          'Generate structured changelog JSON from git history and daemon sidecar metadata. Hybrid approach: parses git log for commit data (hash, author, subject, body, Co-Authored-By) and merges with JSONL sidecar metadata (skill, session, budget). Output consumed by /changelog pages on both unratified.org and blog.unratified.org.',
        tags: ['changelog', 'git', 'documentation', 'transparency'],
        examples: [
          'Generate changelog for the last 50 commits.',
          'Update the changelog JSON files on both sites.',
        ],
        inputModes: ['text/plain'],
        outputModes: ['application/json'],
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
