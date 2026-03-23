import { json } from '@sveltejs/kit';
import * as cache from '$lib/server/cache';
import { fetchCompetitions } from '$lib/server/competitions';
import { scrapeCompetition } from '$lib/server/scraper';
import type { Match } from '$lib/types';
import { RUGBY_SCHEDULE_URL } from '$env/static/private';

const COMPETITIONS_TTL = 24 * 60 * 60 * 1000; // 24h
const MATCHES_TTL = 60 * 60 * 1000; // 1h
const BATCH_SIZE = 10;

async function fetchAllMatches(): Promise<Match[]> {
	let competitions = cache.get<Awaited<ReturnType<typeof fetchCompetitions>>>('competitions');
	if (!competitions) {
		competitions = await fetchCompetitions(RUGBY_SCHEDULE_URL);
		cache.set('competitions', competitions, COMPETITIONS_TTL);
	}

	const matches: Match[] = [];
	for (let i = 0; i < competitions.length; i += BATCH_SIZE) {
		const batch = competitions.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(
			batch.map((c) => scrapeCompetition(c))
		);
		for (const r of results) matches.push(...r);
	}

	// Sort chronologically
	matches.sort((a, b) => {
		const d = a.date.localeCompare(b.date);
		return d !== 0 ? d : a.time.localeCompare(b.time);
	});

	return matches;
}

export async function GET() {
	const stale = cache.getStale<Match[]>('matches');
	const staleOk = !cache.isStale('matches');

	if (staleOk && stale) {
		return json(stale);
	}

	if (stale) {
		// Stale-while-revalidate: return stale immediately, refresh in background
		fetchAllMatches()
			.then((matches) => cache.set('matches', matches, MATCHES_TTL))
			.catch((err) => console.error('[api/matches] background refresh failed:', err));
		return json(stale);
	}

	// Cold start: await full fetch
	const matches = await fetchAllMatches();
	cache.set('matches', matches, MATCHES_TTL);
	return json(matches);
}
