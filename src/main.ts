import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from "./services/VaultService";
import { StatProcessor } from 'services/StatsProcessor';
import { VaultCommands } from 'commands/VaultCommands';


// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {

	private vaultService: VaultService;
	private statsProcessor: StatProcessor;
	private vaultCommands: VaultCommands;

	async onload() {

		this.vaultService = new VaultService(this.app);
		this.statsProcessor = new StatProcessor(this.vaultService);
		
		this.vaultCommands = new VaultCommands(this, this.statsProcessor);


		this.vaultCommands.register();
		console.log("Plugin is load")
		const processor = await this.statsProcessor.getSnapshot('all');
		console.log(`the total character: ${processor.totalCharacters}`);
		console.log(`the total word: ${processor.totalWords}`);
		this.vaultService.getAvarageFileLength()
		this.vaultService.getTotalAttachments()
		this.vaultService.getTotalOrphansFiles('all');
	}
	async unload() {
	    
	}
}

//class SampleModal extends Modal {}
