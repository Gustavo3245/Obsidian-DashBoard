export interface DashboardSettings {
	idleLimitMinutes: number;
}

export const DEFAULT_SETTINGS: DashboardSettings = {
	idleLimitMinutes: 5,
};
