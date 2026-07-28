import {App, PluginSettingTab, Setting} from "obsidian";
import DashboardPlugin from "./main";

export class DashboardSettingTab extends PluginSettingTab {
	plugin: DashboardPlugin;

	constructor(app: App, plugin: DashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
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
