import { ItemView, Side, Workspace, WorkspaceLeaf } from "obsidian";
import { StateManager } from "state/StateManager";

export const DASHBOARD_VIEW_TYPE = "dynamic-dashboard-view";
export const DASHBOARD_ICON_ID = "dynamic-dashboard";

type DashboardCardModifier =
	| "summary"
	| "wide"
	| "detail"
	| "streak"
	| "medium"
	| "large"
	| "square"
	| "square-third"
	| "file-types";

interface DashboardHeightGroup {
	size: "medium" | "large";
	cardCount: number;
	conditionalCard?: {
		index: number;
		modifier: DashboardCardModifier;
	};
}

const DASHBOARD_CARD_LAYOUT: readonly (readonly DashboardCardModifier[])[] = [
	["summary"],
	["summary"],
	["summary", "medium"],
	["summary", "large"],
	["wide"],
	["wide", "large"],
	["detail", "file-types"],
	["detail"],
	["detail", "medium"],
	["detail", "large"],
	["wide", "streak"],
];

const DASHBOARD_HEIGHT_GROUPS: readonly DashboardHeightGroup[] = [
	{ size: "medium", cardCount: 2 },
	{
		size: "large",
		cardCount: 3,
		conditionalCard: { index: 2, modifier: "square-third" },
	},
];

