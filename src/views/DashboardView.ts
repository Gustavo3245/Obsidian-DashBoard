import {
	ItemView,
	Notice,
	setIcon,
	Workspace,
	WorkspaceItem,
	WorkspaceLeaf,
	WorkspaceSidedock,
} from "obsidian";
import { StateManager } from "state/StateManager";
import { Logger } from "utils/Logger";
import { toLocalDateKey } from "utils/DateUtils";
import {
	getDashboardDailyAverageWords,
	getDashboardFileTypes,
	getDashboardLastModifiedFiles,
	getDashboardRecentActivities,
	getDashboardTopFolders,
	getDashboardTopNotes,
} from "views/DashboardViewData";

export const DASHBOARD_VIEW_TYPE = "dynamic-dashboard-view";
export const DASHBOARD_ICON_ID = "dynamic-dashboard-crystal";

let dashboardOpenPromise: Promise<void> | null = null;

type DashboardCardModifier =
	| "summary"
	| "wide"
	| "detail"
	| "workspace-only"
	| "streak"
	| "tall"
	| "upper-row"
	| "third-column"
	| "expanded"
	| "estimated"
	| "daily-average"
	| "total-words"
	| "total-characters"
	| "total-folders"
	| "total-files"
	| "vault-size"
	| "average-words-per-file"
	| "tag-insights"
	| "vault-insights"
	| "file-types"
	| "recent-activity"
	| "top-folders"
	| "last-modified-files"
	| "top-notes";

const DASHBOARD_CARD_LAYOUT: readonly (readonly DashboardCardModifier[])[] = [
	["summary", "total-words"],
	["summary", "total-folders"],
	["summary", "expanded", "third-column", "vault-size"],
	["summary", "tall", "upper-row", "total-characters"],
	["summary", "tall", "upper-row", "total-files"],
	["summary", "expanded", "third-column", "average-words-per-file"],
	["wide", "estimated"],
	["wide", "tall", "daily-average"],
	["detail", "file-types"],
	["detail", "expanded", "tag-insights"],
	["detail", "workspace-only", "vault-insights"],
	["detail", "recent-activity"],
	["wide", "streak"],
	["detail", "workspace-only", "top-folders"],
	["detail", "workspace-only", "last-modified-files"],
	["detail", "workspace-only", "top-notes"],
];

const FILE_TYPE_COLORS = ["#8b5cf6", "#38bdf8", "#22c55e", "#facc15"] as const;
const TOP_FOLDER_COLORS = ["#a371f7", "#58a6ff", "#3fb950", "#facc15", "#f97316"] as const;
const ESTIMATED_TIME_PROGRESS_SEGMENTS = 20;
const FILE_TYPE_LABELS = {
	markdown: "Markdown",
	canvas: "Canvas",
	excalidraw: "Excalidraw",
	other: "Other",
} as const;

function getPaletteColor(colors: readonly string[], index: number): string {
	return colors[index] ?? colors[colors.length - 1] ?? "#8b5cf6";
}

export class DashboardView extends ItemView {
	private dailyAverageCard: HTMLElement | null = null;
	private estimatedTimeCard: HTMLElement | null = null;
	private totalCharactersCard: HTMLElement | null = null;
	private totalFilesCard: HTMLElement | null = null;
	private totalFoldersCard: HTMLElement | null = null;
	private totalWordsCard: HTMLElement | null = null;
	private vaultSizeCard: HTMLElement | null = null;
	private averageWordsPerFileCard: HTMLElement | null = null;
	private streakCard: HTMLElement | null = null;
	private fileTypesCard: HTMLElement | null = null;
	private tagInsightsCard: HTMLElement | null = null;
	private vaultInsightsCard: HTMLElement | null = null;
	private recentActivityCard: HTMLElement | null = null;
	private topFoldersCard: HTMLElement | null = null;
	private topNotesCard: HTMLElement | null = null;
	private dailyAverageResizeObserver: ResizeObserver | null = null;
	private streakResizeObserver: ResizeObserver | null = null;
	private unsubscribeState: (() => void) | null = null;
	private presentationRefreshTimer: number | null = null;

	constructor(leaf: WorkspaceLeaf, private stateManager: StateManager) {
		super(leaf);
		this.navigation = false;
	}

	getViewType(): string {
		return DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Dynamic dashboard";
	}

	getIcon(): string {
		return DASHBOARD_ICON_ID;
	}

