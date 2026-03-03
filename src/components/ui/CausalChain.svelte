<script lang="ts">
  import chainData from '../../data/causal-chain.json';

  // ── Types ──────────────────────────────────────────────────────────────────

  type NodeType = 'root' | 'composite' | 'hypothesis' | 'survivor' | 'interaction' | 'convergence' | 'speculative';
  type Confidence = 'observed' | 'high' | 'moderate' | 'low';

  interface ChainNode {
    id: string;
    label: string;
    sublabel: string;
    order: number;
    type: NodeType;
    icescr: number[];
    confidence: Confidence;
    score?: number;
    detail?: string;
    parent?: string;
    parents?: string[];
    convergence_with?: string;
    role?: string;
  }

  const nodes = chainData.nodes as ChainNode[];

  // ── Lens prop ──────────────────────────────────────────────────────────────

  interface Props {
    lens?: string;
  }
  let { lens = 'developer' } = $props<Props>();

  // Track body lens and html theme in case they change at runtime
  let activeLens = $state(lens);
  let themeVersion = $state(0);
  $effect(() => {
    function onLensChange() {
      const bodyLens = document.body.getAttribute('data-lens');
      if (bodyLens) activeLens = bodyLens;
    }
    onLensChange();
    const lensObserver = new MutationObserver(onLensChange);
    lensObserver.observe(document.body, { attributes: true, attributeFilter: ['data-lens'] });

    const themeObserver = new MutationObserver(() => { themeVersion++; });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      lensObserver.disconnect();
      themeObserver.disconnect();
    };
  });

  // ── Shared state ───────────────────────────────────────────────────────────

  let selectedNode = $state<ChainNode | null>(null);

  function selectNode(node: ChainNode) {
    selectedNode = selectedNode?.id === node.id ? null : node;
  }

  // ── Accordion (educator / no-JS base) ─────────────────────────────────────

  const byOrder: Record<number, ChainNode[]> = {};
  for (const node of nodes) {
    if (!byOrder[node.order]) byOrder[node.order] = [];
    byOrder[node.order].push(node);
  }
  const orderKeys = Object.keys(byOrder)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((k) => k >= 0);

  const orderLabels: Record<number, string> = {
    0: 'Order 0 — Core Hypotheses',
    1: 'Order 1 — First-Order Effects',
    2: 'Order 2 — Interactions',
    3: 'Order 3 — Convergence',
    4: 'Order 4 — Speculative Frontier',
  };

  let accordionOpen = $state<Record<number, boolean>>({ 0: true, 1: false, 2: false, 3: false, 4: false });

  // ── Flowchart (developer) ──────────────────────────────────────────────────

  let hoveredId = $state<string | null>(null);

  // Nodes by column position for the SVG flowchart
  const orderToY: Record<number, number> = { 0: 80, 1: 200, 2: 340, 3: 460, 4: 560 };
  const svgWidth = 720;
  const svgHeight = 640;

  // Pre-computed x positions per node
  const nodeX: Record<string, number> = {
    'composite-a': 360,
    'h2': 100, 'h3': 220, 'h4': 360, 'h6': 510, 'h7': 630,
    'h2-2': 100, 'h3-2': 200, 'h3-3': 300,
    'h4-1': 390, 'h4-3': 470, 'h4-4': 550,
    'h6-4': 630,
    'int-a': 160, 'int-b': 310, 'int-c': 470, 'int-d': 580,
    'four-scarcities': 360,
    'values-meaning': 360,
  };
  const nodeY: Record<string, number> = {};
  for (const node of nodes) {
    nodeY[node.id] = orderToY[node.order] ?? 80;
  }

  function confidenceOpacity(c: Confidence): number {
    return { observed: 1, high: 0.95, moderate: 0.75, low: 0.5 }[c] ?? 0.7;
  }

  // SSR-safe fallbacks (light theme defaults — matches :root in base.css)
  const ssrFallbacks: Record<string, string> = {
    '--color-node-root': '#263238',
    '--color-node-hypothesis': '#33691e',
    '--color-node-survivor': '#558b2f',
    '--color-node-interaction': '#00695c',
    '--color-node-convergence': '#5c6bc0',
    '--color-node-speculative': '#78909c',
    '--color-node-text': '#ffffff',
  };

  function getCssVar(name: string): string {
    if (typeof document === 'undefined') return ssrFallbacks[name] ?? '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function nodeColor(type: NodeType): string {
    void themeVersion; // reactive dependency on theme changes
    return {
      root: getCssVar('--color-node-root'),
      composite: getCssVar('--color-node-root'),
      hypothesis: getCssVar('--color-node-hypothesis'),
      survivor: getCssVar('--color-node-survivor'),
      interaction: getCssVar('--color-node-interaction'),
      convergence: getCssVar('--color-node-convergence'),
      speculative: getCssVar('--color-node-speculative'),
    }[type] ?? getCssVar('--color-node-speculative');
  }

  function nodeTextColor(): string {
    void themeVersion;
    return getCssVar('--color-node-text');
  }

  function isHighlighted(id: string): boolean {
    if (!hoveredId) return true;
    if (id === hoveredId) return true;
    // Highlight ancestors and descendants
    const ancestors = getAncestors(id);
    const descendants = getDescendants(id);
    return ancestors.has(hoveredId) || descendants.has(hoveredId) || id === hoveredId;
  }

  function getAncestors(id: string): Set<string> {
    const result = new Set<string>();
    const node = nodes.find((n) => n.id === id);
    if (!node) return result;
    const parents = node.parents ?? (node.parent ? [node.parent] : []);
    for (const p of parents) {
      result.add(p);
      for (const a of getAncestors(p)) result.add(a);
    }
    return result;
  }

  function getDescendants(id: string): Set<string> {
    const result = new Set<string>();
    for (const n of nodes) {
      const parents = n.parents ?? (n.parent ? [n.parent] : []);
      if (parents.includes(id)) {
        result.add(n.id);
        for (const d of getDescendants(n.id)) result.add(d);
      }
    }
    return result;
  }

  // Edge paths for the flowchart
  const edges = chainData.edges as { from: string; to: string; note?: string }[];

  function edgePath(from: string, to: string): string {
    const x1 = nodeX[from] ?? 360;
    const y1 = (nodeY[from] ?? 80) + 20;
    const x2 = nodeX[to] ?? 360;
    const y2 = (nodeY[to] ?? 200) - 12;
    const cy = (y1 + y2) / 2;
    return `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`;
  }

  // ── Step-through (researcher) ──────────────────────────────────────────────

  const chains = [
    {
      name: 'Constraint Removal',
      description: 'Software labor cost approaches zero, unlocking previously blocked economic activity.',
      path: ['composite-a', 'h2', 'h2-2', 'int-a', 'four-scarcities', 'values-meaning'],
    },
    {
      name: 'Demand Explosion',
      description: 'Cheaper software creates more demand, hitting physical and human limits.',
      path: ['composite-a', 'h3', 'h3-2', 'h3-3', 'int-c', 'int-b', 'four-scarcities', 'values-meaning'],
    },
    {
      name: 'Bottleneck Migration',
      description: 'New constraints emerge as old ones dissolve — judgment, specification, energy.',
      path: ['composite-a', 'h4', 'h4-1', 'h4-3', 'h4-4', 'int-a', 'int-b', 'four-scarcities', 'values-meaning'],
    },
    {
      name: 'Bifurcation',
      description: 'AI benefits distribute unevenly — the distributional filter on all other effects.',
      path: ['composite-a', 'h7', 'int-d', 'four-scarcities', 'values-meaning'],
    },
    {
      name: 'Quality Modulation',
      description: 'Volume increase degrades average quality, triggering market correction.',
      path: ['composite-a', 'h6', 'h6-4', 'int-b', 'int-c', 'four-scarcities', 'values-meaning'],
    },
  ];

  let currentChainIndex = $state(0);
  let currentStepIndex = $state(0);
  let isPlaying = $state(false);
  let playInterval: ReturnType<typeof setInterval> | null = null;

  const currentChain = $derived(chains[currentChainIndex]);
  const currentStep = $derived(currentChain.path[currentStepIndex]);
  const currentStepNode = $derived(nodes.find((n) => n.id === currentStep) ?? null);
  const visitedSteps = $derived(new Set(currentChain.path.slice(0, currentStepIndex + 1)));

  function advanceStep() {
    if (currentStepIndex < currentChain.path.length - 1) {
      currentStepIndex += 1;
    } else {
      stopPlay();
    }
  }

  function retreatStep() {
    if (currentStepIndex > 0) currentStepIndex -= 1;
  }

  function selectChain(index: number) {
    stopPlay();
    currentChainIndex = index;
    currentStepIndex = 0;
  }

  function startPlay() {
    isPlaying = true;
    playInterval = setInterval(() => {
      if (currentStepIndex < currentChain.path.length - 1) {
        currentStepIndex += 1;
      } else {
        stopPlay();
      }
    }, 1800);
  }

  function stopPlay() {
    isPlaying = false;
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); advanceStep(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); retreatStep(); }
    if (e.key === ' ') { e.preventDefault(); isPlaying ? stopPlay() : startPlay(); }
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════════════════
     ACCORDION — Educator base / no-JS fallback
     ═══════════════════════════════════════════════════════════════════════════ -->
{#if activeLens === 'educator'}
<section class="chain-accordion" aria-label="Causal chain analysis">
  <p class="chain-intro">
    AI economic transformation unfolds through five chains of cause and effect.
    Each chain passes through four orders of analysis, converging on a single finding:
    the ability to evaluate, specify, and curate — the core of what education develops —
    becomes the scarcest resource in the AI economy.
  </p>

  {#each orderKeys as order}
    <div class="accordion-section">
      <button
        class="accordion-header"
        onclick={() => accordionOpen[order] = !accordionOpen[order]}
        aria-expanded={accordionOpen[order]}
        aria-controls={`order-panel-${order}`}
      >
        <span class="accordion-label">{orderLabels[order]}</span>
        <span class="accordion-chevron" aria-hidden="true">{accordionOpen[order] ? '▲' : '▼'}</span>
      </button>

      {#if accordionOpen[order]}
        <div
          id={`order-panel-${order}`}
          class="accordion-panel"
          role="region"
          aria-label={orderLabels[order]}
        >
          {#each byOrder[order] as node}
            <div
              class="accordion-node"
              class:selected={selectedNode?.id === node.id}
              data-type={node.type}
            >
              <button
                class="accordion-node-btn"
                onclick={() => selectNode(node)}
                aria-expanded={selectedNode?.id === node.id}
              >
                <div class="node-header-row">
                  <span class="node-label">{node.label}</span>
                  {#if node.score}
                    <span class="node-score" title="Discriminator score">{node.score}/25</span>
                  {/if}
                  <span class="node-confidence" data-confidence={node.confidence}>{node.confidence}</span>
                </div>
                <p class="node-sublabel">{node.sublabel}</p>
              </button>

              {#if selectedNode?.id === node.id && node.detail}
                <div class="node-detail" role="region" aria-label="Detail: {node.label}">
                  <p>{node.detail}</p>
                  {#if node.icescr.length > 0}
                    <p class="node-icescr">
                      ICESCR connection:
                      {#each node.icescr as art, i}
                        <a href={`/covenant/articles/article-${art}`}>Article {art}</a>{i < node.icescr.length - 1 ? ', ' : ''}
                      {/each}
                    </p>
                  {/if}
                  {#if node.convergence_with}
                    <p class="node-convergence">
                      Converges with <strong>{nodes.find(n => n.id === node.convergence_with)?.label}</strong> — independent paths reaching the same node increases confidence.
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     FLOWCHART — Developer view
     ═══════════════════════════════════════════════════════════════════════════ -->
{:else if activeLens === 'developer'}
<section class="chain-flowchart" aria-label="Causal chain flowchart">
  <p class="chain-intro">
    Hover any node to highlight its chain. Click to view detail.
    Nodes fade when unrelated to the selected path.
  </p>

  <div class="flowchart-wrapper">
    <svg
      viewBox="0 0 {svgWidth} {svgHeight}"
      role="img"
      aria-label="Causal chain diagram: AI capability flows through five hypothesis branches across four orders, converging on the Four Scarcities at Order 3."
      class="flowchart-svg"
    >
      <!-- Edges -->
      <g class="edges" aria-hidden="true">
        {#each edges as edge}
          {@const fromHighlit = isHighlighted(edge.from)}
          {@const toHighlit = isHighlighted(edge.to)}
          {#if nodeX[edge.from] !== undefined && nodeX[edge.to] !== undefined}
            <path
              d={edgePath(edge.from, edge.to)}
              stroke={edge.note === 'convergence' ? 'var(--color-accent)' : 'var(--color-border)'}
              stroke-width={edge.note === 'convergence' ? 2 : 1}
              stroke-dasharray={edge.note === 'convergence' ? 'none' : 'none'}
              fill="none"
              opacity={hoveredId && !fromHighlit && !toHighlit ? 0.15 : 0.6}
              class:convergence-edge={edge.note === 'convergence'}
            />
          {/if}
        {/each}
      </g>

      <!-- Nodes -->
      <g class="nodes">
        {#each nodes as node}
          {#if nodeX[node.id] !== undefined}
            {@const x = nodeX[node.id]}
            {@const y = nodeY[node.id]}
            {@const lit = isHighlighted(node.id)}
            <g
              class="node-group"
              transform="translate({x},{y})"
              role="button"
              tabindex="0"
              aria-label="{node.label}: {node.sublabel}"
              onmouseenter={() => hoveredId = node.id}
              onmouseleave={() => hoveredId = null}
              onclick={() => selectNode(node)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(node); } }}
              opacity={hoveredId && !lit ? 0.2 : confidenceOpacity(node.confidence)}
            >
              {#if node.type === 'convergence' || node.type === 'composite'}
                <!-- Diamond for convergence nodes -->
                <polygon
                  points="0,-18 28,0 0,18 -28,0"
                  fill={selectedNode?.id === node.id ? 'var(--color-accent)' : nodeColor(node.type)}
                  stroke="var(--color-bg)"
                  stroke-width="1.5"
                />
              {:else}
                <!-- Rounded rect for regular nodes -->
                <rect
                  x="-48" y="-14"
                  width="96" height="28"
                  rx="4"
                  fill={selectedNode?.id === node.id ? 'var(--color-accent)' : nodeColor(node.type)}
                  stroke="var(--color-bg)"
                  stroke-width="1.5"
                />
              {/if}
              <text
                text-anchor="middle"
                dy="0.35em"
                fill={nodeTextColor()}
                font-size="9"
                font-family="var(--font-heading)"
                pointer-events="none"
              >
                {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
              </text>
              {#if node.convergence_with}
                <circle cx="44" cy="-10" r="4" fill="var(--color-accent)" />
              {/if}
            </g>
          {/if}
        {/each}
      </g>

      <!-- Order labels -->
      <g class="order-labels" aria-hidden="true">
        {#each orderKeys as order}
          <text
            x="8" y={orderToY[order]}
            font-size="9"
            font-family="var(--font-heading)"
            fill="var(--color-text-muted)"
            dominant-baseline="middle"
          >Ord {order}</text>
        {/each}
      </g>
    </svg>

    <!-- Detail panel -->
    {#if selectedNode}
      <aside class="flowchart-detail" aria-live="polite" aria-label="Node detail">
        <button class="detail-close" onclick={() => selectedNode = null} aria-label="Close detail">×</button>
        <h3>{selectedNode.label}</h3>
        <p class="detail-sublabel">{selectedNode.sublabel}</p>
        {#if selectedNode.score}
          <p class="detail-score">Discriminator: <strong>{selectedNode.score}/25</strong> · {selectedNode.confidence} confidence</p>
        {/if}
        {#if selectedNode.detail}
          <p class="detail-body">{selectedNode.detail}</p>
        {/if}
        {#if selectedNode.icescr.length > 0}
          <div class="detail-icescr">
            <span class="detail-icescr-label">ICESCR:</span>
            {#each selectedNode.icescr as art}
              <a href={`/covenant/articles/article-${art}`} class="detail-article-link">Art. {art}</a>
            {/each}
          </div>
        {/if}
        {#if selectedNode.convergence_with}
          <p class="detail-convergence">
            ★ Converges with <em>{nodes.find(n => n.id === selectedNode?.convergence_with)?.label}</em>
          </p>
        {/if}
      </aside>
    {/if}
  </div>

  <p class="flowchart-legend">
    <span class="legend-dot" style="background: {nodeColor('hypothesis')}"></span> Hypothesis
    <span class="legend-dot" style="background: {nodeColor('interaction')}"></span> Interaction
    <span class="legend-dot" style="background: {nodeColor('convergence')}"></span> Convergence
    <span class="legend-dot" style="background: {nodeColor('speculative')}"></span> Speculative
    <span class="legend-line convergence-legend"></span> Convergent validation
  </p>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     IMPACT NARRATIVE — Voter view (personal framing, action CTA)
     ═══════════════════════════════════════════════════════════════════════════ -->
{:else if activeLens === 'voter'}
<section class="chain-impact" aria-label="How AI affects your economic rights">
  <p class="chain-intro">
    AI-driven economic transformation affects your work, healthcare, education,
    and economic security. The analysis below traces how these effects connect
    to rights that 173 nations protect — and that the United States does not.
  </p>

  <div class="impact-cards">
    <div class="impact-card">
      <h3 class="impact-heading">Your Job</h3>
      <p>AI restructures labor markets. Routine tasks automate; judgment-intensive
        roles grow. Without legal protection for the right to work, market forces
        alone determine who adapts and who falls behind.</p>
      <a href="/covenant/articles/article-6" class="impact-link">Article 6: Right to Work &rarr;</a>
    </div>

    <div class="impact-card">
      <h3 class="impact-heading">Your Healthcare</h3>
      <p>AI creates two-tier healthcare: premium AI diagnostics for those who pay,
        commodity quality for everyone else. Without a legal right to health, no
        standard prevents this stratification.</p>
      <a href="/covenant/articles/article-12" class="impact-link">Article 12: Right to Health &rarr;</a>
    </div>

    <div class="impact-card">
      <h3 class="impact-heading">Your Education</h3>
      <p>Judgment capability — the ability to evaluate, decide, and specify —
        emerges as the economy's scarcest resource. Without a legal right to
        education, the pipeline that develops judgment narrows to those who can
        afford it.</p>
      <a href="/covenant/articles/article-13" class="impact-link">Article 13: Right to Education &rarr;</a>
    </div>

    <div class="impact-card">
      <h3 class="impact-heading">Your Rights to Scientific Progress</h3>
      <p>AI represents the most significant scientific advance of the century.
        Article 15 establishes that everyone holds a legal claim to benefit from
        scientific progress. Without ratification, that claim carries no legal
        force in the United States.</p>
      <a href="/covenant/articles/article-15" class="impact-link">Article 15: Right to Science &rarr;</a>
    </div>
  </div>

  <div class="impact-cta">
    <p>Your economic rights lack binding legal protection. 173 nations committed
      to these protections. The United States signed that commitment in 1977 and
      never followed through.</p>
    <a href="/action" class="impact-action-btn">Contact your senators &rarr;</a>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     EXECUTIVE BRIEF — Politician / legislative staff view
     ═══════════════════════════════════════════════════════════════════════════ -->
{:else if activeLens === 'politician'}
<section class="chain-brief" aria-label="Executive summary: AI and ICESCR">
  <h3 class="brief-header">Executive Summary: AI Economic Transformation and ICESCR</h3>

  <dl class="brief-items">
    <dt>Key Finding</dt>
    <dd>AI functions as narrow superintelligence for software labor, restructuring
      employment, healthcare delivery, education, and economic distribution. Effects
      map directly onto ICESCR Articles 6, 9, 12, 13, and 15.</dd>

    <dt>Fiscal Context</dt>
    <dd>The One Big Beautiful Bill Act (P.L. 119-21) reduced Medicaid by $990 billion,
      removing coverage for 10.9 million Americans during accelerating AI-driven
      economic transition. No binding legal standard prevented this reduction.</dd>

    <dt>International Position</dt>
    <dd>173 nations ratified the ICESCR. The United States signed in 1977 but never
      sought Senate consent. Companion non-ratifiers: Comoros, Cuba, Palau, Andorra.</dd>

    <dt>Precedent</dt>
    <dd>The Senate ratified the ICCPR (civil and political rights) in 1992 with
      reservations. The same approach — ratification with appropriate reservations,
      understandings, and declarations — applies to the ICESCR.</dd>
  </dl>

  <div class="brief-bipartisan">
    <h4>Bipartisan Alignment</h4>
    <p>The ICESCR protects family stability (Art. 10), property and living standards
      (Art. 11) — conservative priorities. It also protects labor rights (Art. 6-7),
      social security (Art. 9), healthcare (Art. 12) — progressive priorities.
      Ratification with standard RUDs creates shared legal infrastructure, not a
      partisan program.</p>
  </div>

  <p class="brief-committee">
    <strong>Jurisdiction:</strong> Senate Foreign Relations Committee. The ICESCR
    has received zero committee hearings since President Carter transmitted it in 1978.
  </p>

  <a href="/action/policy-brief" class="brief-cta">
    Full policy brief with floor-speech talking points &rarr;
  </a>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     STEP-THROUGH — Researcher view (analytical, confidence levels)
     ═══════════════════════════════════════════════════════════════════════════ -->
{:else}
<section
  class="chain-stepthrough"
  aria-label="Animated causal chain step-through"
  onkeydown={handleKeydown}
>
  <p class="chain-intro">
    Walk each causal chain step by step. Use arrow keys or the controls below.
    Confidence degrades with each order — the visualization reflects this.
  </p>

  <!-- Chain selector -->
  <div class="chain-selector" role="tablist" aria-label="Select chain">
    {#each chains as chain, i}
      <button
        role="tab"
        aria-selected={currentChainIndex === i}
        onclick={() => selectChain(i)}
        class="chain-tab"
      >
        {chain.name}
      </button>
    {/each}
  </div>

  <p class="chain-description">{currentChain.description}</p>

  <!-- Step nodes -->
  <div class="step-track" aria-label="Chain steps" role="list">
    {#each currentChain.path as nodeId, stepIdx}
      {@const node = nodes.find((n) => n.id === nodeId)}
      {#if node}
        <div
          class="step-node"
          class:active={stepIdx === currentStepIndex}
          class:visited={visitedSteps.has(nodeId) && stepIdx !== currentStepIndex}
          class:future={!visitedSteps.has(nodeId)}
          role="listitem"
          aria-current={stepIdx === currentStepIndex ? 'step' : undefined}
          style="opacity: {visitedSteps.has(nodeId) ? confidenceOpacity(node.confidence) : 0.3}"
        >
          <div class="step-order-badge">Ord {node.order}</div>
          <div class="step-label">{node.label}</div>
          {#if stepIdx < currentChain.path.length - 1}
            <div class="step-arrow" aria-hidden="true">↓</div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  <!-- Detail panel for current step -->
  {#if currentStepNode}
    <div class="step-detail" aria-live="polite">
      <div class="step-detail-header">
        <h3>{currentStepNode.label}</h3>
        <span class="step-detail-confidence" data-confidence={currentStepNode.confidence}>
          {currentStepNode.confidence} confidence
          {#if currentStepNode.score}· {currentStepNode.score}/25{/if}
        </span>
      </div>
      <p class="step-detail-sublabel">{currentStepNode.sublabel}</p>
      {#if currentStepNode.detail}
        <p class="step-detail-body">{currentStepNode.detail}</p>
      {/if}
      {#if currentStepNode.icescr.length > 0}
        <div class="step-detail-icescr">
          ICESCR connection:
          {#each currentStepNode.icescr as art, i}
            <a href={`/covenant/articles/article-${art}`}>Article {art}</a>{i < currentStepNode.icescr.length - 1 ? ', ' : ''}
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Controls -->
  <div class="step-controls" role="group" aria-label="Navigation controls">
    <button
      onclick={retreatStep}
      disabled={currentStepIndex === 0}
      aria-label="Previous step"
    >← Prev</button>

    <button
      onclick={isPlaying ? stopPlay : startPlay}
      aria-label={isPlaying ? 'Pause auto-advance' : 'Play auto-advance'}
      aria-pressed={isPlaying}
      class="play-btn"
    >
      {isPlaying ? '⏸ Pause' : '▶ Play'}
    </button>

    <button
      onclick={advanceStep}
      disabled={currentStepIndex === currentChain.path.length - 1}
      aria-label="Next step"
    >Next →</button>

    <span class="step-counter">
      Step {currentStepIndex + 1} of {currentChain.path.length}
    </span>
  </div>

  <p class="step-keyboard-hint">Keyboard: ← → arrows navigate · Space plays/pauses</p>
</section>
{/if}

<style>
  /* ── Shared ───────────────────────────────────────────────────────────────── */
  .chain-intro {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-lg);
    max-width: 42rem;
  }

  /* ── Accordion ────────────────────────────────────────────────────────────── */
  .chain-accordion {
    margin: var(--space-xl) 0;
  }

  .accordion-section {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin-bottom: var(--space-sm);
    overflow: hidden;
  }

  .accordion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: var(--space-md) var(--space-lg);
    background: var(--color-surface);
    border: none;
    cursor: pointer;
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-primary);
    text-align: left;
  }

  .accordion-header:hover {
    background: var(--color-surface-alt);
  }

  .accordion-header:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .accordion-chevron {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .accordion-panel {
    padding: var(--space-md) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    background: var(--color-bg);
  }

  .accordion-node {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .accordion-node[data-type="convergence"] {
    border-color: var(--color-primary);
    border-width: 2px;
  }

  .accordion-node[data-type="speculative"] {
    border-style: dashed;
  }

  .accordion-node.selected {
    border-color: var(--color-accent);
  }

  .accordion-node-btn {
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: var(--space-sm) var(--space-md);
  }

  .accordion-node-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .node-header-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .node-label {
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-primary);
  }

  .node-score {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    padding: 0.1em 0.4em;
    background: var(--color-surface-alt);
    border-radius: 3px;
  }

  .node-confidence {
    font-size: 0.7rem;
    font-family: var(--font-heading);
    padding: 0.1em 0.4em;
    border-radius: 3px;
    background: var(--color-surface-alt);
    color: var(--color-text-muted);
  }

  .node-confidence[data-confidence="high"] { color: var(--color-confidence-high); }
  .node-confidence[data-confidence="low"] { color: var(--color-confidence-low); }

  .node-sublabel {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin: var(--space-xs) 0 0;
  }

  .node-detail {
    padding: var(--space-sm) var(--space-md);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .node-detail p { margin: var(--space-xs) 0; }

  .node-icescr a {
    font-family: var(--font-heading);
    font-size: 0.8rem;
  }

  .node-convergence {
    color: var(--color-accent);
    font-style: italic;
  }

  /* ── Flowchart ────────────────────────────────────────────────────────────── */
  .chain-flowchart {
    margin: var(--space-xl) 0;
  }

  .flowchart-wrapper {
    display: grid;
    grid-template-columns: 1fr 260px;
    gap: var(--space-lg);
    align-items: start;
  }

  @media (max-width: 768px) {
    .flowchart-wrapper { grid-template-columns: 1fr; }
  }

  .flowchart-svg {
    width: 100%;
    height: auto;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    cursor: pointer;
  }

  .node-group {
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .flowchart-detail {
    position: sticky;
    top: var(--space-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    padding: var(--space-md);
    font-size: 0.8rem;
  }

  .detail-close {
    float: right;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--color-text-muted);
    line-height: 1;
  }

  .detail-close:focus-visible {
    outline: 2px solid var(--color-accent);
    border-radius: 2px;
  }

  .flowchart-detail h3 {
    font-size: 0.875rem;
    margin-top: 0;
    margin-bottom: var(--space-xs);
    margin-right: var(--space-lg);
  }

  .detail-sublabel {
    color: var(--color-text-muted);
    font-style: italic;
    margin-bottom: var(--space-sm);
  }

  .detail-score {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .detail-body { line-height: 1.55; }

  .detail-icescr {
    margin-top: var(--space-sm);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    align-items: center;
  }

  .detail-icescr-label {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .detail-article-link {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    padding: 0.1em 0.4em;
    background: var(--color-surface-alt);
    border-radius: 3px;
    text-decoration: none;
  }

  .detail-convergence {
    color: var(--color-accent);
    font-style: italic;
    margin-top: var(--space-sm);
  }

  .flowchart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: var(--font-heading);
    margin-top: var(--space-md);
    align-items: center;
  }

  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 4px;
  }

  .legend-line {
    display: inline-block;
    width: 24px;
    height: 2px;
    margin-right: 4px;
    vertical-align: middle;
  }

  .convergence-legend {
    background: var(--color-accent);
  }

  /* ── Impact Narrative (Voter) ────────────────────────────────────────────── */
  .chain-impact {
    margin: var(--space-xl) 0;
  }

  .impact-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .impact-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .impact-heading {
    font-size: 1rem;
    margin: 0;
    color: var(--color-heading);
  }

  .impact-card p {
    font-size: 0.875rem;
    line-height: 1.55;
    margin: 0;
    flex: 1;
  }

  .impact-link {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    color: var(--color-accent);
    text-decoration: none;
    border-bottom: 1px solid currentColor;
    align-self: flex-start;
  }

  .impact-cta {
    background: var(--color-surface-alt);
    border-left: 3px solid var(--color-accent);
    border-radius: 0 4px 4px 0;
    padding: var(--space-lg);
    margin-top: var(--space-lg);
  }

  .impact-cta p {
    font-size: 0.9rem;
    margin: 0 0 var(--space-md);
  }

  .impact-action-btn {
    display: inline-block;
    font-family: var(--font-heading);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-bg);
    background: var(--color-accent);
    padding: var(--space-sm) var(--space-lg);
    border-radius: 4px;
    text-decoration: none;
    transition: opacity 0.15s;
  }

  .impact-action-btn:hover {
    opacity: 0.85;
  }

  /* ── Executive Brief (Politician) ──────────────────────────────────────── */
  .chain-brief {
    margin: var(--space-xl) 0;
    max-width: 42rem;
  }

  .brief-header {
    font-size: 1.1rem;
    margin-top: 0;
    margin-bottom: var(--space-lg);
    color: var(--color-primary);
  }

  .brief-items {
    margin: 0 0 var(--space-lg);
    font-size: 0.875rem;
  }

  .brief-items dt {
    font-weight: 600;
    font-family: var(--font-heading);
    font-size: 0.8rem;
    color: var(--color-primary);
    margin-top: var(--space-md);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .brief-items dt:first-child {
    margin-top: 0;
  }

  .brief-items dd {
    margin: var(--space-xs) 0 0;
    line-height: 1.55;
  }

  .brief-bipartisan {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: var(--space-md) var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .brief-bipartisan h4 {
    font-size: 0.875rem;
    margin: 0 0 var(--space-sm);
    color: var(--color-heading);
  }

  .brief-bipartisan p {
    font-size: 0.8rem;
    line-height: 1.55;
    margin: 0;
  }

  .brief-committee {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-lg);
  }

  .brief-cta {
    display: inline-block;
    font-family: var(--font-heading);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-bg);
    background: var(--color-primary);
    padding: var(--space-sm) var(--space-lg);
    border-radius: 4px;
    text-decoration: none;
    transition: opacity 0.15s;
  }

  .brief-cta:hover {
    opacity: 0.85;
  }

  /* ── Step-through ─────────────────────────────────────────────────────────── */
  .chain-stepthrough {
    margin: var(--space-xl) 0;
  }

  .chain-selector {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
  }

  .chain-tab {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all 0.15s;
  }

  .chain-tab:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .chain-tab[aria-selected="true"] {
    background: var(--color-primary);
    color: var(--color-bg);
    border-color: var(--color-primary);
  }

  .chain-tab:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .chain-description {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-lg);
    font-style: italic;
  }

  .step-track {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: var(--space-lg);
    max-width: 32rem;
  }

  .step-node {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
    transition: opacity 0.4s;
    padding: var(--space-xs) 0;
  }

  .step-order-badge {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
    letter-spacing: 0.05em;
  }

  .step-label {
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.9rem;
    padding: var(--space-xs) var(--space-md);
    border-radius: 4px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    transition: all 0.3s;
  }

  .step-node.active .step-label {
    background: var(--color-primary);
    color: var(--color-bg);
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, var(--shadow-opacity));
  }

  .step-node.visited .step-label {
    background: var(--color-surface-alt);
    color: var(--color-text-muted);
  }

  .step-arrow {
    color: var(--color-border);
    font-size: 1rem;
    padding-left: var(--space-md);
  }

  .step-detail {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-accent);
    border-radius: 4px;
    padding: var(--space-md) var(--space-lg);
    margin-bottom: var(--space-lg);
    max-width: 42rem;
    font-size: 0.875rem;
  }

  .step-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-bottom: var(--space-xs);
  }

  .step-detail-header h3 {
    font-size: 0.95rem;
    margin: 0;
  }

  .step-detail-confidence {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .step-detail-confidence[data-confidence="high"] { color: var(--color-confidence-high); }
  .step-detail-confidence[data-confidence="low"] { color: var(--color-confidence-low); }

  .step-detail-sublabel {
    color: var(--color-text-muted);
    font-style: italic;
    margin-bottom: var(--space-sm);
  }

  .step-detail-body { line-height: 1.55; }

  .step-detail-icescr {
    margin-top: var(--space-sm);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .step-detail-icescr a {
    margin-left: var(--space-xs);
  }

  .step-controls {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: var(--space-sm);
  }

  .step-controls button {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    padding: var(--space-xs) var(--space-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text);
    transition: all 0.15s;
  }

  .step-controls button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .step-controls button:not(:disabled):hover {
    border-color: var(--color-primary);
  }

  .step-controls button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .play-btn[aria-pressed="true"] {
    background: var(--color-primary);
    color: var(--color-bg);
    border-color: var(--color-primary);
  }

  .step-counter {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .step-keyboard-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: var(--font-heading);
  }
</style>
