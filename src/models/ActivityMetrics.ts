import { DailyMetrics } from "./DailyMetrics";

export interface DatedDailyMetrics {
	date: number;
	dateKey: string;
	metrics: DailyMetrics;
}

export interface ActivityPeriod {
	key: string;
	endDate: number;
	words: number;
	characters: number;
	sentences: number;
	activeMinutes: number;
	sessions: number;
}
