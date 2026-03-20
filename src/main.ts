import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultService } from "./services/VaultService";

// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {
	vaultService: VaultService = new VaultService(this.app);

	async onload() {
        console.log("Plugin carregado!");

        // Exemplo de uso:
        const totalChars = await this.vaultService.calculateTotalCharacters();
        console.log(`Total de caracteres: ${totalChars}`);
		
		const totalTags = await this.vaultService.getMostAppearsTagInAllContent();
		console.log(`a tag com a maior aparição nos arquivos: ${totalTags.name} count: ${totalTags.count}`);
        
		const totalTagsFromFront = await this.vaultService.getMostAppearsTagInFrontMatter();
		console.log(`a tag com a maior aparição nos headers: ${totalTagsFromFront.name} count: ${totalTagsFromFront.count}`);



		this.addRibbonIcon('dice', 'Check Metrics', async () => {
            const chars = await this.vaultService.calculateTotalword();
            console.log(`Total de palavras: ${chars}`);
        });
    }
}

//class SampleModal extends Modal {}
