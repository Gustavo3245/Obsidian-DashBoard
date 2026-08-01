import { App, getAllTags, TFile, TFolder} from "obsidian";
import { tagType } from "models/value_objects/TagType";
import { ReadingTime } from "models/value_objects/ReadingTime";
import { TimeRange } from "models/value_objects/TimeRange";
import { FileMetrics } from "models/FileMetrics";
import { ContentAnalyzer } from "analyzer/ContentAnalyzer";
import { MetadataAnalyzer } from "analyzer/MetadataAnalyzer";
import { DailyMetrics } from "models/DailyMetrics";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export class VaultService {
	private readonly metadataAnalyzer: MetadataAnalyzer;

	/**
	 * Create the Vault service and its metadata analyzer using the Obsidian app.
	 */
	constructor(private app: App) {
		this.metadataAnalyzer = new MetadataAnalyzer(app);
	}

	/**
	 * Get Markdown files modified within a predefined time range.
	 * The all range returns every Markdown file in the vault.
	 */
	getFilesByRange(range: TimeRange): TFile[] {
		const files = this.app.vault.getMarkdownFiles();

		if(range === 'all') return files;

		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

		const getThreshold = (): number => {
			switch(range) {
				case 'today': return startOfToday;
				case 'week': return startOfToday - (6 * 24 * 60 * 60 * 1000);
				case 'month': return startOfToday - (29 * 24 * 60 * 60 * 1000);
				default: return 0;
			}
		}
		
		const threshold = getThreshold();
		return files.filter(file => file.stat.mtime >= threshold);
	}

	/**
	 *	Get Tfile[] Array with custom time range, using (start time, end time).
	 *	This function use the file.stat.mtime with filter passing the entire vault.
	 */
	getFilesByCustomRange(start: Date, end: Date = new Date()): TFile[] {
		const files = this.app.vault.getMarkdownFiles();

		const startTime = start.getTime();
		const endTime = end.getTime();

		return files.filter(file => {
			const mtime = file.stat.mtime;
			return mtime >= startTime && mtime <= endTime;
		})
	}

	/**
	 * Get the number of characters based in a Array range, Tfile[].
	 * this function uses a map passing the entire vault using the vault.cacheRead() 
	 * function for catch the content: string with the caracters.
	 */
	async getTotalCharacters(files: TFile[]): Promise<number> {
		const metrics = await this.getContentMetrics(files);
		return metrics.reduce((total, current) => total + current.characters, 0);
	}

	/**
	 * Get the number of words based in a Array range of Tfiles[].
	 * Something is considered a word if there is a space or 
	 * punctuation at the end of it.
	 */
	async getTotalWords(files: TFile[]): Promise<number> {
		const metrics = await this.getContentMetrics(files);
		return metrics.reduce((total, current) => total + current.words, 0);
	}

	/**
	 * Return a type tag with the name and count of the most used tag.
	 * this calculation uses all tag appearances in the entire vault (content and FrontMatter).
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

		const mostAppearsTag = Object.entries(tagCount)
									.sort((current, previous) => previous[1] - current[1]);

		if(mostAppearsTag.length > 0 && mostAppearsTag[0]) {
			return {
				name: mostAppearsTag[0][0],
				count: mostAppearsTag[0][1]
			}
		}  
		return "Nothing but Wind";
	}

	/**
	 * Get the Estimated Reading Time based in medium per word readtime
	 * using a Array range of Tfiles[]. This function uses the number 200 for
	 * the medium Per minute readtime.
	 */
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

		return {
			hours,
			minutes,
			seconds,
			totalSeconds
		};
	}

	/**
	 * Get the current last modified MarkDown file in the vault.
	 * Typically, the last modified file is the active one at the moment.
	 */
	getLastModifiedMarkDownFile(): TFile | string { 
		const files = this.app.vault.getMarkdownFiles();

		if(files.length === 0){
			return "Nothing But Wind";
		}
		
		return files.reduce((previous, current) => 
			(current.stat.mtime > previous.stat.mtime) ? current : previous);

	}

	/**
	 * Get the file currently active in the Obsidian workspace.
	 * This function returns null when no file is open.
	 */
	getLastModifiedFile(): TFile | null {
		return this.app.workspace.getActiveFile();
	}

	/**
	 * Get the display name of the current vault.
	 */
	getVaultName(): string {
		return this.app.vault.getName();
	}

	/**
	 * Get the total number of Markdown files inside the vault.
	 */
	getTotalMarkdownFiles(): number {
		const files = this.app.vault.getMarkdownFiles();

		if(files.length == 0 || !files) {
			return 0;
		}
		return files.length;
	}

	/**
	 * Get the total number of files of every type inside the vault.
	 */
	getTotalFiles(): number {
		const files = this.app.vault.getFiles();

		if(files.length == 0 || !files){
			return 0;
		}
		return files.length;
	}

	/**
	 * get the current count of all folders inside the vault.
	 * The root folder is not counted (includeRoot = false).
	 */
	getTotalFolders(): number {
		const folders = this.app.vault.getAllFolders(false);

		if(folders.length == 0){
			return 0;
		}
		return folders.length;
	}

	/**
	 * Get the paths of the files most recently opened in the workspace.
	 * This function returns a fallback message when no file was opened.
	 */
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
		return attachments;
	}

	/**
	 * get the current average file length inside the files range,
	 * the average file length is based in the (vault.files.length - vault.totalFiles).
	 */
	async getAverageWordsPerFile(files: TFile[]): Promise<number>{

		if(files.length === 0){
			return 0;
		}

		const metrics = await this.getContentMetrics(files);
		const totalWords = metrics.reduce(
			(total, current) => total + current.words,
			0
		);
		return totalWords / metrics.length;
	}

	/**
	 * get the current average file length inside the files range,
	 * this function uses the current totalWords parameter made available by getTotalWords().
	 */
	async getAverageWordsPerFiles(files: TFile[], totalWords: number): Promise<number> { 
		return files.length > 0 ? totalWords / files.length : 0;
	}

	/**
	 * get all Orphan files inside the vault
	 * orphan file is a file that has no connection whatsoever (tags and Hyperlinks).
	 */
	getTotalOrphansFiles(files: TFile[]): number {

		if(files.length === 0 || !files){
			return 0;
		}

		return files.filter(file => this.isOrphanFile(file)).length
	}

	/**
	 * get the total size (in MegaBytes) inside the vault.
	 * this function returns a double number represent the actual vault size.
	*/
	getTotalVaultSize(files: TFile[] = this.app.vault.getFiles()): number {

		if(files.length === 0){
			return 0;
		}
		
		const totalSizeBytes = files.reduce((total, file) => total + file.stat.size, 0);
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

		return {
			hours,
			minutes,
			seconds,
			totalSeconds
		};

	}

	/**
	 * get the current vault TotalSentences count (this function declares that a sentence
	 * is considered text separated by a line break);
	 * */
	async getTotalSentences(files: TFile[]): Promise<number> {
		const metrics = await this.getContentMetrics(files);
		return metrics.reduce((total, current) => total + current.sentences, 0);
	}

	/**
	 * Get the word count directly from a content string kept in memory.
	 */
	getTotalWordsFromMemory(data: string): number {
		return ContentAnalyzer.analyze(data).words;
	}

	/**
	 * Get words, characters and sentences directly from in-memory content.
	 */
	getContentMetricsFromMemory(data: string) {
		return ContentAnalyzer.analyze(data);
	}

	/**
	 * Check whether a Markdown file has no tags, outgoing links or backlinks.
	 */
	isOrphanFile(file: TFile): boolean {
		return this.metadataAnalyzer.isOrphanFile(file);
	}

	/**
	 * Get content, reading time, orphan state and file information for one file.
	 * The file content is read from the Obsidian Vault cache.
	 */
	async getFilesMetrics(file: TFile): Promise<FileMetrics> {
		const content = await this.app.vault.cachedRead(file);
		const { words, sentences, characters } = ContentAnalyzer.analyze(content);
		const isOrphan = this.isOrphanFile(file);

		const readingTime = await this.getVaultEstimateReadingTime([file]);

		return {
			characters,
			words,
			sentences,
			readingTime,
			isOrphanFile: isOrphan,
			name: file.name,
			path: file.path,
			fileSize: file.stat.size
		}
	}

	/**
	 * Get the name of the folder with the greatest number of direct file children.
	 * This function returns a fallback message when the vault has no folders.
	 */
	mostActiveFolder(): string {
		const tfolders: TFolder[] = this.app.vault.getAllFolders(false);
		const [firstFolder] = tfolders;

		if (!firstFolder) {
			return "Nothing but Wind";
		}

		let mostActiveFolder = firstFolder;
		let maxFileCount = -1; 

		for (const folder of tfolders) {
			const fileCount = folder.children.filter(child => child instanceof TFile).length;

			if (fileCount > maxFileCount) {
				maxFileCount = fileCount;
				mostActiveFolder = folder;
			}
		}

		return mostActiveFolder.name;
	}

	/**
	 * Get all active dates from the saved daily history within the selected range.
	 * A date is active when it contains content metrics, active minutes or sessions.
	 */
	getActiveDates(range: TimeRange, dailyHistory: Record<string, DailyMetrics>): number[] {
		
		const today = this.getStartOfLocalDay(new Date());
		const minimumDate = this.getMinimumDateForRange(range, today);
		const activeDates = new Set<number>();

		for (const [dateKey, metrics] of Object.entries(dailyHistory)) {
			const date = this.parseIsoDate(dateKey);

			if (date === null || date < minimumDate || date > today) {
				continue;
			}

			const hasActivity = metrics.words > 0
				|| metrics.characters > 0
				|| metrics.sentences > 0
				|| metrics.timeMetrics.activeMinutes > 0
				|| metrics.timeMetrics.sessions > 0;

			if (hasActivity) {
				activeDates.add(date);
			}
		}

		return [...activeDates].sort((first, second) => first - second);
	}

	/**
	 * Get the current streak count from an array of active dates.
	 * The streak can end today or yesterday and stops at the first inactive day.
	 */
	calculateStreakCount(activeDates: number[]): number {
		const activeDateSet = new Set(activeDates);
		const today = this.getStartOfLocalDay(new Date());
		let currentDate = activeDateSet.has(today)
			? today
			: today - DAY_IN_MILLISECONDS;
		let streakCount = 0;

		while (activeDateSet.has(currentDate)) {
			streakCount++;
			currentDate -= DAY_IN_MILLISECONDS;
		}

		return streakCount;
	}

	/**
	 * Get the longest streak from an ordered array of active dates.
	 * Every sequence of consecutive days is compared with the longest sequence found.
	 */
	calculateLongestStreak(activeDates: number[]): number {
		let longestStreak = 0;
		let currentStreak = 0;
		let previousDate: number | null = null;

		for (const date of activeDates) {
			currentStreak = previousDate !== null
				&& date - previousDate === DAY_IN_MILLISECONDS
				? currentStreak + 1
				: 1;
			longestStreak = Math.max(longestStreak, currentStreak);
			previousDate = date;
		}

		return longestStreak;
	}

	/**
	 * Get the oldest accepted date for the selected predefined time range.
	 */
	private getMinimumDateForRange(range: TimeRange, today: number): number {
		switch (range) {
			case "today":
				return today;
			case "week":
				return today - (6 * DAY_IN_MILLISECONDS);
			case "month":
				return today - (29 * DAY_IN_MILLISECONDS);
			case "all":
				return Number.NEGATIVE_INFINITY;
		}
	}

	/**
	 * Convert a date key in YYYY-MM-DD format into a normalized timestamp.
	 * Invalid or non-existent calendar dates return null.
	 */
	private parseIsoDate(date: string): number | null {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

		if (!match) {
			return null;
		}

		const year = Number(match[1]);
		const month = Number(match[2]) - 1;
		const day = Number(match[3]);
		const parsedDate = new Date(year, month, day);

		if (parsedDate.getFullYear() !== year
			|| parsedDate.getMonth() !== month
			|| parsedDate.getDate() !== day) {
			return null;
		}

		return this.getStartOfLocalDay(parsedDate);
	}

	/**
	 * Normalize a local calendar date into a UTC timestamp without a time component.
	 */
	private getStartOfLocalDay(date: Date): number {
		return Date.UTC(
			date.getFullYear(),
			date.getMonth(),
			date.getDate()
		);
	}

	/**
	 * Read the supplied files once and analyze the content of each file.
	 */
	private async getContentMetrics(files: TFile[]) {
		const contents = await Promise.all(
			files.map((file) => this.app.vault.cachedRead(file))
		);

		return contents.map((content) => ContentAnalyzer.analyze(content));
	}
}
