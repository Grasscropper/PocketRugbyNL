// TODO: The underlying scraper logic lives in:
//   - src/lib/server/scraper.ts      — HTML parsing (scrapeCompetitionFull, parseMatches, etc.)
//   - src/lib/server/competitions.ts — fetches competition list from rugby.nl schedule page
// Update those files if the scraping logic needs changing.

import { fetchCompetitions } from '$lib/server/competitions';
import { scrapeCompetitionFull, competitionName } from '$lib/server/scraper';
import type { Match } from '$lib/types';
import type { CompetitionsMap } from '$lib/cache';

const BATCH_SIZE = 10;

export async function scrapeData(): Promise<{ matches: Match[]; competitions: CompetitionsMap }> {
	const scheduleUrl = process.env['RUGBY_SCHEDULE_URL'];
	if (!scheduleUrl) throw new Error('RUGBY_SCHEDULE_URL is not set');

	const competitionRefs = await fetchCompetitions(scheduleUrl);
	const competitionsMap: CompetitionsMap = {};
	const allMatches: Match[] = [];

	for (let i = 0; i < competitionRefs.length; i += BATCH_SIZE) {
		const batch = competitionRefs.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(batch.map((c) => scrapeCompetitionFull(c)));
		for (let j = 0; j < batch.length; j++) {
			const comp = batch[j];
			const { matches, rankings } = results[j];
			const name = competitionName(comp.slug);
			competitionsMap[comp.id] = { matches, rankings, name };
			allMatches.push(...matches);
		}
	}

	allMatches.sort((a, b) => {
		const d = a.date.localeCompare(b.date);
		return d !== 0 ? d : a.time.localeCompare(b.time);
	});

	return { matches: allMatches, competitions: competitionsMap };
}
