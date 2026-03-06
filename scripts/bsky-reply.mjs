#!/usr/bin/env node
/**
 * bsky-reply.mjs
 *
 * Post a reply to an existing Bluesky post.
 * Resolves the CID automatically from the URI.
 *
 * Usage:
 *   node scripts/bsky-reply.mjs <at-uri> "Reply text"
 *   node scripts/bsky-reply.mjs --dry-run <at-uri> "Reply text"
 */

import { AtpAgent, RichText } from '@atproto/api';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(new URL('.', import.meta.url).pathname, '..', '.dev.vars');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filtered = args.filter((a) => a !== '--dry-run');

  if (filtered.length < 2) {
    console.error('Usage: node scripts/bsky-reply.mjs [--dry-run] <at-uri> "Reply text"');
    process.exit(1);
  }

  const targetUri = filtered[0];
  const replyText = filtered[1];

  const env = loadEnv();
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: env.BSKY_HANDLE, password: env.BSKY_PASSWORD });
  console.log(`Authenticated as ${env.BSKY_HANDLE}\n`);

  // Resolve CID of the target post
  const [did, , rkey] = targetUri.replace('at://', '').split('/');
  const postRes = await agent.getPost({ repo: did, rkey });
  const targetCid = postRes.cid;
  console.log(`Target : ${targetUri}`);
  console.log(`CID    : ${targetCid}`);

  const rt = new RichText({ text: replyText });
  await rt.detectFacets(agent);
  console.log(`Reply  : ${rt.graphemeLength} graphemes — "${replyText}"`);

  if (rt.graphemeLength > 300) {
    console.error('ERROR: reply exceeds 300 graphemes.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n[dry-run] would post reply');
    return;
  }

  const ref = { uri: targetUri, cid: targetCid };
  const response = await agent.post({
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    reply: { root: ref, parent: ref },
    createdAt: new Date().toISOString(),
  });

  console.log(`\nPosted: ${response.uri}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
