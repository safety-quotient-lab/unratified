<script lang="ts">
  let activeTheme = $state('light');

  const themes = ['light', 'dark'] as const;

  function init() {
    // Priority: URL param > localStorage > light (D018: light default)
    const url = new URL(window.location.href);
    const urlTheme = url.searchParams.get('theme');
    if (urlTheme && isValidTheme(urlTheme)) {
      activeTheme = urlTheme;
    } else {
      const stored = localStorage.getItem('unratified-theme');
      if (stored && isValidTheme(stored)) {
        activeTheme = stored;
      }
    }
    applyTheme(activeTheme);
  }

  function isValidTheme(value: string): boolean {
    return themes.includes(value as typeof themes[number]);
  }

  function setTheme(theme: string) {
    activeTheme = theme;
    localStorage.setItem('unratified-theme', theme);
    applyTheme(theme);
  }

  function applyTheme(theme: string) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#002d38' : '#fafafa');
    }
    const announcer = document.getElementById('theme-announcer');
    if (announcer) {
      announcer.textContent = `Switched to ${theme} theme`;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const currentIndex = themes.indexOf(activeTheme as typeof themes[number]);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % themes.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + themes.length) % themes.length;
    } else {
      return;
    }

    setTheme(themes[nextIndex]);
    const container = (event.currentTarget as HTMLElement).closest('.theme-toggle');
    const buttons = container?.querySelectorAll('button');
    (buttons?.[nextIndex] as HTMLElement)?.focus();
  }

  $effect(() => {
    init();
  });
</script>

<div class="theme-toggle" role="radiogroup" aria-label="Color theme">
  {#each themes as theme}
    <button
      onclick={() => setTheme(theme)}
      onkeydown={handleKeydown}
      role="radio"
      aria-checked={activeTheme === theme}
      tabindex={activeTheme === theme ? 0 : -1}
    >
      {theme === 'light' ? 'Light' : 'Dark'}
    </button>
  {/each}
</div>
<div id="theme-announcer" class="sr-only" aria-live="polite"></div>

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
