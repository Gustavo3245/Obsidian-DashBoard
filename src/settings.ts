import {App, PluginSettingTab, Setting} from "obsidian";
import DashboardPlugin from "./main";

/** Compatible with the declarative settings API introduced in Obsidian 1.13. */
interface DashboardSettingDefinition {
	id: string;
	name: string;
	description: string;
	type: "text";
	placeholder: string;
	getValue: () => string;
	setValue: (value: string) => Promise<void>;
}

export class DashboardSettingTab extends PluginSettingTab {
	plugin: DashboardPlugin;

	constructor(app: App, plugin: DashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Obsidian 1.13+ uses this API for Settings search; older versions use display(). */
	getSettingDefinitions(): DashboardSettingDefinition[] {
		return [{
			id: "idle-limit-minutes",
			name: "Idle limit",
			description: "Minutes without activity before session tracking pauses.",
			type: "text",
			placeholder: "5",
			getValue: () => String(this.plugin.settings.idleLimitMinutes),
			setValue: async (value: string): Promise<void> => {
				const idleLimitMinutes = Number(value);
				if (Number.isFinite(idleLimitMinutes) && idleLimitMinutes > 0) {
					await this.plugin.updateSettings({ idleLimitMinutes });
				}
			},
		}];
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Idle limit")
			.setDesc("Minutes without activity before session tracking pauses.")
			.addText(text => text
				.setPlaceholder("5")
				.setValue(String(this.plugin.settings.idleLimitMinutes))
				.onChange(async (value) => {
					const idleLimitMinutes = Number(value);

					if (Number.isFinite(idleLimitMinutes) && idleLimitMinutes > 0) {
						await this.plugin.updateSettings({ idleLimitMinutes });
					}
				}));
	}
}
