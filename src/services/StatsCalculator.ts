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
		const contentMetrics = await this.vaultService.getFileContentMetrics(file);

		return {
			name: file.name,
			path: file.path,
			fileSize: file.stat.size,
			characters: contentMetrics.characters,
			words: contentMetrics.words,
			sentences: contentMetrics.sentences,
			readingTime: this.vaultService.getEstimatedReadingTime(contentMetrics.words),
			isOrphanFile: this.vaultService.isOrphanFile(file)
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

	/**
	 * Estimate daily content totals for the days before the current local day.
	 * Each Markdown file contributes its current content metrics to the local day
	 * represented by its last modification timestamp.
	 */
	async getHistoricalDailyMetrics(
		days: number,
		today = new Date()
	): Promise<Record<string, DailyMetrics>> {
		const normalizedDays = Number.isFinite(days)
			? Math.max(0, Math.floor(days))
			: 0;
		const startOfToday = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		);
		const firstDay = new Date(startOfToday);
		firstDay.setDate(startOfToday.getDate() - normalizedDays);
		const endOfPreviousDay = new Date(startOfToday.getTime() - 1);
		const history: Record<string, DailyMetrics> = {};

		for (let offset = normalizedDays; offset >= 1; offset--) {
			const date = new Date(startOfToday);
			date.setDate(startOfToday.getDate() - offset);
			const dateKey = this.toLocalDateKey(date);
			history[dateKey] = {
				date: dateKey,
				words: 0,
				characters: 0,
				sentences: 0,
				timeMetrics: {
					activeMinutes: 0,
					sessions: 0,
				},
			};
		}

		if (normalizedDays === 0) {
			return history;
		}

		const files = this.vaultService.getFilesByCustomRange(
			firstDay,
			endOfPreviousDay
		);
		const filesMetrics = await Promise.all(files.map(async (file) => ({
			dateKey: this.toLocalDateKey(new Date(file.stat.mtime)),
			metrics: await this.vaultService.getFileContentMetrics(file),
		})));

		for (const { dateKey, metrics } of filesMetrics) {
			const dailyMetrics = history[dateKey];
			if (!dailyMetrics) {
				continue;
			}

			dailyMetrics.words += metrics.words;
			dailyMetrics.characters += metrics.characters;
			dailyMetrics.sentences += metrics.sentences;
		}

		return history;
	}

	async getSnapshot(range: TimeRange): Promise<VaultMetrics['volume']['snapshot']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);
		
		const filesMetrics = await Promise.all(
			relevantFiles.map((file) => this.getFileMetrics(file))
		);

		return {
			totalCharacters: filesMetrics.reduce((total, file) => total + file.characters, 0),
			totalWords: filesMetrics.reduce((total, file) => total + file.words, 0),
			totalSentences: filesMetrics.reduce((total, file) => total + file.sentences, 0)
		};
	}

	async getVolumeMetrics(range: TimeRange): Promise<VaultMetrics['volume']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		const filesMetrics = await Promise.all(
			relevantFiles.map((file) => this.getFileMetrics(file))
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

		const totalWords = await this.vaultService.getTotalWords(relevantFiles);
		const estimatedReading = this.vaultService.getEstimatedReadingTime(totalWords);
		const estimatedSpeaking = this.vaultService.getEstimatedSpeakingTime(totalWords);

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
			mostActiveFolder: this.vaultService.mostActiveFolder(relevantFiles),
			lastModifiedFile: this.vaultService.getLastModifiedMarkDownFile(relevantFiles),
			lastModifiedFiles: this.vaultService.getActiveMarkDownFiles(relevantFiles),
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

	private toLocalDateKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

}
