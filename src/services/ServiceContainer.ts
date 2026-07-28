import { StatProcessor } from "orchestrators/StatsProcessor";
import { StateManager } from "state/StateManager";
import { VaultService } from 'services/VaultService';
import { SessionService } from 'services/SessionService';
import { StatsCalculator } from 'services/StatsCalculator';
import { StorageData } from 'datas/VaultMetricData';
import { MetadataAnalyzer } from 'analyzer/MetadataAnalyzer';
import { App } from "obsidian";

export class ServiceContainer {

	public stateManager: StateManager;
	public statsProcessor: StatProcessor;
	public sessionService: SessionService;

	constructor(
		private app: App,
		private initialData: StorageData,
		private saveToDiskFn: (
			data: Pick<StorageData, "vaultMetrics" | "dailyHistory"> ) => Promise<void>
	) {}

	public initialize(): void {

		this.stateManager = new StateManager(
			this.initialData.vaultMetrics,
			this.initialData.dailyHistory,
			this.saveToDiskFn
		);

		const metadataAnalyzer = new MetadataAnalyzer(this.app);
		const vaultService = new VaultService(this.app);
		
		this.sessionService = new SessionService(
			this.initialData.settings.idleLimitMinutes
		);

		const statsCalculator = new StatsCalculator(
			vaultService,
			metadataAnalyzer,
			this.sessionService
		);

		this.statsProcessor = new StatProcessor(
			statsCalculator,
			vaultService,
			this.stateManager
		);

	}
}
