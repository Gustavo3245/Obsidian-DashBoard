import { TAbstractFile, TFile, TFolder } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "services/StatsProcessor";

export class VaultEventListener {
	constructor(private plugin: DashboardPlugin,
		private processor: StatProcessor
	) {}

	private debounceTimeout: NodeJS.Timeout | null = null;

	public init() {

		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (AbstractFile) => {
				console.log(`event disparado: modify Markdown Event`);
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
			await this.processor.processNewMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder) {
			await this.processor.processNewFolder();
		}
	}

	private async handleAbstractFileDeletion(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			await this.processor.processDeletedMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder){
			await this.processor.processDeletedFolder();
		}
	}
}
