import { ReadingTime } from "./value_objects/ReadingTime";
import { tagType } from "./value_objects/TagType";

export interface VaultMetrics {

	// Quantitative metrics relating to numerical values.
	volume: {
		snapshot: {
		totalCharacters: number; // Done
		totalWords: number; // Done
		totalSentences: number; // Done
	}
		totalMarkdownFiles: number; // Done
		totalFiles: number; //Done
		totalFolders: number; // Done
		totalAttachments: number; // Done
		totalOrphansFiles: number; // Done
		totalVaultSize: number; // Total size in bytes.
		averageWordsPerFile: number; //Done
	}
	// Measurements related to estimates and time.
	estimates: {
		estimatedReadingTime: ReadingTime | string; // Done
		estimatedSpeakingTime: ReadingTime | string; // Done
		dailyAverageWords: number;
	}
	// appearances
	appears: {
		mostAppearsTag: tagType | string; // Done
		mostAppearsTagInFrontMatter: tagType | string; // Done
		minorAppearsTag: tagType | string; // Done
		totalUniqueTags: number; // Done
		mostActiveFolder: string;
		lastModifiedFile: string; // Done
		lastModifiedFiles: string[] | string; // Done
	}
	// streak
	streak: {
		streakCount: number;
		longestStreak: number;
	}
	// values that should be saved by the user obsidian.
	storageValues : {
		mostActiveDay: string | null;
		mostActiveWeek: string | null;
		mostActiveMonth: string | null;
	}
}
