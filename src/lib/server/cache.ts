interface CacheEntry<T> {
	data: T;
	fetchedAt: number;
	ttl: number; // ms
}

const store = new Map<string, CacheEntry<unknown>>();

export function get<T>(key: string): T | null {
	const entry = store.get(key) as CacheEntry<T> | undefined;
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > entry.ttl) {
		store.delete(key);
		return null;
	}
	return entry.data;
}

export function getStale<T>(key: string): T | null {
	const entry = store.get(key) as CacheEntry<T> | undefined;
	return entry ? entry.data : null;
}

export function isStale(key: string): boolean {
	const entry = store.get(key);
	if (!entry) return true;
	return Date.now() - entry.fetchedAt > entry.ttl;
}

export function set<T>(key: string, data: T, ttl: number): void {
	store.set(key, { data, fetchedAt: Date.now(), ttl });
}
