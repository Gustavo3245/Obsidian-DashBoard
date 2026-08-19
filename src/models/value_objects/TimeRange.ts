export const RANGE_DAYS = {
	today: 1,
	week: 7,
	month: 30,
	quarter: 90,
	semester: 180,
	year: 365,
} as const;

export type BoundedTimeRange = keyof typeof RANGE_DAYS;
export type TimeRange = BoundedTimeRange | "all";

export interface DateBounds {
	start: number; 
	end: number;
}
