import { TimeRange } from "models/TimeRange";
import { VaultService } from "./VaultService";
import { VaultMetrics } from "models/VaultMetrics";

export class StatProcessor {
	constructor(private vaultService: VaultService) {}

	async getSnapshot(range: TimeRange): Promise<VaultMetrics['volume']['snapshot']> {
		const relevantFiles = this.vaultService.getFilesByRange(range);

		return {
			totalCharacters: await this.vaultService.calculateTotalCharacters(relevantFiles),
			totalWords: await this.vaultService.calculateTotalword(relevantFiles)
		};
	}

}
