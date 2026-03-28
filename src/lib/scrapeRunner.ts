import { isScraping, setScrapingLock, writeCache } from '$lib/cache';
import { scrapeData } from '$lib/scraper';

export async function runScrape(): Promise<void> {
	if (isScraping) return;
	setScrapingLock(true);
	try {
		const data = await scrapeData();
		writeCache(data);
	} catch (err) {
		console.error('[scrapeRunner] scrape failed:', err);
	} finally {
		setScrapingLock(false);
	}
}
