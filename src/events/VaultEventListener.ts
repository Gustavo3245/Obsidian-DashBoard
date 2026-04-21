import { TAbstractFile, TFile, TFolder } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "services/StatsProcessor";

export class VaultEventListener {
	constructor(private plugin: DashboardPlugin,
		private processor: StatProcessor
	) {}

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
			const start = performance.now();
			await this.processor.updateSnapshotLoad(AbstractFile);
			const end = performance.now();
			console.log(`função executada em: ${(end - start).toFixed(2)} ms`)
		}

	}

	private async handleAbstractFileCreation(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			console.log(`Evento disparado, criação de arquivo`)
			await this.processor.processNewMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder) {
			console.log(`Evento disparado, criação de pastas`)
			await this.processor.processFolders(AbstractFile);
		}
	}

	private async handleAbstractFileDeletion(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			console.log(`Evento disparado, deletando arquivo`)
			await this.processor.processDeletedMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder){
			console.log(`Evento disparado, deletando pasta`)
			await this.processor.processFolders(AbstractFile);
		}
	}
}
