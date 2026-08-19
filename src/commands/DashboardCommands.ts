import { Plugin } from "obsidian";
import { openDashboardView } from "views/DashboardView";

export class DashboardCommands {
	constructor(private plugin: Plugin) {}

	public register(): void {
		this.plugin.addCommand({
			id: "open-dashboard-left",
			name: "Open dashboard on left",
			callback: () => {
				void openDashboardView(this.plugin.app.workspace, "left");
			},
		});

		this.plugin.addCommand({
			id: "open-dashboard-right",
			name: "Open dashboard on right",
			callback: () => {
				void openDashboardView(this.plugin.app.workspace, "right");
			},
		});
	}
}
