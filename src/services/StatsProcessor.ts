import { FileMetrics } from "models/FileMetrics";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { VaultMapper } from "mappers/VaultMapper";
import { TFile, TFolder } from "obsidian";
import { StatsCalculator } from "./StatsCalculator";

export class StatProcessor {
	private VaultMetricsState: VaultMetrics;
	private calculator: StatsCalculator;
	private fileStatsCache: Map<string, FileMetrics> = new Map();

	constructor(private vaultService: VaultService) {
		this.calculator = new StatsCalculator(vaultService);
		this.VaultMetricsState = VaultMapper.getEmptyVaultMetrics();
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
		console.log("new file state: ", this.getVaultMetricsState().volume.snapshot);
	}

	async volumesLoad(range: TimeRange) {
		const volumeMetrics = await this.calculator.getVolumeMetrics(range);

		this.emitNewState({
			...this.VaultMetricsState.volume,
			volume: volumeMetrics
		})
	}

	async processNewMarkdownFile(file: TFile) {
		const currentVolume = this.VaultMetricsState.volume;
		const fileSnapshot = await this.calculator.updateSnapshotMetrics(file);

		this.emitNewState({
			volume: {
				...currentVolume,
				totalMarkdownFiles: currentVolume.totalFiles + 1, // Done
				totalFiles: currentVolume.totalFiles + 1, // Done
				totalFolders: currentVolume.totalFolders, // Done
				totalAttachments: currentVolume.totalAttachments, // Done
				totalOrphansFiles: currentVolume.totalOrphansFiles + (this.vaultService.isOrphanFile(file) ? 1 : 0), // Done
				totalVaultSize: currentVolume.totalVaultSize + file.stat.size, // Done
				averageWordsPerFile: currentVolume.averageWordsPerFile, // need to be fixed
				snapshot: { // Done
					totalCharacters: currentVolume.snapshot.totalCharacters + fileSnapshot.totalCharacters,
					totalWords: currentVolume.snapshot.totalWords + fileSnapshot.totalWords,
					totalSentences: currentVolume.snapshot.totalSentences + fileSnapshot.totalSentences
				}
			}
		})
	}

	async processNewFolder() {
		const currentVolume = this.VaultMetricsState.volume;

		this.emitNewState({
			volume: {
				...currentVolume,
				totalFolders: currentVolume.totalFolders + 1,
			}
		})
	}

	async processDeletedMarkdownFile(file: TFile) {
		const currentVolume = this.VaultMetricsState.volume;

		const cachedFileMetrics = this.fileStatsCache.get(file.path) ?? VaultMapper.getEmptyActiveFileMetrics();
		
		// -- NOTE Not every type of markDown file is a orphan file,
		// to fix this problem, (I have to repass the getTotalOrphanFiles again).
	
		this.emitNewState({
			volume: {
				...currentVolume,
				totalMarkdownFiles: currentVolume.totalFiles - 1, // Done
				totalFiles: currentVolume.totalFiles - 1, // Done
				totalFolders: currentVolume.totalFolders, // Done
				totalAttachments: currentVolume.totalAttachments, // Done
				totalOrphansFiles: currentVolume.totalOrphansFiles - (cachedFileMetrics.isOrphanFile ? 1 : 0), // Done
				totalVaultSize: currentVolume.totalVaultSize - cachedFileMetrics.fileSize, // Done
				averageWordsPerFile: currentVolume.averageWordsPerFile, // need to be fixed
				snapshot: {
					totalWords: currentVolume.snapshot.totalWords - cachedFileMetrics.words,
					totalCharacters: currentVolume.snapshot.totalCharacters - cachedFileMetrics.characters,
					totalSentences: currentVolume.snapshot.totalSentences - cachedFileMetrics.sentences
				}
			}
		})
	}

	async processDeletedFolder() {

	}

	async VaultLoad(range: TimeRange) {

		const files = this.vaultService.getFilesByRange(range);

		await Promise.all(files.map(async (file) => {
			const stats = await this.calculator.getFileMetrics(file);
			this.fileStatsCache.set(file.path, stats);
		}))
		
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
		console.log("Inital Value State: ", this.getVaultMetricsState());
	}

}