	protected async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.containerEl.addClass("dynamic-dashboard-container");
		this.contentEl.addClass("dynamic-dashboard-view");
		this.updateLayoutMode();
		this.renderLayout();
		this.unsubscribeState = this.stateManager.subscribe(() => this.renderStateMetrics());
		this.registerPresentationEvents();
		this.registerEvent(
			this.app.workspace.on("layout-change", () => this.updateLayoutMode())
		);
		if (this.dailyAverageCard) {
			this.dailyAverageResizeObserver = new ResizeObserver(
				() => this.renderDailyAverageWords()
			);
			this.dailyAverageResizeObserver.observe(this.dailyAverageCard);
		}
		if (this.streakCard) {
			this.streakResizeObserver = new ResizeObserver(
				() => this.renderWritingStreak()
			);
			this.streakResizeObserver.observe(this.streakCard);
		}
		this.renderStateMetrics();
		this.renderFileTypes();
		this.renderRecentActivity();
		this.renderTopFolders();
	}

	private renderStateMetrics(): void {
		this.renderDailyAverageWords();
		this.renderEstimatedTime();
		this.renderTotalCharacters();
		this.renderTotalFiles();
		this.renderTotalFolders();
		this.renderTotalWords();
		this.renderVaultSize();
		this.renderAverageWordsPerFile();
		this.renderWritingStreak();
		this.renderTagInsights();
		this.renderVaultInsights();
		this.renderTopNotes();
	}

	protected async onClose(): Promise<void> {
		this.unsubscribeState?.();
		this.unsubscribeState = null;
		this.dailyAverageResizeObserver?.disconnect();
		this.dailyAverageResizeObserver = null;
		this.streakResizeObserver?.disconnect();
		this.streakResizeObserver = null;
		if (this.presentationRefreshTimer !== null) {
			window.clearTimeout(this.presentationRefreshTimer);
			this.presentationRefreshTimer = null;
		}
		this.dailyAverageCard = null;
		this.estimatedTimeCard = null;
		this.totalCharactersCard = null;
		this.totalFilesCard = null;
		this.totalFoldersCard = null;
		this.totalWordsCard = null;
		this.vaultSizeCard = null;
		this.averageWordsPerFileCard = null;
		this.streakCard = null;
		this.fileTypesCard = null;
		this.tagInsightsCard = null;
		this.vaultInsightsCard = null;
		this.recentActivityCard = null;
		this.topFoldersCard = null;
		this.topNotesCard = null;
		this.containerEl.removeClass("dynamic-dashboard-container");
		this.containerEl.removeClass("dynamic-dashboard-container--workspace");
		this.contentEl.removeClass("dynamic-dashboard-view");
		this.contentEl.empty();
	}

	onResize(): void {
		super.onResize();
		this.updateLayoutMode();
	}

	private updateLayoutMode(): void {
		if (!this.containerEl.hasClass("dynamic-dashboard-container")) {
			return;
		}

		const isWorkspace = !this.isInsideSidedock();
		const wasWorkspace = this.containerEl.hasClass(
			"dynamic-dashboard-container--workspace"
		);

		if (isWorkspace === wasWorkspace) {
			return;
		}

		this.containerEl.toggleClass(
			"dynamic-dashboard-container--workspace",
			isWorkspace
		);
		this.renderDailyAverageWords();
		this.renderWritingStreak();
	}

	private isInsideSidedock(): boolean {
		let item: WorkspaceItem | null = this.leaf.parent;

		for (let depth = 0; item && depth < 10; depth++) {
			if (item instanceof WorkspaceSidedock) {
				return true;
			}

			const parent: WorkspaceItem | null = item.parent ?? null;
			if (parent === item) {
				break;
			}
			item = parent;
		}

		return false;
	}

	/** Render the cards used by the compact dashboard. */
	private renderLayout(): void {
		const dashboard = this.contentEl.createDiv({
			cls: "dynamic-dashboard-layout",
		});
		const overview = dashboard.createDiv({ cls: "dynamic-dashboard-overview" });
		const overviewCopy = overview.createDiv({
			cls: "dynamic-dashboard-overview-copy",
		});
		const overviewTitle = overviewCopy.createSpan({
			cls: "dynamic-dashboard-overview-title",
		});
		setIcon(overviewTitle.createSpan(), DASHBOARD_ICON_ID);
		overviewTitle.appendText("Overview");
		overviewCopy.createSpan({
			cls: "dynamic-dashboard-overview-subtitle",
			text: "Explore statistics and insights about your vault.",
		});
		overview.createSpan({
			cls: "dynamic-dashboard-overview-range",
			text: "All time",
		});

		for (const modifiers of DASHBOARD_CARD_LAYOUT) {
			const card = this.createCard(dashboard, modifiers);

			if (modifiers.includes("estimated")) {
				this.estimatedTimeCard = card;
			}

			if (modifiers.includes("total-words")) {
				this.totalWordsCard = card;
			}

			if (modifiers.includes("total-characters")) {
				this.totalCharactersCard = card;
			}

			if (modifiers.includes("total-folders")) {
				this.totalFoldersCard = card;
			}

			if (modifiers.includes("total-files")) {
				this.totalFilesCard = card;
			}

			if (modifiers.includes("vault-size")) {
				this.vaultSizeCard = card;
			}

			if (modifiers.includes("average-words-per-file")) {
				this.averageWordsPerFileCard = card;
			}

			if (modifiers.includes("daily-average")) {
				this.dailyAverageCard = card;
			}

			if (modifiers.includes("streak")) {
				this.streakCard = card;
			}

			if (modifiers.includes("file-types")) {
				this.fileTypesCard = card;
			}

			if (modifiers.includes("tag-insights")) {
				this.tagInsightsCard = card;
			}

			if (modifiers.includes("vault-insights")) {
				this.vaultInsightsCard = card;
			}

			if (modifiers.includes("recent-activity")) {
				this.recentActivityCard = card;
			}

			if (modifiers.includes("top-folders")) {
				this.topFoldersCard = card;
			}

			if (modifiers.includes("top-notes")) {
				this.topNotesCard = card;
			}
		}
	}

	/**
	 * Create one dashboard card from its visual modifiers.
	 */
	private createCard(
		parent: HTMLElement,
		modifiers: readonly DashboardCardModifier[]
	): HTMLElement {
		const modifierClasses = modifiers.map(
			(modifier) => `dynamic-dashboard-card--${modifier}`
		);

		return parent.createDiv({
			cls: ["dynamic-dashboard-card", ...modifierClasses].join(" "),
		});
	}

	private registerPresentationEvents(): void {
		const refreshFiles = () => {
			this.renderFileTypes();
			this.renderTopFolders();
			this.schedulePresentationRefresh();
		};
		this.registerEvent(
			this.app.vault.on("create", refreshFiles)
		);
		this.registerEvent(
			this.app.vault.on("delete", refreshFiles)
		);
		this.registerEvent(
			this.app.vault.on("rename", refreshFiles)
		);
		this.registerEvent(
			this.app.vault.on("modify", () => this.schedulePresentationRefresh())
		);
	}

	private schedulePresentationRefresh(): void {
		if (this.presentationRefreshTimer !== null) {
			window.clearTimeout(this.presentationRefreshTimer);
		}

		this.presentationRefreshTimer = window.setTimeout(() => {
			this.presentationRefreshTimer = null;
			this.renderRecentActivity();
			this.renderVaultInsights();
			this.renderTopNotes();
		}, 150);
	}

	private renderRecentActivity(): void {
		if (!this.recentActivityCard) {
			return;
		}

		const activities = getDashboardRecentActivities(this.app.vault.getMarkdownFiles());

		this.recentActivityCard.empty();
		const title = this.recentActivityCard.createDiv({
			cls: "dynamic-recent-activity-title",
		});
		const titleIcon = title.createSpan({
			cls: "dynamic-recent-activity-title-icon",
		});
		setIcon(titleIcon, "history");
		title.createSpan({ text: "Recent activity" });
		const list = this.recentActivityCard.createDiv({
			cls: "dynamic-recent-activity-list",
		});

		for (const activity of activities) {
			const item = list.createDiv({
				cls: `dynamic-recent-activity-item dynamic-recent-activity-item--${activity.type}`,
			});
			item.setAttribute(
				"aria-label",
				`${activity.name}: note ${activity.type}, ${this.formatRelativeTime(activity.timestamp)}`
			);
			item.setAttribute("title", activity.path);
			const icon = item.createSpan({
				cls: "dynamic-recent-activity-icon",
			});
			setIcon(icon, activity.type === "created" ? "file-plus-2" : "file-pen-line");
			const content = item.createDiv({
				cls: "dynamic-recent-activity-content",
			});
			content.createDiv({
				cls: "dynamic-recent-activity-label",
				text: activity.type === "created" ? "Note created" : "Note edited",
			});
			content.createDiv({
				cls: "dynamic-recent-activity-time",
				text: this.formatRelativeTime(activity.timestamp),
			});
		}

		if (activities.length === 0) {
			list.createDiv({
				cls: "dynamic-recent-activity-empty",
				text: "No recent activity",
			});
		}

		const button = this.recentActivityCard.createEl("button", {
			cls: "dynamic-recent-activity-button",
			text: "View all activity",
		});
		button.type = "button";
		button.setAttribute("aria-disabled", "true");
		const buttonIcon = button.createSpan({
			cls: "dynamic-recent-activity-button-icon",
		});
		setIcon(buttonIcon, "arrow-right");
	}

	private formatRelativeTime(timestamp: number): string {
		const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));

		if (elapsedMinutes < 1) {
			return "just now";
		}

		if (elapsedMinutes < 60) {
			return `${elapsedMinutes}m ago`;
		}

		const elapsedHours = Math.floor(elapsedMinutes / 60);
		if (elapsedHours < 24) {
			return `${elapsedHours}h ago`;
		}

		const elapsedDays = Math.floor(elapsedHours / 24);
		return `${elapsedDays}d ago`;
	}

	private renderFileTypes(): void {
		if (!this.fileTypesCard) {
			return;
		}

		const visibleMetrics = getDashboardFileTypes(this.app.vault.getFiles());

		this.fileTypesCard.empty();
		const title = this.fileTypesCard.createDiv({
			cls: "dynamic-file-types-title",
		});
		const titleIcon = title.createSpan({ cls: "dynamic-file-types-title-icon" });
		setIcon(titleIcon, "files");
		title.createSpan({ text: "File types" });
		const body = this.fileTypesCard.createDiv({
			cls: "dynamic-file-types-body",
		});

		for (const [index, metric] of visibleMetrics.entries()) {
			const color = getPaletteColor(FILE_TYPE_COLORS, index);
			const row = body.createDiv({
				cls: "dynamic-file-types-row",
			});
			row.style.setProperty("--dynamic-file-type-color", color);
			row.setAttribute("aria-label", `${FILE_TYPE_LABELS[metric.type]}: ${metric.percentage.toFixed(1)}%`);
			const icon = row.createSpan({ cls: "dynamic-file-types-icon" });
			setIcon(icon, "file-text");
			const details = row.createDiv({ cls: "dynamic-file-types-details" });
			const header = details.createDiv({ cls: "dynamic-file-types-row-header" });
			header.createSpan({
				cls: "dynamic-file-types-name",
				text: FILE_TYPE_LABELS[metric.type],
			});
			header.createSpan({
				cls: "dynamic-file-types-percentage",
				text: `${metric.percentage.toFixed(1)}%`,
			});
			const track = details.createDiv({ cls: "dynamic-file-types-track" });
			const fill = track.createDiv({ cls: "dynamic-file-types-fill" });
			fill.style.width = `${metric.percentage}%`;
		}
	}

	private renderTopFolders(): void {
		if (!this.topFoldersCard) {
			return;
		}

		const folders = getDashboardTopFolders(this.app.vault.getFiles());
		const maximumFileCount = folders[0]?.fileCount ?? 0;

		this.topFoldersCard.empty();
		const title = this.topFoldersCard.createDiv({
			cls: "dynamic-top-folders-title",
		});
		const titleIcon = title.createSpan({
			cls: "dynamic-top-folders-title-icon",
		});
		setIcon(titleIcon, "folder");
		title.createSpan({ text: "Top folders" });
		title.createSpan({
			cls: "dynamic-top-folders-title-detail",
			text: "(by file count)",
		});

		const list = this.topFoldersCard.createDiv({
			cls: "dynamic-top-folders-list",
		});

		for (const [index, folder] of folders.entries()) {
			const item = list.createDiv({
				cls: "dynamic-top-folders-item",
			});
			const color = getPaletteColor(TOP_FOLDER_COLORS, index);
			item.style.setProperty("--dynamic-top-folder-color", color);
			item.setAttribute(
				"aria-label",
				`${folder.path}: ${folder.fileCount} files`
			);

			const header = item.createDiv({
				cls: "dynamic-top-folders-item-header",
			});
			const icon = header.createSpan({
				cls: "dynamic-top-folders-item-icon",
			});
			setIcon(icon, "folder");
			header.createSpan({
				cls: "dynamic-top-folders-path",
				text: `/${folder.path}`,
			});
			header.createSpan({
				cls: "dynamic-top-folders-count",
				text: folder.fileCount.toLocaleString(),
			});

			const track = item.createDiv({
				cls: "dynamic-top-folders-track",
			});
			const fill = track.createDiv({
				cls: "dynamic-top-folders-fill",
			});
			fill.style.width = maximumFileCount > 0
				? `${(folder.fileCount / maximumFileCount) * 100}%`
				: "0";
		}

		if (folders.length === 0) {
			list.createDiv({
				cls: "dynamic-top-folders-empty",
				text: "No folders found",
			});
		}

		const button = this.topFoldersCard.createEl("button", {
			cls: "dynamic-top-folders-button",
			text: "View all folders",
		});
		button.type = "button";
		button.setAttribute("aria-disabled", "true");
		const buttonIcon = button.createSpan({
			cls: "dynamic-top-folders-button-icon",
		});
		setIcon(buttonIcon, "arrow-right");
	}

	private renderTopNotes(): void {
		if (!this.topNotesCard) {
			return;
		}

		const notes = getDashboardTopNotes(this.stateManager.getFilesStats());
		const maximumCharacterCount = notes[0]?.characterCount ?? 0;

		this.topNotesCard.empty();
		const title = this.topNotesCard.createDiv({
			cls: "dynamic-top-folders-title dynamic-top-notes-title",
		});
		const titleIcon = title.createSpan({
			cls: "dynamic-top-folders-title-icon",
		});
		setIcon(titleIcon, "notebook-pen");
		title.createSpan({ text: "Top notes" });
		title.createSpan({
			cls: "dynamic-top-folders-title-detail",
			text: "(by character count)",
		});

		const list = this.topNotesCard.createDiv({
			cls: "dynamic-top-folders-list",
		});

		for (const [index, note] of notes.entries()) {
			const item = list.createDiv({
				cls: "dynamic-top-folders-item",
			});
			const color = getPaletteColor(TOP_FOLDER_COLORS, index);
			item.style.setProperty("--dynamic-top-folder-color", color);
			item.setAttribute(
				"aria-label",
				`${note.name}: ${note.characterCount} characters`
			);
			item.setAttribute("title", note.path);

			const header = item.createDiv({
				cls: "dynamic-top-folders-item-header",
			});
			const icon = header.createSpan({
				cls: "dynamic-top-folders-item-icon",
			});
			setIcon(icon, "file-text");
			header.createSpan({
				cls: "dynamic-top-folders-path",
				text: note.name,
			});
			header.createSpan({
				cls: "dynamic-top-folders-count",
				text: note.characterCount.toLocaleString(),
			});

			const track = item.createDiv({
				cls: "dynamic-top-folders-track",
			});
			const fill = track.createDiv({
				cls: "dynamic-top-folders-fill",
			});
			fill.style.width = maximumCharacterCount > 0
				? `${(note.characterCount / maximumCharacterCount) * 100}%`
				: "0";
		}

		if (notes.length === 0) {
			list.createDiv({
				cls: "dynamic-top-folders-empty",
				text: "No notes found",
			});
		}

		const button = this.topNotesCard.createEl("button", {
			cls: "dynamic-top-folders-button",
			text: "View all notes",
		});
		button.type = "button";
		button.setAttribute("aria-disabled", "true");
		const buttonIcon = button.createSpan({
			cls: "dynamic-top-folders-button-icon",
		});
		setIcon(buttonIcon, "arrow-right");
	}

	private renderVaultInsights(): void {
		if (!this.vaultInsightsCard) {
			return;
		}

		const markdownFiles = this.app.vault.getMarkdownFiles();
		const modifiedFiles = getDashboardLastModifiedFiles(markdownFiles);
		const latestFile = modifiedFiles[0];
		const mostActiveFolder = this.stateManager
			.getVaultMetricsState().appears.mostActiveFolder;
		const folderName = mostActiveFolder.toLowerCase().includes("nothing but wind")
			? "No folder found"
			: `/${mostActiveFolder}`;

		this.vaultInsightsCard.empty();
		const title = this.vaultInsightsCard.createDiv({
			cls: "dynamic-vault-insights-title",
		});
		const titleIcon = title.createSpan({
			cls: "dynamic-vault-insights-title-icon",
		});
		setIcon(titleIcon, "folder");
		title.createSpan({ text: "Vault insights" });

		const content = this.vaultInsightsCard.createDiv({
			cls: "dynamic-vault-insights-content",
		});
		const folderSection = content.createDiv({
			cls: "dynamic-vault-insights-section",
		});
		folderSection.createDiv({
			cls: "dynamic-vault-insights-label",
			text: "Most active folder",
		});
		folderSection.createDiv({
			cls: "dynamic-vault-insights-folder",
			text: folderName,
			attr: { title: folderName },
		});

		const latestSection = content.createDiv({
			cls: "dynamic-vault-insights-section",
		});
		latestSection.createDiv({
			cls: "dynamic-vault-insights-label",
			text: "Last modified file",
		});
		this.renderVaultInsightFile(latestSection, latestFile);

		const filesSection = content.createDiv({
			cls: "dynamic-vault-insights-section dynamic-vault-insights-section--files",
		});
		filesSection.createDiv({
			cls: "dynamic-vault-insights-label",
			text: "Last modified files",
		});
		for (const file of modifiedFiles) {
			this.renderVaultInsightFile(filesSection, file);
		}

		if (modifiedFiles.length === 0) {
			filesSection.createDiv({
				cls: "dynamic-vault-insights-empty",
				text: "No modified files",
			});
		}

		const button = this.vaultInsightsCard.createEl("button", {
			cls: "dynamic-vault-insights-button",
			text: `View all (${markdownFiles.length.toLocaleString()})`,
		});
		button.type = "button";
		button.setAttribute("aria-disabled", "true");
		const buttonIcon = button.createSpan({
			cls: "dynamic-vault-insights-button-icon",
		});
		setIcon(buttonIcon, "arrow-right");
	}

	private renderVaultInsightFile(
		parent: HTMLElement,
		file: ReturnType<typeof getDashboardLastModifiedFiles>[number] | undefined
	): void {
		if (!file) {
			parent.createDiv({
				cls: "dynamic-vault-insights-empty",
				text: "No file found",
			});
			return;
		}

		const row = parent.createDiv({
			cls: "dynamic-vault-insights-file",
			attr: { title: file.path },
		});
		row.createSpan({
			cls: "dynamic-vault-insights-file-name",
			text: file.name,
		});
		row.createSpan({
			cls: "dynamic-vault-insights-file-time",
			text: this.formatRelativeTime(file.timestamp),
		});
	}

	private renderTagInsights(): void {
		if (!this.tagInsightsCard) {
			return;
		}

		const appears = this.stateManager.getVaultMetricsState().appears;
		const insights = [
			{
				label: "Most used tag",
				metric: appears.mostAppearsTag,
				color: "#8b5cf6",
				compactOnly: false,
			},
			{
				label: "Most used frontmatter tag",
				metric: appears.mostAppearsTagInFrontMatter,
				color: "#38bdf8",
				compactOnly: false,
			},
			{
				label: "Least used tag",
				metric: appears.minorAppearsTag,
				color: "#22c55e",
				compactOnly: false,
			},
			{
				label: "Total unique tags",
				metric: { name: "Unique", count: appears.totalUniqueTags },
				color: "#facc15",
				compactOnly: true,
			},
		] as const;

		this.tagInsightsCard.empty();
		const title = this.tagInsightsCard.createDiv({
			cls: "dynamic-tag-insights-title",
		});
		const titleIcon = title.createSpan({
			cls: "dynamic-tag-insights-title-icon",
		});
		setIcon(titleIcon, "tag");
		title.createSpan({ text: "Tag insights" });

		const list = this.tagInsightsCard.createEl("ol", {
			cls: "dynamic-tag-insights-list",
		});

		for (const insight of insights) {
			const metric = typeof insight.metric === "string"
				? { name: "No tags", count: 0 }
				: insight.metric;
			const item = list.createEl("li", {
				cls: [
					"dynamic-tag-insights-item",
					insight.compactOnly
						? "dynamic-tag-insights-item--compact-total"
						: "",
				].filter(Boolean).join(" "),
			});
			item.style.setProperty("--dynamic-tag-insight-color", insight.color);
			item.createDiv({
				cls: "dynamic-tag-insights-label",
				text: insight.label,
			});
			const value = item.createDiv({
				cls: "dynamic-tag-insights-value",
			});
			value.createSpan({
				cls: "dynamic-tag-insights-badge",
				text: metric.name,
			});
			value.createSpan({
				cls: "dynamic-tag-insights-count",
				text: metric.count.toLocaleString(),
			});
			item.setAttribute(
				"aria-label",
				`${insight.label}: ${metric.name}, ${metric.count}`
			);
		}

		const uniqueTags = this.tagInsightsCard.createDiv({
			cls: "dynamic-tag-insights-total",
		});
		const uniqueTagsLabel = uniqueTags.createDiv({
			cls: "dynamic-tag-insights-total-label",
		});
		const uniqueTagsIcon = uniqueTagsLabel.createSpan({
			cls: "dynamic-tag-insights-total-icon",
		});
		setIcon(uniqueTagsIcon, "tags");
		uniqueTagsLabel.createSpan({ text: "Total unique tags" });
		uniqueTags.createDiv({
			cls: "dynamic-tag-insights-total-value",
			text: appears.totalUniqueTags.toLocaleString(),
		});
		uniqueTags.setAttribute(
			"aria-label",
			`Total unique tags: ${appears.totalUniqueTags}`
		);
	}

	private renderTotalWords(): void {
		if (!this.totalWordsCard) {
			return;
		}

		const totalWords = this.stateManager
			.getVaultMetricsState()
			.volume.snapshot.totalWords;
		const totalSentences = this.stateManager
			.getVaultMetricsState()
			.volume.snapshot.totalSentences;
		const wordsPerSentence = totalSentences > 0
			? totalWords / totalSentences
			: 0;
		this.renderSummaryMetric(
			this.totalWordsCard,
			"Words",
			totalWords,
			"pen-line",
			"words",
			{
				iconName: "text",
				modifier: "words",
				text: `${this.formatSummaryRatio(wordsPerSentence)} words / sentence`,
			}
		);
	}

	private renderTotalCharacters(): void {
		if (!this.totalCharactersCard) {
			return;
		}

		const totalCharacters = this.stateManager
			.getVaultMetricsState()
			.volume.snapshot.totalCharacters;
		const totalWords = this.stateManager
			.getVaultMetricsState()
			.volume.snapshot.totalWords;
		const charactersPerWord = totalWords > 0
			? totalCharacters / totalWords
			: 0;
		this.renderSummaryMetric(
			this.totalCharactersCard,
			"Characters",
			totalCharacters,
			"case-sensitive",
			"characters",
			{
				iconName: "languages",
				modifier: "characters",
				text: `${charactersPerWord.toFixed(1)} chars / word`,
			}
		);
	}

	private renderTotalFolders(): void {
		if (!this.totalFoldersCard) {
			return;
		}

		const totalFolders = this.stateManager
			.getVaultMetricsState()
			.volume.totalFolders;
		const totalMarkdownFiles = this.stateManager
			.getVaultMetricsState()
			.volume.totalMarkdownFiles;
		const notesPerFolder = totalFolders > 0
			? totalMarkdownFiles / totalFolders
			: 0;
		this.renderSummaryMetric(
			this.totalFoldersCard,
			"Folders",
			totalFolders,
			"folder",
			"folders",
			{
				iconName: "file-text",
				modifier: "folders",
				text: `${this.formatSummaryRatio(notesPerFolder)} notes / folder`,
			}
		);
	}

	private renderTotalFiles(): void {
		if (!this.totalFilesCard) {
			return;
		}

		const totalFiles = this.stateManager
			.getVaultMetricsState()
			.volume.totalFiles;
		const totalFolders = this.stateManager
			.getVaultMetricsState()
			.volume.totalFolders;
		const filesPerFolder = totalFolders > 0
			? totalFiles / totalFolders
			: 0;
		this.renderSummaryMetric(
			this.totalFilesCard,
			"Files",
			totalFiles,
			"file-text",
			"files",
			{
				iconName: "folder",
				modifier: "files",
				text: `${this.formatSummaryRatio(filesPerFolder)} files / folder`,
			}
		);
	}

	private renderVaultSize(): void {
		if (!this.vaultSizeCard) {
			return;
		}

		const volume = this.stateManager.getVaultMetricsState().volume;
		const averageSizePerFile = volume.totalFiles > 0
			? volume.totalVaultSize / volume.totalFiles
			: 0;
		this.renderSummaryMetric(
			this.vaultSizeCard,
			"Vault size",
			this.formatStorageSize(volume.totalVaultSize, 2),
			"database",
			"vault-size",
			{
				iconName: "file",
				modifier: "vault-size",
				text: `${this.formatStorageSize(averageSizePerFile, 1)} / file`,
			}
		);
	}

	private renderAverageWordsPerFile(): void {
		if (!this.averageWordsPerFileCard) {
			return;
		}

		const averageWordsPerFile = Math.max(
			0,
			this.stateManager.getVaultMetricsState().volume.averageWordsPerFile
		);
		const writingTrend = getDashboardDailyAverageWords(
			this.stateManager.getDailyMetricsState()
		).changePercentage;
		this.renderSummaryMetric(
			this.averageWordsPerFileCard,
			"Words per file",
			averageWordsPerFile.toLocaleString("en-US", {
				maximumFractionDigits: 2,
			}),
			"trending-up",
			"average-words-per-file",
			{
				modifier: "average-words-per-file",
				comparisonText: "vs prev. 30 days",
				changePercentage: writingTrend,
			}
		);
	}

	private renderSummaryMetric(
		card: HTMLElement,
		label: string,
		value: number | string,
		iconName: string,
		iconModifier:
			| "words"
			| "characters"
			| "folders"
			| "files"
			| "vault-size"
			| "average-words-per-file",
		footer?: {
			modifier:
				| "words"
				| "characters"
				| "folders"
				| "files"
				| "vault-size"
				| "average-words-per-file";
			iconName?: string;
			text?: string;
			comparisonText?: string;
			changePercentage?: number;
		}
	): void {
		const normalizedValue = typeof value === "number"
			? Math.max(0, value).toLocaleString("en-US")
			: value;

		card.empty();
		const content = card.createDiv({
			cls: "dynamic-summary-metric",
		});
		const title = content.createDiv({
			cls: "dynamic-summary-metric-title",
		});
		const icon = title.createSpan({
			cls: `dynamic-summary-metric-icon dynamic-summary-metric-icon--${iconModifier}`,
		});
		setIcon(icon, iconName);
		title.createSpan({ text: label });
		content.createDiv({
			cls: "dynamic-summary-metric-value",
			text: normalizedValue,
		});
		if (footer) {
			const changeDirection = footer.changePercentage !== undefined
				? footer.changePercentage > 0
					? "positive"
					: footer.changePercentage < 0 ? "negative" : "neutral"
				: null;
			const footerElement = content.createDiv({
				cls: [
					"dynamic-summary-metric-footer",
					`dynamic-summary-metric-footer--${footer.modifier}`,
					changeDirection
						? `dynamic-summary-metric-footer--${changeDirection}`
						: "",
				].filter(Boolean).join(" "),
			});
			if (footer.iconName && footer.text) {
				const footerIcon = footerElement.createSpan({
					cls: "dynamic-summary-metric-footer-icon",
				});
				setIcon(footerIcon, footer.iconName);
				footerElement.createSpan({
					cls: "dynamic-summary-metric-footer-text",
					text: footer.text,
				});
			} else if (
				footer.comparisonText
				&& footer.changePercentage !== undefined
			) {
				footerElement.createSpan({
					cls: "dynamic-summary-metric-footer-comparison",
					text: footer.comparisonText,
				});
				footerElement.createSpan({
					cls: "dynamic-summary-metric-footer-trend",
					text: this.formatTrendPercentage(footer.changePercentage),
				});
			}
		}
		content.setAttribute(
			"aria-label",
			`${label}: ${normalizedValue}${footer?.text ? `, ${footer.text}` : ""}`
		);
	}

	private formatSummaryRatio(value: number): string {
		return value.toFixed(1).replace(/\.0$/, "");
	}

	private formatTrendPercentage(value: number): string {
		if (value > 100) {
			return "+100%";
		}

		const direction = value > 0 ? "↑" : value < 0 ? "↓" : "→";
		return `${direction} ${Math.abs(value).toFixed(1)}%`;
	}

	private formatStorageSize(bytes: number, maximumFractionDigits: number): string {
		const normalizedBytes = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
		const units = ["B", "KB", "MB", "GB", "TB"] as const;
		const unitIndex = normalizedBytes > 0
			? Math.min(Math.floor(Math.log(normalizedBytes) / Math.log(1024)), units.length - 1)
			: 0;
		const value = normalizedBytes / 1024 ** unitIndex;

		return `${value.toLocaleString("en-US", { maximumFractionDigits })} ${units[unitIndex]}`;
	}

	private renderEstimatedTime(): void {
		if (!this.estimatedTimeCard) {
			return;
		}

		const estimates = this.stateManager.getVaultMetricsState().estimates;
		const readingTime = this.formatEstimatedTime(estimates.estimatedReadingTime);
		const speakingTime = this.formatEstimatedTime(estimates.estimatedSpeakingTime);
		const readingSeconds = this.getEstimatedTimeSeconds(
			estimates.estimatedReadingTime
		);
		const speakingSeconds = this.getEstimatedTimeSeconds(
			estimates.estimatedSpeakingTime
		);
		const maximumSeconds = Math.max(readingSeconds, speakingSeconds);

		this.estimatedTimeCard.empty();
		const content = this.estimatedTimeCard.createDiv({
			cls: "dynamic-estimated-time",
		});
		const title = content.createDiv({
			cls: "dynamic-estimated-time-title",
		});
		const titleIcon = title.createSpan({
			cls: "dynamic-estimated-time-title-icon",
		});
		setIcon(titleIcon, "clock-3");
		title.createSpan({ text: "Estimated time" });

		const metrics = content.createDiv({
			cls: "dynamic-estimated-time-metrics",
		});
		this.renderEstimatedTimeMetric(
			metrics,
			"Reading time",
			readingTime,
			"clock-3",
			"book-open",
			"reading",
			maximumSeconds > 0 ? readingSeconds / maximumSeconds : 0
		);
		this.renderEstimatedTimeMetric(
			metrics,
			"Speaking time",
			speakingTime,
			"mic",
			"audio-lines",
			"speaking",
			maximumSeconds > 0 ? speakingSeconds / maximumSeconds : 0
		);
	}

	private renderEstimatedTimeMetric(
		parent: HTMLElement,
		label: string,
		value: string,
		valueIconName: string,
		labelIconName: string,
		labelIconModifier: "reading" | "speaking",
		completion: number
	): void {
		const metric = parent.createDiv({
			cls: `dynamic-estimated-time-metric dynamic-estimated-time-metric--${labelIconModifier}`,
		});
		const metricLabel = metric.createDiv({
			cls: "dynamic-estimated-time-label",
		});
		const labelIcon = metricLabel.createSpan({
			cls: `dynamic-estimated-time-label-icon dynamic-estimated-time-label-icon--${labelIconModifier}`,
		});
		setIcon(labelIcon, labelIconName);
		metricLabel.createSpan({ text: label });

		const metricValue = metric.createDiv({
			cls: "dynamic-estimated-time-value",
		});
		const valueIcon = metricValue.createSpan({
			cls: "dynamic-estimated-time-value-icon",
		});
		setIcon(valueIcon, valueIconName);
		metricValue.createSpan({
			cls: "dynamic-estimated-time-value-text",
			text: value,
		});
		const hourglassIcon = metricValue.createSpan({
			cls: "dynamic-estimated-time-hourglass-icon",
		});
		setIcon(hourglassIcon, "hourglass");

		const normalizedCompletion = Math.min(1, Math.max(0, completion));
		const activeSegments = normalizedCompletion > 0
			? Math.max(
				1,
				Math.round(normalizedCompletion * ESTIMATED_TIME_PROGRESS_SEGMENTS)
			)
			: 0;
		const progress = metric.createDiv({
			cls: `dynamic-estimated-time-progress dynamic-estimated-time-progress--${labelIconModifier}`,
		});
		progress.setAttribute("role", "progressbar");
		progress.setAttribute("aria-label", `${label} relative completion`);
		progress.setAttribute("aria-valuemin", "0");
		progress.setAttribute("aria-valuemax", "100");
		progress.setAttribute(
			"aria-valuenow",
			String(Math.round(normalizedCompletion * 100))
		);

		for (let index = 0; index < ESTIMATED_TIME_PROGRESS_SEGMENTS; index++) {
			progress.createSpan({
				cls: [
					"dynamic-estimated-time-progress-segment",
					index < activeSegments
						? "dynamic-estimated-time-progress-segment--active"
						: "",
				].filter(Boolean).join(" "),
			});
		}

		metric.setAttribute(
			"aria-label",
			`${label}: ${value}, ${Math.round(normalizedCompletion * 100)}% relative completion`
		);
	}

	private getEstimatedTimeSeconds(
		value: {
			hours: number;
			minutes: number;
			seconds: number;
			totalSeconds?: number;
		} | string
	): number {
		if (typeof value === "string") {
			return 0;
		}

		const calculatedSeconds = value.totalSeconds
			?? (value.hours * 3600) + (value.minutes * 60) + value.seconds;

		return Number.isFinite(calculatedSeconds)
			? Math.max(0, calculatedSeconds)
			: 0;
	}

	private formatEstimatedTime(
		value: { hours: number; minutes: number; seconds: number } | string
	): string {
		if (typeof value === "string") {
			return "00h 00m 00s";
		}

		const formatUnit = (unit: number): string => {
			const normalizedUnit = Math.max(0, Math.floor(unit));
			return `${normalizedUnit < 10 ? "0" : ""}${normalizedUnit}`;
		};
		return `${formatUnit(value.hours)}h ${formatUnit(value.minutes)}m ${formatUnit(value.seconds)}s`;
	}

	private renderDailyAverageWords(): void {
		if (!this.dailyAverageCard) {
			return;
		}

		const metric = getDashboardDailyAverageWords(
			this.stateManager.getDailyMetricsState()
		);
		const availablePlotWidth = Math.max(0, this.dailyAverageCard.clientWidth - 64);
		const visibleDays = Math.max(
			7,
			Math.min(30, Math.floor((availablePlotWidth + 2) / 8))
		);
		const points = metric.points.slice(-visibleDays);
		const axisMaximum = this.getDailyWordsAxisMaximum(
			points.map((point) => point.words),
			metric.currentAverage
		);
		const changeDirection = metric.changePercentage > 0
			? "positive"
			: metric.changePercentage < 0 ? "negative" : "neutral";
		const formattedChangePercentage = this.formatTrendPercentage(
			metric.changePercentage
		);

		this.dailyAverageCard.empty();
		const content = this.dailyAverageCard.createDiv({
			cls: "dynamic-daily-average",
		});
		content.setAttribute(
			"aria-label",
			`Daily average words: ${metric.currentAverage.toFixed(1)}, ${formattedChangePercentage} versus the previous 30 days`
		);
		const header = content.createDiv({
			cls: "dynamic-daily-average-header",
		});
		const heading = header.createDiv({
			cls: "dynamic-daily-average-heading",
		});
		const title = heading.createDiv({
			cls: "dynamic-daily-average-title",
		});
		title.createSpan({ text: "Daily average words" });
		heading.createDiv({
			cls: "dynamic-daily-average-subtitle",
			text: "Based on the last 30 days",
		});
		const trend = header.createDiv({
			cls: `dynamic-daily-average-trend dynamic-daily-average-trend--${changeDirection}`,
		});
		trend.createDiv({
			cls: "dynamic-daily-average-change",
			text: formattedChangePercentage,
		});
		trend.createDiv({
			cls: "dynamic-daily-average-comparison",
			text: "vs previous 30 days",
		});

		const body = content.createDiv({
			cls: "dynamic-daily-average-body",
		});
		body.createDiv({
			cls: "dynamic-daily-average-value",
			text: metric.currentAverage.toFixed(1),
		});
		const graph = body.createDiv({
			cls: "dynamic-daily-average-graph",
		});
		const yAxis = graph.createDiv({
			cls: "dynamic-daily-average-y-axis",
		});
		for (const value of [axisMaximum, axisMaximum / 2, 0]) {
			yAxis.createSpan({ text: this.formatDailyWordsAxisValue(value) });
		}

		const plot = graph.createDiv({
			cls: "dynamic-daily-average-plot",
		});
		plot.style.gridTemplateColumns = `repeat(${points.length}, minmax(0, 1fr))`;
		const averageLine = plot.createDiv({
			cls: "dynamic-daily-average-line",
		});
		averageLine.style.bottom = axisMaximum > 0
			? `${Math.min(100, (metric.currentAverage / axisMaximum) * 100)}%`
			: "0";

		for (const [index, point] of points.entries()) {
			const pointIndex = metric.points.length - points.length + index;
			const previousWords = pointIndex > 0
				? metric.points[pointIndex - 1]?.words ?? 0
				: 0;
			const dailyChangePercentage = previousWords > 0
				? ((point.words - previousWords) / previousWords) * 100
				: point.words > 0 ? 100 : 0;
			const dailyDescription = `${point.dateKey}: ${point.words} words, ${this.formatTrendPercentage(dailyChangePercentage)} vs previous day`;
			const bar = plot.createDiv({
				cls: [
					"dynamic-daily-average-bar",
					point.words === 0 ? "dynamic-daily-average-bar--empty" : "",
				].filter(Boolean).join(" "),
			});
			bar.style.height = axisMaximum > 0
				? `${Math.min(100, (point.words / axisMaximum) * 100)}%`
				: "0";
			bar.setAttribute("title", dailyDescription);
			bar.setAttribute("aria-label", dailyDescription);
		}

		const xAxis = graph.createDiv({
			cls: "dynamic-daily-average-x-axis",
		});
		xAxis.style.gridTemplateColumns = `repeat(${points.length}, minmax(0, 1fr))`;
		const labelIndexes = new Set(
			[0, 0.25, 0.5, 0.75, 1].map((ratio) =>
				Math.round((points.length - 1) * ratio)
			)
		);
		const dateFormatter = new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
		});

		for (const [index, point] of points.entries()) {
			const slot = xAxis.createSpan({
				cls: "dynamic-daily-average-date-slot",
			});
			if (labelIndexes.has(index)) {
				slot.createSpan({
					cls: "dynamic-daily-average-date-label",
					text: dateFormatter.format(this.parseDailyWordsDate(point.dateKey)),
				});
			}
		}
	}

	private getDailyWordsAxisMaximum(values: number[], average: number): number {
		const maximum = Math.max(0, average, ...values);
		if (maximum === 0) {
			return 0;
		}

		const magnitude = 10 ** Math.floor(Math.log10(maximum));
		const normalized = maximum / magnitude;
		const multiplier = normalized <= 1
			? 1
			: normalized <= 2 ? 2 : normalized <= 4 ? 4 : normalized <= 8 ? 8 : 10;
		return multiplier * magnitude;
	}

	private formatDailyWordsAxisValue(value: number): string {
		return value.toLocaleString("en-US", {
			notation: "compact",
			maximumFractionDigits: 1,
		});
	}

	private parseDailyWordsDate(dateKey: string): Date {
		const [year, month, day] = dateKey.split("-").map(Number);
		return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
	}

	private renderWritingStreak(): void {
		if (!this.streakCard) {
			return;
		}

		const isWorkspace = this.containerEl.hasClass(
			"dynamic-dashboard-container--workspace"
		);
		const cellGap = 2;
		const baseCellSize = isWorkspace ? 8 : 9;
		const horizontalCellSize = Math.floor(
			(this.streakCard.clientWidth - 48 - (52 * cellGap)) / 53
		);
		const verticalCellSize = Math.floor(
			(this.streakCard.clientHeight - 54 - (6 * cellGap)) / 7
		);
		const cellSize = isWorkspace
			? Math.max(
				baseCellSize,
				Math.min(20, horizontalCellSize, verticalCellSize)
			)
			: baseCellSize;
		const availableWidth = Math.max(0, this.streakCard.clientWidth - 38);

		this.streakCard.style.setProperty(
			"--dynamic-streak-cell-size",
			`${cellSize}px`
		);
		this.streakCard.style.setProperty(
			"--dynamic-streak-cell-gap",
			`${cellGap}px`
		);
		const visibleWeeks = Math.max(
			4,
			Math.min(53, Math.floor((availableWidth + cellGap) / (cellSize + cellGap)))
		);

		this.streakCard.empty();

		const header = this.streakCard.createDiv({
			cls: "dynamic-writing-streak-header",
		});
		header.createSpan({
			cls: "dynamic-writing-streak-title",
			text: "Writing streak",
		});
		const currentStreak = header.createSpan({
			cls: "dynamic-writing-streak-current",
		});
		currentStreak.appendText("Current streak: ");
		currentStreak.createSpan({
			cls: "dynamic-writing-streak-current-value",
			text: `${this.stateManager.getVaultMetricsState().streak.streakCount} days`,
		});

		const body = this.streakCard.createDiv({
			cls: "dynamic-writing-streak-body",
		});
		const weekdayLabels = body.createDiv({
			cls: "dynamic-writing-streak-weekdays",
		});
		for (const label of ["S", "M", "T", "W", "T", "F", "S"]) {
			weekdayLabels.createSpan({ text: label });
		}

		const chart = body.createDiv({
			cls: "dynamic-writing-streak-chart",
		});
		const calendar = chart.createDiv({
			cls: "dynamic-writing-streak-calendar",
		});
		const history = this.stateManager.getDailyMetricsState();
		const dates = this.getStreakDates(visibleWeeks);
		const today = this.getStartOfLocalDay(new Date()).getTime();
		const oldestVisibleDate = new Date(today);
		oldestVisibleDate.setDate(oldestVisibleDate.getDate() - 364);
		const oldestVisibleTime = oldestVisibleDate.getTime();
		const maximumWords = Math.max(
			0,
			...dates
				.filter((date) => date.getTime() >= oldestVisibleTime && date.getTime() <= today)
				.map((date) => history[toLocalDateKey(date)]?.words ?? 0)
		);

		for (let weekIndex = 0; weekIndex < visibleWeeks; weekIndex++) {
			const week = calendar.createDiv({
				cls: "dynamic-writing-streak-week",
			});

			for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
				const date = dates[(weekIndex * 7) + dayIndex]!;
				const dateKey = toLocalDateKey(date);
				const words = history[dateKey]?.words ?? 0;
				const isOutsideYear = date.getTime() < oldestVisibleTime || date.getTime() > today;
				const level = isOutsideYear ? 0 : this.getStreakLevel(words, maximumWords);
				const cell = week.createDiv({
					cls: `dynamic-writing-streak-cell dynamic-writing-streak-cell--level-${level}`,
				});

				if (isOutsideYear) {
					cell.addClass("dynamic-writing-streak-cell--future");
				}

				cell.setAttribute("title", `${dateKey}: ${words} words`);
				cell.setAttribute("aria-label", `${dateKey}: ${words} words`);
			}
		}

		const months = chart.createDiv({
			cls: "dynamic-writing-streak-months",
		});
		const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

		for (let weekIndex = 0; weekIndex < visibleWeeks; weekIndex++) {
			const weekDates = dates.slice(weekIndex * 7, (weekIndex + 1) * 7);
			const monthStart = weekDates.find(
				(date) => date.getDate() === 1 && date.getTime() <= today
			);
			const monthLabelDate = monthStart ?? (weekIndex === 0 ? weekDates[0] : undefined);
			const slot = months.createSpan({
				cls: "dynamic-writing-streak-month-slot",
			});

			if (monthLabelDate) {
				slot.createSpan({
					cls: "dynamic-writing-streak-month-label",
					text: monthFormatter.format(monthLabelDate),
				});
			}
		}
	}

	private getStreakDates(visibleWeeks: number): Date[] {
		const today = this.getStartOfLocalDay(new Date());
		const firstSunday = new Date(today);
		firstSunday.setDate(today.getDate() - today.getDay() - ((visibleWeeks - 1) * 7));
		const dates: Date[] = [];

		for (let offset = 0; offset < visibleWeeks * 7; offset++) {
			const date = new Date(firstSunday);
			date.setDate(firstSunday.getDate() + offset);
			dates.push(date);
		}

		return dates;
	}

	private getStreakLevel(words: number, maximumWords: number): number {
		if (words <= 0 || maximumWords <= 0) {
			return 0;
		}

		return Math.min(4, Math.max(1, Math.ceil((words / maximumWords) * 4)));
	}

	private getStartOfLocalDay(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

}

export function openDashboardView(
	workspace: Workspace
): Promise<void> {
	if (dashboardOpenPromise) {
		return dashboardOpenPromise;
	}

	const openingPromise: Promise<void> = revealDashboardView(workspace)
		.catch((error: unknown): void => {
			Logger.lifecycle("dashboard view opening failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			new Notice("Could not open the dynamic dashboard.");
		})
		.finally(() => {
			dashboardOpenPromise = null;
		});
	dashboardOpenPromise = openingPromise;

	return dashboardOpenPromise;
}

async function revealDashboardView(
	workspace: Workspace
): Promise<void> {
	const existingLeaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
	const leaf = existingLeaf
		?? workspace.getLeftLeaf(false)
		?? workspace.getLeaf("tab");

	if (!existingLeaf) {
		await leaf.setViewState({
			type: DASHBOARD_VIEW_TYPE,
			active: true,
		});
	}

	if (typeof workspace.revealLeaf === "function") {
		await workspace.revealLeaf(leaf);
		return;
	}

	workspace.setActiveLeaf(leaf, { focus: true });
}
