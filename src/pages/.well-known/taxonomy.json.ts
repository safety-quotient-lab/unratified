/**
 * SKOS ConceptScheme — machine-readable taxonomy in JSON-LD.
 *
 * GET /.well-known/taxonomy.json
 * Full concept hierarchy with broader/narrower/related relationships.
 */

import type { APIRoute } from 'astro';
import { glossary, CATEGORY_LABELS, CATEGORY_ORDER } from '../../data/glossary';

const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const BASE = 'https://unratified.org/glossary#';

export const GET: APIRoute = () => {
  const concepts = glossary.map((t) => ({
    '@id': `${BASE}${t.id}`,
    '@type': `${SKOS}Concept`,
    [`${SKOS}prefLabel`]: t.term,
    [`${SKOS}definition`]: t.definition,
    ...(t.abbreviation ? { [`${SKOS}altLabel`]: t.abbreviation } : {}),
    [`${SKOS}inScheme`]: {
      '@id': 'https://unratified.org/.well-known/taxonomy.json',
    },
    ...(t.broader?.length
      ? { [`${SKOS}broader`]: t.broader.map((id) => ({ '@id': `${BASE}${id}` })) }
      : {}),
    ...(t.narrower?.length
      ? { [`${SKOS}narrower`]: t.narrower.map((id) => ({ '@id': `${BASE}${id}` })) }
      : {}),
    ...(t.related?.length
      ? { [`${SKOS}related`]: t.related.map((id) => ({ '@id': `${BASE}${id}` })) }
      : {}),
    ...(t.seeAlso
      ? { 'http://www.w3.org/2000/01/rdf-schema#seeAlso': `https://unratified.org${t.seeAlso}` }
      : {}),
  }));

  // Top-level collections for each category
  const collections = CATEGORY_ORDER.map((cat) => {
    const members = glossary
      .filter((t) => t.category === cat)
      .map((t) => ({ '@id': `${BASE}${t.id}` }));
    return {
      '@id': `${BASE}category-${cat}`,
      '@type': `${SKOS}Collection`,
      [`${SKOS}prefLabel`]: CATEGORY_LABELS[cat],
      [`${SKOS}member`]: members,
    };
  });

  const body = {
    '@context': {
      skos: SKOS,
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      dcterms: 'http://purl.org/dc/terms/',
      schema: 'https://schema.org/',
    },
    '@id': 'https://unratified.org/.well-known/taxonomy.json',
    '@type': `${SKOS}ConceptScheme`,
    [`${SKOS}prefLabel`]: 'Unratified Taxonomy',
    'dcterms:description':
      'SKOS concept scheme for the analytical vocabulary of the Unratified project — AI economic impact and ICESCR ratification advocacy.',
    'dcterms:license': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'dcterms:publisher': {
      '@type': 'schema:Organization',
      'schema:name': 'Safety Quotient Lab',
      'schema:url': 'https://github.com/safety-quotient-lab',
    },
    [`${SKOS}hasTopConcept`]: glossary
      .filter((t) => !t.broader?.length)
      .map((t) => ({ '@id': `${BASE}${t.id}` })),
    '@graph': [...concepts, ...collections],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
