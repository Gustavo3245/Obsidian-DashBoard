import { App, getAllTags, TFile} from "obsidian";
import { tagType } from "models/value_objects/TagType";
import { ReadingTime } from "models/value_objects/ReadingTime";
import { TimeRange } from "models/value_objects/TimeRange";


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

	/**
	 * get the total caracters bases in the current relevant files (parameter files).
	 */
	async getTotalCharacters(files: TFile[]): Promise<number> {
		
		const characterCount = await Promise.all(
			files.map(async (file) => {
				const content = await this.app.vault.cachedRead(file);
				return content.replace(/\s/g, '').length;
			})
		);
		return characterCount.reduce((total, count) => total + count, 0);
	}

	/**
	 * get the total words based in the current relevant files.
	 * Something is considered a word if there is a space 
	 * or punctuation at the end of it.
	 */
	async getTotalWords(files: TFile[]): Promise<number> {

		const wordCount = await Promise.all(
			files.map(async (file) => {

				// split the actual content of this complete file created a list
				// where every item divide by a space/colon or ponctuation is a item
				// ifs the length of the item is > 2 caracters is considered a word.
				const content = await this.app.vault.cachedRead(file);
				return content.split(/\s+/).filter(word => word.length > 0).length;
			})
		);
		return wordCount.reduce((total, count) => total + count, 0);
	}

	/**
	 * return a type tag with the name and count of the most used tag.
	 * this calculation uses all tag appearances.
	 */
	getMostAppearsTagInAllContent(files: TFile[]): tagType | string {
		const tagCount: Record<string, number> = {};

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fileTags = cache ? getAllTags(cache): null;

			fileTags?.forEach(tag => {
				const normalized = tag.startsWith('#') ? tag : `#${tag}`;
				tagCount[normalized] = (tagCount[normalized] || 0) + 1;
			});
			
		}

		const mostAppearsTag = Object.entries(tagCount).sort((current, previous) => previous[1] - current[1]);

		if(mostAppearsTag.length > 0 && mostAppearsTag[0]) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		}  
		return "Nothing but Wind";
	}

	/**
	 * return a type tag with the name and count of the most used tag.
	 * this calculation uses ONLY frontmatter tags appearances.
	 */
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


	async getVaultEstimateReadingTime(files: TFile[]): Promise<ReadingTime | string> {
		const totalWords = await this.getTotalWords(files);
		const WORD_PER_MINUTE_READTIME = 200;

		if(totalWords == null || !totalWords){
			return "Nothing But Wind";
		}
		
		const totalSeconds = Math.floor((totalWords / WORD_PER_MINUTE_READTIME) * 60);

		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;


		console.log(`total time: ${hours}, ${minutes}, ${seconds}`)

		return {
			hours,
			minutes,
			seconds,
			totalSeconds
		};
	}

	/*
	 * get the current last modified MarkDown file in the vault.
	 * Typically, the last modified file is the active one at the moment.
	 * DEPRECITED // Not used
	 */
	getLastModifiedMarkDownFile(): TFile | string { 
		const files = this.app.vault.getMarkdownFiles();

		if(files.length === 0){
			return "Nothing But Wind";
		}
		
		return files.reduce((previous, current) => 
			(current.stat.mtime > previous.stat.mtime) ? previous : current);

	}

	getLastModifiedFile(): TFile | null {
		return this.app.workspace.getActiveFile();
	}

	getVaultName(): string {
		return this.app.vault.getName();
	}

	
	getTotalFiles(): number {
		const files = this.app.vault.getMarkdownFiles();

		if(files.length == 0 || !files) {
			return 0;
		}
		return files.length;
	}

	/**
	 * get the current count of all folders inside the vault.
	 * The root folder is not counted (includeRoot = false).
	 */
	getTotalFoldes(): number {
		const folders = this.app.vault.getAllFolders(false);

		if(folders.length == 0){
			return 0;
		}
		return folders.length;
	}

	getActiveMarkDownFiles(): string[] | string {
		const files = this.app.workspace.getLastOpenFiles();

		if(files.length == 0) {
			return "Nothing but Wind";
		}
		return files;
	}

	/**
	 * get the count of attachments inside the vault
	 * a attachments its considered a file which is not a Markdown file.
	 */
	getTotalAttachments(): number {
		const files = this.app.vault.getFiles();
		const markdownFiles = this.app.vault.getMarkdownFiles()

		if(files.length == 0) {
			return 0;
		}

		const attachments = (files.length - markdownFiles.length);
		console.log(`Total attachments: ${attachments}`)
		return attachments;
	}

	//ERROR Lembre de implementar essa função recebendo a função de getTotalCharacters,
	// Mudala para sincrona (retirar o retorno de Promise).
	/**
	 * get the current average file length inside the files range,
	 * the average file length is based in the (vault.files.length - vault.totalFiles).
	 */
	async getAverageWordsPerFile(files: TFile[]): Promise<number>{

		if(files.length === 0 || !files){
			return 0;
		}

		const fileContents: string[] = await Promise.all(
			files.map((file) => this.app.vault.cachedRead(file))
		);

		let totalLength = 0;
		fileContents.forEach((content) => {
			const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
			totalLength += wordCount;
		})


		let response = totalLength / fileContents.length;
		console.log(`Test new function: ${response}`);
		return response;
	}

	/**
	 * get the current average file length inside the files range,
	 * this function uses the current totalWords parameter made available by getTotalWords().
	 */
	async getAverageWordsPerFiles(files: TFile[], totalWords: number): Promise<number> { 
		return Number(totalWords / files.length)
	}

	/**
	 * get all Orphan files inside the vault
	 * orphan file is a file that has no connection whatsoever (tags and Hyperlinks).
	 */
	getTotalOrphansFiles(files: TFile[]): number {
		const orphanFiles: TFile[] = [];

		if(files.length === 0 || !files){
			return 0;
		}

		files.forEach((file) => {
			const cache = this.app.metadataCache.getFileCache(file);

			const hasTags = (cache?.tags?.length ?? 0) > 0 || (cache?.frontmatter?.length ?? 0) > 0;

			const hasOutlinks = (cache?.links?.length ?? 0) > 0;

			const backlinks = this.app.metadataCache.resolvedLinks;
			let hasInlinks = false;

			for(const sourcePath in backlinks){
				if(backlinks[sourcePath][file.path]){
					hasInlinks = true;
					break;
				}
			}

			if(!hasTags && !hasOutlinks && !hasInlinks){
				orphanFiles.push(file)
			}
		});
		console.log(`Orphans files count: ${orphanFiles.length}`)
		return orphanFiles.length;
	}

	/**
	 * get the total size (in MegaBytes) inside the vault.
	 * this function returns a double number represent the actual vault size.
	*/
	getTotalVaultSize(files: TFile[]): number {

		if(files.length === 0){
			return 0;
		}
		
		const totalSizeBytes = files.reduce((total, file) => total + file.stat.size, 0);
		const totalSizeInMB = totalSizeBytes / (1024 * 1024);

		return Number(totalSizeBytes.toFixed(2));
	}

	/**
	 * get the current estimated Speaking Time (for files, folders and complete Vault).
	*/
	async getEstimatedSpeakingTime(files: TFile[]): Promise<ReadingTime | string> {
		const totalWords = await this.getTotalWords(files);
		const WORDS_PER_MINUTE_SPEAKTIME = 130;

		if(!totalWords || totalWords <= 0){
			return "Nothing But Wind";
		}
		
		const totalSeconds = Math.floor((totalWords / WORDS_PER_MINUTE_SPEAKTIME) * 60);

		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		console.log(`total time: ${hours}, ${minutes}, ${seconds}`)

		return {
			hours,
			minutes,
			seconds,
			totalSeconds
		};

	}

	getTotalUniqueTags(files: TFile[]): number {

		if(files.length === 0 || !files){
			return 0;
		}

		const uniqueTags = new Set<string>();

		files.forEach((file) => {
			const cache = this.app.metadataCache.getFileCache(file);
			const fileTags = cache ? getAllTags(cache) : null;

			fileTags?.forEach(tag => {
				uniqueTags.add(tag.toLowerCase());
			});
		});

		return uniqueTags.size;
	}

	/**
	 * get the current vault TotalSentences count (this function declares that a sentence
	 * is considered text separated by a line break);
	 * */
	async getTotalSentences(files: TFile[]): Promise<number> {
		let totalSentences = 0;

		const contents = await Promise.all(
			files.map(file => this.app.vault.cachedRead(file))
		);

		contents.forEach(content => {
			const sentencesInFile = content.split(/\r?\n/).filter(line => line.trim().length > 0).length
			totalSentences += sentencesInFile;
		});
		console.log(`TotalSentences: ${totalSentences}`);
		return totalSentences;
	}

}
