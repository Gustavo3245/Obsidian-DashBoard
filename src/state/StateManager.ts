import { VaultMetrics } from "models/VaultMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import { FileMetrics } from "models/FileMetrics";
import { VaultMapper } from "mappers/VaultMapper";
import { DailyMapper } from "mappers/DailyMapper";

export type StateListener = () => void;

export class StateManager {
	private vaultMetricsState: VaultMetrics;
	private dailyMetricsHistory: Record<string, DailyMetrics>;
	private fileStatsCacheState: Map<string, FileMetrics> = new Map();
	private filePreviewCacheState: Map<string, FileMetrics> = new Map();

	private saveTimeout: number | null = null;

	constructor(
		initialVaultData: VaultMetrics,
		initialDailyHistory: Record<string, DailyMetrics>,
		private persistCallback: (data: { vaultMetrics: VaultMetrics, dailyHistory: Record<string, DailyMetrics> }) => Promise<void>
	){
		this.vaultMetricsState = initialVaultData ?? VaultMapper.getEmptyVaultMetrics();
		this.dailyMetricsHistory = initialDailyHistory ?? {};
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

		this.triggerSave();
	}
	
	public emitNewState(patch: Partial<VaultMetrics>) {
		this.vaultMetricsState = VaultMapper.mapToVaultMetrics({
			...this.vaultMetricsState,
			...patch
		});

		this.triggerSave();
	}

	private triggerSave() {

		if (this.saveTimeout !== null){
			window.clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = window.setTimeout(() => {
			this.saveTimeout = null;
			void this.persist();
		}, 2000);

	}

	private async persist(): Promise<void> {
		await this.persistCallback({
			vaultMetrics: this.vaultMetricsState,
			dailyHistory: this.dailyMetricsHistory
		});
	}

	public async flushPendingSave(): Promise<void> {
		if (this.saveTimeout === null) {
			return;
		}

		window.clearTimeout(this.saveTimeout);
		this.saveTimeout = null;
		await this.persist();
	}
}
