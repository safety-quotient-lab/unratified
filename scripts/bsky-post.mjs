#!/usr/bin/env node

/**
 * Bluesky posting script for unratified.org campaign
 *
 * Usage:
 *   node scripts/bsky-post.mjs "Your post text here"
 *   node scripts/bsky-post.mjs --dry-run "Preview without posting"
 *   node scripts/bsky-post.mjs --thread "Post 1" "Post 2" "Post 3"
 *   node scripts/bsky-post.mjs --dry-run --thread "Post 1" "Post 2"
 *
 * Credentials: .dev.vars (BSKY_HANDLE, BSKY_PASSWORD)
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

async function createPost(agent, text, replyRef) {
  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  const record = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };

  if (replyRef) {
    record.reply = replyRef;
  }

  const response = await agent.post(record);
  return response;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const isThread = args.includes('--thread');
  const texts = args.filter(a => a !== '--dry-run' && a !== '--thread');

  if (texts.length === 0) {
    console.error('Usage: node scripts/bsky-post.mjs [--dry-run] [--thread] "Post text" ["Post 2" ...]');
    process.exit(1);
  }

  const env = loadEnv();
  const handle = env.BSKY_HANDLE;
  const password = env.BSKY_PASSWORD;

  if (!handle || !password || handle.includes('xxxx')) {
    console.error('Set BSKY_HANDLE and BSKY_PASSWORD in .dev.vars');
    process.exit(1);
  }

  const agent = new AtpAgent({ service: 'https://bsky.social' });

  console.log(`Authenticating as ${handle}...`);
  await agent.login({ identifier: handle, password });
  console.log(`Authenticated.\n`);

  if (dryRun) {
    console.log('=== DRY RUN (nothing will post) ===\n');
    for (let i = 0; i < texts.length; i++) {
      const rt = new RichText({ text: texts[i] });
      await rt.detectFacets(agent);
      const label = isThread ? `[${i + 1}/${texts.length}]` : '[Single post]';
      console.log(`${label} (${new TextEncoder().encode(texts[i]).length} bytes, ${rt.graphemeLength} graphemes)`);
      console.log(`${'─'.repeat(60)}`);
      console.log(texts[i]);
      if (rt.facets?.length) {
        console.log(`\nDetected facets: ${rt.facets.length} (links/mentions/tags)`);
      }
      console.log();
    }
    console.log('Run without --dry-run to post.');
    return;
  }

  if (isThread && texts.length > 1) {
    console.log(`Posting thread (${texts.length} posts)...\n`);
    let parentRef = null;
    let rootRef = null;

    for (let i = 0; i < texts.length; i++) {
      const replyRef = parentRef ? { root: rootRef, parent: parentRef } : undefined;
      const response = await createPost(agent, texts[i], replyRef);

      if (i === 0) {
        rootRef = { uri: response.uri, cid: response.cid };
      }
      parentRef = { uri: response.uri, cid: response.cid };

      console.log(`[${i + 1}/${texts.length}] Posted: ${response.uri}`);
    }
  } else {
    const response = await createPost(agent, texts[0]);
    console.log(`Posted: ${response.uri}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
