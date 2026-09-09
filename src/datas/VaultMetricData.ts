import { VaultMetrics } from "models/VaultMetrics";
import { DailyMetrics } from "models/DailyMetrics";
import {DashboardSettings, DEFAULT_SETTINGS} from "models/DashboardSettings";
import { VaultMapper } from "mappers/VaultMapper";

export interface StorageData {
    vaultMetrics: VaultMetrics;
    dailyHistory: Record<string, DailyMetrics>; 
    settings: DashboardSettings;
}

export const DEFAULT_STORAGE_DATA: StorageData = {
    vaultMetrics: VaultMapper.getEmptyVaultMetrics(),
    dailyHistory: {},
    settings: DEFAULT_SETTINGS,
};
