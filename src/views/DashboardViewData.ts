import { TFile } from "obsidian";
import { DailyMetrics } from "models/DailyMetrics";

export interface DashboardFileTypeMetric {
	type: "markdown" | "canvas" | "excalidraw" | "other";
	percentage: number;
}

export interface DashboardRecentActivity {
	type: "created" | "edited";
	name: string;
	path: string;
	timestamp: number;
}

export interface DashboardDailyWordsPoint {
	dateKey: string;
	words: number;
}

export interface DashboardDailyAverageWords {
	currentAverage: number;
	previousAverage: number;
	changePercentage: number;
	points: DashboardDailyWordsPoint[];
}

export function getDashboardDailyAverageWords(
	dailyHistory: Record<string, DailyMetrics>,
	today = new Date(),
	days = 30
): DashboardDailyAverageWords {
	const periodDays = Math.max(1, Math.floor(days));
	const startOfToday = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate()
	);
	const allPoints: DashboardDailyWordsPoint[] = [];

	for (let offset = (periodDays * 2) - 1; offset >= 0; offset--) {
		const date = new Date(startOfToday);
		date.setDate(startOfToday.getDate() - offset);
		const dateKey = toLocalDateKey(date);
		allPoints.push({
			dateKey,
			words: Math.max(0, dailyHistory[dateKey]?.words ?? 0),
		});
	}

	const previousPoints = allPoints.slice(0, periodDays);
	const points = allPoints.slice(periodDays);
	const currentAverage = getAverageWords(points);
	const previousAverage = getAverageWords(previousPoints);
	const changePercentage = previousAverage > 0
		? ((currentAverage - previousAverage) / previousAverage) * 100
		: currentAverage > 0 ? 100 : 0;

	return {
		currentAverage,
		previousAverage,
		changePercentage,
		points,
	};
}

export function getDashboardFileTypes(files: TFile[]): DashboardFileTypeMetric[] {
	const counts = {
		markdown: 0,
		canvas: 0,
		excalidraw: 0,
		other: 0,
	};

	for (const file of files) {
		const lowerName = file.name.toLowerCase();

		if (lowerName.endsWith(".excalidraw.md")) {
			counts.excalidraw++;
		} else if (file.extension.toLowerCase() === "md") {
			counts.markdown++;
		} else if (file.extension.toLowerCase() === "canvas") {
			counts.canvas++;
		} else {
			counts.other++;
		}
	}

	const totalFiles = files.length;
	return (Object.entries(counts) as Array<[DashboardFileTypeMetric["type"], number]>)
		.map(([type, count]) => ({
			type,
			percentage: totalFiles > 0 ? (count / totalFiles) * 100 : 0,
		}));
}

export function getDashboardRecentActivities(
	files: TFile[],
	limit = 10
): DashboardRecentActivity[] {
	const activities: DashboardRecentActivity[] = [];

	for (const file of files) {
		activities.push({
			type: "created",
			name: file.basename,
			path: file.path,
			timestamp: file.stat.ctime,
		});

		if (file.stat.mtime > file.stat.ctime) {
			activities.push({
				type: "edited",
				name: file.basename,
				path: file.path,
				timestamp: file.stat.mtime,
			});
		}
	}

	return activities
		.sort((first, second) => second.timestamp - first.timestamp)
		.slice(0, Math.max(0, limit));
}

function getAverageWords(points: DashboardDailyWordsPoint[]): number {
	return points.reduce((total, point) => total + point.words, 0) / points.length;
}

function toLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
