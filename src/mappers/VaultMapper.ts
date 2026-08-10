import { VaultMetrics } from "models/VaultMetrics";

export class VaultMapper {
	
	static getEmptyVaultMetrics(): VaultMetrics {
		return {
			volume: {
				snapshot: { totalCharacters: 0, totalWords: 0, totalSentences: 0 },
				totalMarkdownFiles: 0,
				totalFiles: 0,
				totalFolders: 0,
				totalAttachments: 0,
				totalOrphansFiles: 0,
				totalVaultSize: 0,
				averageWordsPerFile: 0,
			},
			estimates: {
				estimatedReadingTime: "Nothing but Wind",
				estimatedSpeakingTime: "Nothing but Wind",
				dailyAverageWords: null,
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
		};
	}

	static mapToVaultMetrics(data: Partial<VaultMetrics>): VaultMetrics {
		const empty = this.getEmptyVaultMetrics();
		
		return {
            ...empty,
            ...data,
            volume: { ...empty.volume, ...data.volume },
            estimates: { ...empty.estimates, ...data.estimates },
            appears: { ...empty.appears, ...data.appears },
			streak: { ...empty.streak, ...data.streak},
			storageValues: { ...empty.storageValues, ...data.storageValues}
        };
	}
}
