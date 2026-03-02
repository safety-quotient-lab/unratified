<script lang="ts">
  import { geoNaturalEarth1, geoPath } from 'd3-geo';
  import type { GeoPermissibleObjects } from 'd3-geo';
  import ratificationData from '../../data/ratification-status.json';

  let svgElement = $state<SVGSVGElement | null>(null);
  let width = $state(960);
  let height = $state(500);
  let countries = $state<any[]>([]);
  let hoveredCountry = $state<string | null>(null);
  let loaded = $state(false);

  const ratifiedSet = new Set(ratificationData.ratified);
  const signedNotRatifiedSet = new Set(ratificationData.signed_not_ratified);

  const projection = geoNaturalEarth1()
    .scale(155)
    .translate([width / 2, height / 2]);

  const pathGenerator = geoPath(projection);

  function getStatus(numericId: number): 'ratified' | 'signed' | 'not_party' {
    if (ratifiedSet.has(numericId)) return 'ratified';
    if (signedNotRatifiedSet.has(numericId)) return 'signed';
    return 'not_party';
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'ratified': return '#4a7c59';
      case 'signed': return '#c44e3f';
      case 'not_party': return '#8b8b8b';
      default: return '#d4d0c8';
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'ratified': return 'Ratified';
      case 'signed': return 'Signed, not ratified';
      case 'not_party': return 'Not a party';
      default: return 'Unknown';
    }
  }

  async function loadMap() {
    try {
      const topoResponse = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const topology = await topoResponse.json();

      // Import topojson-client dynamically to keep initial bundle small
      const topojson = await import('topojson-client');
      const geojson = topojson.feature(topology, topology.objects.countries);
      countries = (geojson as any).features;
      loaded = true;
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  }

  function handleResize() {
    if (!svgElement?.parentElement) return;
    const containerWidth = svgElement.parentElement.clientWidth;
    width = Math.min(containerWidth, 960);
    height = width * 0.52;
    projection.scale(width / 6.2).translate([width / 2, height / 2]);
  }

  $effect(() => {
    loadMap();
    handleResize();

    const observer = new ResizeObserver(() => handleResize());
    if (svgElement?.parentElement) {
      observer.observe(svgElement.parentElement);
    }

    return () => observer.disconnect();
  });
</script>

<div class="map-container">
  <div class="map-legend">
    <span class="legend-item">
      <span class="legend-swatch" style="background: #4a7c59"></span>
      Ratified ({ratificationData.summary.ratified})
    </span>
    <span class="legend-item">
      <span class="legend-swatch" style="background: #c44e3f"></span>
      Signed, not ratified ({ratificationData.summary.signed_not_ratified})
    </span>
    <span class="legend-item">
      <span class="legend-swatch" style="background: #8b8b8b"></span>
      Not a party ({ratificationData.summary.not_party})
    </span>
  </div>

  {#if !loaded}
    <div class="map-loading" role="status">
      <p>Loading map data…</p>
    </div>
  {/if}

  <svg
    bind:this={svgElement}
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label="World map showing ICESCR ratification status. {ratificationData.summary.ratified} nations have ratified, {ratificationData.summary.signed_not_ratified} signed but not ratified including the United States, and {ratificationData.summary.not_party} have not signed."
    class:loaded
  >
    <g>
      {#each countries as country}
        {@const status = getStatus(Number(country.id))}
        {@const d = pathGenerator(country as GeoPermissibleObjects)}
        {#if d}
          <path
            {d}
            fill={statusColor(status)}
            stroke="#002d38"
            stroke-width="0.5"
            role="presentation"
            onmouseenter={() => { hoveredCountry = `${country.properties?.name ?? 'Unknown'}: ${statusLabel(status)}`; }}
            onmouseleave={() => { hoveredCountry = null; }}
          />
        {/if}
      {/each}
    </g>
  </svg>

  {#if hoveredCountry}
    <div class="map-tooltip" role="status" aria-live="polite">
      {hoveredCountry}
    </div>
  {/if}

  <details class="map-text-alt">
    <summary>Text alternative: ICESCR ratification status</summary>
    <p>
      Of 193 United Nations member states, {ratificationData.summary.ratified} have ratified the ICESCR.
      {ratificationData.summary.signed_not_ratified} nations — including the United States — signed
      but never ratified. {ratificationData.summary.not_party} have neither signed nor ratified.
    </p>
    <p>
      The United States stands as the most prominent non-ratifier. Among developed democracies,
      it remains the only nation that has not ratified the Covenant.
    </p>
  </details>
</div>

<style>
  .map-container {
    margin: var(--space-xl) 0;
  }

  .map-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
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
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }

  svg {
    width: 100%;
    height: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .map-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  .map-tooltip {
    font-family: var(--font-heading);
    font-size: 0.8rem;
    padding: var(--space-xs) var(--space-sm);
    margin-top: var(--space-xs);
    color: var(--color-text-muted);
  }

  .map-text-alt {
    margin-top: var(--space-md);
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .map-text-alt summary {
    cursor: pointer;
    font-family: var(--font-heading);
    font-size: 0.8rem;
  }

  .map-text-alt p {
    margin-top: var(--space-sm);
  }
</style>
