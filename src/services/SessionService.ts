
export class SessionService {

	private accumulatedMs = 0;
	private lastActivityTimestamp = Date.now();
	private lastTickTimestamp = Date.now();
	private heartbeatInterval: number | null = null;
	private isPaused = false;
	private readonly heartbeatMs = 10_000;

	constructor(private idleLimitMinutes: number) { }

	public startTracking(): number {

		if (this.heartbeatInterval !== null) {
			return this.heartbeatInterval;
		}

		this.lastActivityTimestamp = Date.now();
		this.lastTickTimestamp = Date.now();

		this.heartbeatInterval = window.setInterval(() => {
			const now = Date.now();
			const timeSinceLastActivity = now - this.lastActivityTimestamp;
			const delta = now - this.lastTickTimestamp;

			if (this.isPaused) {
				this.lastTickTimestamp = now;
				return;
			}

			if (timeSinceLastActivity <= this.idleLimitMinutes * 60_000) {
				this.accumulatedMs += delta;
			}

			this.lastTickTimestamp = now;
		}, this.heartbeatMs);

		return this.heartbeatInterval;
	}

	public stopTracking(): void {
		if (this.heartbeatInterval !== null) {
			window.clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	public pingActivity(): void {
		const now = Date.now();

		if (now - this.lastActivityTimestamp > this.idleLimitMinutes * 60_000) {
			this.lastTickTimestamp = now;
		}

		this.lastActivityTimestamp = now;
	}

	public setIdleLimitMinutes(idleLimitMinutes: number): void {
		if (Number.isFinite(idleLimitMinutes) && idleLimitMinutes > 0) {
			this.idleLimitMinutes = idleLimitMinutes;
		}
	}

	public pauseTracking(): void {
		this.isPaused = true;
		this.lastTickTimestamp = Date.now();
	}

	public resumeTracking(): void {
		const now = Date.now();

		this.isPaused = false;
		this.lastTickTimestamp = now;
		this.lastActivityTimestamp = now;
	}

	public getActiveMinutes(): number {
		return Math.floor(this.accumulatedMs / 60_000);
	}
}
