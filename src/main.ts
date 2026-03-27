import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from "./services/VaultService";
import { StatProcessor } from 'services/StatsProcessor';
import { Logger } from 'utils/Logger';

// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {
	vaultService: VaultService = new VaultService(this.app);
	statsProcessor: StatProcessor = new StatProcessor(this.vaultService);

	async onload() {
		console.log("Plugin is load")
		const processor = await this.statsProcessor.getSnapshot('all');
		console.log(`the total character: ${processor.totalCharacters}`);
		console.log(`the total word: ${processor.totalWords}`);
		this.vaultService.getAvarageFileLength()
		this.vaultService.getTotalAttachments()
	}
	async unload() {
	    
	}
}

//class SampleModal extends Modal {}
