import React from 'react';

interface DashboardCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function DashboardCard({ children, style }: DashboardCardProps) {
  return (
    <div style={{ 
      background: "#21170F", 
      border: "1px solid #3B2B1E", 
      borderRadius: 12, 
      overflow: "hidden",
      ...style
    }}>
      {children}
    </div>
  );
}
