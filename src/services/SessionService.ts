import { App } from "obsidian";

export class SessionService {
	private lastActivity: number = Date.now();
	private readonly IDLE_THRESHOLD = 5 * 60 * 1000;
	private sessionStartTime: number = Date.now();

	constructor(private app: App) {
		this.sessionStartTime = Date.now();
        this.lastActivity = Date.now();
	}

	public getActiveMinutes(): number {

		const now = Date.now();

		if(now - this.lastActivity > this.IDLE_THRESHOLD) {
			return Math.floor((this.lastActivity - this.sessionStartTime) / 60000);
		}

		return Math.floor((now - this.sessionStartTime) / 60000);
	}

	public pingActivity() {
        this.lastActivity = Date.now();
    }

	public getSessionDurationMinutes(): number {
		return Math.floor((Date.now() - this.sessionStartTime) / 60000);
	}
}
