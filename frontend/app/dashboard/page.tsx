"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useDemoSession } from "@/components/providers/demo-session-provider";
import { getGeneratedAssets } from "@/lib/productApi";
import { 
  Image as ImageIcon, 
  Camera, 
  Book, 
  Zap, 
  Activity, 
  MousePointerClick, 
  Download, 
  Share, 
  Plus,
  BarChart,
  Settings,
  LogOut,
  Sparkles,
  ShoppingBag,
  Tag,
  Globe,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import InstagramConnectionCard from "@/components/instagram/InstagramConnectionCard";


// ─── Types ───────────────────────────────────────────────────────────────────
interface MetricCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "creatives" | "instagram">("overview");
  const [connected, setConnected] = useState(false);
  const [actualCreatives, setActualCreatives] = useState<any[]>([]);
  const router = useRouter();
  const { session, logout, authLoading, profileLoading, profileError, refreshProfile, hasCompletedOnboarding } = useDemoSession();
  const businessName = session.brandProfile?.businessName || session.workspace?.businessName || "Your Shop";
  const brandCategory = session.brandProfile?.category || session.workspace?.category || "Local Business";
  const brandPrimaryColor = session.brandProfile?.primaryColor || "#E8B66F";
  const hasBrandProfile = Boolean(session.brandProfile?.businessName || (session.workspace?.businessName && session.workspace.businessName !== "Your Shop"));

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  useEffect(() => {
    // Only redirect when authentication and profile loading have both settled
    if (!authLoading && !profileLoading) {
      // If there was an error retrieving the profile, do NOT assume onboarding is incomplete
      if (!profileError && !hasCompletedOnboarding) {
        router.replace("/onboard");
      }
    }
  }, [authLoading, profileLoading, profileError, hasCompletedOnboarding, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "instagram" || tabParam === "creatives" || tabParam === "overview") {
        setActiveTab(tabParam as any);
      }
    }

    async function loadData() {

      try {
        const sessions = await getGeneratedAssets();
        const allAssets: any[] = [];
        sessions.forEach((s: any) => {
          if (s.generated_assets) {
            allAssets.push(...s.generated_assets);
          }
        });
        allAssets.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setActualCreatives(allAssets);
      } catch (e) {
        console.error("Failed to load assets", e);
      }
    }
    loadData();
  }, []);

  if (authLoading || profileLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0907", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#E8B66F", fontSize: "14px" }}>Loading your workspace...</div>
      </div>
    );
  }

  if (profileError && !hasBrandProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0907", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ color: "#f87171", fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
          Unable to load workspace profile
        </div>
        <div style={{ color: "#B9AA99", fontSize: "14px", maxWidth: "420px", marginBottom: "20px" }}>
          {profileError}. Please check your connection or retry to load your existing profile.
        </div>
        <button
          onClick={() => refreshProfile()}
          style={{
            padding: "10px 24px",
            background: "linear-gradient(to right, #C49B5A, #E8B66F)",
            color: "#0B0907",
            fontWeight: "bold",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Retry Loading Workspace
        </button>
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0907", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#E8B66F", fontSize: "14px" }}>Redirecting to onboarding...</div>
      </div>
    );
  }

  const metrics: MetricCard[] = [
    { label: "Assets Generated", value: actualCreatives.length.toString(), change: actualCreatives.length > 0 ? "Saved in library" : "Start generating", positive: actualCreatives.length > 0, icon: <ImageIcon size={22} /> },
    { label: "Catalog Products", value: (session.products?.length || 0).toString(), change: (session.products?.length || 0) > 0 ? "Master reference items" : "No items added", positive: (session.products?.length || 0) > 0, icon: <ShoppingBag size={22} /> },
    { label: "Brand Profile", value: hasBrandProfile ? "Configured" : "Incomplete", change: hasBrandProfile ? "Identity preserved" : "Action required", positive: hasBrandProfile, icon: <Book size={22} /> },
    { label: "Instagram Channel", value: connected ? "Connected" : "Disconnected", change: connected ? "Direct publish active" : "Connect account", positive: connected, icon: <Camera size={22} /> },
  ];

  const actionCards = [
    {
      title: "Festival Creatives",
      description: "Celebrate Diwali, Eid, Christmas & regional festivals with warm, high-converting festive greetings.",
      href: "/studio?goal=Festival+Campaign",
      icon: <Sparkles size={28} />,
      badge: "Seasonal High Reach",
      badgeColor: "#E8B66F",
      gradient: "linear-gradient(135deg, rgba(232, 182, 111, 0.15), rgba(20, 16, 13, 0.6))",
      border: "#3B2B1E",
      color: "#E8B66F",
    },
    {
      title: "Product Photoshoot",
      description: "Put your product on an Indian model or in a clean commercial studio with zero prompt writing.",
      href: "/photoshoot",
      icon: <Camera size={28} />,
      badge: "AI Product Studio",
      badgeColor: "#F3CB8D",
      gradient: "linear-gradient(135deg, rgba(111, 69, 44, 0.25), rgba(20, 16, 13, 0.6))",
      border: "#3B2B1E",
      color: "#F3CB8D",
    },
    {
      title: "Product Advertisements",
      description: "Generate 3 professional ad variations crafted by our creative planner and critic engine.",
      href: "/studio?goal=Product+Launch",
      icon: <ShoppingBag size={28} />,
      badge: "High Conversion",
      badgeColor: "#E8B66F",
      gradient: "linear-gradient(135deg, rgba(232, 182, 111, 0.12), rgba(20, 16, 13, 0.6))",
      border: "#3B2B1E",
      color: "#E8B66F",
    },
    {
      title: "Offers & Discounts",
      description: "Create eye-catching discount banners, clearance promotions, and limited-time urgency ads.",
      href: "/studio?goal=Increase+Sales",
      icon: <Tag size={28} />,
      badge: "Direct Sales",
      badgeColor: "#D97706",
      gradient: "linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(20, 16, 13, 0.6))",
      border: "#3B2B1E",
      color: "#D97706",
    },
    {
      title: "Instagram Content",
      description: "Direct 1-click publishing, structured caption copy, mood audio advice & weekly strategy guidance.",
      href: "/studio?tab=instagram&platform=Instagram+Feed+(1:1)",
      icon: <Camera size={28} />,
      badge: "Direct Publishing",
      badgeColor: "#e1306c",
      gradient: "linear-gradient(135deg, rgba(225, 48, 108, 0.12), rgba(20, 16, 13, 0.6))",
      border: "#3B2B1E",
      color: "#e1306c",
    },
    {
      title: "Website & Banners",
      description: "Generate instant mini-websites, digital catalogs, and brand banners for your shop link in bio.",
      href: "/minisite",
      icon: <Globe size={28} />,
      badge: "Instant Mini-Site",
      badgeColor: "#E8B66F",
      gradient: "linear-gradient(135deg, rgba(232, 182, 111, 0.12), rgba(20, 16, 13, 0.6))",
      border: "#3B2B1E",
      color: "#E8B66F",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", color: "#F7F3ED", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "32px 24px" }}>

        {/* Commercial Plan Upgrade Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(20, 16, 13, 0.6) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          borderRadius: 16,
          padding: '16px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(124, 58, 237, 0.25)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c4b5fd',
            }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Upgrade to Creator Pro — ₹699 / month
              </div>
              <div style={{ fontSize: 13, color: '#B9AA99', marginTop: 2 }}>
                Unlock 24 commercial credits, exact brand logo compositing, GoVisual Critic, and self-correction.
              </div>
            </div>
          </div>
          <Link
            href="/pricing"
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
            }}
          >
            View Plans <ArrowRight size={14} />
          </Link>
        </div>

        {/* Greeting & Brand Context Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>नमस्ते, {businessName}</h1>
              <span style={{ fontSize: 11, padding: "3px 8px", background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 12, color: "#B9AA99" }}>
                {brandCategory}
              </span>
            </div>
            <p style={{ color: "#B9AA99", fontSize: 14, margin: 0 }}>
              AI marketing platform for small-business owners. Create professional creatives, photoshoot models, and publish directly.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href={hasBrandProfile ? "/brandbook?edit=true" : "/brandbook"} style={{ textDecoration: "none" }}>
              <button style={{ padding: "8px 16px", borderRadius: 8, background: hasBrandProfile ? "#21170F" : "rgba(232, 182, 111, 0.15)", border: hasBrandProfile ? "1px solid #3B2B1E" : "1px solid #E8B66F", color: "#F7F3ED", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Book size={14} style={{ color: hasBrandProfile ? "#38bdf8" : "#E8B66F" }} /> {hasBrandProfile ? "Edit Brand Profile" : "Setup Brand Profile"}
              </button>
            </Link>
            <Link href="/studio" style={{ textDecoration: "none" }}>
              <button style={{ padding: "8px 18px", borderRadius: 8, background: "#E8B66F", border: "none", color: "#0B0907", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> New Creative
              </button>
            </Link>
          </div>
        </div>

        {/* First-Time Setup State */}
        {!hasBrandProfile && (
          <div style={{ background: "linear-gradient(135deg, rgba(232, 182, 111, 0.12), rgba(33, 23, 15, 0.8))", border: "1px solid rgba(232, 182, 111, 0.35)", borderRadius: 16, padding: "28px 24px", marginBottom: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(232, 182, 111, 0.15)", borderRadius: 20, color: "#E8B66F", fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                ⚡ FIRST STEP: SETUP YOUR BUSINESS
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 8px 0" }}>
                Welcome to GoVisual AI! Let's set up your Brand Brain.
              </h2>
              <p style={{ color: "#B9AA99", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px 0" }}>
                Your business colors, logo, and product catalog teach our AI models how to shoot and style your products accurately. Complete onboarding once to unlock consistent, on-brand creative generation.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Link href="/onboard" style={{ textDecoration: "none" }}>
                  <button style={{ padding: "12px 24px", background: "#E8B66F", border: "none", borderRadius: 10, color: "#0B0907", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 20px rgba(232, 182, 111, 0.25)" }}>
                    <Sparkles size={16} /> Start 3-Minute Onboarding →
                  </button>
                </Link>
                <Link href="/products/setup" style={{ textDecoration: "none" }}>
                  <button style={{ padding: "12px 20px", background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 10, color: "#F7F3ED", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Add Products to Catalog
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards Grid */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 16 }}>
            What would you like to create today?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {actionCards.map((card) => (
              <Link key={card.title} href={card.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: card.gradient,
                    border: `1px solid ${card.border}`,
                    borderRadius: 16,
                    padding: "24px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                    minHeight: 180,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = card.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = card.border;
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ color: card.color }}>{card.icon}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(0,0,0,0.3)", color: card.badgeColor, border: `1px solid ${card.border}` }}>
                        {card.badge}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8, margin: 0 }}>
                      {card.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.4, margin: "8px 0 0 0" }}>
                      {card.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18, color: card.color, fontSize: 12, fontWeight: 700 }}>
                    Create now <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #3B2B1E", paddingBottom: 0 }}>
          {(["overview", "creatives", "instagram"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #E8B66F" : "2px solid transparent", color: activeTab === tab ? "#E8B66F" : "#B9AA99", fontWeight: activeTab === tab ? 600 : 400, fontSize: 13, cursor: "pointer", textTransform: "capitalize", marginBottom: -1 }}>
              {tab === "instagram" ? "Instagram" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#F7F3ED" }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "#B9AA99", marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: m.positive ? "#22c55e" : "#B9AA99" }}>{m.change}</div>
                </div>
              ))}
            </div>

            {/* Instagram Connection Card */}
            <InstagramConnectionCard onStatusChange={(s) => setConnected(s.connected)} />


            {/* Recent Creatives */}
            <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#F7F3ED" }}>Recent Creatives</span>
              <Link href="/library" style={{ fontSize: 13, color: "#E8B66F", textDecoration: "none" }}>View All</Link>
            </div>
            
            {actualCreatives.length === 0 ? (
              <div style={{ background: "#14100D", border: "1px dashed #3B2B1E", borderRadius: 16, padding: "40px", textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.2)", marginBottom: 16, display: "flex", justifyContent: "center" }}>
                  <ImageIcon size={48} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#F7F3ED" }}>No creatives generated yet</h3>
                <p style={{ fontSize: 14, color: "#B9AA99", marginBottom: 24 }}>Generate your first AI creative or photoshoot to see it here.</p>
                <Link href="/studio" style={{ padding: "10px 24px", background: "#E8B66F", color: "#0B0907", fontWeight: 700, fontSize: 14, textDecoration: "none", borderRadius: 8 }}>
                  Create New Asset
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {actualCreatives.slice(0, 4).map((c, idx) => (
                  <div key={c.id || idx} style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ height: 160, position: "relative", background: "#14100D" }}>
                      <img src={c.asset_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Generated asset" />
                    </div>
                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 11, color: "#B9AA99", marginBottom: 8 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Instagram Tab */}
        {activeTab === "instagram" && (
          <div>
            <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
              <InstagramConnectionCard onStatusChange={(s) => setConnected(s.connected)} />

              {connected ? (
                <div style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, color: "#F7F3ED", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>📡 Direct Publishing Channel</span>
                  </div>
                  <p style={{ color: "#B9AA99", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
                    Your Instagram professional account is successfully connected via Meta Graph API. You can publish creatives with custom captions directly from the Content Studio and Asset Library without manual downloading.
                  </p>

                  <div style={{ background: "#14100D", border: "1px dashed #3B2B1E", borderRadius: 12, padding: "28px 20px", textAlign: "center" }}>
                    <div style={{ color: "#B9AA99", fontSize: 14, marginBottom: 16 }}>No automated publishing records yet</div>
                    <Link href="/studio?tab=instagram" style={{ padding: "10px 20px", background: "#E8B66F", color: "#0B0907", borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-block" }}>
                      Create & Publish Post →
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}


        {/* Creatives Tab */}
        {activeTab === "creatives" && (
          <div>
            {actualCreatives.length === 0 ? (
              <div style={{ background: "#14100D", border: "1px dashed #3B2B1E", borderRadius: 16, padding: "40px", textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.2)", marginBottom: 16, display: "flex", justifyContent: "center" }}>
                  <ImageIcon size={48} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#F7F3ED" }}>No creatives generated yet</h3>
                <p style={{ fontSize: 14, color: "#B9AA99", marginBottom: 24 }}>Generate your first AI creative or photoshoot to see it here.</p>
                <Link href="/studio" style={{ padding: "10px 24px", background: "#E8B66F", color: "#0B0907", fontWeight: 700, fontSize: 14, textDecoration: "none", borderRadius: 8 }}>
                  Create New Asset
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {actualCreatives.map((c, i) => (
                  <div key={c.id || i} style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ height: 160, background: "#14100D", position: "relative" }}>
                      <img src={c.asset_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Generated asset" />
                    </div>
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#F7F3ED" }}>Creative</div>
                      <div style={{ fontSize: 11, color: "#B9AA99", marginTop: 4 }}>{new Date(c.created_at).toLocaleDateString()}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <a href={c.asset_url} download target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: 1, padding: "6px 0", background: "rgba(232, 182, 111, 0.12)", border: "1px solid rgba(232, 182, 111, 0.3)", borderRadius: 6, color: "#E8B66F", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Download size={12} /> Download
                        </a>
                        <button style={{ flex: 1, padding: "6px 0", background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.3)", borderRadius: 6, color: "#e1306c", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Share size={12} /> Post
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
