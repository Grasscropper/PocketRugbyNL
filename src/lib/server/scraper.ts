import { parse } from 'node-html-parser';
import type { Match, RankingEntry, CompetitionRef } from '$lib/types';

const DUTCH_MONTHS: Record<string, string> = {
	januari: '01',
	februari: '02',
	maart: '03',
	april: '04',
	mei: '05',
	juni: '06',
	juli: '07',
	augustus: '08',
	september: '09',
	oktober: '10',
	november: '11',
	december: '12'
};

function parseDutchDate(text: string): string | null {
	// e.g. "Zaterdag 06 september 2025"
	const m = text.trim().match(/\d{1,2}\s+(\w+)\s+(\d{4})/);
	if (!m) return null;
	const month = DUTCH_MONTHS[m[1].toLowerCase()];
	if (!month) return null;
	const day = m[0].split(/\s+/)[0].padStart(2, '0');
	return `${m[2]}-${month}-${day}`;
}

export function competitionName(slug: string): string {
	return decodeURIComponent(slug).replace(/-/g, ' ');
}

async function fetchPage(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} catch (err) {
		console.warn(`[scraper] skipping ${url}:`, err);
		return null;
	}
}

function parseMatches(root: ReturnType<typeof parse>, comp: CompetitionRef): Match[] {
	const rows = root.querySelectorAll('tr');
	const matches: Match[] = [];
	let currentDate = '';
	const competition = competitionName(comp.slug);

	for (const row of rows) {
		const cells = row.querySelectorAll('td');

		// Date heading row: single td with colspan and bold
		if (cells.length === 1) {
			const colspan = cells[0].getAttribute('colspan');
			if (colspan && parseInt(colspan) > 1) {
				const parsed = parseDutchDate(cells[0].text);
				if (parsed) currentDate = parsed;
			}
			continue;
		}

		// Match row: td.grid cells (time, venue, home, away, score)
		const gridCells = cells.filter((c) => c.classList.contains('grid'));
		if (gridCells.length < 4 || !currentDate) continue;

		const time = gridCells[0]?.text.trim() ?? '';
		const venue = gridCells[1]?.text.trim() ?? '';
		const home = gridCells[2]?.text.trim() ?? '';
		const away = gridCells[3]?.text.trim() ?? '';
		const score = gridCells[4]?.text.trim() ?? '';

		if (!home || !away) continue;

		matches.push({ date: currentDate, time, venue, home, away, score, competition, competitionId: comp.id });
	}

	return matches;
}

function parseRankings(root: ReturnType<typeof parse>): RankingEntry[] {
	// AllUnited uses id="team-ranking"; fall back to heuristic if not found
	const rankingTable = root.querySelector('table#team-ranking') ?? (() => {
		for (const t of root.querySelectorAll('table')) {
			const rows = t.querySelectorAll('tr');
			const data = rows.filter((r) => {
				const cells = r.querySelectorAll('td');
				return cells.length >= 4 && /^\d+$/.test(cells[0].text.trim());
			});
			if (data.length >= 2) return t;
		}
		return null;
	})();
	if (!rankingTable) return [];

	// Actual column order: Pos | Team | Played | Won | Lost | Drawn | Pts | PtsFor | PtsAgainst | Diff
	return rankingTable.querySelectorAll('tr')
		.filter((r) => {
			const cells = r.querySelectorAll('td');
			return cells.length >= 4 && /^\d+$/.test(cells[0].text.trim());
		})
		.map((row) => {
			const vals = row.querySelectorAll('td').map((c) => c.text.trim());
			return {
				position:       parseInt(vals[0]) || 0,
				team:           vals[1] ?? '',
				played:         parseInt(vals[2]) || 0,
				won:            parseInt(vals[3]) || 0,
				lost:           parseInt(vals[4]) || 0,
				drawn:          parseInt(vals[5]) || 0,
				points:         parseInt(vals[6]) || 0,
				pointsFor:      parseInt(vals[7]) || 0,
				pointsAgainst:  parseInt(vals[8]) || 0
			};
		});
}

export async function scrapeCompetition(comp: CompetitionRef): Promise<Match[]> {
	const html = await fetchPage(comp.url);
	if (!html) return [];
	return parseMatches(parse(html), comp);
}

export async function scrapeCompetitionFull(
	comp: CompetitionRef
): Promise<{ matches: Match[]; rankings: RankingEntry[] }> {
	const html = await fetchPage(comp.url);
	if (!html) return { matches: [], rankings: [] };
	const root = parse(html);
	return { matches: parseMatches(root, comp), rankings: parseRankings(root) };
}
