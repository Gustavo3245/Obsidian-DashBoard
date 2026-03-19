import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { getDashboardIcon } from "./components/icons/DashboardIcon.tsx";
// Remember to rename these classes and interfaces!

export default class HelloWorldPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();	

		addIcon('meu', getDashboardIcon());

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('meu', 'greet', () => {console.log(this.getLastModifiedFile())});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
		console.log("unloading Plugin");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async averageFileLength(): Promise<number> {
		const { vault } = this.app;

		const fileContents: string[] = await Promise.all(
			vault.getMarkdownFiles().map((file) => vault.cachedRead(file))
		);

		let totalLength = 0;
		fileContents.forEach((content) => {
			totalLength += content.length;
		});

		return totalLength / fileContents.length;
	}

	getLastModifiedFile() {
		const files = this.app.vault.getMarkdownFiles();

		if (files.length === 0) return console.log("Not a Single File");
		
		const lastModified = files.reduce((prev, current) => {
			return (prev.stat.mtime > current.stat.mtime) ? prev : current;
		});
	return lastModified;
	}

}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

interface DashInformation {
	caracterQuantity: BigInteger;
	wordQuantity: BigInteger;
}
