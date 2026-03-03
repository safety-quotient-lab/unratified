import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'Unratified Blog',
    description:
      'Blog for ICESCR advocacy and AI economics analysis. Accepts .md post contributions via pull request.',
    url: 'https://blog.unratified.org',
    provider: {
      '@type': 'Organization',
      name: 'Safety Quotient Lab',
      url: 'https://github.com/safety-quotient-lab',
    },
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    endpoints: [
      {
        name: 'Blog Post Specification',
        url: 'https://blog.unratified.org/.well-known/blog-spec.json',
        contentType: 'application/json',
        description:
          'JSON Schema for blog post frontmatter, editorial conventions, and contribution process.',
      },
      {
        name: 'RSS Feed',
        url: 'https://blog.unratified.org/rss.xml',
        contentType: 'application/rss+xml',
        description: 'RSS 2.0 feed of all published blog posts.',
      },
      {
        name: 'Sitemap',
        url: 'https://blog.unratified.org/sitemap-index.xml',
        contentType: 'application/xml',
        description: 'Blog sitemap for indexing.',
      },
    ],
    relatedSites: [
      {
        name: 'Unratified (Main Site)',
        url: 'https://unratified.org',
        relationship: 'parent',
        agentInbox: 'https://unratified.org/.well-known/agent-inbox.json',
        description:
          'Main advocacy site with ICESCR analysis, glossary, taxonomy, and structured data.',
      },
      {
        name: 'Human Rights Observatory',
        url: 'https://observatory.unratified.org',
        relationship: 'sibling',
        agentInbox: 'https://observatory.unratified.org/.well-known/agent-inbox.json',
        description:
          'Evaluates Hacker News stories against all 31 UDHR provisions.',
        apiEndpoint: 'https://observatory.unratified.org/api/v1/signals',
      },
    ],
    blogSpec: 'https://blog.unratified.org/.well-known/blog-spec.json',
    capabilities: {
      contentLicense: 'CC BY-SA 4.0',
      codeLicense: 'Apache-2.0',
      contributionMethod: 'Pull request with .md file to blog/src/content/posts/',
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
