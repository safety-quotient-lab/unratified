<script lang="ts">
  import {
    PIPELINE_STEPS,
    CONGRESS_STATUS,
    NATIONS_RATIFIED,
    UN_MEMBER_STATES,
    yearsSinceSigning,
    currentStepIndex,
    nextRequiredStep,
    type PipelineStep,
    type StepStatus,
  } from '../../data/legislative-status';

  let themeVersion = $state(0);

  // SSR-safe color fallbacks (light theme)
  const ssrFallbacks: Record<string, string> = {
    '--color-tracker-complete': '#558b2f',
    '--color-tracker-stalled': '#f9a825',
    '--color-tracker-pending': '#eceff1',
    '--color-tracker-line': '#cfd8dc',
    '--color-text': '#37474f',
    '--color-text-muted': '#78909c',
    '--color-border': '#cfd8dc',
    '--color-accent': '#00695c',
    '--color-surface': '#ffffff',
    '--color-surface-alt': '#eceff1',
    '--color-heading': '#33691e',
    '--color-primary': '#263238',
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

  // Pipeline layout constants
  const SVG_WIDTH = 600;
  const SVG_HEIGHT = 140;
  const NODE_RADIUS = 20;
  const NODE_Y = 55;
  const LABEL_Y = 95;
  const BADGE_Y = 28;

  const stepCount = PIPELINE_STEPS.length;
  const nodeXPositions = PIPELINE_STEPS.map((_, i) => {
    const margin = 60;
    return margin + (i * (SVG_WIDTH - margin * 2)) / (stepCount - 1);
  });

  const activeIdx = currentStepIndex();

  function nodeColor(status: StepStatus): string {
    void themeVersion;
    switch (status) {
      case 'completed': return getCssVar('--color-tracker-complete');
      case 'stalled':   return getCssVar('--color-tracker-stalled');
      case 'pending':   return getCssVar('--color-tracker-pending');
    }
  }

  function nodeStroke(status: StepStatus): string {
    void themeVersion;
    switch (status) {
      case 'completed': return getCssVar('--color-tracker-complete');
      case 'stalled':   return getCssVar('--color-tracker-stalled');
      case 'pending':   return getCssVar('--color-tracker-line');
    }
  }

  function nodeTextColor(status: StepStatus): string {
    void themeVersion;
    if (status === 'pending') return getCssVar('--color-text-muted');
    return '#ffffff';
  }

  function lineStyle(fromIdx: number): string {
    const from = PIPELINE_STEPS[fromIdx];
    const to = PIPELINE_STEPS[fromIdx + 1];
    if (from.status === 'completed' && to.status === 'completed') return 'solid';
    if (from.status === 'stalled' || to.status === 'stalled') return 'dashed';
    return 'dotted';
  }

  function lineDashArray(style: string): string {
    if (style === 'solid') return 'none';
    if (style === 'dashed') return '6 3';
    return '2 3';
  }

  function lineColor(fromIdx: number): string {
    void themeVersion;
    const style = lineStyle(fromIdx);
    if (style === 'solid') return getCssVar('--color-tracker-complete');
    return getCssVar('--color-tracker-line');
  }

  function checkmarkPath(cx: number, cy: number): string {
    const s = 7;
    return `M ${cx - s * 0.5} ${cy} L ${cx - s * 0.1} ${cy + s * 0.5} L ${cx + s * 0.6} ${cy - s * 0.5}`;
  }

  function textColor(): string {
    void themeVersion;
    return getCssVar('--color-text');
  }

  function mutedColor(): string {
    void themeVersion;
    return getCssVar('--color-text-muted');
  }

  function accentColor(): string {
    void themeVersion;
    return getCssVar('--color-accent');
  }

  function headingColor(): string {
    void themeVersion;
    return getCssVar('--color-heading');
  }

  function stalledBadgeColor(): string {
    void themeVersion;
    return getCssVar('--color-tracker-stalled');
  }

  const yearsAgo = yearsSinceSigning();
  const nextStep = nextRequiredStep();

  function ariaLabel(): string {
    return (
      `ICESCR ratification pipeline: Step 1, Presidential Signature, completed 1977. ` +
      `Step 2, Senate Foreign Relations Committee, stalled since 1978. ` +
      `Steps 3 and 4, Senate Vote and Ratification, pending. ` +
      `The U.S. signed ${yearsAgo} years ago and has not ratified.`
    );
  }
</script>

<div class="status-tracker">
  <!-- Pipeline SVG -->
  <svg
    viewBox="0 0 {SVG_WIDTH} {SVG_HEIGHT}"
    role="img"
    aria-label={ariaLabel()}
    class="tracker-svg"
  >
    <!-- Connector lines -->
    {#each PIPELINE_STEPS.slice(0, -1) as _step, i}
      {@const x1 = nodeXPositions[i] + NODE_RADIUS}
      {@const x2 = nodeXPositions[i + 1] - NODE_RADIUS}
      {@const style = lineStyle(i)}
      {@const dash = lineDashArray(style)}
      <line
        x1={x1}
        y1={NODE_Y}
        x2={x2}
        y2={NODE_Y}
        stroke={lineColor(i)}
        stroke-width="2"
        stroke-dasharray={dash === 'none' ? undefined : dash}
      />
    {/each}

    <!-- Nodes -->
    {#each PIPELINE_STEPS as step, i}
      {@const cx = nodeXPositions[i]}

      <!-- Node circle -->
      <circle
        cx={cx}
        cy={NODE_Y}
        r={NODE_RADIUS}
        fill={nodeColor(step.status)}
        stroke={nodeStroke(step.status)}
        stroke-width="2"
      />

      <!-- Completed: checkmark -->
      {#if step.status === 'completed'}
        <path
          d={checkmarkPath(cx, NODE_Y)}
          fill="none"
          stroke="#ffffff"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {:else if step.status === 'stalled'}
        <!-- Stalled: hatched pattern + step number -->
        <defs>
          <pattern
            id="hatch-{i}"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" />
          </pattern>
          <clipPath id="clip-{i}">
            <circle cx={cx} cy={NODE_Y} r={NODE_RADIUS - 1} />
          </clipPath>
        </defs>
        <circle
          cx={cx}
          cy={NODE_Y}
          r={NODE_RADIUS - 1}
          fill="url(#hatch-{i})"
          clip-path="url(#clip-{i})"
        />
        <!-- Step number -->
        <text
          x={cx}
          y={NODE_Y + 5}
          text-anchor="middle"
          fill={nodeTextColor(step.status)}
          font-size="13"
          font-weight="700"
          font-family="var(--font-heading)"
        >{i + 1}</text>
        <!-- STALLED badge above node -->
        <text
          x={cx}
          y={BADGE_Y}
          text-anchor="middle"
          fill={stalledBadgeColor()}
          font-size="8"
          font-weight="700"
          font-family="var(--font-heading)"
          letter-spacing="0.06em"
        >STALLED</text>
      {:else}
        <!-- Pending: step number -->
        <text
          x={cx}
          y={NODE_Y + 5}
          text-anchor="middle"
          fill={mutedColor()}
          font-size="13"
          font-weight="700"
          font-family="var(--font-heading)"
        >{i + 1}</text>
      {/if}

      <!-- Short label below node -->
      <text
        x={cx}
        y={LABEL_Y}
        text-anchor="middle"
        fill={step.status === 'pending' ? mutedColor() : textColor()}
        font-size="10"
        font-family="var(--font-heading)"
      >{step.shortLabel}</text>

      <!-- Date under label for completed/stalled -->
      {#if step.dates.completed}
        <text
          x={cx}
          y={LABEL_Y + 14}
          text-anchor="middle"
          fill={mutedColor()}
          font-size="9"
          font-family="var(--font-mono)"
        >{step.dates.completed.slice(0, 4)}</text>
      {:else if step.dates.stalledSince}
        <text
          x={cx}
          y={LABEL_Y + 14}
          text-anchor="middle"
          fill={mutedColor()}
          font-size="9"
          font-family="var(--font-mono)"
        >since {step.dates.stalledSince.slice(0, 4)}</text>
      {/if}
    {/each}
  </svg>

  <!-- Metrics panel -->
  <div class="tracker-metrics">
    <div class="metric">
      <span class="metric-value">{yearsAgo}</span>
      <span class="metric-label">Years since signing</span>
    </div>
    <div class="metric">
      <span class="metric-value">{NATIONS_RATIFIED} <span class="metric-denom">/ {UN_MEMBER_STATES}</span></span>
      <span class="metric-label">Nations ratified</span>
    </div>
    <div class="metric metric--wide">
      <span class="metric-label metric-label--lead">119th Congress status</span>
      <span class="metric-status">{CONGRESS_STATUS.lastAction}</span>
    </div>
    <div class="metric metric--wide">
      <span class="metric-label metric-label--lead">Next required step</span>
      <span class="metric-status metric-status--highlight">{nextStep}</span>
    </div>
  </div>

  <!-- Text alternative -->
  <details class="tracker-text-alt">
    <summary>Text alternative: ICESCR ratification pipeline</summary>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Step</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {#each PIPELINE_STEPS as step, i}
          <tr>
            <td>{i + 1}</td>
            <td>{step.label}</td>
            <td style="text-transform: capitalize">{step.status}</td>
            <td>
              {step.dates.completed ?? (step.dates.stalledSince ? `Stalled since ${step.dates.stalledSince.slice(0, 4)}` : '—')}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--color-text-muted);">
      {NATIONS_RATIFIED} of {UN_MEMBER_STATES} UN member states have ratified. The U.S. signed {yearsAgo} years ago.
    </p>
  </details>
</div>

<style>
  .status-tracker {
    margin: var(--space-lg) 0;
  }

  .tracker-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  /* Metrics panel */
  .tracker-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin-top: var(--space-lg);
    padding: var(--space-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .metric--wide {
    grid-column: 1 / -1;
  }

  .metric-value {
    font-family: var(--font-heading);
    font-size: 1.618rem;
    font-weight: 700;
    color: var(--color-accent);
    line-height: 1;
  }

  .metric-denom {
    font-size: 1rem;
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: var(--font-heading);
  }

  .metric-label--lead {
    font-weight: 600;
    color: var(--color-primary);
  }

  .metric-status {
    font-size: 0.875rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  .metric-status--highlight {
    color: var(--color-heading);
    font-weight: 600;
  }

  /* Text alternative */
  .tracker-text-alt {
    margin-top: var(--space-md);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .tracker-text-alt summary {
    cursor: pointer;
    font-family: var(--font-heading);
    font-size: 0.8rem;
  }

  .tracker-text-alt table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--space-sm);
    font-size: 0.8rem;
  }

  .tracker-text-alt th,
  .tracker-text-alt td {
    padding: var(--space-xs) var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  .tracker-text-alt th {
    font-weight: 600;
    font-family: var(--font-heading);
    color: var(--color-primary);
  }

  @media (max-width: 480px) {
    .tracker-metrics {
      grid-template-columns: 1fr;
    }

    .metric--wide {
      grid-column: 1;
    }
  }
</style>
