import type { CompetitionRef } from '$lib/types';

const COMPETITION_PATTERN =
	/https:\/\/pr01\.allunited\.nl\/x\/competition\/poule\/RUGBYBOND\/[\w-]+\/(\d+)\/([\w%-]+)/g;

export async function fetchCompetitions(scheduleUrl: string): Promise<CompetitionRef[]> {
	console.log(scheduleUrl);
	const res = await fetch(scheduleUrl);
	if (!res.ok) throw new Error(`Failed to fetch schedule: ${res.status}`);
	const html = await res.text();

	const seen = new Set<string>();
	const competitions: CompetitionRef[] = [];

	for (const match of html.matchAll(COMPETITION_PATTERN)) {
		const url = match[0];
		const id = match[1];
		const slug = match[2];
		if (!seen.has(url)) {
			seen.add(url);
			competitions.push({ url, id, slug });
		}
	}

	console.log(competitions.length);
	return competitions;
}
