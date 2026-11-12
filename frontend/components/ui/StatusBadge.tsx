import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let color = "rgba(255,255,255,0.45)";
  let bg = "rgba(255,255,255,0.1)";
  
  if (status.toLowerCase() === 'healthy' || status.toLowerCase() === 'completed') {
    color = "#22c55e";
    bg = "rgba(34, 197, 94, 0.12)";
  } else if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'error') {
    color = "#ef4444";
    bg = "rgba(239, 68, 68, 0.12)";
  } else if (status.toLowerCase() === 'processing' || status.toLowerCase() === 'queued') {
    color = "#E8B66F";
    bg = "rgba(232, 182, 111, 0.15)";
  }

  return (
    <span style={{
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 6,
      background: bg,
      color: color,
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    }}>
      {status}
    </span>
  );
}
