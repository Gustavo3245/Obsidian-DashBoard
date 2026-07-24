import { TimeRange } from "models/value_objects/TimeRange";
import { DailyMapper } from "mappers/DailyMapper";
import { moment, TFile, TFolder } from "obsidian";
import { StateManager } from "state/StateManager";
import { VaultService } from "services/VaultService";
import { StatsCalculator } from "services/StatsCalculator";

export class StatProcessor {

	constructor(private calculator: StatsCalculator,
				private vaultService: VaultService,
				private stateManager: StateManager) {} 

	async updatePreviewMetrics(path: string, data: string) {
		const currentFilePreview = this.stateManager.getFileStatsPerPath(path);

		const charactersPreview = data.length;
		const wordsPreview = this.vaultService.getTotalWordsFromMemory(data);

		const updatedFilePreview = DailyMapper.mapToFileMetrics({
			...currentFilePreview,
			characters: charactersPreview,
			words: wordsPreview
			}
		)
		this.stateManager.setFileCache(path, updatedFilePreview);
		console.log(this.stateManager.getFileStatsPerPath(path));
	}

	async dailyMetricsLoad(range: TimeRange) {

		const today = moment().format("YYYY-MM-DD");
		const dailyMetricsLoad = await this.calculator.getDailyMetrics(range);

		this.stateManager.emitNewDailyMetrics(today, {
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

		this.stateManager.emitNewState({
			volume: {
				...this.stateManager.getVaultMetricsState().volume,
				snapshot: snapshot
			}
		})
	}

	async updateSnapshotLoad(file: TFile) {
		const updatedSnapshot = await this.calculator.updateSnapshotMetrics(file);

		this.stateManager.emitNewState({
			volume: {
				...this.stateManager.getVaultMetricsState().volume,
				snapshot: updatedSnapshot
			}
		})
		console.log("new file state: ", this.stateManager.getVaultMetricsState().volume.snapshot);
	}

	async volumesLoad(range: TimeRange) {
		const volumeMetrics = await this.calculator.getVolumeMetrics(range);

		this.stateManager.emitNewState({
			...this.stateManager.getVaultMetricsState().volume,
			volume: volumeMetrics
		})
	}

	async processNewMarkdownFile(file: TFile) {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;
		const fileSnapshot = await this.calculator.updateSnapshotMetrics(file);

		this.stateManager.emitNewState({
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
		console.log("New file created: ", this.stateManager.getVaultMetricsState().volume);
	}


	async processDeletedMarkdownFile(file: TFile) {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;
		const cachedFileMetrics = this.stateManager.getFileStatsPerPath(file.path) ?? DailyMapper.getEmptyActiveFileMetrics();
		
		// -- NOTE Not every type of markDown file is a orphan file,
		// to fix this problem, (I have to repass the getTotalOrphanFiles again).
	
		this.stateManager.emitNewState({
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

		console.log("New file created: ", this.stateManager.getVaultMetricsState().volume);
	}

	async processFolders(tfolder: TFolder) {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				totalFolders: currentVolume.totalFolders,
				totalVaultSize: currentVolume.totalVaultSize,
			}
		})
		console.log("New folder state: ", this.stateManager.getVaultMetricsState().volume);
	}

	async VaultLoad(range: TimeRange) {
		const files = this.vaultService.getFilesByRange(range);

		await Promise.all(files.map(async (file) => {
			const stats = await this.calculator.getFileMetrics(file);
			this.stateManager.setFileCache(file.path, stats);
		}))
		
		const [volume, estimates, appears, streak, storage] = await Promise.all([
			this.calculator.getVolumeMetrics(range),
			this.calculator.getEstimatesMetric(range),
			this.calculator.getAppearsMetrics(range),
			this.calculator.getStreakMetrics(range),
			this.calculator.storageValuesMetrics(range)
		])

		this.stateManager.emitNewState({
			volume: volume,
			estimates: estimates,
			appears: appears,
			streak: streak,
			storageValues: storage
		});

		this.dailyMetricsLoad("all");
		console.log("Inital Value State: ", this.stateManager.getVaultMetricsState());
		console.log("Files Value State: ", this.stateManager.getFilesStats());
		console.log("DailyHistoryMetrics State:", this.stateManager.getDailyMetricsState());
	}
}
