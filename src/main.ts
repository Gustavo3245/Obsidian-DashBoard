import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from "./services/VaultService";

// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {
	vaultService: VaultService = new VaultService(this.app);

	async onload() {
        console.log("Plugin carregado!");

        const totalChars = await this.vaultService.calculateTotalCharacters();
        console.log(`Total de caracteres: ${totalChars}`);
		
		const totalWords = await this.vaultService.calculateTotalword();
        console.log(`Total de palavras: ${totalWords}`);

		const totalTags = await this.vaultService.getMostAppearsTagInAllContent();
		console.log(`a tag com a maior aparição nos arquivos: ${totalTags.name} count: ${totalTags.count}`);
        
		const totalTagsFromFront = await this.vaultService.getMostAppearsTagInFrontMatter();
		console.log(`a tag com a maior aparição nos headers: ${totalTagsFromFront.name} count: ${totalTagsFromFront.count}`);

		const estimateTime = await this.vaultService.getVaultEstimateReadingTime(totalWords);
		console.log(`estimate Time: ${estimateTime.totalSeconds}`);

		this.addRibbonIcon('dice', 'Check Metrics', async () => {
            const chars = await this.vaultService.calculateTotalword();
            console.log(`Total de palavras: ${chars}`);
        });

		const lastFile = await this.vaultService.getLastModifiedMarkDownFile();
		console.log(`last file: ${lastFile}`);

    }
	async unload() {
	    
	}
}

//class SampleModal extends Modal {}
