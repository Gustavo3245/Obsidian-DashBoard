import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, TFile, Vault} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

import { VaultEventListener } from './events/VaultEventListener';
import { DEFAULT_STORAGE_DATA, StorageData } from 'datas/VaultMetricData';

import { ServiceContainer } from 'services/ServiceContainer';
import { VaultMetrics } from 'models/VaultMetrics';
import { DailyMetrics } from 'models/DailyMetrics';

// Remember to rename these classes and interfaces!
export default class DashboardPlugin extends Plugin {

	private serviceContainer: ServiceContainer;
	private vaultMetricData: StorageData;

	private vaultEvent: VaultEventListener;

	async onload() {

		await this.loadSettings();

		this.serviceContainer = new ServiceContainer(
			this.app,
			this.vaultMetricData,
			async (updatedData) => { await this.saveSettings(updatedData); }
		);

		this.serviceContainer.initialize();

		this.vaultEvent = new VaultEventListener(this, this.serviceContainer.sessionService, this.serviceContainer.statsProcessor)

		await this.bootstrapPlugin();
	}

	async loadSettings() {
		
		const dataFromDisk = (await this.loadData()) || {};

		this.vaultMetricData = {

			vaultMetrics: {
				...DEFAULT_STORAGE_DATA.vaultMetrics,
				...(dataFromDisk.vaultMetricData || {})
			},

			dailyHistory: dataFromDisk.dailyHistory || {},

			settings: {
				...DEFAULT_STORAGE_DATA.settings,
				...(dataFromDisk.settings || {})
			}
		};
	}

	async saveSettings(updatedMetrics?: { vaultMetrics?: VaultMetrics, dailyHistory?: Record<string, DailyMetrics> }) {
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

	private async bootstrapPlugin() {
		console.log("Iniciando rotinas do Dynamic Dashboard...");

		// 1. Liga os "ouvidos" do plugin (eventos de clique, digitação, etc)
		this.vaultEvent.init()

		// 2. Começa a contar o tempo da sessão atual
		this.serviceContainer.sessionService.startTracking();

		// 3. Faz a varredura pesada inicial do Vault inteiro
		await this.serviceContainer.statsProcessor.VaultLoad('all');

	}
}

