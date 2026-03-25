import { TFile } from "obsidian";
import { ReadingTime } from "./ReadingTime";
import { tagType } from "./TagType";

export interface VaultMetrics {

	// Metricas Quantitativas referentes a valores númericos.
	volume: {
		snapshot: {
		totalCharacters: number; 
		totalWords: number;
	}
		totalFiles: number;
		totalFolders: number;
		totalAttachments: number;
		totalOrphansFiles: number;
		totalFileSize: number;
		totalSentences: number;
		averageWordsPerFile: number;
	}

	estimatedReadingTime: ReadingTime;
	estimatedSpeakingTime: null | undefined;
	dailyAverageWords: null | undefined;

	mostAppearsTag: tagType | string;
	mostAppearsTagInFrontMatter: tagType | string;
	minorAppearsTag: tagType | string;
	totalUniqueTags: null | undefined;
	mostActiveFolder: null | undefined;
	lastModifiedFile: TFile | undefined;
	
	streakCount: null | undefined;
	longestStreak: null | undefined;

	mostActiveDay: null | undefined;
	mostActiveWeek: null | undefined;
	mostActiveMonth: null | undefined;
	
}
