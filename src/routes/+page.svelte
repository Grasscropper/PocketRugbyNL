<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll, replaceState } from '$app/navigation';
	import { filterMatches, searchMatches, groupByDate, formatDate } from '$lib/matchFilter';
	import { allTeams, groupByClub } from '$lib/teamUtils';
	import MatchCard from '$lib/components/MatchCard.svelte';
	import VirtualList from '$lib/components/VirtualList.svelte';
	import type { Match } from '$lib/types';
	import type { PageData } from './$types';

	type FlatItem = { type: 'date'; date: string } | { type: 'match'; match: Match };

	const LS_KEY = 'pocketrugby_selected_teams';
	const LS_COMPACT = 'pocketrugby_compact';

	let { data }: { data: PageData } = $props();

	const allMatches = $derived<Match[]>((data.data as Match[]) ?? []);
	let selectedTeams = $state<string[]>([]);
	let loading = $state(false);
	let error = $state('');
	let filterOpen = $state(false);
	let stickyEl = $state<HTMLElement | null>(null);
	let bottomBarEl = $state<HTMLElement | null>(null);
	let vlist = $state<{ scrollToIndex: (i: number, offset?: number) => void } | null>(null);
	let searchInput = $state('');
	let searchEl = $state<HTMLInputElement | null>(null);
	let matchSearch = $state('');
	let compact = $state(false);
	let pollCountdown = $state(10);
	let initialized = $state(false);

	$effect(() => {
		const val = searchInput;
		const t = setTimeout(() => { matchSearch = val; }, 250);
		return () => clearTimeout(t);
	});

	// Keep URL params and localStorage in sync with filter state
	$effect(() => {
		if (!initialized) return;
		const params = new URLSearchParams();
		if (selectedTeams.length > 0) params.set('teams', selectedTeams.join(','));
		if (searchInput) params.set('q', searchInput);
		const qs = params.toString();
		replaceState(qs ? `?${qs}` : location.pathname, {});
		localStorage.setItem(LS_KEY, JSON.stringify(selectedTeams));
	});

	const teams = $derived(allTeams(allMatches));
	const clubGroups = $derived(groupByClub(teams));
	const filtered = $derived(filterMatches(allMatches, selectedTeams));
	const searched = $derived(searchMatches(filtered, matchSearch));
	const grouped = $derived(groupByDate(searched));

	const flatItems = $derived.by(() => {
		const flat: FlatItem[] = [];
		for (const [date, matches] of grouped) {
			flat.push({ type: 'date', date });
			for (const match of matches) flat.push({ type: 'match', match });
		}
		return flat;
	});

	// Slot heights are estimates; VirtualList measures actual heights via ResizeObserver.
	const getHeight = $derived(
		(item: FlatItem): number => item.type === 'date' ? 52 : (compact ? 58 : 100)
	);

	function toggleTeam(team: string) {
		if (selectedTeams.includes(team)) {
			selectedTeams = selectedTeams.filter((t) => t !== team);
		} else {
			selectedTeams = [...selectedTeams, team];
		}
	}

	function selectClub(clubTeams: string[]) {
		const allSelected = clubTeams.every((t) => selectedTeams.includes(t));
		if (allSelected) {
			selectedTeams = selectedTeams.filter((t) => !clubTeams.includes(t));
		} else {
			const toAdd = clubTeams.filter((t) => !selectedTeams.includes(t));
			selectedTeams = [...selectedTeams, ...toAdd];
		}
	}

	function clearFilter() {
		selectedTeams = [];
	}

	function toggleCompact() {
		compact = !compact;
		localStorage.setItem(LS_COMPACT, String(compact));
	}

	function scrollToNow() {
		const today = new Date().toISOString().slice(0, 10);
		let targetIdx = 0;
		for (let i = 0; i < flatItems.length; i++) {
			const item = flatItems[i];
			if (item.type === 'date') {
				targetIdx = i;
				if (item.date >= today) break;
			}
		}
		vlist?.scrollToIndex(targetIdx, stickyEl?.offsetHeight ?? 0);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			filterOpen = false;
		} else if (e.key === '/' && !(['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName))) {
			e.preventDefault();
			searchEl?.focus();
		}
	}

	function onPointerdown(e: PointerEvent) {
		if (filterOpen && stickyEl && !stickyEl.contains(e.target as Node)) {
			if (bottomBarEl?.contains(e.target as Node)) return;
			filterOpen = false;
		}
	}

	onMount(() => {
		const params = new URLSearchParams(location.search);
		const teamsParam = params.get('teams');
		const qParam = params.get('q');

		if (teamsParam) {
			selectedTeams = teamsParam.split(',').filter(Boolean);
		} else {
			const saved = localStorage.getItem(LS_KEY);
			if (saved) try { selectedTeams = JSON.parse(saved); } catch { /* ignore */ }
		}

		if (qParam) searchInput = qParam;
		compact = localStorage.getItem(LS_COMPACT) === 'true';
		initialized = true;

		// Poll for new scrape data every 10s and reload when cachedAt changes
		const tick = setInterval(() => {
			pollCountdown = Math.max(0, pollCountdown - 1);
		}, 1_000);

		const interval = setInterval(async () => {
			pollCountdown = 10;
			try {
				const res = await fetch('/api/cache-status');
				if (!res.ok) return;
				const { cachedAt } = await res.json() as { cachedAt: number | null };
				if (cachedAt !== null && cachedAt !== data.cachedAt) {
					await invalidateAll();
				}
			} catch { /* ignore network errors */ }
		}, 10_000);

		return () => { clearInterval(tick); clearInterval(interval); };
	});

</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerdown} />

