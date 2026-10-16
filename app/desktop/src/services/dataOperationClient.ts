import { request } from './ipcClient';
import type { Dataset, HistoryMetadata, Preview } from '../types/dataset';
import type {
  DataOperation,
  JobAcknowledgement,
  SaveResult,
} from '../types/dataOperations';

export const getHistory = (datasetId: string) =>
  request<HistoryMetadata>('dataset.history', { dataset_id: datasetId });

export const applyDataOperation = (datasetId: string, operation: DataOperation) =>
  request<JobAcknowledgement>('data.apply', { dataset_id: datasetId, operation });

export const undoDataset = (datasetId: string) =>
  request<JobAcknowledgement>('dataset.undo', { dataset_id: datasetId });

export const redoDataset = (datasetId: string) =>
  request<JobAcknowledgement>('dataset.redo', { dataset_id: datasetId });

export const saveDataset = (datasetId: string, forceOverwrite: boolean) =>
  request<JobAcknowledgement>('dataset.save', {
    dataset_id: datasetId,
    force_overwrite: forceOverwrite,
  });

export const getWorkingPreview = (
  datasetId: string,
  options: { offset?: number; limit?: number; columns?: string[] } = {},
) =>
  request<Preview>('dataset.preview', {
    dataset_id: datasetId,
    offset: options.offset ?? 0,
    limit: options.limit ?? 100,
    ...(options.columns ? { columns: options.columns } : {}),
  });

export type CompletedDataOperation = {
  dataset: Dataset;
  history: HistoryMetadata;
};
export type CompletedSave = SaveResult;
