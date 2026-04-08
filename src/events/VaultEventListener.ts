import { Plugin, TAbstractFile, TFile } from "obsidian";
import DashboardPlugin from "../main";
import { StatProcessor } from "services/StatsProcessor";

export class VaultEventListener {
	constructor(private plugin: DashboardPlugin,
				private processor: StatProcessor
				) {}

	private debounceTimeout: NodeJS.Timeout;
	
	public init() {

		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (file) => this.handleTextModify(file))
		);

	}

	private async handleTextModify(activeFile: TAbstractFile) {
		if(activeFile instanceof TFile && activeFile.extension === 'md'){
			clearTimeout(this.debounceTimeout);

			this.debounceTimeout = setTimeout(async () => {
				await this.processor.updateSnapshotMetrics(activeFile);
			}, 500);
		}
	}
}
