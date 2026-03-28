// TODO: The underlying scraper logic lives in:
//   - src/lib/server/scraper.ts      — HTML parsing (scrapeCompetition, parseMatches, etc.)
//   - src/lib/server/competitions.ts — fetches competition list from rugby.nl schedule page
// Update those files if the scraping logic needs changing.

import { fetchCompetitions } from '$lib/server/competitions';
import { scrapeCompetition } from '$lib/server/scraper';
import type { Match } from '$lib/types';

const BATCH_SIZE = 10;

export async function scrapeData(): Promise<Match[]> {
	const scheduleUrl = process.env['RUGBY_SCHEDULE_URL'];
	if (!scheduleUrl) throw new Error('RUGBY_SCHEDULE_URL is not set');

	const competitions = await fetchCompetitions(scheduleUrl);

	const matches: Match[] = [];
	for (let i = 0; i < competitions.length; i += BATCH_SIZE) {
		const batch = competitions.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(batch.map((c) => scrapeCompetition(c)));
		for (const r of results) matches.push(...r);
	}

	matches.sort((a, b) => {
		const d = a.date.localeCompare(b.date);
		return d !== 0 ? d : a.time.localeCompare(b.time);
	});

	return matches;
}
