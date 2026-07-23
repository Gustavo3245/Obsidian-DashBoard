import { DailyMetrics } from "models/DailyMetrics";
import { FileMetrics } from "models/FileMetrics";

export class DailyMapper {

	static getEmptyActiveFileMetrics(): FileMetrics {
		return {
			name: "Nothing But Wind",
			path: "Nothing But Wind",
			characters: 0,
			words: 0,
			sentences: 0,
			fileSize: 0,
			isOrphanFile: true,
			readingTime: {
				hours: 0,
				minutes: 0,
				seconds: 0,
				totalSeconds: 0
			}
		}
	}

	static getEmptyDailyMetrics(): DailyMetrics {
		return {
			date: "Nothing but Wind",
			words: 0,
			characters: 0,
			sentences: 0,
			timeMetrics: {
				activeMinutes: 0,
				sessions: 0
			}
		}
	}

	static mapToFileMetrics(file: Partial<FileMetrics>): FileMetrics {
		const empty = this.getEmptyActiveFileMetrics();

		return {
			...empty,
			...file,
			name: file.name ?? empty.name,
			path: file.path ?? empty.path,
			characters: file.characters ?? empty.characters,
			words: file.words ?? empty.words,
			sentences: file.sentences ?? empty.sentences,
			fileSize: file.fileSize ?? empty.fileSize,
			isOrphanFile: file.isOrphanFile ?? empty.isOrphanFile,
			readingTime: file.readingTime ?? empty.readingTime
		};
	}

	static mapToDailyMetrics(dailyMetrics: Partial<DailyMetrics>): DailyMetrics {
		const empty = this.getEmptyDailyMetrics();

		return {
			...empty,
			...dailyMetrics,
			date: dailyMetrics.date ?? empty.date,
			words: dailyMetrics.words ?? empty.words,
			characters: dailyMetrics.characters ?? empty.characters,
			sentences: dailyMetrics.sentences ?? empty.sentences,
			timeMetrics: {...empty.timeMetrics, ...dailyMetrics.timeMetrics}
		}
	}
}
