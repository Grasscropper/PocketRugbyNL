import { json } from '@sveltejs/kit';
import * as cache from '$lib/server/cache';
import { fetchCompetitions } from '$lib/server/competitions';
import { scrapeCompetitionFull, competitionName } from '$lib/server/scraper';
import { RUGBY_SCHEDULE_URL } from '$env/static/private';

const COMPETITIONS_TTL = 24 * 60 * 60 * 1000;
const DETAIL_TTL = 60 * 60 * 1000;

export async function GET({ params }: { params: { id: string } }) {
	const { id } = params;

	let competitions = cache.get<Awaited<ReturnType<typeof fetchCompetitions>>>('competitions');
	if (!competitions) {
		competitions = await fetchCompetitions(RUGBY_SCHEDULE_URL);
		cache.set('competitions', competitions, COMPETITIONS_TTL);
	}

	const comp = competitions.find((c) => c.id === id);
	if (!comp) return json({ error: 'not found' }, { status: 404 });

	const cacheKey = `competition-${id}`;
	const cached = cache.get<object>(cacheKey);
	if (cached) return json(cached);

	const { matches, rankings } = await scrapeCompetitionFull(comp);
	const name = competitionName(comp.slug);
	const result = { matches, rankings, name };
	cache.set(cacheKey, result, DETAIL_TTL);
	return json(result);
}
