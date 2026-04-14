import { Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
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
				this.handleCharactersModify(AbstractFile);
			})
		);

		// this.plugin.registerEvent(
		// 	this.plugin.app.vault.on('modify', (file) => { 
		// 		if(file instanceof TFile && file.extension === 'md'){
		// 			this.handleTextModify(file);
		// 		}
		// 	})
		// );

		this.plugin.registerEvent(
			this.plugin.app.vault.on('create', (AbstractFile) => {
				this.handleCreateModify(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('delete', (file) => this.handleDeletedModify())
		);
	}

	private async handleCharactersModify(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			clearTimeout(this.debounceTimeout);

			this.debounceTimeout = setTimeout(async () => {
				await this.processor.updateSnapshotLoad(AbstractFile);
			}, 250);
		}

		else if(AbstractFile instanceof TFolder) {
			clearTimeout(this.debounceTimeout);

			this.debounceTimeout = setTimeout(async () => {
				await this.processor.updateVolumeLoad();
			}, 500);
		}
	}


	// private async handleTextModify(activeFile: TFile) {
	// 	clearTimeout(this.debounceTimeout);

	// 	this.debounceTimeout = setTimeout(async () => {
	// 		await this.processor.updateSnapshotLoad(activeFile);
	// 	}, 500);

	// }

	private async handleCreateModify(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			clearTimeout(this.debounceTimeout);

			this.debounceTimeout = setTimeout(async () => {
				await this.processor.updateVolumeLoad();
			}, 1000);
		}
	}

	private async handleDeletedModify() {
		clearTimeout(this.debounceTimeout);

		this.debounceTimeout = setTimeout(async () => {
			await this.processor.updateFilesMetrics();
		}, 1000)
	}
}
