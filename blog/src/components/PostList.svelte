<script lang="ts">
  interface Post {
    id: string;
    title: string;
    summary: string;
    publishedDate: string;
    author: string;
    tags: string[];
    reviewStatus?: string;
  }

  interface Props {
    posts: Post[];
    allTags: string[];
  }

  let { posts, allTags }: Props = $props();

  let activeTag = $state('all');
  let sortOrder = $state('newest');

  const filtered = $derived.by(() => {
    let result = posts;
    if (activeTag !== 'all') {
      result = result.filter(p => p.tags.includes(activeTag));
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
    activeTag === 'all'
      ? `Showing ${filtered.length} post${filtered.length !== 1 ? 's' : ''}`
      : `Showing ${filtered.length} post${filtered.length !== 1 ? 's' : ''} tagged #${activeTag}`
  );

  const allChips = $derived(['all', ...allTags]);

  function selectTag(tag: string) {
    activeTag = tag;
  }

  function handleChipKeydown(event: KeyboardEvent, index: number) {
    let nextIndex = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (index + 1) % allChips.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (index - 1 + allChips.length) % allChips.length;
    } else {
      return;
    }

    selectTag(allChips[nextIndex]);
    const container = (event.currentTarget as HTMLElement).closest('.tag-filter');
    const buttons = container?.querySelectorAll('button');
    (buttons?.[nextIndex] as HTMLElement)?.focus();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<div class="post-controls">
  <div class="tag-filter" role="radiogroup" aria-label="Filter by tag">
    {#each allChips as tag, i}
      <button
        onclick={() => selectTag(tag)}
        onkeydown={(e) => handleChipKeydown(e, i)}
        role="radio"
        aria-checked={activeTag === tag}
        tabindex={activeTag === tag ? 0 : -1}
        class:active={activeTag === tag}
      >
        {tag === 'all' ? 'All' : `#${tag}`}
      </button>
    {/each}
  </div>

  <div class="sort-control">
    <label for="post-sort">Sort</label>
    <select id="post-sort" bind:value={sortOrder}>
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="az">A-Z by title</option>
    </select>
  </div>
</div>

<div class="sr-only" aria-live="polite">{announcement}</div>

<section class="post-list">
  {#each filtered as post (post.id)}
    <article class="post-card">
      <time datetime={post.publishedDate.split('T')[0]}>
        {formatDate(post.publishedDate)}
      </time>
      <h2><a href={`/${post.id}`}>{post.title}</a></h2>
      <p class="post-summary">{post.summary}</p>
      <div class="post-card-meta">
        <span class="author">{post.author}</span>
        {#if post.reviewStatus === "unreviewed"}
          <span class="review-badge">Pre-Review</span>
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
    <p class="no-results">No posts match this filter.</p>
  {/if}
</section>

<style>
  .post-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
  }

  .tag-filter {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .tag-filter button {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .tag-filter button:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .tag-filter button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .tag-filter button.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-bg);
  }

  .sort-control {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-left: auto;
  }

  .sort-control label {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    color: var(--color-text-muted);
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

  .no-results {
    color: var(--color-text-muted);
    font-style: italic;
  }

  @media (max-width: 640px) {
    .post-controls {
      flex-direction: column;
      align-items: flex-start;
    }

    .sort-control {
      margin-left: 0;
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
</style>
