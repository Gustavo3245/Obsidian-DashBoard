import { TAbstractFile, TFile, TFolder } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "orchestrators/StatsProcessor";
import { SessionService } from "services/SessionService";

export class VaultEventListener {

	constructor(private plugin: DashboardPlugin,
		private sessionService: SessionService,
		private processor: StatProcessor
	) {}

	public init() {

		this.plugin.registerEvent(
			this.plugin.app.workspace.on('quick-preview', (AbstractFile: TFile, data: string) => {
				this.sessionService.pingActivity();
				this.handlePreviewAbsctractFile(AbstractFile, data);
			})
		)
		
		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (AbstractFile) => {
				this.sessionService.pingActivity();
				this.handleAbstractFileModification(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('create', (AbstractFile) => {
				this.sessionService.pingActivity();
				this.handleAbstractFileCreation(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('delete', (AbstractFile) => {
				this.sessionService.pingActivity();
				this.handleAbstractFileDeletion(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on("rename", (abstractFile, oldPath) => {
				this.sessionService.pingActivity();

				if (abstractFile instanceof TFile) {
					this.processor.processRenamedFile(abstractFile, oldPath);
				} else if (abstractFile instanceof TFolder) {
					this.processor.processFolders();
				}
			})
		);

	}

	private async handleAbstractFileModification(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			await this.processor.updateSnapshotLoad(AbstractFile);
		} else if (AbstractFile instanceof TFile) {
			this.processor.processModifiedAttachment();
		}

	}

	private async handleAbstractFileCreation(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			await this.processor.processNewMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder) {
			this.processor.processFolders();
		} 

		else if (AbstractFile instanceof TFile) {
			this.processor.processNewAttachment(AbstractFile);
		}
	}

	private async handleAbstractFileDeletion(AbstractFile: TAbstractFile) {

		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			await this.processor.processDeletedMarkdownFile(AbstractFile);
		}

		else if(AbstractFile instanceof TFolder){
			this.processor.processFolders();
		}

		else if (AbstractFile instanceof TFile) {
			this.processor.processDeletedAttachment(AbstractFile);
		}
	}

	private async handlePreviewAbsctractFile(AbstractFile: TAbstractFile, data: string) {
		if(AbstractFile instanceof TFile && AbstractFile.extension === 'md'){
			this.processor.updatePreviewMetrics(AbstractFile.path, data);
		}
		
	}
}
