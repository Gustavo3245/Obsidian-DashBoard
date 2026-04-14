import { TAbstractFile, TFile, TFolder } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "services/StatsProcessor";

export class VaultEventListener {
	constructor(private plugin: DashboardPlugin,
		private processor: StatProcessor
	) {}

	private debounceTimeout: NodeJS.Timeout;
	
	public init() {

		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (AbstractFile) => {
				this.handleAbstractFileModification(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('create', (AbstractFile) => {
				this.handleAbstractFileCreation(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('delete', (AbstractFile) => {
				this.handleAbstractFileDeletion(AbstractFile);
			})
		);
	}

	private async handleAbstractFileModification(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			clearTimeout(this.debounceTimeout);

			this.debounceTimeout = setTimeout(async () => {
				await this.processor.updateSnapshotLoad(AbstractFile);
			}, 250);
		}
	}

	private async handleAbstractFileCreation(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			await this.processor.processNewMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder) {
			await this.processor.processNewFolder();
		}
	}

	private async handleAbstractFileDeletion(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			
		}

		else if(AbstractFile instanceof TFolder){

		}
	}
}
