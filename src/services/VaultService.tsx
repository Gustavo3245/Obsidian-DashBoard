import { App, getAllTags} from "obsidian";

interface tagType {
	name: string,
	count: number
}


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
	// o intuito aqui é mapear cada arquivo e em cada arquivo realizar a operação necessaria da função.

	async calculateTotalword(): Promise<number> {
		const files = this.app.vault.getMarkdownFiles();

		const wordCount = await Promise.all(
			files.map(async (file) => {

				// split the actual content of this complete file created a list
				// where every item divide by a space/colon or ponctuation is a item
				// ifs the length of the item is > 2 caracters is considered a word.
				const content = await this.app.vault.read(file);
				return content.split(/\s+/).filter(word => word.length > 0).length;
			})
		)
		const wordTotal = wordCount.reduce((total, count) => total + count, 0);
		return wordTotal;
	}

	getMostAppearsTagInAllContent(): tagType | string {
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

		const mostAppearsTag = Object.entries(tagCount).sort((current, previous) => previous[1] - current[1]);
		if(mostAppearsTag.length > 0) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		}  
		return "Nothing but Wind";
		
	}
	//FIXME
	getMostAppearsTagInFrontMatter(): tagType | string {
		const files = this.app.vault.getMarkdownFiles();
		const tagCount: Record<string, number> = {};

		for (const file of files){ 
			const cache = this.app.metadataCache.getFileCache(file);

			if(cache?.frontmatter && cache.frontmatter.tags) {
				let tags = cache.frontmatter.tags;

				// a tag pode ser storage dentro do obsidian como uma string tag: "model" ou
				// um array de tags: [model, backend].
				if(typeof tags === 'string') {
					tags = [tags];
				}

				// a declaração de tag dentro do frontmatter é feita por (# + nameTag)
				// O problema está que é possível declarar sem usar o #.
				if(Array.isArray(tags)) {
					tags.forEach(tag => {
						const formattedTag = tag.startsWith('#') ? tag : `#{tag}`;
						tagCount[formattedTag] = (tagCount[formattedTag] || 0) + 1;
					});
				}
			}
		}
		// transforma o array em um Array de arrays, compara cada array (current) com o proximo (previous) retornando
		// o array que possue a maior aparição.
		const mostAppearsTag = Object.entries(tagCount).sort((current, previous) => previous[1] - current[1]);

		if(mostAppearsTag.length > 0) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		}  
		return "Nothing but Wind";
	}
}
