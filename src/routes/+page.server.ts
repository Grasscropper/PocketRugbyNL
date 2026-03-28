import type { PageServerLoad } from './$types';
import { readCache, isScraping } from '$lib/cache';
import { runScrape } from '$lib/scrapeRunner';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

export const load: PageServerLoad = () => {
	const cache = readCache();
	const isStale = !cache || Date.now() - cache.cachedAt > STALE_MS;

	if (isStale && !isScraping) {
		// Fire-and-forget: user gets cached data immediately, scrape runs in background
		runScrape().catch((err) => console.error('[load] background scrape failed:', err));
	}

	// TODO: Handle null data case in the UI — occurs on first cold start before cron has run.
	// Consider showing a loading/retry message or polling until data is available.
	return {
		data: cache?.data ?? null,
		cachedAt: cache?.cachedAt ?? null,
		isStale
	};
};
