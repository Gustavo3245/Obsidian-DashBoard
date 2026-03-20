// All metrics in this interface are related to the current file. 
// (It doesn't make much sense to provide global metrics in the status bar.)

export interface statusBarMetrics {
	
	readtimeEstimate: Date | null;
	lastTimeModifying: Date | null;

	// Default Values
	wordCount: number;
	characterCount: number;

	currentTime: Date | null;
	timeWriting: Date | null;
}
