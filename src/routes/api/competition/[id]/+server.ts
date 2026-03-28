import { json } from '@sveltejs/kit';
import { readCompetitionsCache } from '$lib/cache';
import * as memCache from '$lib/server/cache';
import { fetchCompetitions } from '$lib/server/competitions';
import { scrapeCompetitionFull, competitionName } from '$lib/server/scraper';
import { RUGBY_SCHEDULE_URL } from '$env/static/private';

const COMPETITIONS_TTL = 24 * 60 * 60 * 1000;

export async function GET({ params }: { params: { id: string } }) {
	const { id } = params;

	// Prefer file cache populated by the cron scraper
	const fileCache = readCompetitionsCache();
	if (fileCache?.[id]) return json(fileCache[id]);

	// Fallback: scrape on demand (before the first cron run)
	let competitions = memCache.get<Awaited<ReturnType<typeof fetchCompetitions>>>('competitions');
	if (!competitions) {
		competitions = await fetchCompetitions(RUGBY_SCHEDULE_URL);
		memCache.set('competitions', competitions, COMPETITIONS_TTL);
	}

	const comp = competitions.find((c) => c.id === id);
	if (!comp) return json({ error: 'not found' }, { status: 404 });

	const { matches, rankings } = await scrapeCompetitionFull(comp);
	const name = competitionName(comp.slug);
	return json({ matches, rankings, name });
}
