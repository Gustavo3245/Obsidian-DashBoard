import { MetadataCache, TFile, getAllTags, App } from "obsidian";
import { tagType } from "models/value_objects/TagType";

export class MetadataAnalyzer {
	constructor(
		private app: App
	) {}

	/**
	 * This function return a Tag Record object with the name and the count of
	 * the write tag in the frontmatter files.
	 */
	getTagCountsInFrontMatter(files: TFile[]): Record<string, number> {
		const tagCount: Record<string, number> = {};

		for (const file of files){ 
			const cache = this.app.metadataCache.getFileCache(file);

			if(cache?.frontmatter && cache.frontmatter.tags) {

				const tags = Array.isArray(cache.frontmatter.tags)
					? cache.frontmatter.tags : [cache.frontmatter.tags];

				tags.forEach(tag => {
					const normalized = tag.startsWith('#') ? tag : `#${tag}`;
					tagCount[normalized] = (tagCount[normalized] || 0) + 1; 
				});
			}
		}
		return tagCount;
	}

	/**
	 * return a type tag with the name and count of the most used tag.
	 * this calculation uses ONLY frontmatter tags appearances.
	 */
	getMostAppearsTagInFrontMatter(files: TFile[]): tagType | string {
		const tagCount = this.getTagCountsInFrontMatter(files);

		const mostAppearsTag = Object.entries(tagCount).sort((current, previous) => previous[1] - current[1]);

		if(mostAppearsTag?.length > 0 && mostAppearsTag[0]) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		} 
		return "Nothing But Wind";
	}

	/**
	 * return a type tag with the name and count of the minor used tag.
	 * this calculation uses ONLY frontmatter tags appearances.
	 */
	getMinorAppearsTagInFrontMatter(files: TFile[]): tagType | string {
		const tagCount = this.getTagCountsInFrontMatter(files);

		const minorAppearsTag = Object.entries(tagCount).sort((current, previous) => current[1] - previous[1]);

		if(minorAppearsTag?.length > 0 && minorAppearsTag[0]){
			return {
				name: minorAppearsTag[0][0],
				count: minorAppearsTag[0][1]
			};
		}
		return "Nothing but Wind";
	}

	/**
	 * return the length/size number of the uniqueTags count in all content, 
	 * (frontmatter and obsidian notes). this function consider study and Study different tags.
	*/
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
	 * this function return the value of the orphanFile A OrphanFile is a file 
	 * without Tags, Outlinks and BackLinks in the entiry content or Frontmatter.
	*/
	isOrphanFile(file: TFile): Boolean {
		const cache = this.app.metadataCache.getFileCache(file);

		// 1. Verifica Tags (Conteúdo e Frontmatter)
		const hasTags = (cache?.tags?.length ?? 0) > 0 || (cache?.frontmatter?.tags?.length ?? 0) > 0;

		// 2. Verifica Links de Saída (Outlinks)
		const hasOutlinks = (cache?.links?.length ?? 0) > 0;

		// 3. Verifica Links de Entrada (Inlinks/Backlinks)
		const backlinks = this.app.metadataCache.resolvedLinks;
		let hasInlinks = false;

		for (const sourcePath in backlinks) {
			if (backlinks[sourcePath][file.path]) {
				hasInlinks = true;
				break;
			}
		}

		return !hasTags && !hasOutlinks && !hasInlinks;	
	}
}
