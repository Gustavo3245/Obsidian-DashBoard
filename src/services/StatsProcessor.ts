import { FileMetrics } from "models/FileMetrics";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";
import { TimeRange } from "models/value_objects/TimeRange";
import { VaultMapper } from "mappers/VaultMapper";
import { TFile } from "obsidian";
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

	async updateVolumeLoad() {

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
