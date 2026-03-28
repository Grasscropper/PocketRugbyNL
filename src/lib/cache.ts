import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_FILE = join(process.cwd(), 'cache', 'data.json');

interface CacheFile {
	data: unknown;
	cachedAt: number;
}

export function readCache(): CacheFile | null {
	try {
		if (!existsSync(CACHE_FILE)) return null;
		return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheFile;
	} catch {
		return null;
	}
}

export function writeCache(data: unknown): void {
	const dir = join(process.cwd(), 'cache');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(CACHE_FILE, JSON.stringify({ data, cachedAt: Date.now() }), 'utf-8');
}

const LOG_FILE = join(process.cwd(), 'cache', 'scrape.log');

export type ScrapeTrigger = 'cron' | 'cold-start' | 'on-visit';

function formatDuration(ms: number): string {
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function writeLine(trigger: ScrapeTrigger, event: string, detail?: string): void {
	const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
	const t = trigger.padEnd(11);
	const line = detail
		? `${ts}  ${t}  ${event.padEnd(6)}  ${detail}\n`
		: `${ts}  ${t}  ${event}\n`;
	const dir = join(process.cwd(), 'cache');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	appendFileSync(LOG_FILE, line, 'utf-8');
}

export function logScrapeStart(trigger: ScrapeTrigger): void {
	writeLine(trigger, 'start');
}

export function logScrapeEnd(
	trigger: ScrapeTrigger,
	durationMs: number,
	result: { matches: number } | { error: string }
): void {
	if ('error' in result) {
		writeLine(trigger, 'error', `${result.error}  ${formatDuration(durationMs)}`);
	} else {
		writeLine(trigger, 'ok', `${result.matches} matches  ${formatDuration(durationMs)}`);
	}
}

export let isScraping = false;

export function setScrapingLock(val: boolean): void {
	isScraping = val;
}
