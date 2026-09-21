/** Return a local calendar date key in the persisted YYYY-MM-DD format. */
export function toLocalDateKey(date: Date): string {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}-${day < 10 ? "0" : ""}${day}`;
}
