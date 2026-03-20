import { TFile } from "obsidian";

export interface VaultMetrics {

	characterCount: number; 
	wordCount: number;
	fileCount: number; 

	lastModifiedFile: TFile | null;
	mostAppearsTag: String | null;

	orphanFilesCount: number | 0;
	attachmentsCount: number;

	readTimeEstimate: number;

}
