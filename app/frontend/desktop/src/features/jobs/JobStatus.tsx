import { useState } from 'react';
import { cancelJob } from '../../services/jobService';
import { useJobStore } from '../../stores/jobStore';

export function JobStatus() {
  const jobs = useJobStore((state) => state.jobs);
  const [error, setError] = useState('');
  async function cancel(jobId: string) {
    try {
      await cancelJob(jobId);
      setError('Cancellation requested.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel this job.');
    }
  }
  if (!jobs.length) return null;
  return (
    <section className="card" aria-label="Processing jobs">
      <h2>Processing jobs</h2>
      <ul>
        {jobs.map((job) => (
          <li key={job.job_id} className="job-row">
            <span>
              {job.kind}: {job.message} (
              {job.progress === null ? 'progress unknown' : `${Math.round(job.progress * 100)}%`})
            </span>
            {job.progress !== null && (
              <progress aria-label={`${job.kind} progress`} max={1} value={job.progress} />
            )}
            {['pending', 'running'].includes(job.state) && (
              <button onClick={() => void cancel(job.job_id)}>Cancel</button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="status">{error}</p>}
    </section>
  );
}
