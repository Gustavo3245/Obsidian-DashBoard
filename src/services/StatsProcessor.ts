import { FileMetrics } from "models/FileMetrics";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { VaultMapper } from "mappers/VaultMapper";
import { TFile } from "obsidian";

export class StatProcessor {
	private VaultMetricsState: VaultMetrics;
	private activeFileMetricsState: FileMetrics;

	constructor(private vaultService: VaultService) {
		this.VaultMetricsState = VaultMapper.getEmptyVaultMetrics();
		this.activeFileMetricsState = VaultMapper.getEmptyActiveFileMetrics();
	}

	getVaultMetricsState() {
		return this.VaultMetricsState;
	}

	private emitNewState(patch: Partial<VaultMetrics>) {
		this.VaultMetricsState = VaultMapper.mapToVaultMetrics({
			...this.VaultMetricsState,
			...patch
		});
	}

	async snapshotLoad(range: TimeRange) {
		const snapshot = await this.getSnapshot(range);

		this.emitNewState({
			volume: {
				...this.VaultMetricsState.volume,
				snapshot: snapshot
			}
		})
	}

	async updateSnapshotLoad(file: TFile) {
		const updatedSnapshot = await this.updateSnapshotMetrics(file);

		this.emitNewState({
			volume: {
				...this.VaultMetricsState.volume,
				snapshot: updatedSnapshot
			}
		})
	}

	async VaultLoad(range: TimeRange) {

		const [volume, estimates, appears, streak, storage] = await Promise.all([
			this.getVolumeMetrics(range),
			this.getEstimatesMetric(range),
			this.getAppearsMetrics(range),
			this.getStreakMetrics(range),
			this.storageValuesMetrics(range)
		])

		this.emitNewState({
			volume: volume,
			estimates: estimates,
			appears: appears,
			streak: streak,
			storageValues: storage
		});
	}

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
