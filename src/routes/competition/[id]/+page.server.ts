import type { PageServerLoad } from './$types';
import { readCompetitionsCache } from '$lib/cache';

export const load: PageServerLoad = ({ params }) => {
	const cache = readCompetitionsCache();
	const competition = cache?.[params.id] ?? null;
	return {
		matches: competition?.matches ?? null,
		rankings: competition?.rankings ?? null,
		name: competition?.name ?? null
	};
};
