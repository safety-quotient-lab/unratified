<script lang="ts">
  interface Heading {
    depth: number;
    slug: string;
    text: string;
  }

  let { headings }: { headings: Heading[] } = $props();

  const tocHeadings = headings
    .filter(h => h.depth === 2 || h.depth === 3)
    .map(h => ({ ...h, text: h.text.replace(/#$/, '').trim() }));
</script>

{#if tocHeadings.length > 1}
  <details class="toc" open>
    <summary class="toc-title">Contents</summary>
    <nav aria-label="Table of contents">
      <ol class="toc-list">
        {#each tocHeadings as heading}
          <li class="toc-item toc-depth-{heading.depth}">
            <a href="#{heading.slug}">{heading.text}</a>
          </li>
        {/each}
      </ol>
    </nav>
  </details>
{/if}

<style>
  .toc {
    margin: var(--space-xl) 0;
    padding: var(--space-md) var(--space-lg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface-alt);
  }

  .toc-title {
    cursor: pointer;
    font-family: var(--font-heading);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    list-style: none;
    user-select: none;
  }

  .toc-title::-webkit-details-marker {
    display: none;
  }

  .toc-title::before {
    content: '▶ ';
    font-size: 0.65rem;
    transition: transform 0.15s;
    display: inline-block;
  }

  details[open] .toc-title::before {
    transform: rotate(90deg);
  }

  .toc-list {
    list-style: none;
    margin: var(--space-md) 0 0;
    padding: 0;
  }

  .toc-item {
    line-height: 1.5;
  }

  .toc-item + .toc-item {
    margin-top: var(--space-xs);
  }

  .toc-item a {
    font-family: var(--font-heading);
    font-size: 0.875rem;
    color: var(--color-accent);
    text-decoration: none;
    border-bottom: none;
  }

  .toc-item a:hover {
    color: var(--color-accent-light);
    text-decoration: underline;
  }

  .toc-depth-3 {
    padding-left: var(--space-lg);
  }

  .toc-depth-3 a {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
</style>
