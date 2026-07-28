import { TAbstractFile, TFile, TFolder } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "orchestrators/StatsProcessor";
import { SessionService } from "services/SessionService";
import { Logger } from "utils/Logger";

export class VaultEventListener {

	constructor(private plugin: DashboardPlugin,
		private sessionService: SessionService,
		private processor: StatProcessor
	) {}

	public init() {

		this.plugin.registerEvent(
			this.plugin.app.workspace.on('quick-preview', (AbstractFile: TFile, data: string) => {

				Logger.event("workspace.quick-preview", {
					path: AbstractFile.path,
					extension: AbstractFile.extension,
				});

				this.sessionService.pingActivity();
				void this.handlePreviewAbsctractFile(AbstractFile, data);
			})
		)
		
		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (AbstractFile) => {
				Logger.event("vault.modify", this.describeFile(AbstractFile));
				this.sessionService.pingActivity();
				void this.handleAbstractFileModification(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('create', (AbstractFile) => {
				Logger.event("vault.create", this.describeFile(AbstractFile));
				this.sessionService.pingActivity();
				void this.handleAbstractFileCreation(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on('delete', (AbstractFile) => {
				Logger.event("vault.delete", this.describeFile(AbstractFile));
				this.sessionService.pingActivity();
				void this.handleAbstractFileDeletion(AbstractFile);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.vault.on("rename", (abstractFile, oldPath) => {

				Logger.event("vault.rename", {
					...this.describeFile(abstractFile),
					oldPath,
				});

				this.sessionService.pingActivity();

				if (abstractFile instanceof TFile) {
					void this.processor.processRenamedFile(abstractFile, oldPath);
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

	private describeFile(abstractFile: TAbstractFile): Record<string, unknown> {
		return {
			path: abstractFile.path,
			type: abstractFile instanceof TFolder ? "folder" : "file",
			extension:
				abstractFile instanceof TFile
					? abstractFile.extension
					: undefined,
		};
	}
}
