import { ItemView, Side, Workspace, WorkspaceLeaf } from "obsidian";

export const DASHBOARD_VIEW_TYPE = "dynamic-dashboard-view";
export const DASHBOARD_ICON_ID = "dynamic-dashboard";

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

		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--summary",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--summary",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--summary dynamic-dashboard-card--medium",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--summary dynamic-dashboard-card--large",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--wide",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--wide dynamic-dashboard-card--large",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--detail",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--detail",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--detail dynamic-dashboard-card--medium",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--detail dynamic-dashboard-card--large",
		});
		dashboard.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--wide dynamic-dashboard-card--streak",
		});

		const mediumHeightGroup = dashboard.createDiv({
			cls: "dynamic-dashboard-height-group dynamic-dashboard-height-group--medium",
		});
		mediumHeightGroup.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--square",
		});
		mediumHeightGroup.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--square",
		});

		const largeHeightGroup = dashboard.createDiv({
			cls: "dynamic-dashboard-height-group dynamic-dashboard-height-group--large",
		});
		largeHeightGroup.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--square",
		});
		largeHeightGroup.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--square dynamic-dashboard-card--square-third",
		});
		largeHeightGroup.createDiv({
			cls: "dynamic-dashboard-card dynamic-dashboard-card--square",
		});

		dashboard.createDiv({
			cls: "dynamic-dashboard-footer",
		});
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
