import { Plugin } from "obsidian";
import {
	DASHBOARD_ICON_ID,
	openDashboardView,
} from "views/DashboardView";

export class DashboardCommands {
	constructor(private plugin: Plugin) {}

	public register(): void {
		this.plugin.addCommand({
			id: "open-dashboard-left",
			name: "Open dashboard on left",
			icon: DASHBOARD_ICON_ID,
			callback: () => {
				void openDashboardView(this.plugin.app.workspace);
			},
		});

		this.plugin.addCommand({
			id: "open-dashboard-right",
			name: "Open dashboard on left (legacy shortcut)",
			icon: DASHBOARD_ICON_ID,
			callback: () => {
				void openDashboardView(this.plugin.app.workspace);
			},
		});
	}
}
