import { isScraping, setScrapingLock, writeCache, appendScrapeLog } from '$lib/cache';
import type { ScrapeLogEntry } from '$lib/cache';
import { scrapeData } from '$lib/scraper';

export async function runScrape(trigger: ScrapeLogEntry['trigger']): Promise<void> {
	if (isScraping) return;
	setScrapingLock(true);
	const start = Date.now();
	try {
		const data = await scrapeData();
		writeCache(data);
		appendScrapeLog({ ts: new Date().toISOString(), trigger, status: 'ok', durationMs: Date.now() - start });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[scrapeRunner] scrape failed:', err);
		appendScrapeLog({ ts: new Date().toISOString(), trigger, status: 'error', durationMs: Date.now() - start, error: message });
	} finally {
		setScrapingLock(false);
	}
}
