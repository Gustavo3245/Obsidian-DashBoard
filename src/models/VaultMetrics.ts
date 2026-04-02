import { TFile } from "obsidian";
import { ReadingTime } from "./ReadingTime";
import { tagType } from "./TagType";

export interface VaultMetrics {

	// Quantitative metrics relating to numerical values.
	volume: {
		snapshot: {
		totalCharacters: Promise<number>; // Done
		totalWords: Promise<number>; // Done
	}
		totalFiles: number; // Done
		totalFolders: number; // Done
		totalAttachments: number; // Done
		totalOrphansFiles: number; // Done
		totalVaultSize: number; // Done
		totalSentences: number; // Done
		averageWordsPerFile: number; //Done
	}
	// Measurements related to estimates and time.
	estimates: {
		estimatedReadingTime: Promise<ReadingTime | string>; // Done
		estimatedSpeakingTime: Promise<ReadingTime | string>; // Done
		dailyAverageWords: null | undefined;
	}
	// appearances
	appears: {
		mostAppearsTag: tagType | string; // Done
		mostAppearsTagInFrontMatter: tagType | string; // Done
		minorAppearsTag: tagType | string;
		totalUniqueTags: null | undefined;
		mostActiveFolder: null | undefined;
		lastModifiedFile: TFile | null; // Done
		lastModifiedFiles: string[] | null; // Done
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
