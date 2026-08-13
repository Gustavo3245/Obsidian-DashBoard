import { VaultMetrics } from "models/VaultMetrics";
import { FileMetrics } from "models/FileMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { TFile} from "obsidian";
import { SessionService } from "./SessionService";
import { VaultService } from "./VaultService";
import { MetadataAnalyzer } from "analyzer/MetadataAnalyzer";
import { StateManager } from "state/StateManager";

export class StatsCalculator {
	constructor(private vaultService: VaultService,
				private metadataAnalyzer: MetadataAnalyzer,
				private sessionService: SessionService,
				private stateManager: StateManager){}

	getActiveMinutes(): number {
		return this.sessionService.getActiveMinutes();
	}
	 
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
		
		const filesMetrics = await Promise.all(
			relevantFiles.map((file) => this.vaultService.getFilesMetrics(file))
		);

		return {
			totalCharacters: filesMetrics.reduce((total, file) => total + file.characters, 0),
			totalWords: filesMetrics.reduce((total, file) => total + file.words, 0),
			totalSentences: filesMetrics.reduce((total, file) => total + file.sentences, 0)
		};
	}

	async updateSnapshotMetrics(file: TFile): Promise<VaultMetrics['volume']['snapshot']> {
		const metrics = await this.getFileMetrics(file);

		return {
			totalCharacters: metrics.characters,
			totalWords: metrics.words,
			totalSentences: metrics.sentences,
		}
	}

	async getVolumeMetrics(range: TimeRange): Promise<VaultMetrics['volume']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		const filesMetrics = await Promise.all(
			relevantFiles.map((file) => this.vaultService.getFilesMetrics(file))
		);

		const chars = filesMetrics.reduce((total, file) => total + file.characters, 0);
		const words = filesMetrics.reduce((total, file) => total + file.words, 0);
		const sentences = filesMetrics.reduce((total, file) => total + file.sentences, 0);

		return {
			snapshot: {
				totalCharacters: chars,
				totalWords: words,
				totalSentences: sentences
			},
			totalMarkdownFiles: this.vaultService.getTotalMarkdownFiles(),
			totalFiles: this.vaultService.getTotalFiles(),
			totalFolders: this.vaultService.getTotalFolders(),
			totalAttachments: this.vaultService.getTotalAttachments(),
			totalOrphansFiles: this.vaultService.getTotalOrphansFiles(relevantFiles),
			totalVaultSize: this.vaultService.getTotalVaultSize(),
			averageWordsPerFile: await this.vaultService.getAverageWordsPerFile(relevantFiles)
		};
	}

	async getEstimatesMetric(range: TimeRange): Promise<VaultMetrics['estimates']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);
		const dailyMetrics = this.vaultService.getDailyMetricsByRange(
			range,
			this.stateManager.getDailyMetricsState()
		);

		const [estimatedReading, estimatedSpeaking] = await Promise.all([
			this.vaultService.getVaultEstimateReadingTime(relevantFiles),
			this.vaultService.getEstimatedSpeakingTime(relevantFiles)
		]);

		return {
			estimatedReadingTime: estimatedReading,
			estimatedSpeakingTime: estimatedSpeaking,
			dailyAverageWords: this.vaultService.calculateDailyAverageWords(dailyMetrics)
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
		const activeDates = this.vaultService.getActiveDates(
			range,
			this.stateManager.getDailyMetricsState()
		);

		return {
			streakCount: this.vaultService.calculateStreakCount(activeDates),
			longestStreak: this.vaultService.calculateLongestStreak(activeDates)
		}
	}

	async storageValuesMetrics(range: TimeRange): Promise<VaultMetrics['storageValues']> {
		const dailyMetrics = this.vaultService.getDailyMetricsByRange(
			range,
			this.stateManager.getDailyMetricsState()
		);

		return {
			mostActiveDay: this.vaultService.calculateMostActiveDay(dailyMetrics),
			mostActiveWeek: this.vaultService.calculateMostActiveWeek(dailyMetrics),
			mostActiveMonth: this.vaultService.calculateMostActiveMonth(dailyMetrics)
		}
	}

}
