/**
 * Schema.org DefinedTermSet — machine-readable glossary.
 *
 * GET /.well-known/glossary.json
 * Returns JSON-LD with @context referencing schema.org.
 */

import type { APIRoute } from 'astro';
import { glossary, CATEGORY_LABELS } from '../../data/glossary';

export const GET: APIRoute = () => {
  const terms = glossary.map((t) => {
    const primaryUrls = t.sources
      ?.filter((s) => s.authority === 'primary')
      .map((s) => s.url) ?? [];
    const nonPrimaryUrls = t.sources
      ?.filter((s) => s.authority !== 'primary')
      .map((s) => s.url) ?? [];

    return {
      '@type': 'DefinedTerm',
      '@id': `https://unratified.org/glossary#${t.id}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: 'https://unratified.org/.well-known/glossary.json',
      termCode: t.id,
      ...(t.abbreviation ? { alternateName: t.abbreviation } : {}),
      ...(t.seeAlso ? { url: `https://unratified.org${t.seeAlso}` } : {}),
      ...(primaryUrls.length === 1 ? { sameAs: primaryUrls[0] } : {}),
      ...(primaryUrls.length > 1 ? { sameAs: primaryUrls } : {}),
      ...(nonPrimaryUrls.length === 1 ? { isBasedOn: nonPrimaryUrls[0] } : {}),
      ...(nonPrimaryUrls.length > 1 ? { isBasedOn: nonPrimaryUrls } : {}),
      additionalProperty: {
        '@type': 'PropertyValue',
        name: 'category',
        value: CATEGORY_LABELS[t.category],
      },
    };
  });

  const body = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': 'https://unratified.org/.well-known/glossary.json',
    name: 'Unratified Glossary',
    description:
      'Project-specific terms, frameworks, and analytical vocabulary used throughout the Unratified analysis of AI economic impact and ICESCR ratification.',
    url: 'https://unratified.org/glossary',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    publisher: {
      '@type': 'Organization',
      name: 'Safety Quotient Lab',
      url: 'https://github.com/safety-quotient-lab',
    },
    hasDefinedTerm: terms,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
