export interface Match {
	date: string; // ISO date: "2025-09-06"
	time: string; // "13:00"
	venue: string;
	home: string;
	away: string;
	score: string; // "38 - 42" or ""
	competition: string; // human-readable name
	competitionId: string; // AllUnited numeric ID
}

export interface RankingEntry {
	position: number;
	team: string;
	played: number;
	won: number;
	drawn: number;
	lost: number;
	pointsFor: number;
	pointsAgainst: number;
	points: number;
}

export interface CompetitionRef {
	url: string;
	id: string;
	slug: string;
}
