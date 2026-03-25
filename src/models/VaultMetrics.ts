import { TFile } from "obsidian";
import { ReadingTime } from "./ReadingTime";
import { tagType } from "./TagType";

export interface VaultMetrics {

	// Quantitative metrics relating to numerical values.
	volume: {
		snapshot: {
		totalCharacters: number; // Done
		totalWords: number; // Done
	}
		totalFiles: number; // Done
		totalFolders: number; // Done
		totalAttachments: number;
		totalOrphansFiles: number;
		totalFileSize: number;
		totalSentences: number;
		averageWordsPerFile: number;
	}
	// Measurements related to estimates and time.
	estimates: {
		estimatedReadingTime: ReadingTime; // Done
		estimatedSpeakingTime: null | undefined;
		dailyAverageWords: null | undefined;
	}
	// appearances
	appears: {
		mostAppearsTag: tagType | string; // Done
		mostAppearsTagInFrontMatter: tagType | string; // Done
		minorAppearsTag: tagType | string;
		totalUniqueTags: null | undefined;
		mostActiveFolder: null | undefined;
		lastModifiedFile: TFile | undefined; // Done
		lastModifiedFiles: string[] | null;
	}
	// streak
	streak: {
		streakCount: null | undefined;
		longestStreak: null | undefined;
	}
	// values that should be saved by the user obsidian.
	storageValues : {
		mostActiveDay: null | undefined;
		mostActiveWeek: null | undefined;
		mostActiveMonth: null | undefined;
	}
	
}
