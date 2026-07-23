import { VaultMetrics } from "models/VaultMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import { FileMetrics } from "models/FileMetrics";
import { VaultMapper } from "mappers/VaultMapper";

export type StateListener = () => void;

export class StateManager {
	private vaultMetricsState: VaultMetrics;
	private dailyMetricsHistory: Record<string, DailyMetrics>;
	private fileStatsCacheState: Map<string, FileMetrics> = new Map();

	private listeners: StateListener[] = [];
	private saveTimeout: NodeJS.Timeout | null = null;

	constructor(
		initialVaultData: VaultMetrics | null,
		initialDailyHistory: Record<string, DailyMetrics> | null,
		private persistCallback: () => Promise<void>
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
	}

	public emitNewState(patch: Partial<VaultMetrics>) {
		this.vaultMetricsState = VaultMapper.mapToVaultMetrics({
			...this.vaultMetricsState,
			...patch
		});

	}

	public getDailyMetricsState(): Record<string, DailyMetrics> {
		return this.dailyMetricsHistory;
	}

	public getDailyMetricsByDate(date: string): DailyMetrics {
		return this.dailyMetricsHistory[date] ?? VaultMapper.getEmptyDailyMetrics();
	}

	public emitNewDailyMetrics(date: string, patch: Partial<DailyMetrics>) {
		const dailyHistory = this.getDailyMetricsByDate(date);

		this.dailyMetricsHistory[date] = VaultMapper.mapToDailyMetrics({
			...dailyHistory,
			...patch,
			date: date
		});
	}

}
