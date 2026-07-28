import { TimeRange } from "models/value_objects/TimeRange";
import { DailyMapper } from "mappers/DailyMapper";
import { moment, TFile } from "obsidian";
import { StateManager } from "state/StateManager";
import { VaultService } from "services/VaultService";
import { StatsCalculator } from "services/StatsCalculator";

export class StatProcessor {

	constructor(private calculator: StatsCalculator,
				private vaultService: VaultService,
				private stateManager: StateManager) {} 

	updatePreviewMetrics(path: string, data: string): void {
		
		const currentFilePreview = this.stateManager.getFilePreview(path)
			?? this.stateManager.getFileStatsPerPath(path);

		const previewMetrics = this.vaultService.getContentMetricsFromMemory(data);

		const updatedFilePreview = DailyMapper.mapToFileMetrics({
			...currentFilePreview,
			characters: previewMetrics.characters,
			words: previewMetrics.words,
			sentences: previewMetrics.sentences,
			}
		)

		this.stateManager.setFilePreview(path, updatedFilePreview);
	}

	async startDailySession(range: TimeRange): Promise<void> {
		
		const today = moment().format("YYYY-MM-DD");
		const dailyMetricsLoad = await this.calculator.getDailyMetrics(range);
		const currentDailyMetrics = this.stateManager.getDailyMetricsByDate(today);

		this.stateManager.emitNewDailyMetrics(today, {
			date: today,
			words: dailyMetricsLoad.words,
			sentences: dailyMetricsLoad.sentences,
			characters: dailyMetricsLoad.characters,
			timeMetrics: {
				activeMinutes: dailyMetricsLoad.timeMetrics.activeMinutes,
				sessions: currentDailyMetrics.timeMetrics.sessions + 1,
			}
		});
	}

	refreshActiveTime(): void {

		const today = moment().format("YYYY-MM-DD");
		const currentDailyMetrics = this.stateManager.getDailyMetricsByDate(today);

		this.stateManager.emitNewDailyMetrics(today, {
			timeMetrics: {
				...currentDailyMetrics.timeMetrics,
				activeMinutes: this.calculator.getActiveMinutes(),
			},
		});
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

	async updateSnapshotLoad(file: TFile): Promise<void> {
		
		const currentVolume = this.stateManager.getVaultMetricsState().volume;
		const previousFileMetrics = this.stateManager.getFileStatsPerPath(file.path);
		const updatedFileMetrics = await this.calculator.getFileMetrics(file);
		
		const previousWords = previousFileMetrics?.words ?? 0;
		const previousCharacters = previousFileMetrics?.characters ?? 0;
		const previousSentences = previousFileMetrics?.sentences ?? 0;
		const previousSize = previousFileMetrics?.fileSize ?? 0;
		const previousOrphanCount = previousFileMetrics?.isOrphanFile ? 1 : 0;
		const updatedOrphanCount = updatedFileMetrics.isOrphanFile ? 1 : 0;

		const totalWords = Math.max(
			0,
			currentVolume.snapshot.totalWords + updatedFileMetrics.words - previousWords
		);

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				snapshot: {
					totalCharacters: Math.max(0, currentVolume.snapshot.totalCharacters
							+ updatedFileMetrics.characters
							- previousCharacters ),
					totalWords,
					totalSentences: Math.max(0, currentVolume.snapshot.totalSentences
							+ updatedFileMetrics.sentences
							- previousSentences ),
				},

				totalOrphansFiles: Math.max(0, currentVolume.totalOrphansFiles
						+ updatedOrphanCount
						- previousOrphanCount ),
				totalVaultSize: Math.max(0, currentVolume.totalVaultSize
						+ updatedFileMetrics.fileSize
						- previousSize ),
				averageWordsPerFile: currentVolume.totalMarkdownFiles > 0
						? totalWords / currentVolume.totalMarkdownFiles
						: 0,
			}
		});

		this.stateManager.setFileCache(file.path, updatedFileMetrics);
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
		const fileMetrics = await this.calculator.getFileMetrics(file);
		
		const totalWords = currentVolume.snapshot.totalWords + fileMetrics.words;
		const totalMarkdownFiles = currentVolume.totalMarkdownFiles + 1;

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				snapshot: { 
					totalCharacters: currentVolume.snapshot.totalCharacters + fileMetrics.characters,
					totalWords,
					totalSentences: currentVolume.snapshot.totalSentences + fileMetrics.sentences
				},

				totalMarkdownFiles,
				totalFiles: currentVolume.totalFiles + 1,
				totalOrphansFiles: currentVolume.totalOrphansFiles + (fileMetrics.isOrphanFile ? 1 : 0),
				totalVaultSize: currentVolume.totalVaultSize + fileMetrics.fileSize,
				averageWordsPerFile: totalWords / totalMarkdownFiles,
			}
		});

		this.stateManager.setFileCache(file.path, fileMetrics);
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

	}
}
