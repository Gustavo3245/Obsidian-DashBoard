import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from 'services/VaultService';
import { StatProcessor } from 'orchestrators/StatsProcessor';
import { VaultCommands } from 'commands/VaultCommands';
import { VaultMapper } from 'mappers/VaultMapper';
import { VaultEventListener } from './events/VaultEventListener';
import { SessionService } from 'services/SessionService';
import { StateManager } from 'state/StateManager';
import { StatsCalculator } from 'services/StatsCalculator';
import { DEFAULT_STORAGE_DATA, StorageData } from 'datas/VaultMetricData';
import { MetadataAnalyzer } from 'analyzer/MetadataAnalyzer';


// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {

	private vaultService: VaultService;
	private statsProcessor: StatProcessor;
	private vaultCommands: VaultCommands;
	private vaultMapper: VaultMapper;
	private vaultEvent: VaultEventListener;
	private sessionService: SessionService;
	private StatsCalculator: StatsCalculator;
	private stateManager: StateManager;
	private vaultMetricData: StorageData;
	private metadataAnalyzer: MetadataAnalyzer;


	async onload() {
		await this.loadSettings();

		this.vaultService = new VaultService(this.app);
		this.sessionService = new SessionService(this.app);
		this.metadataAnalyzer = new MetadataAnalyzer(this.app);
		
		this.stateManager = new StateManager(
			this.vaultMetricData.vaultMetrics,
			this.vaultMetricData.dailyHistory,
			async () => { await this.saveSettings();}
		);

		this.StatsCalculator = new StatsCalculator(
			this.vaultService,
			this.metadataAnalyzer,
			this.sessionService
		)

		this.statsProcessor = new StatProcessor(this.StatsCalculator, this.vaultService, this.stateManager);	
		this.vaultCommands = new VaultCommands(this, this.statsProcessor);
		this.vaultEvent = new VaultEventListener(this, this.sessionService, this.statsProcessor);

		this.vaultEvent.init();	
		this.sessionService.startTracking();
		await this.statsProcessor.VaultLoad('all');

		await this.saveSettings();
	}

	async loadSettings() {
		const dataFromDisk = await this.loadData();
		this.vaultMetricData = Object.assign({}, DEFAULT_STORAGE_DATA, dataFromDisk);
	}

	async saveSettings(){

		const dataToSave: StorageData = {
			vaultMetrics: this.stateManager.getVaultMetricsState(),
			dailyHistory: this.stateManager.getDailyMetricsState(),
			settings: this.vaultMetricData.settings
		};

		await this.saveData(dataToSave);
	}

}

