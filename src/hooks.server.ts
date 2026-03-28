import type { Handle } from '@sveltejs/kit';
import { RUGBY_SCHEDULE_URL } from '$env/static/private';
import { startCron } from '$lib/cron';
import { runScrape } from '$lib/scrapeRunner';

// Expose to non-SvelteKit server modules (cron runs outside SvelteKit request context)
process.env['RUGBY_SCHEDULE_URL'] ||= RUGBY_SCHEDULE_URL;

let cronStarted = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!cronStarted) {
		cronStarted = true;
		startCron();
		console.log('[startup] Running initial scrape...');
		runScrape('cold-start').catch((err) => console.error('[startup] initial scrape failed:', err));
	}
	return resolve(event);
};
