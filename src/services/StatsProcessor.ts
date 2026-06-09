import { FileMetrics } from "models/FileMetrics";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { VaultMapper } from "mappers/VaultMapper";
import { TFile, TFolder } from "obsidian";
import { StatsCalculator } from "./StatsCalculator";
import { SessionService } from "./SessionService";
import { DailyMetrics } from "models/DailyMetrics";

export class StatProcessor {
	private VaultMetricsState: VaultMetrics;
	private dailyMetrics: DailyMetrics;
	private calculator: StatsCalculator;
	private fileStatsCache: Map<string, FileMetrics> = new Map();

	constructor(private vaultService: VaultService,
		private sessionService: SessionService) {

		this.calculator = new StatsCalculator(vaultService, sessionService);
		this.VaultMetricsState = VaultMapper.getEmptyVaultMetrics();
		this.dailyMetrics = VaultMapper.getEmptyDailyMetrics();

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

	private emitNewDailyState(patch: Partial<DailyMetrics>) {
		this.dailyMetrics = VaultMapper.mapToDailyMetrics({
			...this.dailyMetrics,
			...patch
		})
	}

	async dailyMetricsLoad(range: TimeRange) {
		const dailyMetricsLoad = await this.calculator.getDailyMetrics(range);

		this.emitNewDailyState({
			...this.dailyMetrics,
			date: dailyMetricsLoad.date,
			words: dailyMetricsLoad.words,
			sentences: dailyMetricsLoad.sentences,
			characters: dailyMetricsLoad.characters,
			timeMetrics: {
				activeMinutes: dailyMetricsLoad.timeMetrics.activeMinutes,
				sessions: dailyMetricsLoad.timeMetrics.sessions
			}
		})
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
				snapshot: { 
					totalCharacters: currentVolume.snapshot.totalCharacters + fileSnapshot.totalCharacters,
					totalWords: currentVolume.snapshot.totalWords + fileSnapshot.totalWords,
					totalSentences: currentVolume.snapshot.totalSentences + fileSnapshot.totalSentences
					},
				totalMarkdownFiles: currentVolume.totalMarkdownFiles + 1,
				totalFiles: currentVolume.totalFiles + 1,
				totalFolders: currentVolume.totalFolders, 
				totalAttachments: currentVolume.totalAttachments, 
				totalOrphansFiles: currentVolume.totalOrphansFiles + (this.vaultService.isOrphanFile(file) ? 1 : 0),
				totalVaultSize: currentVolume.totalVaultSize + file.stat.size, 
				averageWordsPerFile: (currentVolume.snapshot.totalWords / currentVolume.totalFiles)
			}
		})
		console.log("New file created: ", this.getVaultMetricsState().volume);
	}


	async processDeletedMarkdownFile(file: TFile) {
		const currentVolume = this.VaultMetricsState.volume;
		const cachedFileMetrics = this.fileStatsCache.get(file.path) ?? VaultMapper.getEmptyActiveFileMetrics();
		
		// -- NOTE Not every type of markDown file is a orphan file,
		// to fix this problem, (I have to repass the getTotalOrphanFiles again).
	
		this.emitNewState({
			volume: {
				...currentVolume,
				snapshot: {
					totalWords: currentVolume.snapshot.totalWords - cachedFileMetrics.words,
					totalCharacters: currentVolume.snapshot.totalCharacters - cachedFileMetrics.characters,
					totalSentences: currentVolume.snapshot.totalSentences - cachedFileMetrics.sentences
				},
				totalMarkdownFiles: currentVolume.totalMarkdownFiles - 1,
				totalFiles: currentVolume.totalFiles - 1,
				totalFolders: currentVolume.totalFolders,
				totalAttachments: currentVolume.totalAttachments,
				totalOrphansFiles: currentVolume.totalOrphansFiles - (cachedFileMetrics.isOrphanFile ? 1 : 0),
				totalVaultSize: currentVolume.totalVaultSize - cachedFileMetrics.fileSize, 
				averageWordsPerFile: (currentVolume.snapshot.totalWords / currentVolume.totalFiles)
			}
		})

		console.log("New file created: ", this.getVaultMetricsState().volume);
	}

	async processFolders(tfolder: TFolder) {
		const currentVolume = this.VaultMetricsState.volume;

		this.emitNewState({
			volume: {
				...currentVolume,
				totalFolders: currentVolume.totalFolders,
				totalVaultSize: currentVolume.totalVaultSize,
			}
		})
		console.log("New folder state: ", this.getVaultMetricsState().volume);
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
		console.log("Files Value State: ", this.fileStatsCache);
	}

}
