import cron from 'node-cron';
import { runScrape } from '$lib/scrapeRunner';

export function startCron(): void {
	cron.schedule('0 * * * *', () => {
		console.log('[cron] Hourly scrape triggered');
		runScrape('cron').catch((err) => console.error('[cron] scrape error:', err));
	});
}
