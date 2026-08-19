import { App, getAllTags, TFile} from "obsidian";
import { tagType } from "models/value_objects/TagType";
import { ReadingTime } from "models/value_objects/ReadingTime";
import { RANGE_DAYS, TimeRange } from "models/value_objects/TimeRange";
import { ContentAnalyzer, ContentMetrics } from "analyzer/ContentAnalyzer";
import { MetadataAnalyzer } from "analyzer/MetadataAnalyzer";
import { DailyMetrics } from "models/DailyMetrics";
import { ActivityPeriod, DatedDailyMetrics } from "models/ActivityMetrics";

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
	 * Get Markdown files modified during a predefined rolling range.
	 * Bounded ranges start at the beginning of the oldest included local day,
	 * end at the end of the current local day,
	 * while the all range returns every Markdown file in the vault.
	 * Range names and day counts are defined centrally by RANGE_DAYS.
	 */
	getFilesByRange(range: TimeRange): TFile[] {
		const files = this.app.vault.getMarkdownFiles();

		if(range === 'all') return files;

		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;

		const days = RANGE_DAYS[range];
		const getThreshold = startOfToday - ((days - 1) * DAY_IN_MILLISECONDS);

		return files.filter(file => {
			const mtime = file.stat.mtime;
			return mtime >= getThreshold && mtime <= endOfToday;
		});
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
	 * get the current vault TotalSentences count (this function declares that a sentence
	 * is considered text separated by a line break);
	 * */
	async getTotalSentences(files: TFile[]): Promise<number> {
		const metrics = await this.getContentMetrics(files);
		return metrics.reduce((total, current) => total + current.sentences, 0);
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
	 * Calculate an estimated duration from a total word count
	 * and a positive words-per-minute rate.
	 */
	estimateTime(totalWords: number, wordsPerMinute: number): ReadingTime | string {
		if(totalWords <= 0) {
			return "Nothing but Wind";
		}

		const totalSeconds = Math.floor((totalWords / wordsPerMinute) * 60);

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
	 * Get the estimated reading time for a total word count using 200 words per minute.
	 */
	getEstimatedReadingTime(totalWords: number): ReadingTime | string {
		const WORDS_PER_MINUTE_READING = 200;
		return this.estimateTime(totalWords, WORDS_PER_MINUTE_READING);
	}

	/**
	 * Get the estimated speaking time for a total word count using 130 words per minute.
	 */
	getEstimatedSpeakingTime(totalWords: number): ReadingTime | string {
		const WORDS_PER_MINUTE_SPEAKING = 130;
		return this.estimateTime(totalWords, WORDS_PER_MINUTE_SPEAKING);
	}

	/**
	 * Get the path of the last modified Markdown file in the supplied range.
	 * A serializable fallback message is returned when the range has no files.
	 */
	getLastModifiedMarkDownFile(files: TFile[]): string {
		
		if(files.length === 0){
			return "Nothing But Wind";
		}

		const lastModifiedFile = files.reduce((previous, current) =>
			(current.stat.mtime > previous.stat.mtime) ? current : previous);

		return lastModifiedFile.path;
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
	 * Get recently opened paths that belong to the supplied Markdown file range.
	 * This function returns a fallback message when no matching file exists.
	 */
	getActiveMarkDownFiles(files: TFile[]): string[] | string {

		const relevantPaths = new Set(files.map((file) => file.path));
		
		const markdownFilePaths = this.app.workspace.getLastOpenFiles()
			.filter((path) => {
				const file = this.app.vault.getAbstractFileByPath(path);
				
				return file instanceof TFile
					&& file.extension === "md" && relevantPaths.has(path);
			});

		if(markdownFilePaths.length === 0) {
			return "Nothing but Wind";
		}

		return markdownFilePaths;
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
	async getAverageWordsPerFile(files: TFile[]): Promise<number> {

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
	 * Get the total size in bytes of the supplied files or the complete vault.
	 * File sizes come directly from TFile.stat.size.
	*/
	getTotalVaultSize(files: TFile[] = this.app.vault.getFiles()): number {

		if(files.length === 0){
			return 0;
		}
		
		const totalSizeBytes = files.reduce((total, file) => total + file.stat.size, 0);
		return Number(totalSizeBytes.toFixed(2));
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
	 * Read one Markdown file and return only its analyzed content values.
	 */
	async getFileContentMetrics(file: TFile): Promise<ContentMetrics> {
		const content = await this.app.vault.cachedRead(file);
		return ContentAnalyzer.analyze(content);
	}

	/**
	 * Check whether a Markdown file has no tags, outgoing links or backlinks.
	 */
	isOrphanFile(file: TFile): boolean {
		return this.metadataAnalyzer.isOrphanFile(file);
	}

	/**
	 * Get the folder with the greatest number of direct files in the supplied range.
	 * This function returns a fallback message when no ranged file belongs to a folder.
	 */
	mostActiveFolder(files: TFile[]): string {
		const folderCounts = new Map<string, number>();

		for (const file of files) {
			const folder = file.parent;

			if (folder?.isRoot() !== false) {
				continue;
			}

			folderCounts.set(folder.path, (folderCounts.get(folder.path) ?? 0) + 1);
		}

		const mostActiveFolder = [...folderCounts.entries()]
			.sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))[0];

		return mostActiveFolder?.[0] ?? "Nothing but Wind";
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

			if (this.hasDailyActivity(metrics)) {
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
	 * Get valid daily metrics from the saved history within the selected range.
	 * Future dates and invalid date keys are ignored.
	 */
	getDailyMetricsByRange(range: TimeRange, dailyHistory: Record<string, DailyMetrics>): DatedDailyMetrics[] {
		const today = this.getStartOfLocalDay(new Date());
		const minimumDate = this.getMinimumDateForRange(range, today);

		return Object.entries(dailyHistory)
			.map(([dateKey, metrics]) => ({
				date: this.parseIsoDate(dateKey),
				dateKey,
				metrics,
			}))
			.filter((dailyMetrics): dailyMetrics is DatedDailyMetrics =>
				dailyMetrics.date !== null
				&& dailyMetrics.date >= minimumDate
				&& dailyMetrics.date <= today
				&& this.hasDailyActivity(dailyMetrics.metrics)
			)
			.sort((first, second) => first.date - second.date);
	}

	/**
	 * Get the average word count across active days in the selected history.
	 * Empty histories return zero.
	 */
	calculateDailyAverageWords(dailyMetrics: DatedDailyMetrics[]): number {
		
		if (dailyMetrics.length === 0) {
			return 0;
		}

		const totalWords = dailyMetrics.reduce(
			(total, dailyMetric) => total + dailyMetric.metrics.words,
			0
		);

		return totalWords / dailyMetrics.length;
	}

	/**
	 * Get the most active day using active minutes and the saved daily metrics.
	 * The most recent day wins when all activity values are equal.
	 */
	calculateMostActiveDay(dailyMetrics: DatedDailyMetrics[]): string | null {
		const periods = dailyMetrics.map(({ date, dateKey, metrics }) =>
			this.createActivityPeriod(dateKey, date, metrics)
		);

		return this.getMostActivePeriod(periods)?.key ?? null;
	}

	/**
	 * Get the Monday of the most active week using the saved daily metrics.
	 * Metrics from every day in the same calendar week are accumulated.
	 */
	calculateMostActiveWeek(dailyMetrics: DatedDailyMetrics[]): string | null {
		const periods = this.groupDailyMetrics(dailyMetrics, (date) => {
			const dayOfWeek = new Date(date).getUTCDay();
			const daysSinceMonday = (dayOfWeek + 6) % 7;
			const weekStart = date - (daysSinceMonday * DAY_IN_MILLISECONDS);

			return {
				key: this.formatIsoDate(weekStart),
				endDate: weekStart + (6 * DAY_IN_MILLISECONDS),
			};
		});

		return this.getMostActivePeriod(periods)?.key ?? null;
	}

	/**
	 * Get the most active month in YYYY-MM format using the saved daily metrics.
	 * Metrics from every day in the same calendar month are accumulated.
	 */
	calculateMostActiveMonth(dailyMetrics: DatedDailyMetrics[]): string | null {
		const periods = this.groupDailyMetrics(dailyMetrics, (date) => {
			const parsedDate = new Date(date);
			const year = parsedDate.getUTCFullYear();
			const month = parsedDate.getUTCMonth();

			return {
				key: `${year}-${String(month + 1).padStart(2, "0")}`,
				endDate: Date.UTC(year, month + 1, 0),
			};
		});

		return this.getMostActivePeriod(periods)?.key ?? null;
	}

	/**
	 * Group daily metrics into activity periods using the supplied date resolver.
	 */
	private groupDailyMetrics(dailyMetrics: DatedDailyMetrics[],
		resolvePeriod: (date: number) => { key: string; endDate: number }): ActivityPeriod[] {
		const periods = new Map<string, ActivityPeriod>();

		for (const { date, metrics } of dailyMetrics) {
			const { key, endDate } = resolvePeriod(date);
			const period = periods.get(key)
				?? this.createActivityPeriod(key, endDate);

			period.words += metrics.words;
			period.characters += metrics.characters;
			period.sentences += metrics.sentences;
			period.activeMinutes += metrics.timeMetrics.activeMinutes;
			period.sessions += metrics.timeMetrics.sessions;
			periods.set(key, period);
		}

		return [...periods.values()];
	}

	/**
	 * Create a serializable activity period with optional daily metric values.
	 */
	private createActivityPeriod(key: string, endDate: number, metrics?: DailyMetrics): ActivityPeriod {
		return {
			key,
			endDate,
			words: metrics?.words ?? 0,
			characters: metrics?.characters ?? 0,
			sentences: metrics?.sentences ?? 0,
			activeMinutes: metrics?.timeMetrics.activeMinutes ?? 0,
			sessions: metrics?.timeMetrics.sessions ?? 0,
		};
	}

	/**
	 * Select the most active period by time, sessions and content metrics.
	 */
	private getMostActivePeriod(periods: ActivityPeriod[]): ActivityPeriod | null {
		return periods.reduce<ActivityPeriod | null>((mostActive, current) => {
			if (mostActive === null) {
				return current;
			}

			const currentValues = this.getActivityValues(current);
			const mostActiveValues = this.getActivityValues(mostActive);

			for (let index = 0; index < currentValues.length; index++) {
				const currentValue = currentValues[index] ?? 0;
				const mostActiveValue = mostActiveValues[index] ?? 0;

				if (currentValue !== mostActiveValue) {
					return currentValue > mostActiveValue
						? current
						: mostActive;
				}
			}

			return current.endDate > mostActive.endDate ? current : mostActive;
		}, null);
	}

	/**
	 * Get activity values in the order used to compare saved periods.
	 */
	private getActivityValues(period: ActivityPeriod): number[] {
		return [
			period.activeMinutes,
			period.sessions,
			period.words,
			period.characters,
			period.sentences,
		];
	}

	/**
	 * Convert a normalized timestamp into a YYYY-MM-DD date key.
	 */
	private formatIsoDate(date: number): string {
		return new Date(date).toISOString().slice(0, 10);
	}

	/**
	 * Check whether saved daily metrics contain content or session activity.
	 */
	private hasDailyActivity(metrics: DailyMetrics): boolean {
		return metrics.words > 0
			|| metrics.characters > 0
			|| metrics.sentences > 0
			|| metrics.timeMetrics.activeMinutes > 0
			|| metrics.timeMetrics.sessions > 0;
	}

	/**
	 * Get the oldest accepted date for the selected predefined time range.
	 */
	private getMinimumDateForRange(range: TimeRange, today: number): number {
		if (range === "all") {
			return Number.NEGATIVE_INFINITY;
		}

		return today - ((RANGE_DAYS[range] - 1) * DAY_IN_MILLISECONDS);
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
		return Promise.all(
			files.map((file) => this.getFileContentMetrics(file))
		);
	}
}
