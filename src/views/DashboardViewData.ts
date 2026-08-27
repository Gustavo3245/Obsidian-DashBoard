import { TFile } from "obsidian";

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
