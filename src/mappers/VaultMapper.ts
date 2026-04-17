import { VaultMetrics } from "models/VaultMetrics";
import { FileMetrics } from "models/FileMetrics";
import { TFile } from "obsidian";
import { ReadingTime } from "models/value_objects/ReadingTime";

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
			streak: { streakCount: null, longestStreak: null },
			storageValues: { mostActiveDay: null, mostActiveWeek: null, mostActiveMonth: null }
		};
	}

	static getEmptyActiveFileMetrics(): FileMetrics {
		return {
			name: "Nothing But Wind",
			path: "Nothing But Wind",
			characters: 0,
			words: 0,
			sentences: 0,
			fileSize: 0,
			isOrphanFile: true,
			readingTime: {
				hours: 0,
				minutes: 0,
				seconds: 0,
				totalSeconds: 0
			}
		}
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
	
	
	static mapToFileMetrics(file: FileMetrics): FileMetrics {
		return {
			name: file.name,
			path: file.path,
			characters: file.characters,
			words: file.words,
			sentences: file.sentences,
			fileSize: file.fileSize,
			isOrphanFile: file.isOrphanFile,
			readingTime: file.readingTime
		};
	}
}
