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
				dailyAverageWords: 0,
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
		const volume = data.volume;
		const estimates = data.estimates;
		const appears = data.appears;
		const streak = data.streak;
		const storageValues = data.storageValues;
		
		return {
			volume: {
				snapshot: {
					totalCharacters: volume?.snapshot?.totalCharacters ?? 0,
					totalWords: volume?.snapshot?.totalWords ?? 0,
					totalSentences: volume?.snapshot?.totalSentences ?? 0,
				},
				totalMarkdownFiles: volume?.totalMarkdownFiles ?? 0,
				totalFiles: volume?.totalFiles ?? 0,
				totalFolders: volume?.totalFolders ?? 0,
				totalAttachments: volume?.totalAttachments ?? 0,
				totalOrphansFiles: volume?.totalOrphansFiles ?? 0,
				totalVaultSize: volume?.totalVaultSize ?? 0,
				averageWordsPerFile: volume?.averageWordsPerFile ?? 0,
			},
			estimates: {
				estimatedReadingTime: estimates?.estimatedReadingTime
					?? empty.estimates.estimatedReadingTime,
				estimatedSpeakingTime: estimates?.estimatedSpeakingTime
					?? empty.estimates.estimatedSpeakingTime,
				dailyAverageWords: estimates?.dailyAverageWords ?? 0,
			},
			appears: {
				mostAppearsTag: appears?.mostAppearsTag ?? empty.appears.mostAppearsTag,
				mostAppearsTagInFrontMatter: appears?.mostAppearsTagInFrontMatter
					?? empty.appears.mostAppearsTagInFrontMatter,
				minorAppearsTag: appears?.minorAppearsTag ?? empty.appears.minorAppearsTag,
				totalUniqueTags: appears?.totalUniqueTags ?? 0,
				mostActiveFolder: appears?.mostActiveFolder ?? empty.appears.mostActiveFolder,
				lastModifiedFile: appears?.lastModifiedFile ?? empty.appears.lastModifiedFile,
				lastModifiedFiles: appears?.lastModifiedFiles ?? empty.appears.lastModifiedFiles,
			},
			streak: {
				streakCount: streak?.streakCount ?? 0,
				longestStreak: streak?.longestStreak ?? 0,
			},
			storageValues: {
				mostActiveDay: storageValues?.mostActiveDay ?? null,
				mostActiveWeek: storageValues?.mostActiveWeek ?? null,
				mostActiveMonth: storageValues?.mostActiveMonth ?? null,
			},
		};
	}
}
