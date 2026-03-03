<script lang="ts">
  interface TimelineEvent {
    year: number;
    label: string;
    detail: string;
    type: 'signing' | 'inaction' | 'opposition' | 'context';
  }

  const events: TimelineEvent[] = [
    { year: 1948, label: 'UDHR Adopted', detail: 'Universal Declaration of Human Rights adopted by UN General Assembly. Establishes economic, social, and cultural rights alongside civil and political rights.', type: 'context' },
    { year: 1966, label: 'ICESCR Adopted', detail: 'International Covenant on Economic, Social and Cultural Rights adopted by UN General Assembly, splitting the UDHR into two binding treaties.', type: 'context' },
    { year: 1976, label: 'ICESCR Enters Force', detail: 'After 35 nations ratify, the ICESCR becomes binding international law. The U.S. has not signed.', type: 'context' },
    { year: 1977, label: 'Carter Signs ICESCR', detail: 'President Carter signs the ICESCR on October 5, 1977. On February 23, 1978, transmits it to the Senate alongside the ICCPR, CERD, and the American Convention on Human Rights.', type: 'signing' },
    { year: 1979, label: 'SFRC Hearings', detail: 'Senate Foreign Relations Committee holds hearings on the ICESCR (November 14–16 and 19, 1979, 96th Congress). The Iran hostage crisis diverts congressional attention; the committee never advances the treaty to a vote.', type: 'context' },
    { year: 1981, label: 'Reagan Administration', detail: 'Reagan administration opposes ICESCR ratification. Ambassador Jeane Kirkpatrick argues economic and social rights represent "letters to Santa Claus." The administration deletes ESCR coverage from State Department annual human rights reports.', type: 'opposition' },
    { year: 1989, label: 'Bush Administration', detail: 'George H.W. Bush administration does not pursue ICESCR ratification. Focus remains on ICCPR, which the Senate ratifies in 1992 with significant reservations.', type: 'inaction' },
    { year: 1992, label: 'ICCPR Ratified', detail: 'Senate ratifies the International Covenant on Civil and Political Rights (the ICESCR\'s twin treaty) with reservations, understandings, and declarations. ICESCR receives no parallel action.', type: 'context' },
    { year: 1993, label: 'Clinton Administration', detail: 'Clinton administration expresses support for ICESCR ratification but never prioritizes Senate action. Other treaties and domestic legislation consume political capital.', type: 'inaction' },
    { year: 2001, label: 'Bush Administration', detail: 'George W. Bush administration does not pursue ICESCR ratification. Post-9/11 foreign policy priorities dominate.', type: 'inaction' },
    { year: 2009, label: 'Obama Administration', detail: 'Obama administration prioritizes CEDAW and CRPD over the ICESCR. At the 2010 and 2015 Universal Periodic Reviews, multiple countries recommend ICESCR ratification; the U.S. declines to commit. ACA advances Article 12 goals domestically.', type: 'inaction' },
    { year: 2017, label: 'Trump Administration', detail: 'Trump administration withdraws from multiple international agreements and bodies. ICESCR ratification receives no consideration.', type: 'opposition' },
    { year: 2021, label: 'Biden Administration', detail: 'Biden administration re-engages with international institutions but does not prioritize ICESCR ratification. Other treaties take precedence.', type: 'inaction' },
    { year: 2025, label: 'EO 14199 + OBBBA', detail: 'Executive Order 14199 (Feb 2025) orders review of all US treaties. One Big Beautiful Bill Act (July 2025) slashes $990B (gross) from Medicaid, eliminates coverage for ~10M Americans. The absence of binding economic rights framework leaves no structural recourse.', type: 'context' },
    { year: 2026, label: '49 Years Since Signing', detail: 'Nearly five decades after President Carter signed the ICESCR, the Senate has never held a ratification vote. AI-driven economic transformation makes the gap observable in new ways.', type: 'context' },
  ];

  let expandedIndex = $state<number | null>(null);

  function toggle(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(index);
    }
  }

  function typeColor(type: TimelineEvent['type']): string {
    switch (type) {
      case 'signing': return 'var(--color-accent)';
      case 'inaction': return 'var(--color-text-muted)';
      case 'opposition': return 'var(--color-primary)';
      case 'context': return 'var(--color-accent-light)';
    }
  }

  function typeLabel(type: TimelineEvent['type']): string {
    switch (type) {
      case 'signing': return 'Action taken';
      case 'inaction': return 'No action';
      case 'opposition': return 'Active opposition';
      case 'context': return 'Context';
    }
  }
</script>

<div class="timeline-container" role="list" aria-label="ICESCR ratification timeline">
  <div class="timeline-legend">
    <span class="legend-item"><span class="legend-dot" style="background: var(--color-accent)"></span> Action taken</span>
    <span class="legend-item"><span class="legend-dot" style="background: var(--color-text-muted)"></span> No action</span>
    <span class="legend-item"><span class="legend-dot" style="background: var(--color-primary)"></span> Active opposition</span>
    <span class="legend-item"><span class="legend-dot" style="background: var(--color-accent-light)"></span> Context</span>
  </div>

  <div class="timeline-line">
    {#each events as event, i}
      <div
        class="timeline-event"
        class:expanded={expandedIndex === i}
        role="listitem"
      >
        <button
          class="event-marker"
          onclick={() => toggle(i)}
          onkeydown={(e) => handleKeydown(e, i)}
          aria-expanded={expandedIndex === i}
          aria-label="{event.year}: {event.label}"
          style="border-color: {typeColor(event.type)}"
        >
          <span class="event-year">{event.year}</span>
          <span class="event-dot" style="background: {typeColor(event.type)}"></span>
          <span class="event-label">{event.label}</span>
        </button>

        {#if expandedIndex === i}
          <div class="event-detail" role="region" aria-label="Details for {event.year}">
            <span class="event-type-badge" style="color: {typeColor(event.type)}">{typeLabel(event.type)}</span>
            <p>{event.detail}</p>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .timeline-container {
    margin: var(--space-xl) 0;
  }

  .timeline-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
    font-size: 0.8rem;
    font-family: var(--font-heading);
    color: var(--color-text-muted);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .timeline-line {
    position: relative;
    padding-left: 2rem;
  }

  .timeline-line::before {
    content: '';
    position: absolute;
    left: 0.6rem;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-border);
  }

  .timeline-event {
    position: relative;
    margin-bottom: var(--space-md);
  }

  .event-marker {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-text);
    padding: var(--space-xs) var(--space-sm);
    border-radius: 4px;
    transition: background-color 0.15s;
    text-align: left;
    width: 100%;
  }

  .event-marker:hover {
    background: var(--color-surface-alt);
  }

  .event-marker:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .event-dot {
    position: absolute;
    left: -1.65rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .event-year {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 0.875rem;
    min-width: 3rem;
    color: var(--color-primary);
  }

  .event-label {
    font-weight: 500;
  }

  .event-detail {
    margin-left: 3.8rem;
    margin-top: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .event-detail p {
    margin: var(--space-xs) 0 0;
  }

  .event-type-badge {
    font-family: var(--font-heading);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @media (max-width: 768px) {
    .event-detail {
      margin-left: 0;
      margin-top: var(--space-sm);
    }
  }
</style>
