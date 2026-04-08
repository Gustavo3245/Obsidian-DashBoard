import { TFile } from "obsidian";
import { ReadingTime } from "./value_objects/ReadingTime";
import { tagType } from "./value_objects/TagType";

export interface VaultMetrics {

	// Quantitative metrics relating to numerical values.
	volume: {
		snapshot: {
		totalCharacters: number; // Done
		totalWords: number; // Done
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
		estimatedReadingTime: ReadingTime | string; // Done
		estimatedSpeakingTime: ReadingTime | string; // Done
		dailyAverageWords: null | undefined;
	}
	// appearances
	appears: {
		mostAppearsTag: tagType | string; // Done
		mostAppearsTagInFrontMatter: tagType | string; // Done
		minorAppearsTag: tagType | string;
		totalUniqueTags: number; // Done
		mostActiveFolder: null | undefined;
		lastModifiedFile: TFile | string; // Done
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
