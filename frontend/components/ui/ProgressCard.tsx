import React from 'react';
import { DashboardCard } from './DashboardCard';
import { StatusBadge } from './StatusBadge';

interface ProgressCardProps {
  title: string;
  progress: number;
  status: string;
  subtitle?: string;
}

export function ProgressCard({ title, progress, status, subtitle }: ProgressCardProps) {
  return (
    <DashboardCard style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{subtitle}</div>}
        </div>
        <StatusBadge status={status} />
      </div>
      
      <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 6, overflow: "hidden", marginTop: 16 }}>
        <div style={{ 
          background: status.toLowerCase() === 'failed' ? "#ef4444" : status.toLowerCase() === 'completed' ? "#22c55e" : "#E8B66F", 
          height: "100%", 
          width: `${Math.max(0, Math.min(100, progress))}%`,
          transition: "width 0.3s ease" 
        }} />
      </div>
      <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
        {progress}%
      </div>
    </DashboardCard>
  );
}
