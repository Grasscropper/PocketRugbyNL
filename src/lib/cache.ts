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

export type ScrapeLogEntry = {
	ts: string;
	trigger: 'cron' | 'cold-start' | 'on-visit';
	status: 'ok' | 'error';
	durationMs: number;
	error?: string;
};

export function appendScrapeLog(entry: ScrapeLogEntry): void {
	const dir = join(process.cwd(), 'cache');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

export let isScraping = false;

export function setScrapingLock(val: boolean): void {
	isScraping = val;
}
