import { FileMetrics } from "models/FileMetrics";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { VaultMapper } from "mappers/VaultMapper";
import { TFile, TFolder } from "obsidian";
import { StatsCalculator } from "./StatsCalculator";

export class StatProcessor {
	private VaultMetricsState: VaultMetrics;
	private activeFileMetricsState: FileMetrics;
	private calculator: StatsCalculator;

	constructor(private vaultService: VaultService) {
		this.calculator = new StatsCalculator(vaultService);
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

		console.group(`Active State:`, this.getVaultMetricsState());
	}

	async snapshotLoad(range: TimeRange) {
		const snapshot = await this.calculator.getSnapshot(range);

		this.emitNewState({
			volume: {
				...this.VaultMetricsState.volume,
				snapshot: snapshot
			}
		})
	}

	async updateSnapshotLoad(file: TFile) {
		const updatedSnapshot = await this.calculator.updateSnapshotMetrics(file);

		this.emitNewState({
			volume: {
				...this.VaultMetricsState.volume,
				snapshot: updatedSnapshot
			}
		})
	}

	async volumesLoad(range: TimeRange) {
		const volumeMetrics = await this.calculator.getVolumeMetrics(range);

		this.emitNewState({
			...this.VaultMetricsState.volume,
			volume: volumeMetrics
		})
	}

	async processNewMarkdownFile(file: TFile) {
		const fileSnapshot = await this.calculator.updateSnapshotMetrics(file);
		const currentVolume = this.VaultMetricsState.volume;

		this.emitNewState({
			volume: {
				...currentVolume,
				totalMarkdownFiles: currentVolume.totalMarkdownFiles + 1,
				totalOrphansFiles: currentVolume.totalOrphansFiles + 1,
				snapshot: {
					totalCharacters: currentVolume.snapshot.totalCharacters = fileSnapshot.totalCharacters,
					totalWords: currentVolume.snapshot.totalWords = fileSnapshot.totalWords,
					totalSentences: currentVolume.snapshot.totalSentences = fileSnapshot.totalSentences
				}
			}
		})
	}

	async processNewFolder() {
		const currentVolume = this.VaultMetricsState.volume;

		this.emitNewState({
			volume: {
				...currentVolume,
				totalFolders: currentVolume.totalFolders + 1
			}
		})
	}

	// FIXME
	async processDeletedMarkdownFile(file: TFile) {
		const currentVolume = this.VaultMetricsState.volume;

		this.emitNewState({
			volume: {
				...currentVolume,
				totalMarkdownFiles: currentVolume.totalMarkdownFiles - 1,
				// -- NOTE Not every type of markDown file is a orphan file,
				// to fix this problem, (I have to repass the getTotalOrphanFiles again).
				totalOrphansFiles: currentVolume.totalOrphansFiles - 1,
				snapshot: {
					totalWords: currentVolume.snapshot.totalWords,
					totalCharacters: currentVolume.snapshot.totalCharacters,
					totalSentences: currentVolume.snapshot.totalSentences
				}
			}
		})
	}

	async processDeletedFolder() {

	}

	async VaultLoad(range: TimeRange) {

		const [volume, estimates, appears, streak, storage] = await Promise.all([
			this.calculator.getVolumeMetrics(range),
			this.calculator.getEstimatesMetric(range),
			this.calculator.getAppearsMetrics(range),
			this.calculator.getStreakMetrics(range),
			this.calculator.storageValuesMetrics(range)
		])

		this.emitNewState({
			volume: volume,
			estimates: estimates,
			appears: appears,
			streak: streak,
			storageValues: storage
		});
	}

}
