<script lang="ts">
  interface Author {
    human: { name: string; url: string };
    tool: { name: string; url: string };
    model: { name: string; url: string };
    agent: { name: string; projectUrl: string };
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

  let { posts, allTags }: Props = $props();

  let selectedTags = $state<Set<string>>(new Set());
  let sortOrder = $state('newest');
  let dropdownOpen = $state(false);

  const allSelected = $derived(selectedTags.size === 0);

  const filterLabel = $derived.by(() => {
    if (allSelected) return 'All tags';
    if (selectedTags.size === 1) return `#${[...selectedTags][0]}`;
    return `${selectedTags.size} tags selected`;
  });

  const filtered = $derived.by(() => {
    let result = posts;
    if (!allSelected) {
      result = result.filter(p => p.tags.some(t => selectedTags.has(t)));
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
    allSelected
      ? `Showing all ${filtered.length} post${filtered.length !== 1 ? 's' : ''}`
      : `Showing ${filtered.length} post${filtered.length !== 1 ? 's' : ''} for ${filterLabel}`
  );

  function toggleTag(tag: string) {
    const next = new Set(selectedTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    selectedTags = next;
  }

  function clearAll() {
    selectedTags = new Set();
  }

  function closeOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.tag-filter-dropdown')) {
      dropdownOpen = false;
    }
  }

  function handleDropdownKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dropdownOpen = false;
    }
  }

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

<svelte:window onclick={closeOnOutsideClick} />

<div class="post-controls">
  <div class="tag-filter-dropdown" role="none" onkeydown={handleDropdownKeydown}>
    <button
      class="filter-trigger"
      class:active={!allSelected}
      aria-haspopup="listbox"
      aria-expanded={dropdownOpen}
      onclick={(e) => { e.stopPropagation(); dropdownOpen = !dropdownOpen; }}
    >
      <span class="filter-label">{filterLabel}</span>
      <span class="filter-caret" aria-hidden="true">{dropdownOpen ? '▴' : '▾'}</span>
    </button>

    {#if dropdownOpen}
      <div class="filter-menu" role="listbox" aria-multiselectable="true" aria-label="Filter by tag">
        <label class="filter-option filter-option--all">
          <input
            type="checkbox"
            checked={allSelected}
            onchange={clearAll}
          />
          <span>All tags</span>
        </label>
        <div class="filter-divider" role="separator"></div>
        {#each allTags as tag}
          <label class="filter-option" class:checked={selectedTags.has(tag)}>
            <input
              type="checkbox"
              checked={selectedTags.has(tag)}
              onchange={() => toggleTag(tag)}
            />
            <span>#{tag}</span>
          </label>
        {/each}
      </div>
    {/if}
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
      <time datetime={post.publishedDate}>
        {formatDate(post.publishedDate)}
      </time>
      <h2><a href={`/${post.id}`}>{post.title}</a></h2>
      <p class="post-summary">{post.summary}</p>
      <div class="post-card-meta">
        <span class="author">
          <a href={post.author.human.url} rel="noopener">{post.author.human.name}</a>
          &middot;
          <a href={post.author.tool.url} rel="noopener">{post.author.tool.name}</a>
          &middot;
          <a href={post.author.model.url} rel="noopener">{post.author.model.name}</a>
          &middot;
          <a href={post.author.agent.projectUrl} rel="noopener">{post.author.agent.name}</a>
        </span>
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

  .tag-filter-dropdown {
    position: relative;
  }

  .filter-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-heading);
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .filter-trigger:hover,
  .filter-trigger[aria-expanded="true"] {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .filter-trigger.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }

  .filter-trigger:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .filter-caret {
    font-size: 0.6rem;
    line-height: 1;
  }

  .filter-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 100;
    min-width: 11rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 0.25rem 0;
  }

  .filter-option {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 0.3rem 0.75rem;
    font-family: var(--font-heading);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    cursor: pointer;
    user-select: none;
  }

  .filter-option:hover {
    color: var(--color-text);
    background: var(--color-surface-alt);
  }

  .filter-option.checked {
    color: var(--color-accent);
  }

  .filter-option--all {
    color: var(--color-text);
    font-weight: 600;
  }

  .filter-option input[type="checkbox"] {
    width: 0.8rem;
    height: 0.8rem;
    accent-color: var(--color-accent);
    cursor: pointer;
    flex-shrink: 0;
  }

  .filter-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.25rem 0;
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
