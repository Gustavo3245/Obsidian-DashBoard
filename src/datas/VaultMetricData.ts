import { VaultMetrics } from "models/VaultMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import {DashboardSettings, DEFAULT_SETTINGS} from "models/DashboardSettings";

export interface StorageData {
    vaultMetrics: VaultMetrics;
    dailyHistory: Record<string, DailyMetrics>; 
    settings: DashboardSettings;
}

export const DEFAULT_STORAGE_DATA: StorageData = {
    vaultMetrics: {
        volume: {
            snapshot: { totalCharacters: 0, totalWords: 0, totalSentences: 0 },
            totalMarkdownFiles: 0,
            totalFiles: 0,
            totalFolders: 0,
            totalAttachments: 0,
            totalOrphansFiles: 0,
            totalVaultSize: 0,
            averageWordsPerFile: 0
        },
		estimates: {
			estimatedReadingTime: "Nothing but Wind",
			estimatedSpeakingTime: "Nothing but Wind",
			dailyAverageWords: null
		},
		appears: {
			mostAppearsTag: "Nothing but Wind",
			mostAppearsTagInFrontMatter: "Nothing but Wind",
			minorAppearsTag: "Nothing but Wind",
			totalUniqueTags: 0,
			mostActiveFolder: "Nothing but Wind",
			lastModifiedFile: "Nothing but Wind",
			lastModifiedFiles: "Nothing but Wind",
		},
		streak: {
			streakCount: 0,
			longestStreak: 0
		},
		storageValues: { 
			mostActiveDay: null,
			mostActiveWeek: null,
			mostActiveMonth: null
		}
	},
    dailyHistory: {},
    settings: DEFAULT_SETTINGS,
};
