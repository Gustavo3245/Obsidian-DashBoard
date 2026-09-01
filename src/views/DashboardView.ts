import { ItemView, setIcon, Side, Workspace, WorkspaceLeaf } from "obsidian";
import { StateManager } from "state/StateManager";
import {
	getDashboardFileTypes,
	getDashboardRecentActivities,
} from "views/DashboardViewData";

export const DASHBOARD_VIEW_TYPE = "dynamic-dashboard-view";
export const DASHBOARD_ICON_ID = "dynamic-dashboard";

type DashboardCardModifier =
	| "summary"
	| "wide"
	| "detail"
	| "streak"
	| "tall"
	| "extra-summary"
	| "expanded"
	| "active-days"
	| "file-types"
	| "recent-activity";

const DASHBOARD_CARD_LAYOUT: readonly (readonly DashboardCardModifier[])[] = [
	["summary"],
	["summary"],
	["summary", "tall", "extra-summary"],
	["summary", "tall", "extra-summary"],
	["summary", "expanded"],
	["summary", "expanded"],
	["wide"],
	["wide", "tall"],
	["detail", "file-types"],
	["detail", "expanded", "active-days"],
	["detail", "recent-activity"],
	["wide", "streak"],
];

const FILE_TYPE_COLORS = ["#8b5cf6", "#38bdf8", "#22c55e", "#facc15"] as const;
const FILE_TYPE_LABELS = {
	markdown: "Markdown",
	canvas: "Canvas",
	excalidraw: "Excalidraw",
	other: "Other",
} as const;

export class DashboardView extends ItemView {
	private streakCard: HTMLElement | null = null;
	private fileTypesCard: HTMLElement | null = null;
	private recentActivityCard: HTMLElement | null = null;
	private streakResizeObserver: ResizeObserver | null = null;
	private unsubscribeState: (() => void) | null = null;
	private recentActivityRefreshTimer: number | null = null;

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
		this.renderLayout();
		this.unsubscribeState = this.stateManager.subscribe(
			() => this.renderWritingStreak()
		);
		this.registerPresentationEvents();
		if (this.streakCard) {
			this.streakResizeObserver = new ResizeObserver(
				() => this.renderWritingStreak()
			);
			this.streakResizeObserver.observe(this.streakCard);
		}
		this.renderWritingStreak();
		this.renderFileTypes();
		this.renderRecentActivity();
	}

	protected async onClose(): Promise<void> {
		this.unsubscribeState?.();
		this.unsubscribeState = null;
		this.streakResizeObserver?.disconnect();
		this.streakResizeObserver = null;
		if (this.recentActivityRefreshTimer !== null) {
			window.clearTimeout(this.recentActivityRefreshTimer);
			this.recentActivityRefreshTimer = null;
		}
		this.streakCard = null;
		this.fileTypesCard = null;
		this.recentActivityCard = null;
		this.containerEl.removeClass("dynamic-dashboard-container");
		this.contentEl.removeClass("dynamic-dashboard-view");
		this.contentEl.empty();
	}

	/** Render the cards used by the compact dashboard. */
	private renderLayout(): void {
		const dashboard = this.contentEl.createDiv({
			cls: "dynamic-dashboard-layout",
		});
		const overview = dashboard.createDiv({ cls: "dynamic-dashboard-overview" });
		const overviewTitle = overview.createSpan({
			cls: "dynamic-dashboard-overview-title",
		});
		setIcon(overviewTitle.createSpan(), "chart-no-axes-column-increasing");
		overviewTitle.appendText("Overview");
		overview.createSpan({
			cls: "dynamic-dashboard-overview-range",
			text: "All time",
		});

		for (const modifiers of DASHBOARD_CARD_LAYOUT) {
			const card = this.createCard(dashboard, modifiers);

			if (modifiers.includes("streak")) {
				this.streakCard = card;
			}

			if (modifiers.includes("file-types")) {
				this.fileTypesCard = card;
			}

			if (modifiers.includes("recent-activity")) {
				this.recentActivityCard = card;
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
			this.scheduleRecentActivityRefresh();
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
			this.app.vault.on("modify", () => this.scheduleRecentActivityRefresh())
		);
	}

	private scheduleRecentActivityRefresh(): void {
		if (this.recentActivityRefreshTimer !== null) {
			window.clearTimeout(this.recentActivityRefreshTimer);
		}

		this.recentActivityRefreshTimer = window.setTimeout(() => {
			this.recentActivityRefreshTimer = null;
			this.renderRecentActivity();
		}, 150);
	}

	private renderRecentActivity(): void {
		if (!this.recentActivityCard) {
			return;
		}

		const activities = getDashboardRecentActivities(this.app.vault.getMarkdownFiles());

		this.recentActivityCard.empty();
		this.recentActivityCard.createDiv({
			cls: "dynamic-recent-activity-title",
			text: "Recent activity",
		});
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
			const color = FILE_TYPE_COLORS[index] ?? FILE_TYPE_COLORS.at(-1)!;
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

	private renderWritingStreak(): void {
		if (!this.streakCard) {
			return;
		}

		const cellSize = 9;
		const cellGap = 2;
		const availableWidth = Math.max(0, this.streakCard.clientWidth - 38);
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
				.map((date) => history[this.toLocalDateKey(date)]?.words ?? 0)
		);

		for (let weekIndex = 0; weekIndex < visibleWeeks; weekIndex++) {
			const week = calendar.createDiv({
				cls: "dynamic-writing-streak-week",
			});

			for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
				const date = dates[(weekIndex * 7) + dayIndex]!;
				const dateKey = this.toLocalDateKey(date);
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

	private toLocalDateKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

}

export async function openDashboardView(
	workspace: Workspace,
	side: Side = "right"
): Promise<void> {
	const existingLeaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
	const leaf = existingLeaf
		?? (side === "left"
			? workspace.getLeftLeaf(false)
			: workspace.getRightLeaf(false))
		?? workspace.getLeaf("tab");

	if (!existingLeaf) {
		await leaf.setViewState({
			type: DASHBOARD_VIEW_TYPE,
			active: true,
		});
	}

	workspace.setActiveLeaf(leaf, { focus: true });
}
