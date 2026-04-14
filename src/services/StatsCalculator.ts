import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { TFile } from "obsidian";

export class StatsCalculator {
	constructor(private vaultService: VaultService){}
	
	async getSnapshot(range: TimeRange): Promise<VaultMetrics['volume']['snapshot']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		const [chars, words] = await Promise.all([
			this.vaultService.getTotalCharacters(relevantFiles),
			this.vaultService.getTotalWords(relevantFiles)
		])
		return {
			totalCharacters: chars, totalWords: words
		};
	}

	async updateSnapshotMetrics(file: TFile): Promise<VaultMetrics['volume']['snapshot']> {

		const [chars, words] = await Promise.all([
			this.vaultService.getTotalCharacters([file]),
			this.vaultService.getTotalWords([file])
		])

		return {
			totalCharacters: chars, totalWords: words
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
				totalWords: words
			},
			totalSentences: sentences,
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
			mostAppearsTagInFrontMatter: this.vaultService.getMostAppearsTagInFrontMatter(relevantFiles),
			minorAppearsTag: "Nothing but Wind",
			totalUniqueTags: this.vaultService.getTotalUniqueTags(relevantFiles),
			mostActiveFolder: "Nothing but Wind",
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
