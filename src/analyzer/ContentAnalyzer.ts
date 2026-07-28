export interface ContentMetrics {
	characters: number;
	words: number;
	sentences: number;
}

export class ContentAnalyzer {
	private static removeFrontmatter(content: string): string {
		return content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
	}

	static analyze(content: string): ContentMetrics {
		const normalizedContent = this.removeFrontmatter(content);

		return {
			characters: normalizedContent.replace(/\s/gu, "").length,
			words: normalizedContent.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length ?? 0,
			sentences: normalizedContent
				.split(/[.!?]+(?:\s|$)|\r?\n+/u)
				.filter((sentence) => /[\p{L}\p{N}]/u.test(sentence))
				.length,
		};
	}
}
