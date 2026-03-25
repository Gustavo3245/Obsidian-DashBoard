import { App, getAllTags, TFile} from "obsidian";
import { tagType } from "models/TagType.js";
import { ReadingTime } from "models/ReadingTime";
import { TimeRange } from "models/TimeRange";


export class VaultService {
	constructor(private app: App) {}

	getFilesByRange(range: TimeRange): TFile[] {
		const files = this.app.vault.getMarkdownFiles();

		if(range === 'all') return files;

		const ActualDate = Date.now();

		const setLimits: Record<TimeRange, number> = {
			'today': ActualDate - (24 * 60 * 60 * 1000),
			'week': ActualDate - (7 * 24 * 60 * 60 * 1000),
			'month': ActualDate - (30 * 24 * 60 * 60 * 1000),
			'all': 0
		}
		
		const threshold = setLimits[range];
		return files.filter(file => file.stat.mtime >= threshold);
	}


	async calculateTotalCharacters(files: TFile[]): Promise<number> {
		
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

	async calculateTotalword(files: TFile[]): Promise<number> {

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

	getMostAppearsTagInAllContent(files: TFile[]): tagType | string {
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
		if(mostAppearsTag.length > 0 && mostAppearsTag) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		}  
		return "Nothing but Wind";
		
	}
	getMostAppearsTagInFrontMatter(files: TFile[]): tagType | string {
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

				if(Array.isArray(tags)) {
					tags.forEach(tag => {
						tagCount[tag] = (tagCount[tag] || 0) + 1;
					});
				}
			}
		}
		// transforma o array em um Array de arrays, compara cada array (current) com o proximo (previous) retornando
		// o array que possue a maior aparição.
		const mostAppearsTag = Object.entries(tagCount).sort((current, previous) => previous[1] - current[1]);

		if(mostAppearsTag?.length > 0 && mostAppearsTag[0]) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		} 
		return "Nothing But Wind"
	}


	getVaultEstimateReadingTime(totalWords: number): ReadingTime | string {
		const WORD_PER_MINUTE_READTIME = 200;

		if(totalWords <= 0){
			return "Nothing But Wind";
		}
		
		const totalSeconds = Math.floor((totalWords / WORD_PER_MINUTE_READTIME) * 60);

		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return {
			hours,
			minutes,
			seconds,
			totalSeconds
		};
	}

	getLastModifiedMarkDownFile(): TFile | undefined { 
		const files = this.app.vault.getMarkdownFiles();

		if(files.length === 0){
			return undefined;
		}
		
		return  files.reduce((previous, current) => 
			(current.stat.mtime > previous.stat.mtime) ? previous : current);

	}

	getActiveFile(): TFile | null {
		return this.app.workspace.getActiveFile();
	}

	getVaultName(): string | null {
		return this.app.vault.getName();
	}

}
