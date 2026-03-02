<script lang="ts">
  let activeLens = $state('developer');

  function init() {
    // Priority: URL param > sessionStorage > localStorage > default
    const url = new URL(window.location.href);
    const urlLens = url.searchParams.get('lens');
    if (urlLens && isValidLens(urlLens)) {
      activeLens = urlLens;
    } else {
      const session = sessionStorage.getItem('unratified-lens');
      const local = localStorage.getItem('unratified-lens');
      if (session && isValidLens(session)) {
        activeLens = session;
      } else if (local && isValidLens(local)) {
        activeLens = local;
      }
    }
    applyLens(activeLens);
  }

  function isValidLens(value: string): boolean {
    return ['developer', 'educator', 'researcher'].includes(value);
  }

  function setLens(lens: string) {
    activeLens = lens;
    localStorage.setItem('unratified-lens', lens);
    sessionStorage.setItem('unratified-lens', lens);
    applyLens(lens);
  }

  function applyLens(lens: string) {
    document.body.setAttribute('data-lens', lens);
    // Announce to screen readers
    const announcer = document.getElementById('lens-announcer');
    if (announcer) {
      announcer.textContent = `Viewing as ${lens}`;
    }
  }

  $effect(() => {
    init();
  });
</script>

<div class="lens-toggle" role="radiogroup" aria-label="Content perspective">
  <button
    onclick={() => setLens('developer')}
    aria-pressed={activeLens === 'developer'}
    role="radio"
    aria-checked={activeLens === 'developer'}
  >
    Developer
  </button>
  <button
    onclick={() => setLens('educator')}
    aria-pressed={activeLens === 'educator'}
    role="radio"
    aria-checked={activeLens === 'educator'}
  >
    Educator
  </button>
  <button
    onclick={() => setLens('researcher')}
    aria-pressed={activeLens === 'researcher'}
    role="radio"
    aria-checked={activeLens === 'researcher'}
  >
    Researcher
  </button>
</div>
<div id="lens-announcer" class="sr-only" aria-live="polite"></div>

<style>
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
</style>
