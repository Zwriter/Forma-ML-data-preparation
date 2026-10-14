export type Job = { job_id: string; kind: string; state: 'pending'|'running'|'completed'|'failed'|'cancelled'; progress: number | null; message: string };
