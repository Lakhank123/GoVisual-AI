"use client";
import React, { useEffect, useState } from 'react';
import { useGenerationStore } from '../../../lib/generationStore';
import { getJobStatus } from '../../../lib/generationApi';
import { ProgressCard } from '../../../components/ui/ProgressCard';

export default function QueuePage() {
  const { activeJobs, updateJob } = useGenerationStore();
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (activeJobs.length === 0) return;

    const interval = setInterval(async () => {
      setPolling(true);
      for (const job of activeJobs) {
        if (job.status === 'completed' || job.status === 'failed') continue;
        
        try {
          const res = await getJobStatus(job.jobId);
          if (res.success) {
            updateJob(job.jobId, res.status, res.progress);
          }
        } catch (e) {
          console.error("Failed to poll job", job.jobId);
        }
      }
      setPolling(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeJobs, updateJob]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Active Generation Jobs</h2>
        {polling && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Polling...</span>}
      </div>

      {activeJobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>
          <p style={{ color: "rgba(255,255,255,0.45)" }}>No active jobs in queue.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: 16, maxWidth: 800 }}>
          {activeJobs.map(job => (
            <ProgressCard 
              key={job.jobId} 
              title={`Job ${job.jobId.slice(0, 8)}`} 
              subtitle={`Generation ID: ${job.generationId.slice(0, 8)}`}
              progress={job.progress} 
              status={job.status} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
