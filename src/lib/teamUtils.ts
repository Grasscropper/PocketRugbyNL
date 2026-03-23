import type { Match } from '$lib/types';

const SUFFIX_RE = /\s+(1|2|3|4|CU|JU|CO|D\d+|Espoirs|Ladies|Academy|Dames|Heren|Junioren)$/i;

export function clubName(teamName: string): string {
	let name = teamName.trim();
	let prev: string;
	do {
		prev = name;
		name = name.replace(SUFFIX_RE, '').trim();
	} while (name !== prev);
	return name;
}

export function allTeams(matches: Match[]): string[] {
	const set = new Set<string>();
	for (const m of matches) {
		set.add(m.home);
		set.add(m.away);
	}
	return [...set].sort();
}

export function groupByClub(teams: string[]): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const team of teams) {
		const club = clubName(team);
		const list = map.get(club) ?? [];
		list.push(team);
		map.set(club, list);
	}
	return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

