<script lang="ts">
  interface Dimension {
    key: string;
    label: string;
    maxValue?: number;
  }

  interface Profile {
    name: string;
    values: Record<string, number>;
  }

  interface Props {
    dimensions: Dimension[];
    profiles: Profile[];
    title: string;
  }

  let { dimensions, profiles, title }: Props = $props();

  let themeVersion = $state(0);

  // SSR-safe fallbacks (light theme defaults)
  const ssrFallbacks: Record<string, string> = {
    '--color-chart-profile-1': '#00695c',
    '--color-chart-profile-2': '#1565c0',
    '--color-chart-profile-3': '#ad1457',
    '--color-chart-grid': '#cfd8dc',
    '--color-text': '#37474f',
    '--color-text-muted': '#78909c',
    '--color-border': '#cfd8dc',
  };

  const profileColorVars = [
    '--color-chart-profile-1',
    '--color-chart-profile-2',
    '--color-chart-profile-3',
  ];

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
  const svgSize = 400;
  const cx = 200;
  const cy = 200;
  const radius = 140;
  const gridLevels = 5;

  const n = $derived(dimensions.length);
  const angleStep = $derived((2 * Math.PI) / n);

  function angle(i: number): number {
    return angleStep * i - Math.PI / 2; // start at 12 o'clock
  }

  function pointX(i: number, value: number, max: number): number {
    return cx + radius * (value / max) * Math.cos(angle(i));
  }

  function pointY(i: number, value: number, max: number): number {
    return cy + radius * (value / max) * Math.sin(angle(i));
  }

  function gridRingPoints(level: number): string {
    const frac = level / gridLevels;
    return dimensions
      .map((_, i) => `${cx + radius * frac * Math.cos(angle(i))},${cy + radius * frac * Math.sin(angle(i))}`)
      .join(' ');
  }

  function profilePoints(profile: Profile): string {
    return dimensions
      .map((dim, i) => {
        const max = dim.maxValue ?? 10;
        const v = profile.values[dim.key] ?? 0;
        return `${pointX(i, v, max)},${pointY(i, v, max)}`;
      })
      .join(' ');
  }

  function labelX(i: number): number {
    return cx + (radius + 24) * Math.cos(angle(i));
  }

  function labelY(i: number): number {
    return cy + (radius + 24) * Math.sin(angle(i)) + 4;
  }

  function labelAnchor(i: number): string {
    const cosVal = Math.cos(angle(i));
    if (cosVal > 0.15) return 'start';
    if (cosVal < -0.15) return 'end';
    return 'middle';
  }

  function profileColor(idx: number): string {
    void themeVersion;
    const varName = profileColorVars[idx % profileColorVars.length];
    return getCssVar(varName);
  }

  function gridColor(): string {
    void themeVersion;
    return getCssVar('--color-chart-grid');
  }

  function textColor(): string {
    void themeVersion;
    return getCssVar('--color-text');
  }

  function mutedColor(): string {
    void themeVersion;
    return getCssVar('--color-text-muted');
  }

  function ariaDescription(): string {
    if (profiles.length === 0) return '';
    const p = profiles[0];
    const entries = dimensions.map((d) => ({
      label: d.label,
      value: p.values[d.key] ?? 0,
    }));
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const high = sorted[0];
    const low = sorted[sorted.length - 1];
    return `${dimensions.length} dimensions across ${profiles.length} profile${profiles.length > 1 ? 's' : ''}. ${p.name} ranges from ${low.value} (${low.label}) to ${high.value} (${high.label}).`;
  }
</script>

<div class="radar-chart-container">
  <svg
    viewBox="0 0 {svgSize} {svgSize}"
    role="img"
    aria-label="{title}. {ariaDescription()}"
    class="radar-chart-svg"
  >
    <!-- Grid rings -->
    {#each Array.from({ length: gridLevels }, (_, i) => i + 1) as level}
      <polygon
        points={gridRingPoints(level)}
        fill="none"
        stroke={gridColor()}
        stroke-width={level === gridLevels ? 1.5 : 0.5}
      />
    {/each}

    <!-- Axis lines -->
    {#each dimensions as _, i}
      <line
        x1={cx}
        y1={cy}
        x2={cx + radius * Math.cos(angle(i))}
        y2={cy + radius * Math.sin(angle(i))}
        stroke={gridColor()}
        stroke-width={0.5}
        stroke-dasharray="2 4"
      />
    {/each}

    <!-- Grid value labels along first axis -->
    {#each Array.from({ length: gridLevels }, (_, i) => i + 1) as level}
      {@const max = dimensions[0]?.maxValue ?? 10}
      {@const val = (max / gridLevels) * level}
      <text
        x={cx + 4}
        y={cy - radius * (level / gridLevels) - 3}
        fill={mutedColor()}
        font-size="8"
        font-family="var(--font-mono)"
      >{val}</text>
    {/each}

    <!-- Data polygons -->
    {#each profiles as profile, idx}
      <polygon
        points={profilePoints(profile)}
        fill={profileColor(idx)}
        fill-opacity={0.15}
        stroke={profileColor(idx)}
        stroke-width={2}
      />

      <!-- Data points -->
      {#each dimensions as dim, i}
        {@const max = dim.maxValue ?? 10}
        {@const v = profile.values[dim.key] ?? 0}
        <circle
          cx={pointX(i, v, max)}
          cy={pointY(i, v, max)}
          r={4}
          fill={profileColor(idx)}
        />
      {/each}
    {/each}

    <!-- Dimension labels -->
    {#each dimensions as dim, i}
      <text
        x={labelX(i)}
        y={labelY(i)}
        text-anchor={labelAnchor(i)}
        fill={textColor()}
        font-size="10"
        font-family="var(--font-heading)"
      >{dim.label}</text>
    {/each}
  </svg>

  <!-- Legend -->
  {#if profiles.length > 1}
    <div class="radar-legend">
      {#each profiles as profile, idx}
        <span class="legend-item">
          <span class="legend-swatch" style="background: {profileColor(idx)}"></span>
          {profile.name}
        </span>
      {/each}
    </div>
  {/if}

  <details class="chart-text-alt">
    <summary>Text alternative: {title}</summary>
    <table>
      <thead>
        <tr>
          <th>Dimension</th>
          {#each profiles as profile}
            <th>{profile.name}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each dimensions as dim}
          <tr>
            <td>{dim.label} ({dim.key})</td>
            {#each profiles as profile}
              <td>{profile.values[dim.key] ?? 0}/{dim.maxValue ?? 10}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
</div>

<style>
  .radar-chart-container {
    margin: var(--space-lg) 0;
    max-width: 28rem;
  }

  .radar-chart-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .radar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-top: var(--space-sm);
    font-size: 0.8rem;
    font-family: var(--font-heading);
    color: var(--color-text-muted);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
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
