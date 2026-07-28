type LogDetails = Record<string, unknown>;

export class Logger {
	private static readonly prefix = "[Dynamic Dashboard]";

	static event(name: string, details?: LogDetails): void {
		this.debug("event", name, details);
	}

	static state(name: string, details: LogDetails): void {
		this.debug("state", name, details);
	}

	static lifecycle(name: string, details?: LogDetails): void {
		this.debug("lifecycle", name, details);
	}

	private static debug(scope: string, name: string, details?: LogDetails): void {

		if (details) {
			// Logging is an explicit, development-facing plugin feature.
			// eslint-disable-next-line obsidianmd/rule-custom-message
			console.info(`${this.prefix}[${scope}] ${name}`, details);
			return;
		}

		// Logging is an explicit, development-facing plugin feature.
		// eslint-disable-next-line obsidianmd/rule-custom-message
		console.info(`${this.prefix}[${scope}] ${name}`);
	}
}
