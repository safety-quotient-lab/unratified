<script lang="ts">
  interface Author {
    human?: { name: string; url: string };
    tool: { name: string; url: string };
    model: { name: string; url: string }[];
    agent: { name: string; projectUrl: string; sections?: string[] }[];
  }

  interface Post {
    id: string;
    title: string;
    summary: string;
    publishedDate: string;
    author: Author;
    tags: string[];
    reviewStatus?: string;
  }

  interface Props {
    posts: Post[];
    allTags: string[];
  }

  type Persona = 'voter' | 'politician' | 'educator' | 'researcher' | 'developer' | 'all';

  const PERSONA_TAGS: Record<Exclude<Persona, 'all'>, Set<string>> = {
    voter: new Set([
      'icescr', 'voter-guide', 'ratification', 'civic-action', 'senate',
      'economic-rights', 'human-rights', 'labor', 'housing', 'health',
      'education', 'cold-war', 'human-rights-history', 'history',
      'advocacy', 'open-web',
    ]),
    politician: new Set([
      'icescr', 'voter-guide', 'ratification', 'policy', 'senate',
      'civic-action', 'civil-society', 'progressive-realization',
      'economic-rights', 'human-rights', 'labor', 'housing', 'health',
      'education', 'foreign-relations', 'accountability',
      'advocacy', 'AI', 'transparency',
    ]),
    educator: new Set([
      'icescr', 'ratification', 'economic-rights', 'human-rights',
      'udhr', 'methodology', 'fair-witness', 'transparency', 'meta',
      'confabulation', 'ai-accuracy', 'taxonomy', 'open-web',
      'history', 'cold-war', 'human-rights-history',
      'labor', 'housing', 'health', 'education',
      'observatory', 'data-analysis', 'stakeholder-voice',
    ]),
    researcher: new Set([
      'methodology', 'construct-validity', 'psychometrics', 'data-analysis',
      'measurement-design', 'statistics', 'hrcb', 'udhr', 'rights-salience',
      'observatory', 'fair-witness', 'calibration', 'llm-evaluation',
      'ensemble-scoring', 'confabulation', 'ai-accuracy', 'taxonomy',
      'semiotics', 'machine-learning', 'nlp', 'research', 'catastrophe-theory',
      'interpretant', 'psychoemotional-safety', 'setl', 'privacy',
      'stakeholder-voice', 'higher-order-effects', 'speculation',
      'peer-review', 'gemini', 'closed-loop', 'discriminator',
      'lazy-neutral', 'instrumentation', 'measurement-integrity',
    ]),
    developer: new Set([
      'cognitive-architecture', 'ai-agents', 'claude-code', 'a2a',
      'distributed-systems', 'inter-agent', 'interagent', 'well-known',
      'rfc-5785', 'infrastructure', 'security', 'prompt-injection',
      'recursive-systems', 'false-positives', 'hooks', 'parry',
      'graceful-degradation', 'developer-experience', 'byzantine-fault-tolerance',
      'human-ai-interaction', 'tool-design', 'ai-ux', 'csp', 'gap-detection',
      'silent-failure', 'development-process', 'git', 'reconstruction',
      'reproducibility', 'anti-regression', 'self-governance',
      'epistemic-infrastructure',
    ]),
  };

  const PERSONA_LABELS: Record<Persona, { name: string; desc: string }> = {
    voter:      { name: 'Voter',      desc: 'Voter guides, civic action, economic rights' },
    politician: { name: 'Politician', desc: 'Policy, ratification, legislative context' },
    educator:   { name: 'Educator',   desc: 'Teaching resources, methodology, human rights' },
    researcher: { name: 'Researcher', desc: 'Measurement, validity, construct analysis' },
    developer:  { name: 'Developer',  desc: 'Agent architecture, protocols, tools' },
    all:        { name: 'All',        desc: 'Everything' },
  };

  const LENS_KEY = 'unratified-lens';

  function loadPersona(): Persona {
    try {
      const stored = localStorage.getItem(LENS_KEY);
      if (stored && stored in PERSONA_TAGS) return stored as Persona;
    } catch {}
    return 'voter';
  }

  let { posts, allTags }: Props = $props();

  let persona = $state<Persona>(loadPersona());
  let selectedTag = $state<string | null>(null);
  let sortOrder = $state('newest');

  // Listen for lens changes from the main site (same origin) or other tabs
  $effect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LENS_KEY && e.newValue) {
        const val = e.newValue as Persona;
        if (val in PERSONA_TAGS || val === 'all') {
          persona = val;
          selectedTag = null;
        }
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  function postMatchesPersona(post: Post, p: Persona): boolean {
    if (p === 'all') return true;
    const tags = PERSONA_TAGS[p];
    return post.tags.some(t => tags.has(t));
  }

  // Tags visible for current persona with counts (for word-cloud sizing)
  const visibleTags = $derived.by(() => {
    const personaPosts = posts.filter(p => postMatchesPersona(p, persona));
    const tagCounts = new Map<string, number>();
    for (const post of personaPosts) {
      for (const tag of post.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    const entries = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0][1] : 1;
    return entries.map(([tag, count]) => ({
      tag,
      count,
      // Scale font from 0.55rem (1 post) to 1.1rem (max posts)
      fontSize: 0.55 + (count / max) * 0.55,
    }));
  });

  const filtered = $derived.by(() => {
    let result = posts.filter(p => postMatchesPersona(p, persona));
    if (selectedTag) {
      result = result.filter(p => p.tags.includes(selectedTag!));
    }
    switch (sortOrder) {
      case 'oldest':
        result = [...result].sort((a, b) =>
          new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
        );
        break;
      case 'az':
        result = [...result].sort((a, b) =>
          a.title.localeCompare(b.title)
        );
        break;
      default:
        result = [...result].sort((a, b) =>
          new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
        );
    }
    return result;
  });

  const announcement = $derived(
    `Showing ${filtered.length} post${filtered.length !== 1 ? 's' : ''} for ${PERSONA_LABELS[persona].name}${selectedTag ? `, #${selectedTag}` : ''}`
  );

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: 'America/New_York',
    });
  }
