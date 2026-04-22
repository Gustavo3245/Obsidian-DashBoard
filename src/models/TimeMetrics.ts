import { ReadingTime } from "./value_objects/ReadingTime";

interface TimeMetrics {
	lastActiveTimestamp: ReadingTime;
	totalDailyACtiveTime: ReadingTime;
	sessionStartTime: ReadingTime;
}
