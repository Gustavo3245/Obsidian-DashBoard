import { Plugin } from "obsidian";
import DashBoardPlugin from "../main";

export class VaultCommands {
	constructor(private plugin: DashBoardPlugin) {}

	public register(): void {
		this.plugin.addCommand({
			id: "Vault-greeting-to-console",
			name: "Vault-greeting-to-console",
			callback: () => {
				console.log("Hey, You");
			},
		});
	}
}
