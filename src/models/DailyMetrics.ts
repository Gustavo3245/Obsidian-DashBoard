export interface DailyMetrics {
	date: string;
	words: number;
	characters: number;
	sentences: number;
	timeMetrics: {
		activeMinutes: number;
		sessions: number;
	}
}
