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

  const lenses = ['developer', 'educator', 'researcher'];

  function applyLens(lens: string) {
    document.body.setAttribute('data-lens', lens);
    const announcer = document.getElementById('lens-announcer');
    if (announcer) {
      announcer.textContent = `Viewing as ${lens}`;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const currentIndex = lenses.indexOf(activeLens);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % lenses.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + lenses.length) % lenses.length;
    } else {
      return;
    }

    setLens(lenses[nextIndex]);
    const container = (event.currentTarget as HTMLElement).closest('.lens-toggle');
    const buttons = container?.querySelectorAll('button');
    (buttons?.[nextIndex] as HTMLElement)?.focus();
  }

  $effect(() => {
    init();
  });
</script>

<div class="lens-toggle" role="radiogroup" aria-label="Content perspective">
  <button
    onclick={() => setLens('developer')}
    onkeydown={handleKeydown}
    role="radio"
    aria-checked={activeLens === 'developer'}
    tabindex={activeLens === 'developer' ? 0 : -1}
  >
    Developer
  </button>
  <button
    onclick={() => setLens('educator')}
    onkeydown={handleKeydown}
    role="radio"
    aria-checked={activeLens === 'educator'}
    tabindex={activeLens === 'educator' ? 0 : -1}
  >
    Educator
  </button>
  <button
    onclick={() => setLens('researcher')}
    onkeydown={handleKeydown}
    role="radio"
    aria-checked={activeLens === 'researcher'}
    tabindex={activeLens === 'researcher' ? 0 : -1}
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
