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

		console.log(`total time: ${hours}, ${minutes}, ${seconds}`)

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

	getTotalFiles(): number | null {
		const files = this.app.vault.getMarkdownFiles();

		if(files.length == 0) {
			return null;
		}
		return files.length;
	}

	getTotalFoldes(): number | null {
		const folders = this.app.vault.getAllFolders(false);

		if(folders.length == 0){
			return null;
		}
		return folders.length;
	}

	getActiveMarkDownFiles(): string[] | null {
		const files = this.app.workspace.getLastOpenFiles();

		if(files.length == 0) {
			return null;
		}
		return files;
	}

	// pegar todos os arquivos - total de arquivos markdown
	getTotalAttachments(): number | null {
		const files = this.app.vault.getFiles();
		const markdownFiles = this.app.vault.getMarkdownFiles()

		if(files.length == 0) {
			return null;
		}

		const attachments = (files.length - markdownFiles.length);
		console.log(`Total attachments: ${attachments}`)
		return attachments;
	}


	async getAvarageFileLength(): Promise<number>{
		const { vault } = this.app;

		const fileContents: string[] = await Promise.all(
			vault.getMarkdownFiles().map((file) =>
			vault.cachedRead(file))
		);

		let totalLength = 0;
		fileContents.forEach((content) => {
			totalLength += content.length;
		})


		let response = totalLength / fileContents.length;
		console.log(`Test new function: ${response}`);
		return response;
	}

	/**
	 * get all Orphan files inside the vault
	 * orphan file is a file that has no connection whatsoever (tags and Hyperlinks).
	 */
	async getTotalOrphansFiles(range: TimeRange): Promise<number> {
		const allfiles = this.getFilesByRange(range);
		const orphanFiles: TFile[] = [];

		allfiles.forEach((file) => {
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

	/*
	 * get the total size (in MegaBytes) inside the vault.
	 * this function returns a double number represent the actual vault size.
	*/
	async getTotalVaultSize(): Promise<number> {
		const files = this.getFilesByRange('all');

		if(files.length == 0){
			return 0;
		}

		const fileSize = await Promise.all(
			files.map(async (file) => {
				const content = await this.app.vault.read(file);
				return file.stat.size;
			})
		)
		const totalSize = fileSize.reduce((total, count) => total + count, 0);
		const totalSizeInMegabytes = (totalSize / 1024) / 1024;

		console.log(`Vault total size: ${totalSize}`);
		return totalSize;
	}

	/*
	 * get the current estimated Speaking Time (for files, folders and complete Vault).
	*/
	async getEstimatedSpeakingTime(range: TimeRange): Promise<ReadingTime | string> {
		const totalWords = await this.calculateTotalword(this.getFilesByRange(range));
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
}
