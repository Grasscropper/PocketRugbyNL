import type { Match } from '$lib/types';

/** Show last week, this week, and next week. Week starts Monday 00:00. */
export function filterByTimeWindow(matches: Match[]): Match[] {
	const now = new Date();
	const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
	const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

	const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
	const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
	const nextSunday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 13);

	return matches.filter((m) => {
		if (m.date === '1970-01-01') return false;
		const [y, mo, d] = m.date.split('-').map(Number);
		const matchDate = new Date(y, mo - 1, d);
		return matchDate >= lastMonday && matchDate <= nextSunday;
	});
}

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
