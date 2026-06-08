import { App } from "obsidian";

export class SessionService {
	private lastActivity: number = Date.now();
	private timer: NodeJS.Timeout | null = null;

	private readonly IDLE_THRESHOLD = 15 * 1000;
	constructor(private app: App) {
        this.lastActivity = Date.now();
	}

	public getActiveMinutes() {
		console.log("Tracker de tempo iniciado!");

		// TEMPORÁRIO PARA TESTE:
		this.timer = setInterval(() => {
			const now = Date.now();
			const timeSinceLastActivity = now - this.lastActivity;

			if (timeSinceLastActivity < this.IDLE_THRESHOLD) {
				console.log(` Usuário ATIVO. Tempo sem mexer: ${Math.floor(timeSinceLastActivity/1000)}s. Adicionando tempo...`);
				// this.stateManager.dispatchTimeUpdate(1);
			} else {
				console.log(` Usuário OCIOSO. Tempo sem mexer: ${Math.floor(timeSinceLastActivity/1000)}s. Pausando contagem.`);
			}
		}, 5000); 
	}

	public pingActivity() {
        this.lastActivity = Date.now();
    }

}
