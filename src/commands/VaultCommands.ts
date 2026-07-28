import { Notice } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "orchestrators/StatsProcessor";

export class VaultCommands {
	constructor(
		private plugin: DashboardPlugin,
		private statProcessor: StatProcessor
	) {}
	

	public register(): void {
		this.plugin.addCommand({
			id: "refresh-vault-metrics",
			name: "Refresh vault metrics",
			callback: async () => {
				await this.statProcessor.vaultLoad("all");
				new Notice("Vault metrics updated.");
			},
		});
	}
}
