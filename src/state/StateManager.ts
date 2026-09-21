import { VaultMetrics } from "models/VaultMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import { FileMetrics } from "models/FileMetrics";
import { VaultMapper } from "mappers/VaultMapper";
import { DailyMapper } from "mappers/DailyMapper";
import { Logger } from "utils/Logger";

export type StateListener = () => void;

export class StateManager {
	private vaultMetricsState: VaultMetrics;
	private dailyMetricsHistory: Record<string, DailyMetrics>;
	private fileStatsCacheState: Map<string, FileMetrics> = new Map();
	private filePreviewCacheState: Map<string, FileMetrics> = new Map();
	private stateListeners: Set<StateListener> = new Set();

	private saveTimeout: number | null = null;
	private persistQueue: Promise<void> = Promise.resolve();

	constructor(
		initialVaultData: VaultMetrics,
		initialDailyHistory: Record<string, DailyMetrics>,
		private persistCallback: (data: { vaultMetrics: VaultMetrics, dailyHistory: Record<string, DailyMetrics> }) => Promise<void>
	){
		this.vaultMetricsState = VaultMapper.mapToVaultMetrics(initialVaultData ?? {});
		this.dailyMetricsHistory = {};
		for (const date of Object.keys(initialDailyHistory ?? {})) {
			const metrics = initialDailyHistory[date];
			if (metrics !== undefined) {
				this.dailyMetricsHistory[date] = DailyMapper.mapToDailyMetrics({
					...metrics,
					date,
				});
			}
		}
	}

	public getVaultMetricsState(): VaultMetrics {
		return this.vaultMetricsState;
	}

	public getFileStatsPerPath(path: string,): FileMetrics | undefined {
		return this.fileStatsCacheState.get(path);
	}

	public getFilesStats() {
		return this.fileStatsCacheState.values();
	}

	public setFileCache(path: string, stats: FileMetrics) {
		this.fileStatsCacheState.set(path, stats);
	}

	public removeFileCache(path: string) {
		this.fileStatsCacheState.delete(path);
		this.filePreviewCacheState.delete(path);
	}

	public getFilePreview(path: string): FileMetrics | undefined {
		return this.filePreviewCacheState.get(path);
	}

	public setFilePreview(path: string, stats: FileMetrics): void {
		this.filePreviewCacheState.set(path, stats);
	}

	public subscribe(listener: StateListener): () => void {
		this.stateListeners.add(listener);
		return () => this.stateListeners.delete(listener);
	}

	public getDailyMetricsState(): Record<string, DailyMetrics> {
		return this.dailyMetricsHistory;
	}

	public getDailyMetricsByDate(date: string): DailyMetrics {
		return this.dailyMetricsHistory[date] ?? DailyMapper.getEmptyDailyMetrics();
	}

	public emitNewDailyMetrics(date: string, patch: Partial<DailyMetrics>) {
		const dailyHistory = this.getDailyMetricsByDate(date);

		this.dailyMetricsHistory[date] = DailyMapper.mapToDailyMetrics({
			...dailyHistory,
			...patch,
			date: date
		});

		Logger.state("daily metrics emitted", {
			date,
			patch,
			state: this.dailyMetricsHistory[date],
		});
		this.notifyListeners();
		this.triggerSave();
	}

	/** Fill absent or empty content totals without replacing tracked values. */
	public mergeMissingDailyContentMetrics(
		dailyMetrics: Record<string, DailyMetrics>
	): number {
		let changedDates = 0;

		for (const date of Object.keys(dailyMetrics)) {
			const metrics = dailyMetrics[date];
			if (metrics === undefined) {
				continue;
			}
			const current = this.dailyMetricsHistory[date];
			const currentHasContent = current !== undefined
				&& (current.words > 0
					|| current.characters > 0
					|| current.sentences > 0);
			const incomingHasContent = metrics.words > 0
				|| metrics.characters > 0
				|| metrics.sentences > 0;

			if (currentHasContent || (current !== undefined && !incomingHasContent)) {
				continue;
			}

			const reconciled = DailyMapper.mapToDailyMetrics({
				...current,
				date,
				words: metrics.words,
				characters: metrics.characters,
				sentences: metrics.sentences,
				timeMetrics: current?.timeMetrics ?? metrics.timeMetrics,
			});

			this.dailyMetricsHistory[date] = reconciled;
			changedDates++;
		}

		if (changedDates === 0) {
			return 0;
		}

		Logger.state("historical daily metrics merged", { changedDates });
		this.notifyListeners();
		this.triggerSave();
		return changedDates;
	}
	
	public emitNewState(patch: Partial<VaultMetrics>) {
		this.vaultMetricsState = VaultMapper.mapToVaultMetrics({
			...this.vaultMetricsState,
			...patch
		});

		Logger.state("vault metrics emitted", {
			patch,
			state: this.vaultMetricsState,
		});
		this.notifyListeners();
		this.triggerSave();
	}

	private notifyListeners(): void {
		for (const listener of this.stateListeners) {
			listener();
		}
	}

	private triggerSave() {

		if (this.saveTimeout !== null){
			window.clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = window.setTimeout(() => {
			this.saveTimeout = null;
			void this.persist().catch((error: unknown) => {
				Logger.state("state persistence failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, 2000);

	}

	private async persist(): Promise<void> {
		const snapshot = {
			vaultMetrics: this.vaultMetricsState,
			dailyHistory: { ...this.dailyMetricsHistory },
		};
		const previousPersist = this.persistQueue.catch(() => undefined);
		const currentPersist = previousPersist.then(() =>
			this.persistCallback(snapshot)
		);
		this.persistQueue = currentPersist;
		await currentPersist;

		Logger.state("state persisted", {
			vaultMetrics: snapshot.vaultMetrics,
			dailyHistory: snapshot.dailyHistory,
		});

	}

	public async flushPendingSave(): Promise<void> {
		if (this.saveTimeout !== null) {
			window.clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}

		await this.persist();
	}
}
