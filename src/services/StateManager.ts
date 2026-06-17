import { VaultMetrics } from "models/VaultMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import { FileMetrics } from "models/FileMetrics";
import { VaultMapper } from "mappers/VaultMapper";

export class StateManager {
	private vaultMetricsState: VaultMetrics;
	private dailyMetricsState: DailyMetrics;
	private fileStatsCacheState: Map<string, FileMetrics> = new Map();

	constructor(){
		this.vaultMetricsState = VaultMapper.getEmptyVaultMetrics();
		this.dailyMetricsState = VaultMapper.getEmptyDailyMetrics();
	}

	public getVaultMetricsState(): VaultMetrics {
		return this.vaultMetricsState;
	}

	public getDailyMetricsState(): DailyMetrics {
		return this.dailyMetricsState;
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

	public emitNewDailyState(patch: Partial<DailyMetrics>) {
		this.dailyMetricsState = VaultMapper.mapToDailyMetrics({
			...this.dailyMetricsState,
			...patch
		})
	} 

}
