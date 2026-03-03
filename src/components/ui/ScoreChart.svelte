<script lang="ts">
  interface ScoreItem {
    label: string;
    score: number;
    status?: 'survived' | 'eliminated' | 'modulator' | 'retained';
  }

  interface Props {
    items: ScoreItem[];
    maxScore: number;
    title: string;
    showStatus?: boolean;
  }

  let { items, maxScore, title, showStatus = true }: Props = $props();

  let themeVersion = $state(0);

  // SSR-safe fallbacks (light theme defaults)
  const ssrFallbacks: Record<string, string> = {
    '--color-chart-survived': '#558b2f',
    '--color-chart-eliminated': '#c62828',
    '--color-chart-modulator': '#f9a825',
    '--color-chart-neutral': '#5c6bc0',
    '--color-chart-bar-bg': '#eceff1',
    '--color-text': '#37474f',
    '--color-text-muted': '#78909c',
    '--color-border': '#cfd8dc',
    '--color-accent': '#00695c',
  };

  function getCssVar(name: string): string {
    if (typeof document === 'undefined') return ssrFallbacks[name] ?? '';
    void themeVersion;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  $effect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => { themeVersion++; });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  });

  // Layout constants
  const labelWidth = 160;
  const barStart = 170;
  const barMaxWidth = 320;
  const scoreX = barStart + barMaxWidth + 8;
  const svgWidth = 600;
  const rowHeight = 36;
  const topPad = 12;

  function svgHeight(): number {
    return items.length * rowHeight + topPad * 2;
  }

  function barWidth(score: number): number {
    return (score / maxScore) * barMaxWidth;
  }

  function barColor(status: string | undefined): string {
    void themeVersion;
    switch (status) {
      case 'survived': return getCssVar('--color-chart-survived');
      case 'eliminated': return getCssVar('--color-chart-eliminated');
      case 'modulator': return getCssVar('--color-chart-modulator');
      case 'retained': return getCssVar('--color-chart-neutral');
      default: return getCssVar('--color-accent');
    }
  }

  function barBgColor(): string {
    void themeVersion;
    return getCssVar('--color-chart-bar-bg');
  }

  function textColor(): string {
    void themeVersion;
    return getCssVar('--color-text');
  }

  function mutedColor(): string {
    void themeVersion;
    return getCssVar('--color-text-muted');
  }

  function statusLabel(status: string | undefined): string {
    switch (status) {
      case 'survived': return 'Survived';
      case 'eliminated': return 'Eliminated';
      case 'modulator': return 'Modulates';
      case 'retained': return 'Retained';
      default: return '';
    }
  }

  function ariaDescription(): string {
    const sorted = [...items].sort((a, b) => b.score - a.score);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `${items.length} items scored out of ${maxScore}. Highest: ${highest.label} at ${highest.score}. Lowest: ${lowest.label} at ${lowest.score}.`;
  }
</script>

<div class="score-chart-container">
  <svg
    viewBox="0 0 {svgWidth} {svgHeight()}"
    role="img"
    aria-label="{title}. {ariaDescription()}"
    class="score-chart-svg"
  >
    {#each items as item, i}
      {@const y = topPad + i * rowHeight}
      {@const bw = barWidth(item.score)}

      <!-- Background bar -->
      <rect
        x={barStart}
        y={y + 4}
        width={barMaxWidth}
        height={22}
        rx={2}
        fill={barBgColor()}
      />

      <!-- Score bar -->
      {#if item.score > 0}
        <rect
          x={barStart}
          y={y + 4}
          width={bw}
          height={22}
          rx={2}
          fill={barColor(item.status)}
          tabindex="0"
          role="listitem"
          aria-label="{item.label}: {item.score} out of {maxScore}{item.status ? `, ${statusLabel(item.status)}` : ''}"
        />
      {:else}
        <!-- Eliminated: thin placeholder line -->
        <line
          x1={barStart}
          y1={y + 15}
          x2={barStart + 40}
          y2={y + 15}
          stroke={barColor(item.status)}
          stroke-width={2}
          stroke-dasharray="4 3"
        />
      {/if}

      <!-- Label -->
      <text
        x={labelWidth}
        y={y + 19}
        text-anchor="end"
        fill={textColor()}
        font-size="11"
        font-family="var(--font-heading)"
      >{item.label}</text>

      <!-- Score -->
      <text
        x={item.score > 0 ? barStart + bw + 8 : barStart + 52}
        y={y + 19}
        fill={mutedColor()}
        font-size="11"
        font-family="var(--font-mono)"
      >{item.score}/{maxScore}</text>

      <!-- Status badge -->
      {#if showStatus && item.status}
        <text
          x={scoreX + 48}
          y={y + 19}
          fill={barColor(item.status)}
          font-size="9"
          font-family="var(--font-heading)"
          text-transform="uppercase"
          letter-spacing="0.04em"
        >{statusLabel(item.status)}</text>
      {/if}
    {/each}
  </svg>

  <details class="chart-text-alt">
    <summary>Text alternative: {title}</summary>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Score</th>
          {#if showStatus}<th>Status</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each items as item}
          <tr>
            <td>{item.label}</td>
            <td>{item.score}/{maxScore}</td>
            {#if showStatus}<td>{statusLabel(item.status)}</td>{/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
</div>

<style>
  .score-chart-container {
    margin: var(--space-lg) 0;
  }

  .score-chart-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .score-chart-svg rect[tabindex="0"]:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }

  .chart-text-alt {
    margin-top: var(--space-md);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .chart-text-alt summary {
    cursor: pointer;
    font-family: var(--font-heading);
    font-size: 0.8rem;
  }

  .chart-text-alt table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--space-sm);
    font-size: 0.8rem;
  }

  .chart-text-alt th,
  .chart-text-alt td {
    padding: var(--space-xs) var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  .chart-text-alt th {
    font-weight: 600;
    font-family: var(--font-heading);
    color: var(--color-primary);
  }
</style>
