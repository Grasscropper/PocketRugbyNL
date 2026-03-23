<script lang="ts">
	import type { Match } from '$lib/types';

	interface Props {
		match: Match;
		compact?: boolean;
		showCompetition?: boolean;
		query?: string;
	}

	let { match, compact = false, showCompetition = false, query = '' }: Props = $props();

	function scoreFor(score: string, side: 'home' | 'away'): string {
		const parts = score.split('-').map((s) => s.trim());
		return side === 'home' ? (parts[0] ?? '') : (parts[1] ?? '');
	}

	function hl(text: string): string {
		const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		const q = query.trim();
		if (!q) return safe;
		const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return safe.replace(new RegExp(escaped, 'gi'), '<mark>$&</mark>');
	}
</script>

{#if compact}
	<div class="match-card match-card--compact" class:played={!!match.score}>
		<div class="compact-row">
			<span class="compact-teams">{@html hl(match.home)} – {@html hl(match.away)}</span>
			{#if match.score}<span class="compact-score">{match.score}</span>{/if}
		</div>
		<div class="match-meta">
			{match.time} · {@html hl(match.venue)}{#if showCompetition} · <a class="comp-link" href="/competition/{match.competitionId}">{@html hl(match.competition)}</a>{/if}
		</div>
	</div>
{:else}
	<div class="match-card" class:played={!!match.score}>
		<div class="team-row">
			<span class="team-name">{@html hl(match.home)}</span>
			{#if match.score}<span class="team-score">{scoreFor(match.score, 'home')}</span>{/if}
		</div>
		<div class="team-row">
			<span class="team-name">{@html hl(match.away)}</span>
			{#if match.score}<span class="team-score">{scoreFor(match.score, 'away')}</span>{/if}
		</div>
		<div class="match-meta">
			{match.time} · {@html hl(match.venue)}{#if showCompetition} · <a class="comp-link" href="/competition/{match.competitionId}">{@html hl(match.competition)}</a>{/if}
		</div>
	</div>
{/if}

<style>
	.match-card {
		background: var(--surface);
		border-radius: 8px;
		padding: 0.6rem 0.875rem;
		margin-bottom: 0.4rem;
		border: 1px solid var(--border);
		max-width: 500px;
	}

	.match-card.played { border-left: 3px solid var(--accent); }

	/* Default: stacked layout */
	.team-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.15rem 0;
	}

	.team-name {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.team-score {
		font-size: 1rem;
		font-weight: 700;
		color: var(--accent);
		min-width: 2ch;
		text-align: right;
		flex-shrink: 0;
	}

	/* Compact layout */
	.match-card--compact { padding: 0.4rem 0.875rem; }

	.compact-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.compact-teams {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.compact-score {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--accent);
		flex-shrink: 0;
	}

	.match-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; }

	.comp-link {
		color: var(--text-muted);
		text-decoration: none;
		border-bottom: 1px dotted var(--text-muted);
	}

	.comp-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
</style>
