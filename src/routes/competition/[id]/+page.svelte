<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { groupByDate, formatDate } from '$lib/matchFilter';
	import MatchCard from '$lib/components/MatchCard.svelte';
	import type { Match, RankingEntry } from '$lib/types';

	const id = $derived($page.params.id);

	let matches = $state<Match[]>([]);
	let rankings = $state<RankingEntry[]>([]);
	let name = $state('');
	let loading = $state(true);
	let error = $state('');

	const grouped = $derived(groupByDate(matches));

	onMount(async () => {
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

<header>
	<a class="back-btn" href="/">← Terug</a>
	<h1 class="comp-title">{name || 'Competitie'}</h1>
</header>

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
			{#if matches.length === 0}
				<div class="empty">Geen wedstrijden gevonden.</div>
			{:else}
				{#each [...grouped] as [date, dayMatches]}
					<div class="date-section">
						<h3 class="date-heading">{formatDate(date)}</h3>
						{#each dayMatches as match}
							<MatchCard {match} />
						{/each}
					</div>
				{/each}
			{/if}
		</section>
	{/if}
</main>

<style>
	header {
		background: var(--surface-header);
		border-bottom: 2px solid var(--accent);
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		position: sticky;
		top: 0;
		z-index: 10;
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
</style>
