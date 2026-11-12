"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardCard } from '../../components/ui/DashboardCard';
import { DashboardButton } from '../../components/ui/DashboardButton';
import { dispatchGeneration } from '../../lib/generationApi';
import { useGenerationStore } from '../../lib/generationStore';

export default function WorkspacePage() {
  const router = useRouter();
  const addJob = useGenerationStore((s) => s.addJob);
  const [sessionId, setSessionId] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDispatch = async () => {
    if (!sessionId) {
      setError("Please provide a valid session ID.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await dispatchGeneration({
        session_id: sessionId,
        target_provider: provider || undefined,
        settings: { quality: "high" }
      });
      if (response.success) {
        addJob({
          jobId: response.job_id,
          generationId: response.generation_id,
          status: "queued",
          progress: 0
        });
        router.push("/generation/queue");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during dispatch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, maxWidth: 600 }}>
      <DashboardCard style={{ padding: "24px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Dispatch New Generation</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24 }}>
          Manually trigger a pipeline run by linking an existing session.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Session ID</label>
          <input 
            type="text" 
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none" }}
            placeholder="e.g. sess_abc123"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Target Provider (Optional)</label>
          <input 
            type="text" 
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none" }}
            placeholder="e.g. openai"
          />
        </div>

        {error && <div style={{ color: "#e1306c", fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <DashboardButton variant="primary" onClick={handleDispatch} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Dispatching..." : "Dispatch Generation →"}
        </DashboardButton>
      </DashboardCard>
    </div>
  );
}
