import { TFile } from "obsidian";

interface VaultMetrics {

	characterCount: number; //Count every character in the entiry vault.
	wordCount: number;
	fileCount: number; 

	lastModifiedFile: TFile | null;
	mostAppearsTag: String | null;

	orphanFilesCount: number | 0;
	attachmentsCount: number;

	readTimeEstimate: number;

}
