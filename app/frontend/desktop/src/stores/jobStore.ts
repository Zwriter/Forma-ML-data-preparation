import { create } from 'zustand';
import type { Job } from '../types/job';
export const useJobStore = create<{ jobs: Job[]; add: (job: Job) => void }>((set) => ({ jobs: [], add: (job) => set((state) => {
  const previous = state.jobs.find((item) => item.job_id === job.job_id);
  const terminal = ['completed','failed','cancelled'].includes(previous?.state ?? '');
  const keepPrevious = terminal || (previous?.state === 'running' && job.state === 'pending');
  const next = keepPrevious ? previous! : job;
  return { jobs: [...state.jobs.filter((item) => item.job_id !== job.job_id), next] };
}) }));
