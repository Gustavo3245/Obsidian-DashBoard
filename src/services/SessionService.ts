import { App } from "obsidian";

export class SessionService {
    private accumulatedMs: number = 0;
    private lastActivityTimestamp: number = Date.now();
    private lastTickTimestamp: number = Date.now();     
    
	private heartbeatInterval: NodeJS.Timeout | null = null;
    private readonly IDLE_LIMIT_MS = 5 * 60 * 1000;

	private heartBeatTimer: number = 10000;

	constructor(private app: App){
		this.app = app;
	}

    public startTracking() {
        this.lastActivityTimestamp = Date.now();
        this.lastTickTimestamp = Date.now();

        this.heartbeatInterval = setInterval(() => {
			console.log("Tracking!");
            const now = Date.now();
            const timeSinceLastActivity = now - this.lastActivityTimestamp;
            
            const delta = now - this.lastTickTimestamp; 

            if (timeSinceLastActivity <= this.IDLE_LIMIT_MS) {
                this.accumulatedMs += delta;
				console.log(`tempo acumulado: ${this.accumulatedMs}`)
            }

            this.lastTickTimestamp = now;
        }, this.heartBeatTimer);
    }

    public pingActivity() {
        const now = Date.now();

        if (now - this.lastActivityTimestamp > this.IDLE_LIMIT_MS) {
            this.lastTickTimestamp = now;
        }

        this.lastActivityTimestamp = now;
    }

    public getActiveMinutes(): number {
        return Math.floor(this.accumulatedMs / this.heartBeatTimer);
    }
}
