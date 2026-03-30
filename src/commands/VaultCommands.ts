import DashBoardPlugin from "../main";
import { StatProcessor } from "services/StatsProcessor";

export class VaultCommands {
	constructor(
		private plugin: DashBoardPlugin, 
		private statProcessor: StatProcessor
	) {}
	

	public register(): void {
		this.plugin.addCommand({
			id: "DashBoard-word",
			name: "Print Snapshot",
			callback: async () => {
				const data = await this.statProcessor.getSnapshot('all');
				console.log(`the active data: ${data}`);
			},
		});
	}
}
