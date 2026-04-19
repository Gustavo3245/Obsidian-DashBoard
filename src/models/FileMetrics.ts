import { ReadingTime } from "./value_objects/ReadingTime";

export interface FileMetrics {
	
	// Actual TFile Metrics: Name and Path.
	name: string;
	path: string;

	// Relating to the file itself.	
	characters: number;
	words: number;
	sentences: number;
	
	// Has the propose for the new volume calculation.
	readingTime: ReadingTime | string;
	fileSize: number;
	isOrphanFile: Boolean;
}
