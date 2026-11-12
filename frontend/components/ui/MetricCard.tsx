import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}

export function MetricCard({ label, value, change, positive, icon }: MetricCardProps) {
  return (
    <div style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ fontSize: 22, marginBottom: 8, color: "#E8B66F" }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#F7F3ED" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#B9AA99", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 11, color: positive ? "#22c55e" : "#E8B66F" }}>{change}</div>
    </div>
  );
}
