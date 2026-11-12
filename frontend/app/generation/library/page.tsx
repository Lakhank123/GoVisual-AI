"use client";
import React, { useState } from 'react';
import { DashboardCard } from '../../../components/ui/DashboardCard';
import { DashboardButton } from '../../../components/ui/DashboardButton';
import { getAssets } from '../../../lib/generationApi';

export default function LibraryPage() {
  const [generationId, setGenerationId] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!generationId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getAssets(generationId);
      if (res.success) setAssets(res.assets || []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch assets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Asset Library</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input 
            type="text" 
            value={generationId}
            onChange={(e) => setGenerationId(e.target.value)}
            style={{ width: "250px", padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", fontSize: 13 }}
            placeholder="Search Generation ID..."
          />
          <DashboardButton variant="primary" onClick={handleFetch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </DashboardButton>
        </div>
      </div>

      {error && <div style={{ color: "#e1306c", fontSize: 12, marginBottom: 16 }}>{error}</div>}

      {assets.length === 0 && !loading && !error && (
        <div style={{ textAlign: "center", padding: "80px 0", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
          <p style={{ color: "rgba(255,255,255,0.45)" }}>Enter a Generation ID to view its finalized assets.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {assets.map((asset, i) => (
          <DashboardCard key={asset.asset_id || i}>
            <div style={{ height: 160, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* If real URLs were returned, we'd use <img src={asset.url} /> */}
              <span style={{ fontSize: 40 }}>{asset.asset_type === 'image' ? '🖼️' : '🎬'}</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{asset.stage}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{asset.asset_type}</div>
              <DashboardButton style={{ width: "100%", textAlign: "center" }}>
                Download Asset
              </DashboardButton>
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
