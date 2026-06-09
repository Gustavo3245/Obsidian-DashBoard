import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from "./services/VaultService";
import { StatProcessor } from 'services/StatsProcessor';
import { VaultCommands } from 'commands/VaultCommands';
import { VaultMapper } from 'mappers/VaultMapper';
import { VaultEventListener } from './events/VaultEventListener';
import { SessionService } from 'services/SessionService';


// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {

	private vaultService: VaultService;
	private statsProcessor: StatProcessor;
	private vaultCommands: VaultCommands;
	private VaultMapper: VaultMapper;
	private VaultEvent: VaultEventListener;
	private sessionService: SessionService

	async onload() {

		this.vaultService = new VaultService(this.app);
		this.sessionService = new SessionService(this.app);
		this.statsProcessor = new StatProcessor(this.vaultService, this.sessionService);	
		this.vaultCommands = new VaultCommands(this, this.statsProcessor);
		this.VaultEvent = new VaultEventListener(this, this.sessionService, this.statsProcessor);

		this.VaultEvent.init();	
		this.sessionService.startTracking();
		this.statsProcessor.VaultLoad('all');
	}
	async unload() {
		this.vaultService = null as any;
		this.statsProcessor = null as any;
		this.VaultEvent = null as any;
	    
	}

	async loadSettings() {

	}

	async saveData(data: any): Promise<void> {
	    
	}
}

//class SampleModal extends Modal {}
