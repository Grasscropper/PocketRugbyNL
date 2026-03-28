import {
	isScraping, setScrapingLock,
	writeCache, writeCompetitionsCache,
	logScrapeStart, logScrapeEnd
} from '$lib/cache';
import type { ScrapeTrigger } from '$lib/cache';
import { scrapeData } from '$lib/scraper';

export type { ScrapeTrigger };

export async function runScrape(trigger: ScrapeTrigger): Promise<void> {
	if (isScraping) return;
	setScrapingLock(true);
	const start = Date.now();
	logScrapeStart(trigger);
	try {
		const { matches, competitions } = await scrapeData();
		writeCache(matches);
		writeCompetitionsCache(competitions);
		logScrapeEnd(trigger, Date.now() - start, { matches: matches.length });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[scrapeRunner] scrape failed:', err);
		logScrapeEnd(trigger, Date.now() - start, { error: message });
	} finally {
		setScrapingLock(false);
	}
}
