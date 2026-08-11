import { ItemView, Side, Workspace, WorkspaceLeaf } from "obsidian";

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
	| "square-third";

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
	["detail"],
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
	constructor(leaf: WorkspaceLeaf) {
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
		this.contentEl.addClass("dynamic-dashboard-view");
		this.renderLayout();
	}

	protected async onClose(): Promise<void> {
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
		dashboard.setAttribute("aria-hidden", "true");

		for (const modifiers of DASHBOARD_CARD_LAYOUT) {
			this.createCard(dashboard, modifiers);
		}

		for (const group of DASHBOARD_HEIGHT_GROUPS) {
			this.createHeightGroup(dashboard, group);
		}

		dashboard.createDiv({
			cls: "dynamic-dashboard-footer",
		});
	}

	/**
	 * Create one dashboard card from its visual modifiers.
	 */
	private createCard(
		parent: HTMLElement,
		modifiers: readonly DashboardCardModifier[]
	): void {
		const modifierClasses = modifiers.map(
			(modifier) => `dynamic-dashboard-card--${modifier}`
		);

		parent.createDiv({
			cls: ["dynamic-dashboard-card", ...modifierClasses].join(" "),
		});
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
