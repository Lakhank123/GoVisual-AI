"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface MetricCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
}

interface RecentCreative {
  id: string;
  imageUrl: string;
  type: string;
  createdAt: string;
  platform: string;
  reach?: number;
  likes?: number;
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "creatives" | "instagram" | "website">("overview");
  const [connected, setConnected] = useState(false);
  const [businessName, setBusinessName] = useState("Your Shop");

  // Load from sessionStorage
  useEffect(() => {
    const brand = sessionStorage.getItem("gv_brand");
    if (brand) {
      try { setBusinessName(JSON.parse(brand).name || "Your Shop"); } catch {}
    }
    const igConnected = sessionStorage.getItem("gv_ig_connected");
    if (igConnected === "true") setConnected(true);
  }, []);

  const metrics: MetricCard[] = [
    { label: "Creatives Generated", value: "24", change: "+8 this week", positive: true, icon: "🎨" },
    { label: "Instagram Followers", value: connected ? "1,284" : "—", change: connected ? "+63 this month" : "Connect Instagram", positive: true, icon: "📸" },
    { label: "Post Reach", value: connected ? "8,420" : "—", change: connected ? "+22% vs last month" : "Connect Instagram", positive: true, icon: "📡" },
    { label: "Website Visits", value: "342", change: "+12 today", positive: true, icon: "🌐" },
    { label: "WhatsApp Clicks", value: "89", change: "+5 today", positive: true, icon: "💬" },
    { label: "Credits Remaining", value: "47", change: "Buy more credits", positive: false, icon: "⚡" },
  ];

  const recentCreatives: RecentCreative[] = [
    { id: "1", imageUrl: "/static/demo1.jpg", type: "Campaign", createdAt: "Today 2:30 PM", platform: "Instagram", reach: 420, likes: 38 },
    { id: "2", imageUrl: "/static/demo2.jpg", type: "Product Shoot", createdAt: "Yesterday", platform: "Instagram", reach: 290, likes: 21 },
    { id: "3", imageUrl: "/static/demo3.jpg", type: "Video Reel", createdAt: "3 days ago", platform: "Instagram Reels", reach: 1200, likes: 95 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, sans-serif" }}>

      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#39ff14", fontWeight: 700, fontSize: 18 }}>GoVisual AI</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>|</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>{businessName}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={{ padding: "8px 16px", borderRadius: 8, background: "#39ff14", color: "#000", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            + Create New
          </Link>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#e8e8f0", fontSize: 13, cursor: "pointer" }}>
            ⚡ 47 Credits
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>नमस्ते, {businessName} 👋</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Your complete brand growth dashboard. Create, publish, and track — all in one place.</p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 40 }}>
          {[
            { href: "/", icon: "🎨", label: "New Creative", color: "#39ff14" },
            { href: "/photoshoot", icon: "📷", label: "Product Shoot", color: "#a78bfa" },
            { href: "/video", icon: "🎬", label: "Make Video", color: "#f97316" },
            { href: "/brandbook", icon: "📘", label: "Brand Book", color: "#38bdf8" },
            { href: "/minisite", icon: "🌐", label: "Website", color: "#f0a500" },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 12px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{action.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: action.color }}>{action.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 0 }}>
          {(["overview", "creatives", "instagram", "website"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #39ff14" : "2px solid transparent", color: activeTab === tab ? "#39ff14" : "rgba(255,255,255,0.45)", fontWeight: activeTab === tab ? 600 : 400, fontSize: 13, cursor: "pointer", textTransform: "capitalize", marginBottom: -1 }}>
              {tab === "instagram" ? "Instagram" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: m.positive ? "#39ff14" : "#f0a500" }}>{m.change}</div>
                </div>
              ))}
            </div>

            {/* Instagram Connect Banner */}
            {!connected && (
              <div style={{ background: "linear-gradient(135deg, rgba(225,48,108,0.15), rgba(66,133,244,0.15))", border: "1px solid rgba(225,48,108,0.3)", borderRadius: 14, padding: "24px 28px", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>📸 Connect your Instagram</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Track how your GoVisual creatives are growing your followers and reach in real-time.</div>
                </div>
                <button onClick={() => { setConnected(true); sessionStorage.setItem("gv_ig_connected", "true"); }} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #e1306c, #833ab4)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Connect Instagram →
                </button>
              </div>
            )}

            {/* Recent Creatives */}
            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>Recent Creatives</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {recentCreatives.map((c) => (
                <div key={c.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ height: 160, background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                    {c.type === "Video Reel" ? "🎬" : c.type === "Product Shoot" ? "📷" : "🎨"}
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.type}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{c.createdAt} · {c.platform}</div>
                    {c.reach && (
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        <span>📡 {c.reach.toLocaleString()} reach</span>
                        <span>❤️ {c.likes} likes</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Instagram Tab */}
        {activeTab === "instagram" && (
          <div>
            {connected ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                  {[
                    { label: "Followers", value: "1,284", change: "+63", period: "this month" },
                    { label: "Avg. Reach / Post", value: "420", change: "+22%", period: "vs last month" },
                    { label: "Engagement Rate", value: "4.8%", change: "+0.6%", period: "vs last month" },
                    { label: "Profile Visits", value: "892", change: "+34%", period: "this week" },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
                      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "#39ff14" }}>{s.change} {s.period}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontWeight: 600, marginBottom: 16 }}>Follower Growth (Last 30 Days)</div>
                  <div style={{ height: 120, display: "flex", alignItems: "flex-end", gap: 6 }}>
                    {[1200,1210,1215,1220,1218,1225,1230,1228,1235,1240,1238,1245,1250,1255,1260,1258,1265,1270,1268,1272,1275,1278,1280,1282,1284].map((v, i) => (
                      <div key={i} style={{ flex: 1, background: `rgba(57,255,20,${0.3 + (v - 1200) / 300})`, borderRadius: "3px 3px 0 0", height: `${((v - 1195) / 100) * 100}%`, minHeight: 4 }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                    <span>30 days ago</span><span>Today</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Connect Your Instagram Business Account</div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>
                  See exactly how many followers you gained, how much reach your posts got, and how your engagement is growing — all because of GoVisual creatives.
                </div>
                <button onClick={() => { setConnected(true); sessionStorage.setItem("gv_ig_connected", "true"); }} style={{ padding: "14px 32px", background: "linear-gradient(135deg, #e1306c, #833ab4)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                  Connect Instagram Account →
                </button>
                <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Requires Instagram Business or Creator account</div>
              </div>
            )}
          </div>
        )}

        {/* Creatives Tab */}
        {activeTab === "creatives" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ height: 140, background: `linear-gradient(135deg, hsl(${i * 40}, 60%, 15%), hsl(${i * 40 + 40}, 60%, 10%))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                    {["🎨", "📷", "🎬", "📘", "🎨", "📷", "🎬", "🌐"][i]}
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Creative #{i + 1}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{["Campaign", "Product Shoot", "Video", "Brand Book"][i % 4]}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={{ flex: 1, padding: "6px 0", background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.3)", borderRadius: 6, color: "#39ff14", fontSize: 11, cursor: "pointer" }}>Download</button>
                      <button style={{ flex: 1, padding: "6px 0", background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.3)", borderRadius: 6, color: "#e1306c", fontSize: 11, cursor: "pointer" }}>Post</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Website Tab */}
        {activeTab === "website" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Your Website</div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>Share one link that shows your brand, products, and contact info.</p>
            <Link href="/minisite" style={{ padding: "14px 32px", background: "#39ff14", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 16, textDecoration: "none", display: "inline-block" }}>
              Set Up My Website →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