<div class="sticky-top" bind:this={stickyEl}>
	<header>
		<h1><img src="/icon-192.png" alt="Rugby ball" class="title-icon" /> PocketRugbyNL</h1>
		<div class="header-actions desktop-only">
			<button class="icon-btn" onclick={scrollToNow} title="Spring naar vandaag">Nu</button>
			<button class="icon-btn" onclick={toggleCompact} title={compact ? 'Uitgebreid' : 'Compact'}>
				{compact ? '▤' : '☰'}
			</button>
			<button class="filter-btn" onclick={() => (filterOpen = !filterOpen)}>
				Teams {selectedTeams.length > 0 ? `(${selectedTeams.length})` : ''} {filterOpen ? '▲' : '▼'}
			</button>
		</div>
	</header>

	{#if filterOpen}
		<aside class="filter-panel">
			<div class="filter-actions">
				<span class="filter-count">{selectedTeams.length} geselecteerd</span>
				{#if selectedTeams.length > 0}
					<button class="clear-btn" onclick={clearFilter}>Alles wissen</button>
				{/if}
			</div>

			{#each [...clubGroups] as [club, clubTeams]}
				<div class="club-group">
					<button
						class="club-name"
						class:partial={clubTeams.some((t) => selectedTeams.includes(t))}
						class:all={clubTeams.every((t) => selectedTeams.includes(t))}
						onclick={() => selectClub(clubTeams)}
					>
						{club}
					</button>
					{#if clubTeams.length > 1}
						<div class="team-list">
							{#each clubTeams as team}
								<label class="team-label">
									<input
										type="checkbox"
										checked={selectedTeams.includes(team)}
										onchange={() => toggleTeam(team)}
									/>
									{team}
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</aside>
	{/if}

	<div class="search-bar desktop-only">
		<input
			class="search-input"
			type="search"
			placeholder="Zoek wedstrijd, team, locatie…  (/)"
			bind:value={searchInput}
			bind:this={searchEl}
		/>
	</div>
</div>

<main>
	{#if data.data === null}
		<div class="loading">Data wordt geladen… controleert over {pollCountdown}s opnieuw.</div>
	{:else if error}
		<div class="error">Fout: {error}</div>
	{:else if allMatches.length === 0}
		<div class="empty">Geen wedstrijden gevonden.</div>
	{:else if searched.length === 0}
		<div class="empty">Geen wedstrijden gevonden voor deze zoekopdracht.</div>
	{:else}
		<VirtualList items={flatItems} {getHeight} bind:this={vlist}>
			{#snippet children(item)}
				{#if item.type === 'date'}
					<h2 class="date-heading">{formatDate(item.date)}</h2>
				{:else}
					<MatchCard match={item.match} {compact} showCompetition query={matchSearch} />
				{/if}
			{/snippet}
		</VirtualList>
	{/if}
</main>

<!-- Mobile/tablet bottom control bar -->
<div class="bottom-bar mobile-only" bind:this={bottomBarEl}>
	<input
		class="search-input"
		type="search"
		placeholder="Zoek wedstrijd, team, locatie…"
		bind:value={searchInput}
	/>
	<button class="icon-btn" onclick={scrollToNow} title="Spring naar vandaag">Nu</button>
	<button class="icon-btn" onclick={toggleCompact} title={compact ? 'Uitgebreid' : 'Compact'}>
		{compact ? '▤' : '☰'}
	</button>
	<button
		class="icon-btn"
		class:active={selectedTeams.length > 0}
		onclick={() => (filterOpen = !filterOpen)}
		title="Teams filteren"
	>
		⊟{selectedTeams.length > 0 ? `\u202F${selectedTeams.length}` : ''}
	</button>
</div>

<style>
	.sticky-top {
		position: sticky;
		top: 0;
		z-index: 10;
	}

	header {
		background: var(--surface-header);
		border-bottom: 2px solid var(--accent);
		color: var(--text);
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h1 { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; }
	.title-icon { width: 1.5rem; height: 1.5rem; object-fit: contain; }

	.header-actions { display: flex; gap: 0.5rem; align-items: center; }

	.icon-btn {
		background: rgba(240, 96, 0, 0.15);
		border: 1px solid var(--accent);
		color: var(--accent);
		padding: 0.5rem 0.6rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
		min-width: 44px;
		min-height: 44px;
		line-height: 1;
		font-weight: 600;
	}

	.icon-btn:hover { background: rgba(240, 96, 0, 0.25); }
	.icon-btn.active { background: var(--accent); color: white; }

	.filter-btn {
		background: rgba(240, 96, 0, 0.15);
		border: 1px solid var(--accent);
		color: var(--accent);
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		min-width: 44px;
		min-height: 44px;
		font-weight: 600;
	}

	.filter-btn:hover { background: rgba(240, 96, 0, 0.25); }

	.filter-panel {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		padding: 1rem;
		max-height: 60vh;
		overflow-y: auto;
	}

	.filter-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.filter-count { font-size: 0.85rem; color: var(--text-muted); }

	.clear-btn {
		background: none;
		border: 1px solid #f87171;
		color: #f87171;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.club-group { margin-bottom: 0.5rem; }

	.club-name {
		background: var(--surface-raised);
		border: 1px solid var(--border);
		color: var(--text);
		border-radius: 4px;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.9rem;
		width: 100%;
		text-align: left;
		min-height: 44px;
	}

	.club-name.partial { border-color: var(--accent); color: var(--accent); }
	.club-name.all { background: var(--accent); color: white; border-color: var(--accent); }

	.team-list { padding: 0.25rem 0 0.25rem 0.75rem; }

	.team-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0;
		font-size: 0.9rem;
		color: var(--text);
		cursor: pointer;
		min-height: 36px;
	}

	.team-label input { width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent); }

	.search-bar {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		padding: 0.5rem 1rem;
	}

	.search-input {
		width: 100%;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		font-size: 0.9rem;
		background: var(--surface-raised);
		color: var(--text);
	}

	.search-input::placeholder { color: var(--text-muted); }
	.search-input:focus { outline: none; border-color: var(--accent); }

	main {
		padding: 1rem;
		max-width: 500px;
		margin: 0 auto;
	}

	.loading, .error, .empty {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--text-muted);
		font-size: 1rem;
	}

	.error { color: #f87171; }

	.date-heading {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--accent);
		text-transform: capitalize;
		padding: 0.75rem 0 0.4rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: 0.5rem;
	}

	/* Mobile bottom bar */
	.bottom-bar {
		display: none;
	}

	@media (max-width: 768px) {
		.desktop-only { display: none !important; }

		.filter-panel {
			position: fixed;
			bottom: 60px;
			left: 0;
			right: 0;
			border-top: 2px solid var(--accent);
			border-bottom: none;
			z-index: 9;
		}

		.bottom-bar {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 10;
			background: var(--surface-header);
			border-top: 1px solid var(--border);
			padding: 0.5rem 0.75rem;
			gap: 0.5rem;
			align-items: center;
		}

		.bottom-bar .search-input {
			flex: 1;
			min-width: 0;
			height: 44px;
			padding: 0 0.6rem;
			font-size: 0.9rem;
		}

		.bottom-bar .icon-btn {
			flex-shrink: 0;
			padding: 0 0.5rem;
			font-size: 0.85rem;
		}

		main {
			padding-bottom: calc(56px + 1rem);
		}
	}
</style>
