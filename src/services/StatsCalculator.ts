import { VaultMetrics } from "models/VaultMetrics";
import { FileMetrics } from "models/FileMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { TFile} from "obsidian";
import { SessionService } from "./SessionService";
import { VaultService } from "./VaultService";
import { MetadataAnalyzer } from "analyzer/MetadataAnalyzer";

export class StatsCalculator {
	constructor(private vaultService: VaultService,
				private metadataAnalyzer: MetadataAnalyzer,
				private sessionService: SessionService){}
	 
	async getFileMetrics(file: TFile): Promise<FileMetrics> {
		const fileMetrics = await this.vaultService.getFilesMetrics(file);

		return {
			name: file.name,
			path: file.path,
			fileSize: file.stat.size,
			characters: fileMetrics.characters,
			words: fileMetrics.words,
			sentences: fileMetrics.sentences,
			readingTime: fileMetrics.readingTime,
			isOrphanFile: fileMetrics.isOrphanFile
		}
	}

	async getDailyMetrics(range: TimeRange): Promise<DailyMetrics> {
		const snapshotValues = await this.getSnapshot(range);

		return {
			date: new Date().toLocaleDateString('pt-BR'),
			words: snapshotValues.totalWords,
			characters: snapshotValues.totalCharacters,
			sentences: snapshotValues.totalSentences,
			timeMetrics: {
				activeMinutes: this.sessionService.getActiveMinutes(),
				sessions: 1
			}
		}
	}

	async updateDailyMetrics(file: TFile): Promise<DailyMetrics> {
		const updateSnapshot = await this.updateSnapshotMetrics(file);

		return {
			date: new Date().toLocaleDateString('pt-BR'),
			words: updateSnapshot.totalWords,
			characters: updateSnapshot.totalCharacters,
			sentences: updateSnapshot.totalSentences,
			timeMetrics: {
				activeMinutes: this.sessionService.getActiveMinutes(),
				sessions: 1
			}
		}
	}

	async getSnapshot(range: TimeRange): Promise<VaultMetrics['volume']['snapshot']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		const [chars, words, sentences] = await Promise.all([
			this.vaultService.getTotalCharacters(relevantFiles),
			this.vaultService.getTotalWords(relevantFiles),
			this.vaultService.getTotalSentences(relevantFiles)
		])
		return {
			totalCharacters: chars, totalWords: words, totalSentences: sentences
		};
	}

	async updateSnapshotMetrics(file: TFile): Promise<VaultMetrics['volume']['snapshot']> {

		const [chars, words, sentences] = await Promise.all([
			this.vaultService.getTotalCharacters([file]),
			this.vaultService.getTotalWords([file]),
			this.vaultService.getTotalSentences([file])
		])

		return {
			totalCharacters: chars, totalWords: words, totalSentences: sentences
		}
	}

	async getVolumeMetrics(range: TimeRange): Promise<VaultMetrics['volume']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		const [chars, words, sentences] = await Promise.all([
			this.vaultService.getTotalCharacters(relevantFiles),
			this.vaultService.getTotalWords(relevantFiles),
			this.vaultService.getTotalSentences(relevantFiles)
		]);

		return {
			snapshot: {
				totalCharacters: chars,
				totalWords: words,
				totalSentences: sentences
			},
			totalMarkdownFiles: this.vaultService.getTotalMarkdownFiles(),
			totalFiles: this.vaultService.getTotalFiles(),
			totalFolders: this.vaultService.getTotalFoldes(),
			totalAttachments: this.vaultService.getTotalAttachments(),
			totalOrphansFiles: this.vaultService.getTotalOrphansFiles(relevantFiles),
			totalVaultSize: this.vaultService.getTotalVaultSize(relevantFiles),
			averageWordsPerFile: await this.vaultService.getAverageWordsPerFile(relevantFiles)
		};
	}

	async getEstimatesMetric(range: TimeRange): Promise<VaultMetrics['estimates']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		const [estimatedReading, estimatedSpeaking] = await Promise.all([
			this.vaultService.getVaultEstimateReadingTime(relevantFiles),
			this.vaultService.getEstimatedSpeakingTime(relevantFiles)
		]);

		return {
			estimatedReadingTime: estimatedReading,
			estimatedSpeakingTime: estimatedSpeaking,
			dailyAverageWords: null
		}
	}

	async getAppearsMetrics(range: TimeRange): Promise<VaultMetrics['appears']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			mostAppearsTag: this.vaultService.getMostAppearsTagInAllContent(relevantFiles),
			mostAppearsTagInFrontMatter: this.metadataAnalyzer.getMostAppearsTagInFrontMatter(relevantFiles),
			minorAppearsTag: this.metadataAnalyzer.getMinorAppearsTagInFrontMatter(relevantFiles),
			totalUniqueTags: this.metadataAnalyzer.getTotalUniqueTags(relevantFiles),
			mostActiveFolder: this.vaultService.mostActiveFolder(),
			lastModifiedFile: this.vaultService.getLastModifiedMarkDownFile(),
			lastModifiedFiles: this.vaultService.getActiveMarkDownFiles(),

		}
	}

	async getStreakMetrics(range: TimeRange): Promise<VaultMetrics['streak']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			streakCount: null,
			longestStreak: null
		}
	}

	async storageValuesMetrics(range: TimeRange): Promise<VaultMetrics['storageValues']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			mostActiveDay: null,
			mostActiveWeek: null,
			mostActiveMonth: null
		}
	}

}
