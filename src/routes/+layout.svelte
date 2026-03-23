<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#0d1420" />
	<meta name="description" content="Snel wedstrijden vinden in de NL rugby competitie" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<title>PocketRugbyNL</title>
</svelte:head>

{@render children()}

<style>
	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

	:global(:root) {
		--bg:            #0f1520;
		--surface:       #1a2235;
		--surface-raised:#212d42;
		--surface-header:#0d1420;
		--border:        #2a3a55;
		--text:          #e2e8f0;
		--text-muted:    #8a9ab8;
		--accent:        #f06000;
		--accent-light:  #ff7820;
	}

	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		background: var(--bg);
		color: var(--text);
		min-height: 100vh;
	}

	:global(a) { color: var(--accent); }

	:global(mark) {
		background: rgba(240, 96, 0, 0.35);
		color: inherit;
		border-radius: 2px;
		padding: 0 1px;
	}
</style>