export class DashboardView extends ItemView {
	private streakCard: HTMLElement | null = null;
	private fileTypesCard: HTMLElement | null = null;
	private streakResizeObserver: ResizeObserver | null = null;
	private unsubscribeState: (() => void) | null = null;

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
		this.unsubscribeState = this.stateManager.subscribe(() => {
			this.renderWritingStreak();
			this.renderFileTypes();
		});
		this.observeWritingStreak();
		this.renderWritingStreak();
		this.renderFileTypes();
	}

	protected async onClose(): Promise<void> {
		this.unsubscribeState?.();
		this.unsubscribeState = null;
		this.streakResizeObserver?.disconnect();
		this.streakResizeObserver = null;
		this.streakCard = null;
		this.fileTypesCard = null;
		this.containerEl.removeClass("dynamic-dashboard-container");
		this.contentEl.removeClass("dynamic-dashboard-view");
		this.contentEl.empty();
	}

	/**
	 * Render the empty responsive regions used by the future dashboard cards.
	 */
	private renderLayout(): void {
		const dashboard = this.contentEl.createDiv({
			cls: "dynamic-dashboard-layout",
		});
		for (const modifiers of DASHBOARD_CARD_LAYOUT) {
			const card = this.createCard(dashboard, modifiers);

			if (modifiers.includes("streak")) {
				this.streakCard = card;
			}

			if (modifiers.includes("file-types")) {
				this.fileTypesCard = card;
			}
		}

		for (const group of DASHBOARD_HEIGHT_GROUPS) {
			this.createHeightGroup(dashboard, group);
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

	private observeWritingStreak(): void {
		if (!this.streakCard) {
			return;
		}

		this.streakResizeObserver = new ResizeObserver(
			() => this.renderWritingStreak()
		);
		this.streakResizeObserver.observe(this.streakCard);
	}

	private renderFileTypes(): void {
		if (!this.fileTypesCard) {
			return;
		}

		const storedMetrics = this.stateManager.getVaultMetricsState().volume.fileTypes;
		const primaryTypes = ["markdown", "canvas"];
		const totalFiles = storedMetrics.reduce((total, metric) => total + metric.count, 0);
		const visibleMetrics = primaryTypes.map((type) => ({
			type,
			count: storedMetrics.find((metric) => metric.type === type)?.count ?? 0,
			percentage: 0,
		}));
		visibleMetrics.push({
			type: "other",
			count: storedMetrics
				.filter((metric) => !primaryTypes.includes(metric.type))
				.reduce((total, metric) => total + metric.count, 0),
			percentage: 0,
		});

		for (const metric of visibleMetrics) {
			metric.percentage = totalFiles > 0 ? (metric.count / totalFiles) * 100 : 0;
		}

		const colors = ["#8b5cf6", "#3b82f6", "#eab308"];
		let accumulatedPercentage = 0;
		const gradientStops = visibleMetrics.map((metric, index) => {
			const color = colors[index] ?? colors[colors.length - 1]!;
			const start = accumulatedPercentage;
			accumulatedPercentage += totalFiles > 0 ? (metric.count / totalFiles) * 100 : 0;
			return `${color} ${start}% ${accumulatedPercentage}%`;
		});

		this.fileTypesCard.empty();
		this.fileTypesCard.createDiv({
			cls: "dynamic-file-types-title",
			text: "File types",
		});
		const body = this.fileTypesCard.createDiv({
			cls: "dynamic-file-types-body",
		});
		const donut = body.createDiv({
			cls: "dynamic-file-types-donut",
		});
		donut.style.setProperty(
			"--dynamic-file-types-gradient",
			totalFiles > 0
				? `conic-gradient(${gradientStops.join(", ")})`
				: "var(--background-modifier-border)"
		);
		donut.setAttribute(
			"aria-label",
			totalFiles > 0
				? visibleMetrics.map((metric) => `${metric.type}: ${metric.percentage.toFixed(1)}%`).join(", ")
				: "No files"
		);
		donut.setAttribute("role", "img");

		const legend = body.createDiv({
			cls: "dynamic-file-types-legend",
		});

		for (const [index, metric] of visibleMetrics.entries()) {
			const color = colors[index] ?? colors[colors.length - 1]!;
			const row = legend.createDiv({
				cls: "dynamic-file-types-legend-row",
			});
			row.style.setProperty("--dynamic-file-type-color", color);
			row.createSpan({
				cls: "dynamic-file-types-name",
				text: this.formatFileTypeName(metric.type),
			});
			row.createSpan({
				cls: "dynamic-file-types-percentage",
				text: `${metric.percentage.toFixed(1)}%`,
			});
		}
	}

	private formatFileTypeName(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	private renderWritingStreak(): void {
		if (!this.streakCard) {
			return;
		}

		const cardWidth = this.streakCard.clientWidth;
		const cardHeight = this.streakCard.clientHeight;
		const cellGap = 2;
		const targetCellSize = 9;
		const availableWidth = Math.max(0, cardWidth - 38);
		const availableGridHeight = Math.max(0, cardHeight - 41);
		const cellSize = Math.max(
			4,
			Math.min(
				10,
				targetCellSize,
				Math.floor((availableGridHeight - (6 * cellGap)) / 7)
			)
		);
		const visibleWeeks = Math.max(
			4,
			Math.min(53, Math.floor((availableWidth + cellGap) / (cellSize + cellGap)))
		);

		this.streakCard.empty();
		this.streakCard.style.setProperty("--dynamic-streak-cell-size", `${cellSize}px`);
		this.streakCard.style.setProperty("--dynamic-streak-cell-gap", `${cellGap}px`);

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
		const maximumWords = Math.max(
			0,
			...dates.map((date) => history[this.toLocalDateKey(date)]?.words ?? 0)
		);
		const today = this.getStartOfLocalDay(new Date()).getTime();

		for (let weekIndex = 0; weekIndex < visibleWeeks; weekIndex++) {
			const week = calendar.createDiv({
				cls: "dynamic-writing-streak-week",
			});

			for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
				const date = dates[(weekIndex * 7) + dayIndex]!;
				const dateKey = this.toLocalDateKey(date);
				const words = history[dateKey]?.words ?? 0;
				const isFuture = date.getTime() > today;
				const level = isFuture ? 0 : this.getStreakLevel(words, maximumWords);
				const cell = week.createDiv({
					cls: `dynamic-writing-streak-cell dynamic-writing-streak-cell--level-${level}`,
				});

				if (isFuture) {
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

	/**
	 * Create a responsive group containing a configurable number of square cards.
	 */
	private createHeightGroup(
		parent: HTMLElement,
		config: DashboardHeightGroup
	): void {
		const group = parent.createDiv({
			cls: `dynamic-dashboard-height-group dynamic-dashboard-height-group--${config.size}`,
		});

		for (let index = 0; index < config.cardCount; index++) {
			const modifiers: DashboardCardModifier[] = ["square"];

			if (index === config.conditionalCard?.index) {
				modifiers.push(config.conditionalCard.modifier);
			}

			this.createCard(group, modifiers);
		}
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
