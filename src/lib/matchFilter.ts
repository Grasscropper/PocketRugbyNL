import type { Match } from '$lib/types';

export function filterMatches(matches: Match[], selectedTeams: string[]): Match[] {
	if (selectedTeams.length === 0) return matches;
	const set = new Set(selectedTeams);
	return matches.filter((m) => set.has(m.home) || set.has(m.away));
}

export function searchMatches(matches: Match[], query: string): Match[] {
	const q = query.trim().toLowerCase();
	if (!q) return matches;
	return matches.filter(
		(m) =>
			m.home.toLowerCase().includes(q) ||
			m.away.toLowerCase().includes(q) ||
			m.venue.toLowerCase().includes(q) ||
			m.competition.toLowerCase().includes(q)
	);
}

function isEpochDate(iso: string): boolean {
	return iso === '1970-01-01';
}

export function groupByDate(matches: Match[]): Map<string, Match[]> {
	const map = new Map<string, Match[]>();
	for (const m of matches) {
		const list = map.get(m.date) ?? [];
		list.push(m);
		map.set(m.date, list);
	}
	return new Map(
		[...map.entries()].sort(([a], [b]) => {
			const aE = isEpochDate(a);
			const bE = isEpochDate(b);
			if (aE !== bE) return aE ? 1 : -1;
			return a.localeCompare(b);
		})
	);
}

export function formatDate(iso: string): string {
	if (isEpochDate(iso)) return 'Date not set';
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(year, month - 1, day).toLocaleDateString('nl-NL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}
