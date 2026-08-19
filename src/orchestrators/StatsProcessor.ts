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

		const totalWords = Math.max(0,
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

	async estimatesLoad(range: TimeRange): Promise<void> {
		const estimatesMetrics = await this.calculator.getEstimatesMetric(range);

		this.stateManager.emitNewState({
			estimates: estimatesMetrics
		});
	}

	async appearsLoad(range: TimeRange): Promise<void> {
		const appearsMetrics = await this.calculator.getAppearsMetrics(range);

		this.stateManager.emitNewState({
			appears: appearsMetrics
		});
	}

	async streakLoad(range: TimeRange): Promise<void> {
		const streakMetrics = await this.calculator.getStreakMetrics(range);

		this.stateManager.emitNewState({
			streak: streakMetrics
		});
	}

	async storageValuesLoad(range: TimeRange): Promise<void> {
		const storageValuesMetrics = await this.calculator.storageValuesMetrics(range);

		this.stateManager.emitNewState({
			storageValues: storageValuesMetrics
		});
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
		
		const totalWords = Math.max(0, currentVolume.snapshot.totalWords - cachedFileMetrics.words);
		const totalMarkdownFiles = Math.max(0, currentVolume.totalMarkdownFiles - 1);

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				snapshot: {
					totalWords,
					totalCharacters: Math.max(0, currentVolume.snapshot.totalCharacters - cachedFileMetrics.characters),
					totalSentences: Math.max(0,currentVolume.snapshot.totalSentences - cachedFileMetrics.sentences)
				},

				totalMarkdownFiles,
				totalFiles: Math.max(0, currentVolume.totalFiles - 1),
				totalOrphansFiles: Math.max(0, currentVolume.totalOrphansFiles - (cachedFileMetrics.isOrphanFile ? 1 : 0)),
				totalVaultSize: Math.max(0, currentVolume.totalVaultSize - cachedFileMetrics.fileSize),
				averageWordsPerFile: totalMarkdownFiles > 0 ? totalWords / totalMarkdownFiles : 0,
			}
		});

		this.stateManager.removeFileCache(file.path);
	}

	processFolders(): void {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				totalFolders: this.vaultService.getTotalFolders(),
			}
		});
	}

	processNewAttachment(file: TFile): void {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				totalFiles: currentVolume.totalFiles + 1,
				totalAttachments: currentVolume.totalAttachments + 1,
				totalVaultSize: currentVolume.totalVaultSize + file.stat.size,
			}
		});
	}

	processDeletedAttachment(file: TFile): void {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				totalFiles: Math.max(0, currentVolume.totalFiles - 1),
				totalAttachments: Math.max(0, currentVolume.totalAttachments - 1),
				totalVaultSize: Math.max(0, currentVolume.totalVaultSize - file.stat.size),
			}
		});
	}

	processModifiedAttachment(): void {
		const currentVolume = this.stateManager.getVaultMetricsState().volume;

		this.stateManager.emitNewState({
			volume: {
				...currentVolume,
				totalVaultSize: this.vaultService.getTotalVaultSize(),
			}
		});
	}

	async processRenamedFile(file: TFile, oldPath: string): Promise<void> {
		
		if (file.extension !== "md") {
			return;
		}

		const cachedMetrics = this.stateManager.getFileStatsPerPath(oldPath);
		this.stateManager.removeFileCache(oldPath);

		if (cachedMetrics) {
			this.stateManager.setFileCache(file.path, {
				...cachedMetrics,
				name: file.name,
				path: file.path,
			});
			return;
		}

		this.stateManager.setFileCache(
			file.path,
			await this.calculator.getFileMetrics(file)
		);
	}

	/**
	 * Recalculate and emit metrics derived from the current metadata cache
	 * for Markdown files inside the selected range.
	 */
	async refreshMetadataMetrics(range: TimeRange) {
		const appears = await this.calculator.getAppearsMetrics(range);

		this.stateManager.emitNewState({
			appears,
		});
	}

	async vaultLoad(range: TimeRange) {
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