</script>

<div class="post-controls">
  <span class="persona-label">
    Showing for <strong>{PERSONA_LABELS[persona].name}</strong>
    <a href="https://unratified.org/start" class="persona-change">change</a>
  </span>

  <div class="sort-control">
    <select aria-label="Sort order" bind:value={sortOrder}>
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="az">A-Z</option>
    </select>
  </div>
</div>

{#if visibleTags.length > 1}
  <div class="tag-cloud">
    <button
      class="tag-pill"
      class:active={!selectedTag}
      onclick={() => selectedTag = null}
    >All</button>
    {#each visibleTags as { tag, count, fontSize }}
      <button
        class="tag-pill"
        class:active={selectedTag === tag}
        style="font-size: {fontSize}rem"
        title="{count} post{count !== 1 ? 's' : ''}"
        onclick={() => selectedTag = selectedTag === tag ? null : tag}
      >#{tag}</button>
    {/each}
  </div>
{/if}

<div class="sr-only" aria-live="polite">{announcement}</div>

<section class="post-list">
  {#each filtered as post (post.id)}
    <article class="post-card">
      <time datetime={post.publishedDate}>
        {formatDate(post.publishedDate)}
      </time>
      <h2><a href={`/${post.id}`}>{post.title}</a></h2>
      <p class="post-summary">{post.summary}</p>
      <div class="post-card-meta">
        <span class="author">
          <a href={post.author.tool.url} rel="noopener">{post.author.tool.name}</a>
          &middot;
          {#each post.author.model as m, i}
            {#if i > 0}&middot;{/if}<a href={m.url} rel="noopener">{m.name}</a>
          {/each}
          &middot;
          {#each post.author.agent as a, i}
            {#if i > 0}&middot;{/if}<a href={a.projectUrl} rel="noopener">{a.name}</a>
          {/each}
        </span>
        {#if post.reviewStatus === "unreviewed"}
          <span class="review-badge">Pre-Review</span>
        {:else if post.reviewStatus === "ai-reviewed"}
          <span class="review-badge ai-reviewed">AI-Reviewed</span>
        {/if}
        {#if post.tags.length > 0}
          <span class="tags">
            {#each post.tags as tag}
              <a href={`/tags/${tag}`} class="tag">#{tag}</a>
            {/each}
          </span>
        {/if}
      </div>
    </article>
  {/each}

  {#if filtered.length === 0}
    <p class="no-results">No posts match this filter. Try "All" to see everything.</p>
  {/if}
</section>

<style>
  .post-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: var(--space-sm) 0;
    margin-bottom: var(--space-sm);
  }

  .persona-label {
    font-family: var(--font-heading);
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .persona-change {
    font-size: 0.75rem;
    color: var(--color-accent);
    text-decoration: none;
    margin-left: 0.25rem;
  }

  .persona-change:hover {
    text-decoration: underline;
  }

  .tag-cloud {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.4rem;
    padding: var(--space-sm) 0;
    margin-bottom: var(--space-lg);
    line-height: 1.8;
  }

  .tag-pill {
    font-family: var(--font-heading);
    /* font-size set inline via word-cloud scaling */
    padding: 0.15rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.12s;
    white-space: nowrap;
  }

  .tag-pill:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .tag-pill.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-surface);
  }

  .sort-control {
    margin-left: auto;
  }

  .sort-control select {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
  }

  .sort-control select:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .post-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .post-card {
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .post-card time {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .post-card h2 {
    font-size: 1.309rem;
    margin: var(--space-xs) 0 var(--space-sm);
  }

  .post-card h2 a {
    text-decoration: none;
    color: var(--color-heading);
  }

  .post-card h2 a:hover {
    color: var(--color-accent);
  }

  .post-summary {
    color: var(--color-text);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .post-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .tags {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .tag {
    font-family: var(--font-heading);
    font-size: 0.7rem;
    color: var(--color-accent);
    text-decoration: none;
  }

  .tag:hover {
    color: var(--color-accent-light);
  }

  .author a {
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .author a:hover {
    color: var(--color-accent);
  }

  .no-results {
    color: var(--color-text-muted);
    font-style: italic;
  }

  @media (max-width: 640px) {
    .post-controls {
      flex-wrap: wrap;
    }

    .sort-control {
      margin-left: 0;
      width: 100%;
      padding-top: var(--space-xs);
    }
  }

  .review-badge {
    font-family: var(--font-heading);
    font-size: 0.65rem;
    color: #b58900;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    border: 1px solid #b5890044;
    padding: 0.1rem 0.4rem;
    border-radius: 2px;
  }

  .review-badge.ai-reviewed {
    color: #268bd2;
    border-color: #268bd244;
  }
</style>
