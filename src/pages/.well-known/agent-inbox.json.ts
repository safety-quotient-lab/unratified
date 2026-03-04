/**
 * Agent Inbox — structured capability advertisement for discovering agents.
 *
 * GET /.well-known/agent-inbox.json
 * Symmetric to observatory.unratified.org/.well-known/agent-inbox.json.
 * Advertises glossary, taxonomy, references, and site capabilities.
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'Unratified — ICESCR Advocacy Through AI Economics',
    description:
      'Pedagogical website advocating for U.S. ratification of the ICESCR through the lens of AI economic impact. Provides structured vocabulary, taxonomy, and citation data for agent consumption.',
    url: 'https://unratified.org',
    provider: {
      '@type': 'Organization',
      name: 'Safety Quotient Lab',
      url: 'https://github.com/safety-quotient-lab',
    },
    creator: [
      {
        '@type': 'SoftwareApplication',
        name: 'Claude',
        url: 'https://www.anthropic.com/claude',
        applicationCategory: 'Artificial Intelligence',
        provider: {
          '@type': 'Organization',
          name: 'Anthropic',
          url: 'https://www.anthropic.com',
        },
      },
      {
        '@type': 'Person',
        name: 'Kashif Shah',
        url: 'https://kashifshah.net',
      },
    ],
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    endpoints: [
      {
        name: 'Glossary (Schema.org DefinedTermSet)',
        url: 'https://unratified.org/.well-known/glossary.json',
        contentType: 'application/ld+json',
        description:
          '49 project-specific terms across 8 categories with definitions, external sources, abbreviations, and cross-references.',
      },
      {
        name: 'Taxonomy (SKOS ConceptScheme)',
        url: 'https://unratified.org/.well-known/taxonomy.json',
        contentType: 'application/ld+json',
        description:
          'Full concept hierarchy with broader/narrower/related relationships in SKOS JSON-LD.',
      },
      {
        name: 'Sitemap',
        url: 'https://unratified.org/sitemap-index.xml',
        contentType: 'application/xml',
        description: '44 pages covering ICESCR articles, AI analysis, advocacy tools, and glossary.',
      },
      {
        name: 'Blog Posts (RSS)',
        url: 'https://blog.unratified.org/rss.xml',
        contentType: 'application/rss+xml',
        description:
          'All published blog posts — observatory data analysis, methodology documentation, and advocacy commentary.',
      },
    ],
    relatedSites: [
      {
        name: 'Unratified Blog',
        url: 'https://blog.unratified.org',
        relationship: 'child',
        agentInbox: 'https://blog.unratified.org/.well-known/agent-inbox.json',
        description:
          'Blog for ICESCR advocacy and AI economics analysis. Accepts .md post contributions via pull request.',
        blogSpec: 'https://blog.unratified.org/.well-known/blog-spec.json',
      },
      {
        name: 'Human Rights Observatory',
        url: 'https://observatory.unratified.org',
        relationship: 'sibling',
        agentInbox: 'https://observatory.unratified.org/.well-known/agent-inbox.json',
        description:
          'Evaluates Hacker News stories against all 31 UDHR provisions. Provides live statistics consumed by this site at build time.',
        apiEndpoint: 'https://observatory.unratified.org/api/v1/signals',
      },
    ],
    capabilities: {
      lensSystem: {
        description:
          'Content adapts presentation to 5 audience personas without altering facts.',
        personas: ['voter', 'politician', 'developer', 'educator', 'researcher'],
        default: 'voter',
        mechanism: 'CSS visibility via data-lens attribute on body element',
      },
      structuredData: {
        description: 'Every page emits JSON-LD with BreadcrumbList and DefinedTermSet reference.',
        types: ['Article', 'WebSite', 'BreadcrumbList', 'DefinedTermSet'],
      },
      aiGenerated: true,
      aiGenerator: 'Claude (Anthropic)',
      humanDirector: 'Kashif Shah',
      contentLicense: 'CC BY-SA 4.0',
      codeLicense: 'Apache-2.0',
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
