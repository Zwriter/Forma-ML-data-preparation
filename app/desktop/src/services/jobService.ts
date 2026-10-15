import { request } from './ipcClient';
import type { Job } from '../types/job';
export const getJobStatus = (jobId: string) => request<Job>('job.status', { job_id: jobId });
export const cancelJob = (jobId: string) => request('job.cancel', { job_id: jobId });
