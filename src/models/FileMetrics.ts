import { ReadingTime } from "./value_objects/ReadingTime";

export interface FileMetrics {
	name: string;
	path: string;
	characters: number;
	words: number;
	sentences: number;
	readingTime: ReadingTime | string;
}
