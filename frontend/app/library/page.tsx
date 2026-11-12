"use client";
import { useState, useEffect } from "react";
import { useDemoSession } from "@/components/providers/demo-session-provider";
import { downloadAsPng } from "@/lib/imageDownload";

export default function LibraryPage() {
  const { session, refreshLibrary } = useDemoSession();
  const [filter, setFilter] = useState<"all" | "creatives" | "photoshoots" | "videos" | "brand">("all");

  useEffect(() => {
    refreshLibrary().catch(console.error);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", color: "#F7F3ED" }}>
      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid #3B2B1E", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#E8B66F", fontWeight: 700, fontSize: 18 }}>GoVisual AI</span>
          <span style={{ color: "#3B2B1E", fontSize: 18 }}>|</span>
          <span style={{ color: "#B9AA99", fontSize: 14 }}>Asset Library</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Asset Library</h1>
          <p style={{ color: "#B9AA99", fontSize: 14 }}>All your generated creatives, photoshoots, and brand assets in one place.</p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {(["all", "creatives", "photoshoots", "videos", "brand"] as const).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} style={{ padding: "8px 16px", background: filter === tab ? "rgba(232,182,111,0.15)" : "transparent", border: filter === tab ? "1px solid #E8B66F" : "1px solid #3B2B1E", color: filter === tab ? "#E8B66F" : "#B9AA99", fontWeight: filter === tab ? 600 : 400, fontSize: 13, cursor: "pointer", textTransform: "capitalize", borderRadius: 20 }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {!session.library || session.library.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", color: "rgba(255,255,255,0.4)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
            <div>Your library is empty.</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Generate some assets in the Content Studio to see them here.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 24 }}>
            {session.library
              .filter((a) => {
                if (filter === "all") return true;
                if (filter === "creatives") return a.type === "creative";
                if (filter === "photoshoots") return a.type === "photoshoot";
                if (filter === "videos") return a.type === "video";
                if (filter === "brand") return a.type === "brand_book" || a.type === "website_asset";
                return true;
              })
              .map((asset) => (
                <div key={asset.id} style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ height: 200, background: "linear-gradient(135deg, #14100D, #2B1E14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, position: "relative" }}>
                    {asset.url && (asset.type === "creative" || asset.type === "photoshoot" || asset.metadata?.format === "image/jpeg" || asset.url.endsWith(".jpg") || asset.url.endsWith(".png") || asset.url.endsWith(".webp") || asset.url.includes("/static/generated/")) ? (
                      <img src={asset.url} alt={asset.metadata?.title || 'Asset'} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      asset.type === "video" ? "🎬" : asset.type === "brand_book" ? "📘" : "🎨"
                    )}
                  </div>
                  <div style={{ padding: 16, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{asset.metadata?.title || 'Asset'}</div>
                        <div style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 4, textTransform: "capitalize" }}>{asset.type.replace('_', ' ')}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </div>
                      {Boolean(asset.metadata?.caption || asset.metadata?.tags?.caption) && (
                        <div style={{ marginBottom: 12, padding: "8px 10px", background: "#14100D", border: "1px solid #3B2B1E", borderRadius: 6 }}>
                          <div style={{ fontSize: 11, color: "#B9AA99", fontStyle: "italic", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            "{asset.metadata?.caption || asset.metadata?.tags?.caption}"
                          </div>
                          <button
                            onClick={() => {
                              const cap = asset.metadata?.caption || asset.metadata?.tags?.caption || "";
                              const tags = asset.metadata?.hashtags || asset.metadata?.tags?.hashtags || "";
                              const full = tags ? `${cap}\n\n${tags}` : cap;
                              navigator.clipboard.writeText(full);
                            }}
                            style={{ background: "transparent", border: "none", color: "#E8B66F", fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            📋 Copy Caption & Tags
                          </button>
                        </div>
                      )}
                    </div>
                    {asset.url && (
                      <button
                        onClick={async () => {
                          const title = (asset.metadata?.title || 'asset').toLowerCase().replace(/[^a-z0-9]/g, '_');
                          await downloadAsPng(asset.url!, `govisual_${title}.png`);
                        }}
                        style={{ width: "100%", padding: "8px 0", background: "rgba(232, 182, 111, 0.12)", color: "#E8B66F", border: "1px solid rgba(232, 182, 111, 0.3)", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                      >
                        Download PNG
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

      </div>
    </div>
  );
}
