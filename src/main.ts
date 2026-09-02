import { addIcon, Plugin } from "obsidian";
import { DashboardSettingTab } from "./settings";
import { DashboardSettings, DEFAULT_SETTINGS } from "models/DashboardSettings";
import { VaultEventListener } from './events/VaultEventListener';
import { DEFAULT_STORAGE_DATA, StorageData } from 'datas/VaultMetricData';
import { ServiceContainer } from 'services/ServiceContainer';
import { VaultMetrics } from 'models/VaultMetrics';
import { DailyMetrics } from 'models/DailyMetrics';
import { VaultCommands } from "commands/VaultCommands";
import { DashboardCommands } from "commands/DashboardCommands";
import { Logger } from "utils/Logger";
import { getDashboardIcon } from "assets/icons/DashboardIcon";
import {DASHBOARD_ICON_ID, DASHBOARD_VIEW_TYPE, DashboardView, openDashboardView} from "views/DashboardView";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export default class DashboardPlugin extends Plugin {

	private serviceContainer: ServiceContainer;
	private vaultMetricData: StorageData;
	private vaultEvent: VaultEventListener;
	public settings: DashboardSettings = DEFAULT_SETTINGS;

	async onload() {
		Logger.lifecycle("plugin loading");

		await this.loadSettings();

		this.serviceContainer = new ServiceContainer(
			this.app,
			this.vaultMetricData,
			async (updatedData) => { await this.saveSettings(updatedData); }
		);

		this.serviceContainer.initialize();
		this.registerDashboardView();

		this.vaultEvent = new VaultEventListener(
			this,
			this.serviceContainer.sessionService,
			this.serviceContainer.statsProcessor
		);

		await this.bootstrapPlugin();
		Logger.lifecycle("plugin loaded");
	}

	async loadSettings() {

		const loadedData: unknown = await this.loadData();
		const dataFromDisk = isRecord(loadedData) ? loadedData : {};
		
		const currentVaultMetrics = isRecord(dataFromDisk.vaultMetrics)
			? dataFromDisk.vaultMetrics: undefined;
		const legacyVaultMetrics = isRecord(dataFromDisk.vaultMetricData)
			? dataFromDisk.vaultMetricData: undefined;
		const savedDailyHistory = isRecord(dataFromDisk.dailyHistory)
			? dataFromDisk.dailyHistory as Record<string, DailyMetrics>: {};
		const savedSettings = isRecord(dataFromDisk.settings)
			? dataFromDisk.settings: {};

		const savedVaultMetrics = currentVaultMetrics ?? legacyVaultMetrics ?? {};

		this.vaultMetricData = {
			vaultMetrics: {
				...DEFAULT_STORAGE_DATA.vaultMetrics,
				...(savedVaultMetrics as Partial<VaultMetrics>)
			},
			dailyHistory: savedDailyHistory,
			settings: {
				...DEFAULT_SETTINGS,
				idleLimitMinutes:
					typeof savedSettings.idleLimitMinutes === "number"
						? savedSettings.idleLimitMinutes
						: DEFAULT_SETTINGS.idleLimitMinutes,
			}
		};

		this.settings = this.vaultMetricData.settings;
	}

	async saveSettings(updatedMetrics?: {
		vaultMetrics?: VaultMetrics;
		dailyHistory?: Record<string, DailyMetrics>; }) {

		if (updatedMetrics) {
			this.vaultMetricData = {

				...this.vaultMetricData,
				vaultMetrics: {
					...this.vaultMetricData.vaultMetrics,
					...(updatedMetrics.vaultMetrics || {})
				},
				dailyHistory: {
					...this.vaultMetricData.dailyHistory,
					...(updatedMetrics.dailyHistory || {})
				}
			};
		}

		await this.saveData(this.vaultMetricData);
	}

	public async updateSettings(patch: Partial<DashboardSettings>): Promise<void> {
		this.settings = {
			...this.settings,
			...patch,
		};
		this.vaultMetricData.settings = this.settings;
		this.serviceContainer.sessionService.setIdleLimitMinutes(
			this.settings.idleLimitMinutes
		);
		await this.saveSettings();
	}

	private async bootstrapPlugin() {
		this.vaultEvent.init();
		this.vaultEvent.initActivityEvents();

		this.registerInterval(
			this.serviceContainer.sessionService.startTracking()
		);

		new VaultCommands(this, this.serviceContainer.statsProcessor).register();
		new DashboardCommands(this).register();

		this.addSettingTab(new DashboardSettingTab(this.app, this));
		await this.serviceContainer.statsProcessor.startDailySession("all");
		await this.serviceContainer.statsProcessor.vaultLoad("all");

		this.registerInterval(window.setInterval(() => {
			this.serviceContainer.statsProcessor.refreshActiveTime();
		}, 60_000));
	}

	private registerDashboardView(): void {
		addIcon(DASHBOARD_ICON_ID, getDashboardIcon());
		this.registerView(
			DASHBOARD_VIEW_TYPE,
			(leaf) => new DashboardView(
				leaf,
				this.serviceContainer.stateManager
			)
		);
		this.addRibbonIcon(
			DASHBOARD_ICON_ID,
			"Open dynamic dashboard",
			() => { void openDashboardView(this.app.workspace, "right"); }
		);
	}

	onunload(): void {
		Logger.lifecycle("plugin unloading");
		this.serviceContainer.sessionService.stopTracking();
		void this.serviceContainer.stateManager.flushPendingSave();
	}
}
