
import * as azureStorage from 'azure-storage';
import { BlobService, common } from 'azure-storage';
import { promisify } from 'util';
import { padLeft } from '../String/pad';
import * as moment from 'moment-timezone';
import * as _ from 'lodash';

export async function deleteOldFilesByPrefixInChunks(
	blobService: BlobService,
	container: string,
	deletePrefix: string,
	deleteModifiedBefore: Date,
) {
	const prefixes = _.range(0, 0xFFF)
		.map((prefix: number) => prefix.toString(16))
		.map((prefix: string) => padLeft(prefix, 3, '0'))
		.map((prefix: string) => deletePrefix + prefix);

	for (const prefix of prefixes) {
		const blobsResult = await promisify<string, string, common.ContinuationToken, BlobService.ListBlobsResult>(
			blobService.listBlobsSegmentedWithPrefix.bind(blobService),
		)(
			container,
			prefix,
			undefined as any,
		);
		const blobsToDelete = blobsResult.entries
			.filter((entry: azureStorage.BlobService.BlobResult) => moment(entry.lastModified).isBefore(deleteModifiedBefore));

		const deletePromises = blobsToDelete.map(async (entry: azureStorage.BlobService.BlobResult) => {
			try {
				await promisify<string, string, azureStorage.ServiceResponse>(blobService.deleteBlob.bind(blobService))(container, entry.name);
				process.stdout.write('.');
			} catch (error) {
				process.stdout.write('\n');
				console.error(`Blob was not deleted ${entry.name}`, error);
			}
		});
		await Promise.all(deletePromises);
	}
}
