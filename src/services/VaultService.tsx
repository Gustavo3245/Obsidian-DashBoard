import { App, getAllTags } from "obsidian";

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
		const characterTotal = characterCount.reduce((total, count) => total + count, 0);
		return characterTotal;
	}

	// getMarkdownFiles retorna uma Promise, que é uma lista composta de TFile (obsdian markDown File)
	// o intuito aqui é mapear cada arquivo e em cada arquivo realizar a operação necessaria da função
	//

	async calculateTotalword(): Promise<number> {
		const files = this.app.vault.getMarkdownFiles();

		const wordCount = await Promise.all(
			files.map(async (file) => {

				// spilt the actual content of this complete file created a list
				// where every item divide by a space/colon or ponctuation is a item
				// ifs the length of the item is > 2 caracters is considered a word.
				const content = await this.app.vault.read(file);
				return content.split(/\s+/).filter(word => word.length > 0).length;
			})
		)
		const wordTotal = wordCount.reduce((total, count) => total + count, 0);
		return wordTotal;
	}

	getMostAppearsTagInContent(): String | null {
		const files = this.app.vault.getMarkdownFiles();
		const tagCount: Record<string, number> = {};

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);

			if (cache) {
				const fileTags = getAllTags(cache);

				if (fileTags) {
					fileTags.forEach(tag => {
						tagCount[tag] = (tagCount[tag] || 0) + 1;
					})
				}
			}
		}

		const mostAppearsTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
		return mostAppearsTag.length > 0 ? mostAppearsTag[0][0] : null;
		
	}


}
