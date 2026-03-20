import { App, TFile } from "obsidian";

export class VaultService {
	constructor(private app: App) {}

	async calculateTotalCharacters(): Promise<number> {
		const files = this.app.vault.getMarkdownFiles();
		
		const characterCount = await Promise.all(
			files.map(async (file) => {
				const content = await this.app.vault.read(file);
				return content.replace(/\s/g, '').length;
			})
		)
		const characterTotal = characterCount.reduce((acc, count) => acc + count, 0);
		return characterTotal;
	}

	async calculateTotalword(): Promise<number> {
		const files = this.app.vault.getMarkdownFiles();

		const wordCount = await Promise.all(
			files.map(async (file) => {
				const content = await this.app.vault.read(file);
				return content.split(/\s+/).filter(word => word.length > 0).length;
			})
		)
		const wordTotal = wordCount.reduce((acc, count) => acc + count, 0);
		return wordTotal;
	}
}
