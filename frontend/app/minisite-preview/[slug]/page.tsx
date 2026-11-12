"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LandingPageRenderer, type MinisiteData } from "@/components/minisite/LandingPageRenderer";

export default function MinisitePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [data, setData] = useState<MinisiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile" | "responsive">("responsive");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    fetch(`${apiBase}/s/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Storefront not found or has expired.");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0B0907", color: "#F7F3ED", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(232,182,111,0.2)", borderTopColor: "#E8B66F", animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.02em", color: "#E8B66F" }}>Assembling Brand Storefront...</div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 6 }}>Loading authentic brand styling, products, and conversion links</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0B0907", color: "#F7F3ED", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#E8B66F" }}>Storefront Not Found</h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, maxWidth: 440, marginBottom: 24, lineHeight: 1.5 }}>
          We couldn&apos;t find an active website specification for &quot;{slug}&quot;. You can generate and configure one in the brand builder.
        </p>
        <Link 
          href="/minisite" 
          style={{ 
            padding: "12px 24px", 
            background: "#E8B66F", 
            color: "#0B0907", 
            borderRadius: 8, 
            fontWeight: 700, 
            textDecoration: "none", 
            fontSize: 14 
          }}
        >
          ← Go to Website Builder
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080605", color: "#F7F3ED", fontFamily: "system-ui, sans-serif" }}>
      {/* Top Floating Utility Control Bar */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(11, 9, 7, 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/minisite"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#E8B66F",
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 6,
              background: "rgba(232,182,111,0.1)",
              border: "1px solid rgba(232,182,111,0.25)",
            }}
          >
            ← Back to Builder
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{data.shopName}</span>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 4, color: "rgba(255,255,255,0.5)" }}>
              {data.theme ? data.theme.replace("_", " ") : "Storefront"}
            </span>
          </div>
        </div>

        {/* Viewport switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setViewport("responsive")}
            style={{
              padding: "5px 12px",
              background: viewport === "responsive" ? "#E8B66F" : "transparent",
              color: viewport === "responsive" ? "#000" : "rgba(255,255,255,0.7)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Responsive
          </button>
          <button
            onClick={() => setViewport("desktop")}
            style={{
              padding: "5px 12px",
              background: viewport === "desktop" ? "#E8B66F" : "transparent",
              color: viewport === "desktop" ? "#000" : "rgba(255,255,255,0.7)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🖥️ Desktop
          </button>
          <button
            onClick={() => setViewport("mobile")}
            style={{
              padding: "5px 12px",
              background: viewport === "mobile" ? "#E8B66F" : "transparent",
              color: viewport === "mobile" ? "#000" : "rgba(255,255,255,0.7)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📱 Mobile
          </button>
        </div>

        {/* Share and actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: "6px 14px",
              background: copied ? "#25D366" : "rgba(255,255,255,0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Link Copied!" : "🔗 Share Link"}
          </button>
        </div>
      </header>

      {/* Main Landing Page Render */}
      <main style={{ padding: viewport === "mobile" ? "40px 16px" : 0 }}>
        <LandingPageRenderer data={data} previewMode={viewport} />
      </main>
    </div>
  );
}
