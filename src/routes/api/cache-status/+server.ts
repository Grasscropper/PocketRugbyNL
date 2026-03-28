import { json } from '@sveltejs/kit';
import { readCache } from '$lib/cache';

export function GET() {
	const cache = readCache();
	return json({ cachedAt: cache?.cachedAt ?? null });
}
