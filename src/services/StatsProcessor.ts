import { TimeRange } from "models/TimeRange";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TFile } from "obsidian";

export class StatProcessor {
	constructor(private vaultService: VaultService) {}

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

	async updateSnapshotMetrics(files: TFile): Promise<VaultMetrics['volume']['snapshot']> {

		const [chars, words] = await Promise.all([
			this.vaultService.getTotalCharacters([files]),
			this.vaultService.getTotalWords([files])
		])

		return {
			totalCharacters: chars, totalWords: words
		}
	}

	async getVolumeMetrics(range: TimeRange): Promise<VaultMetrics['volume']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			snapshot: {
				totalCharacters: this.vaultService.getTotalCharacters(relevantFiles),
				totalWords: this.vaultService.getTotalWords(relevantFiles),
			},
			totalSentences: 0, // Not done yet
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

		return {
			estimatedReadingTime: this.vaultService.getVaultEstimateReadingTime(relevantFiles),
			estimatedSpeakingTime: this.vaultService.getEstimatedSpeakingTime(relevantFiles),
			dailyAverageWords: null
		}
	}

	async getAppearsMetrics(range: TimeRange): Promise<VaultMetrics['appears']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			mostAppearsTag: this.vaultService.getMostAppearsTagInAllContent(relevantFiles),
			mostAppearsTagInFrontMatter: this.vaultService.getMostAppearsTagInFrontMatter(relevantFiles),
			minorAppearsTag: "null",
			totalUniqueTags: this.vaultService.getTotalUniqueTags(relevantFiles),
			mostActiveFolder: null,
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
