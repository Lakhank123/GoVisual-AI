"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function GenerationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Workspace', path: '/generation' },
    { name: 'Queue', path: '/generation/queue' },
    { name: 'Asset Library', path: '/generation/library' },
    { name: 'Providers', path: '/generation/providers' }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", color: "#F7F3ED", fontFamily: "system-ui, sans-serif" }}>
      {/* Top Nav (Reusing Dashboard style) */}
      <div style={{ borderBottom: "1px solid #3B2B1E", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#E8B66F", fontWeight: 700, fontSize: 18 }}>GoVisual AI</span>
          <span style={{ color: "#3B2B1E", fontSize: 18 }}>|</span>
          <span style={{ color: "#B9AA99", fontSize: 14 }}>Generation Engine</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard" style={{ padding: "8px 16px", borderRadius: 8, background: "#21170F", border: "1px solid #3B2B1E", color: "#F7F3ED", fontSize: 13, textDecoration: "none" }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: "#F7F3ED" }}>⚙️ Generation Engine</h1>
          <p style={{ color: "#B9AA99", fontSize: 14 }}>Advanced AI media pipeline control center.</p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #3B2B1E", paddingBottom: 0 }}>
          {tabs.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <Link key={tab.path} href={tab.path} style={{ textDecoration: 'none' }}>
                <button style={{ 
                  padding: "10px 20px", 
                  background: "transparent", 
                  border: "none", 
                  borderBottom: isActive ? "2px solid #E8B66F" : "2px solid transparent", 
                  color: isActive ? "#E8B66F" : "#B9AA99", 
                  fontWeight: isActive ? 600 : 400, 
                  fontSize: 13, 
                  cursor: "pointer", 
                  marginBottom: -1 
                }}>
                  {tab.name}
                </button>
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
