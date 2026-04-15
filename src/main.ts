import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from "./services/VaultService";
import { StatProcessor } from 'services/StatsProcessor';
import { VaultCommands } from 'commands/VaultCommands';
import { VaultMapper } from 'mappers/VaultMapper';


// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {

	private vaultService: VaultService;
	private statsProcessor: StatProcessor;
	private vaultCommands: VaultCommands;
	private VaultMapper: VaultMapper;

	async onload() {

		this.vaultService = new VaultService(this.app);
		this.statsProcessor = new StatProcessor(this.vaultService);	
		this.vaultCommands = new VaultCommands(this, this.statsProcessor);

		await this.statsProcessor.volumesLoad('all');

		this.vaultCommands.register();
	}
	async unload() {
	    
	}
}

//class SampleModal extends Modal {}
