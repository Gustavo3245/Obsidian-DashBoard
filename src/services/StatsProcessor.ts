import { TimeRange } from "models/TimeRange";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";

export class StatProcessor {
	constructor(private vaultService: VaultService) {}

	async getSnapshot(range: TimeRange): Promise<VaultMetrics['volume']['snapshot']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			totalCharacters: this.vaultService.getTotalCharacters(relevantFiles),
			totalWords: this.vaultService.getTotalWords(relevantFiles)
		};
	}

	async getVolumeMetrics(range: TimeRange): Promise<VaultMetrics['volume']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			snapshot: {
				totalCharacters: this.vaultService.getTotalCharacters(relevantFiles),
				totalWords: this.vaultService.getTotalWords(relevantFiles),
			},
			totalSentences: 0, // Not done yet
			totalFiles: this.vaultService.getTotalFiles(),
			totalFolders: this.vaultService.getTotalFoldes(),
			totalAttachments: this.vaultService.getTotalAttachments(),
			totalOrphansFiles: this.vaultService.getTotalOrphansFiles(relevantFiles),
			totalVaultSize: this.vaultService.getTotalVaultSize(relevantFiles),
			averageWordsPerFile: await this.vaultService.getAverageWordsPerFile(relevantFiles)
		};
	}

}
