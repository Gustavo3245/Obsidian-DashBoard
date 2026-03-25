const LogTheme = {
    INFO: "background: #2d3436; color: #00d2d3; border: 1px solid #00d2d3;",
    SUCCESS: "background: #1b4d3e; color: #2ecc71; border: 1px solid #2ecc71;",
    ERROR: "background: #c0392b; color: #ffffff; border: 1px solid #ff7675;",
    DEBUG: "background: #2f3640; color: #fbc531; border: 1px solid #fbc531;"
} as const;

export class Logger {

	private static vaultName: string = "Vault";
	static init(name: string){
		this.vaultName = name;
	}

	// (DRY) Don't Repeat Yourself Principle, make a default private function for the info, sucess and error.
	private static log(message: string, themeStyle: string, data?: any){
		console.log(`Vault: ${this.vaultName} ${message}`, themeStyle, "color: inherit;", data ?? "Nothing But Wind")
	}

	static info(message: string, data?: any) { this.log(message, LogTheme.INFO, data)}
	static error(message: string, data?: any) { this.log(message, LogTheme.ERROR, data)}
	static sucess(message: string, data?: any) { this.log(message, LogTheme.SUCCESS, data)}

}
