import { CachedMetadata, TAbstractFile, TFile, TFolder } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "orchestrators/StatsProcessor";
import { SessionService } from "services/SessionService";
import { Logger } from "utils/Logger";

export class VaultEventListener {

	constructor(private plugin: DashboardPlugin,
		private sessionService: SessionService,
		private processor: StatProcessor
	) { }

	private metadataChangedTimer: number | null = null;
	/**
	 * Registers the Obsidian workspace and Vault events used by the plugin.
	 * Every event reports user activity to SessionService and delegates metric
	 * updates to the appropriate handler or StatProcessor operation.
	 *
	 * Registered events:
	 * - quick-preview: updates the in-memory preview metrics for a Markdown file.
	 * - modify: applies metric changes from a Markdown file or attachment.
	 * - create: adds metrics for a new Markdown file, attachment, or folder.
	 * - delete: removes metrics for a deleted Markdown file, attachment, or folder.
	 * - rename: moves a Markdown cache entry or reconciles the folder count.
	 *
	 * Plugin.registerEvent ensures that Obsidian removes these listeners when
	 * the plugin is unloaded.
	 */
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
				this.handleAbstractRenameFile(abstractFile, oldPath);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on("deleted", (file: TFile, previousCache: CachedMetadata) => {

				Logger.event("Metadata.deleted", {
					path: file.path,
					hasPreviousCache: previousCache
				})

				this.handleDeletedMetadata(file);
			})
		);

		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on("changed", (file: TFile, data: string, cache: CachedMetadata) => {

				Logger.event("MetadataChace.changed", {
					path: file.path,
				});

				this.handleChangedMetadata(file);
			})
		)

	}

	/**
	 * Registers DOM events that indicate active interaction with Obsidian.
	 * Keyboard input, pointer interaction, and window focus reset the idle
	 * timer through SessionService.pingActivity().
	 *
	 * Plugin.registerDomEvent ensures that Obsidian removes these listeners
	 * when the plugin is unloaded.
	 */
	public initActivityEvents(): void {
		this.plugin.registerDomEvent(activeDocument, "keydown", () => {
			Logger.event("activity.keydown");
			this.sessionService.pingActivity();
		});

		this.plugin.registerDomEvent(activeDocument, "pointerdown", () => {
			Logger.event("activity.pointerdown");
			this.sessionService.pingActivity();
		});

		this.plugin.registerDomEvent(window, "focus", () => {
			Logger.event("activity.focus");
			this.sessionService.pingActivity();
		});
	}

	/**
	 * Handles modifications to files in the Vault.
	 * Markdown files use their cached previous metrics to apply an incremental
	 * delta. Other files are treated as attachments and trigger a reconciliation
	 * of the total Vault size.
	 */
	private async handleAbstractFileModification(AbstractFile: TAbstractFile) {

		if (AbstractFile instanceof TFile && AbstractFile.extension === 'md') {
			await this.processor.updateSnapshotLoad(AbstractFile);
		} else if (AbstractFile instanceof TFile) {
			this.processor.processModifiedAttachment();
		}

	}

	/**
	 * Handles newly created Vault entries.
	 * Markdown files are analyzed and added to the file cache, folders update
	 * the folder count, and all other files update attachment metrics.
	 */
	private async handleAbstractFileCreation(AbstractFile: TAbstractFile) {

		if (AbstractFile instanceof TFile && AbstractFile.extension === 'md') {
			await this.processor.processNewMarkdownFile(AbstractFile);
		}

		else if (AbstractFile instanceof TFolder) {
			this.processor.processFolders();
		}

		else if (AbstractFile instanceof TFile) {
			this.processor.processNewAttachment(AbstractFile);
		}
	}

	/**
	 * Handles deleted Vault entries.
	 * Markdown metrics are removed using the last cached FileMetrics because
	 * deleted files may no longer be readable. Folders and attachments update
	 * their corresponding aggregate metrics.
	 */
	private async handleAbstractFileDeletion(AbstractFile: TAbstractFile) {

		if (AbstractFile instanceof TFile && AbstractFile.extension === 'md') {
			await this.processor.processDeletedMarkdownFile(AbstractFile);
		}

		else if (AbstractFile instanceof TFolder) {
			this.processor.processFolders();
		}

		else if (AbstractFile instanceof TFile) {
			this.processor.processDeletedAttachment(AbstractFile);
		}
	}

	/**
	 * Handles the current editor preview for a Markdown file.
	 * The unsaved text is analyzed in memory and stored in the preview cache,
	 * without replacing the confirmed metrics used for incremental deltas.
	 */
	private async handlePreviewAbsctractFile(AbstractFile: TAbstractFile, data: string) {
		if (AbstractFile instanceof TFile && AbstractFile.extension === 'md') {
			this.processor.updatePreviewMetrics(AbstractFile.path, data);
		}
	}

	private async handleAbstractRenameFile(abstractFile: TAbstractFile, oldPath: string) {

		if (abstractFile instanceof TFile) {
			this.processor.processRenamedFile(abstractFile, oldPath);
		}

		else if (abstractFile instanceof TFolder) {
			this.processor.processFolders();
		}
	}

	private async handleDeletedMetadata(file: TFile) {

		if (file.extension !== "md") {
			return;
		}

		await this.processor.refreshMetadataMetrics("all");
	}

	private async handleChangedMetadata(file: TFile) {

		if (file.extension !== "md") {
			return;
		}

		if (this.metadataChangedTimer !== null) {
			window.clearTimeout(this.metadataChangedTimer);
		}

		this.metadataChangedTimer = window.setTimeout(() => {
			this.metadataChangedTimer = null;
			this.processor.appearsLoad("all");
		}, 300);
	}

	/**
	 * Converts an Obsidian file or folder into a small, serializable description
	 * used by event logs. File contents are never included.
	 */
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
