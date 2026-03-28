<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { groupByDate, formatDate, searchMatches } from '$lib/matchFilter';
	import { allTeams, groupByClub } from '$lib/teamUtils';
	import { filterMatches } from '$lib/matchFilter';
	import MatchCard from '$lib/components/MatchCard.svelte';
	import type { Match, RankingEntry } from '$lib/types';

	const LS_COMPACT = 'pocketrugby_compact';

	const id = $derived($page.params.id);

	let matches = $state<Match[]>([]);
	let rankings = $state<RankingEntry[]>([]);
	let name = $state('');
	let loading = $state(true);
	let error = $state('');

	let searchInput = $state('');
	let matchSearch = $state('');
	let compact = $state(false);
	let filterOpen = $state(false);
	let selectedTeams = $state<string[]>([]);
	let stickyEl = $state<HTMLElement | null>(null);
	let bottomBarEl = $state<HTMLElement | null>(null);

	$effect(() => {
		const val = searchInput;
		const t = setTimeout(() => { matchSearch = val; }, 250);
		return () => clearTimeout(t);
	});

	const teams = $derived(allTeams(matches));
	const clubGroups = $derived(groupByClub(teams));
	const teamFiltered = $derived(filterMatches(matches, selectedTeams));
	const searched = $derived(searchMatches(teamFiltered, matchSearch));
	const grouped = $derived(groupByDate(searched));

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

	function clearFilter() { selectedTeams = []; }

	function toggleCompact() {
		compact = !compact;
		localStorage.setItem(LS_COMPACT, String(compact));
	}

	function scrollToNow() {
		const today = new Date().toISOString().slice(0, 10);
		const sections = document.querySelectorAll<HTMLElement>('[data-date]');
		let target: HTMLElement | null = null;
		for (const section of sections) {
			target = section;
			if (section.dataset.date! >= today) break;
		}
		if (!target) return;
		const headerH = stickyEl?.offsetHeight ?? 0;
		const top = target.getBoundingClientRect().top + window.scrollY - headerH;
		window.scrollTo({ top, behavior: 'smooth' });
	}

	function onPointerdown(e: PointerEvent) {
		if (filterOpen && stickyEl && !stickyEl.contains(e.target as Node)) {
			if (bottomBarEl?.contains(e.target as Node)) return;
			filterOpen = false;
		}
	}

	onMount(async () => {
		compact = localStorage.getItem(LS_COMPACT) === 'true';
		try {
			const res = await fetch(`/api/competition/${id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			matches = data.matches ?? [];
			rankings = data.rankings ?? [];
			name = data.name ?? '';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	});

</script>

<svelte:window onpointerdown={onPointerdown} />

<div class="sticky-top" bind:this={stickyEl}>
	<header>
		<div class="header-left">
			<a class="back-btn" href="/">← Terug</a>
			<h1 class="comp-title">{name || 'Competitie'}</h1>
		</div>
		<div class="header-actions desktop-only">
			<button class="icon-btn" onclick={scrollToNow} title="Spring naar vandaag">Nu</button>
			<button class="icon-btn" onclick={toggleCompact} title={compact ? 'Uitgebreid' : 'Compact'}>
				{compact ? '▤' : '☰'}
			</button>
			<button
				class="filter-btn"
				class:active={selectedTeams.length > 0}
				onclick={() => (filterOpen = !filterOpen)}
			>
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
			placeholder="Zoek team, locatie…"
			bind:value={searchInput}
		/>
	</div>
</div>

<main>
	{#if loading}
		<div class="loading">Laden… (kan 5-15 seconden duren)</div>
	{:else if error}
		<div class="error">Fout: {error}</div>
	{:else}
		{#if rankings.length > 0}
			<section class="section">
				<h2 class="section-heading">Ranglijst</h2>
				<div class="table-wrap">
					<table class="ranking-table">
						<thead>
							<tr>
								<th>#</th>
								<th class="team-col">Ploeg</th>
								<th title="Gespeeld">GS</th>
								<th title="Gewonnen">W</th>
								<th title="Verloren">V</th>
								<th title="Gelijk">G</th>
								<th title="Punten">Pnt</th>
								<th title="Punten voor">PV</th>
								<th title="Punten tegen">PT</th>
							</tr>
						</thead>
						<tbody>
							{#each rankings as row}
								<tr>
									<td class="pos">{row.position}</td>
									<td class="team-col">{row.team}</td>
									<td>{row.played}</td>
									<td>{row.won}</td>
									<td>{row.lost}</td>
									<td>{row.drawn}</td>
									<td class="pts">{row.points}</td>
									<td>{row.pointsFor}</td>
									<td>{row.pointsAgainst}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<section class="section">
			<h2 class="section-heading">Speelschema</h2>
			{#if searched.length === 0}
				<div class="empty">Geen wedstrijden gevonden.</div>
			{:else}
				{#each [...grouped] as [date, dayMatches]}
					<div class="date-section" data-date={date}>
						<h3 class="date-heading">{formatDate(date)}</h3>
						{#each dayMatches as match}
							<MatchCard {match} {compact} query={matchSearch} />
						{/each}
					</div>
				{/each}
			{/if}
		</section>
	{/if}
</main>

<!-- Mobile/tablet bottom control bar -->
<div class="bottom-bar mobile-only" bind:this={bottomBarEl}>
	<input
		class="search-input"
		type="search"
		placeholder="Zoek team, locatie…"
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
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}

	.back-btn {
		color: var(--accent);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.back-btn:hover { color: var(--accent-light); }

	.comp-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text);
		text-transform: capitalize;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }

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

	.filter-btn:hover, .filter-btn.active { background: rgba(240, 96, 0, 0.25); }

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

	main { padding: 1rem; max-width: 720px; margin: 0 auto; }

	.section { margin-bottom: 2rem; }

	.section-heading {
		font-size: 1rem;
		font-weight: 700;
		color: var(--accent);
		padding: 0.5rem 0;
		border-bottom: 2px solid var(--accent);
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-wrap { overflow-x: auto; }

	.ranking-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.ranking-table th,
	.ranking-table td {
		padding: 0.4rem 0.5rem;
		text-align: center;
		border-bottom: 1px solid var(--border);
		color: var(--text);
	}

	.ranking-table th {
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		background: var(--surface-raised);
	}

	.ranking-table .team-col { text-align: left; }
	.ranking-table .pos { color: var(--text-muted); }
	.ranking-table .pts { font-weight: 700; color: var(--accent); }
	.ranking-table tbody tr:hover { background: var(--surface-raised); }

	.date-section { margin-bottom: 1.25rem; }

	.date-heading {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: capitalize;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--border);
		margin-bottom: 0.5rem;
	}

	.loading, .error, .empty {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--text-muted);
	}

	.error { color: #f87171; }

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
