"use client";
import React, { useEffect, useState } from 'react';
import { getHealth } from '../../../lib/generationApi';
import { DashboardCard } from '../../../components/ui/DashboardCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { MetricCard } from '../../../components/ui/MetricCard';

export default function ProvidersPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHealth().then(res => {
      if (res.success) setHealth(res.health);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.45)" }}>Loading system health...</div>;
  }

  if (!health) {
    return <div style={{ color: "#e1306c" }}>Failed to load generation engine health.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>System Status</h2>
        <StatusBadge status={health.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <MetricCard label="Database" value={health.database_connected ? "Online" : "Offline"} change="" positive={health.database_connected} icon="🗄️" />
        <MetricCard label="Storage" value={health.storage_connected ? "Online" : "Offline"} change="" positive={health.storage_connected} icon="☁️" />
        <MetricCard label="Dispatcher" value={health.dispatcher_status} change="Queue Worker" positive={health.dispatcher_status === 'active'} icon="⚡" />
        <MetricCard label="Cache" value={health.cache_status} change="Hit/Miss layer" positive={health.cache_status === 'active'} icon="🧠" />
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Available Providers</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {/* Placeholder for actual providers since our API mock returned [] */}
        <DashboardCard style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>DALL-E 3</div>
            <StatusBadge status="Healthy" />
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
            Primary image generation provider. High quality, slower latency.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: 4 }}>Supports: Images</span>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: 4 }}>Lat: ~12s</span>
          </div>
        </DashboardCard>

        <DashboardCard style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Gemini Pro Vision</div>
            <StatusBadge status="Healthy" />
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
            Secondary provider. Fast generation, multimodal.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: 4 }}>Supports: Images</span>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: 4 }}>Lat: ~4s</span>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
