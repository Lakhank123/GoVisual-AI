"use client";
import { useState } from "react";
import Link from "next/link";
import BorderGlow from "../components/ui/BorderGlow";
import DomeGallery from "../components/ui/DomeGallery";

const GALLERY_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?q=80&w=600&auto=format&fit=crop",
    alt: "Traditional Indian Saree Store"
  },
  {
    src: "https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=600&auto=format&fit=crop",
    alt: "Mumbai Vadapav Stall"
  },
  {
    src: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?q=80&w=600&auto=format&fit=crop",
    alt: "Fresh Indian Spices Store"
  },
  {
    src: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?q=80&w=600&auto=format&fit=crop",
    alt: "Indian Jewelry Shop"
  },
  {
    src: "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop",
    alt: "Local Electronics & Mobile Accessories Shop"
  },
  {
    src: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?q=80&w=600&auto=format&fit=crop",
    alt: "Indian Mithai Sweet Shop"
  },
  {
    src: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop",
    alt: "Indian Grocery Store"
  }
];

export default function LandingPage() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  const features = [
    {
      emoji: "📘",
      title: "Brand Book",
      description: "Upload your logo. Paste your Instagram. Get your complete brand identity — colors, fonts, voice, dos and don'ts — in 60 seconds.",
      link: "/brandbook",
      accent: "#38bdf8"
    },
    {
      emoji: "🎨",
      title: "AI Creatives",
      description: "Generate 3 stunning campaign images for Instagram, WhatsApp, and Facebook — perfectly styled to your brand colors.",
      link: "/onboard",
      accent: "#39ff14"
    },
    {
      emoji: "📷",
      title: "Product Photoshoot",
      description: "Upload your product. Choose an Indian avatar model. Get 6 professional studio shots ready to post.",
      link: "/photoshoot",
      accent: "#a78bfa"
    },
    {
      emoji: "🎬",
      title: "Video Reels",
      description: "Turn any image into an Instagram Reel with text animation, zoom effects, and background music. MP4 ready in minutes.",
      link: "/video",
      accent: "#f97316"
    },
    {
      emoji: "🌐",
      title: "Your Website",
      description: "Get a beautiful one-page website with your products, WhatsApp button, Google Maps, and Instagram feed. Share one link everywhere.",
      link: "/minisite",
      accent: "#f0a500"
    },
    {
      emoji: "📊",
      title: "Growth Dashboard",
      description: "Track your Instagram followers, post reach, and engagement. See exactly how GoVisual AI is growing your business.",
      link: "/dashboard",
      accent: "#e1306c"
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
      {/* Inject custom CSS for marquee and general animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-container {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .marquee-container:hover {
          animation-play-state: paused;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }
        .border-glow-card {
          height: 100%;
        }
        .border-glow-inner {
          height: 100%;
        }
      `}} />

      {/* HERO SECTION */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: "40px" }}>
        
        {/* Background Glowing Orb */}
        <div style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(57,255,20,0.12) 0%, rgba(13,148,136,0.03) 70%, transparent 100%)",
          pointerEvents: "none",
          animation: "pulseGlow 6s ease-in-out infinite",
          zIndex: 1
        }} />

        {/* Top Navbar */}
        <header style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          background: "rgba(6, 10, 6, 0.8)"
        }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#39ff14", letterSpacing: "-0.02em" }}>GoVisual AI</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/onboard" style={{ textDecoration: "none", color: "#ffffff", fontSize: "14px", fontWeight: 600, padding: "10px 20px" }}>
              Sign In
            </Link>
            <Link href="/brandbook" style={{
              textDecoration: "none",
              color: "#000000",
              background: "#39ff14",
              fontSize: "14px",
              fontWeight: 700,
              padding: "10px 24px",
              borderRadius: "30px",
              boxShadow: "0 0 15px rgba(57,255,20,0.3)",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              Start Free
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <div style={{ position: "relative", zIndex: 5, maxWidth: "800px", margin: "100px auto 40px", textAlign: "center", padding: "0 24px" }}>
          <div style={{
            display: "inline-block",
            padding: "6px 16px",
            background: "rgba(57,255,20,0.08)",
            border: "1px solid rgba(57,255,20,0.2)",
            borderRadius: "30px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#39ff14",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "24px"
          }}>
            🇮🇳 Made for Mumbai's Local Brands
          </div>
          
          <h1 style={{ fontSize: "64px", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#ffffff", marginBottom: "20px" }}>
            Mumbai ka apna<br />
            <span style={{ color: "#39ff14" }}>AI Brand Studio</span>
          </h1>

          <p style={{ fontSize: "19px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5, marginBottom: "36px", maxWidth: "600px", margin: "0 auto 36px" }}>
            From a product photo to a complete brand — creatives, videos, photoshoots, and your own website. All powered by AI. All in minutes.
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: "28px" }}>
            <Link href="/brandbook" style={{
              textDecoration: "none",
              background: "#39ff14",
              color: "#000",
              fontWeight: 700,
              padding: "16px 36px",
              borderRadius: "12px",
              fontSize: "16px",
              boxShadow: "0 4px 20px rgba(57,255,20,0.25)"
            }}>
              Create My Brand Book
            </Link>
            <button 
              onClick={() => setIsVideoModalOpen(true)}
              style={{
                background: "transparent",
                border: "1px solid #39ff14",
                color: "#39ff14",
                fontWeight: 700,
                padding: "15px 36px",
                borderRadius: "12px",
                fontSize: "16px",
                cursor: "pointer"
              }}>
              Watch How It Works
            </button>
          </div>

          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
            Used by 500+ local businesses in Mumbai · 100% free to start
          </div>
        </div>

        {/* Marquee Social Proof strip */}
        <div style={{ position: "relative", zIndex: 5, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)", padding: "16px 0", overflow: "hidden" }}>
          <div className="marquee-container" style={{ display: "flex", gap: "40px", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
            {Array.from({ length: 4 }).map((_, outerIdx) => (
              <span key={outerIdx} style={{ display: "flex", gap: "40px" }}>
                <span>Bandra West 📍</span>
                <span>•</span>
                <span>Andheri East 🛍️</span>
                <span>•</span>
                <span>Dadar Chowpatty 🏖️</span>
                <span>•</span>
                <span>Borivali National Park 🌳</span>
                <span>•</span>
                <span>Thane Lake City 🌊</span>
                <span>•</span>
                <span>Pune 🏛️</span>
                <span>•</span>
                <span>Nashik 🍇</span>
                <span>•</span>
                <span>Nagpur 🍊</span>
                <span>•</span>
                <span>Surat 💎</span>
                <span>•</span>
                <span>Ahmedabad 🪁</span>
                <span>•</span>
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#ffffff", marginBottom: "16px" }}>How GoVisual AI Works</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px" }}>Three simple steps to unlock enterprise-grade marketing for your local business.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            
            {/* Step 1 */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#39ff14", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>1</div>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>📘</div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Build Your Brand Book</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Upload your logo and social media handle. Our AI reads your brand identity and builds your complete brand book in 60 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#39ff14", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>2</div>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>🎨</div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Create Content That Sells</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Generate image creatives, product photoshoots with Indian models, and video reels — all automatically styled to your brand.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#39ff14", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>3</div>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>📈</div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Publish and Grow</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Post directly to Instagram, launch your own website, and track your follower growth — all from one dashboard.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FEATURES GRID SECTION */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#ffffff", marginBottom: "16px" }}>Everything Your Shop Needs</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px" }}>Powerful AI engines trained specifically to grow retail store visibility.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            
            {features.map((feat, i) => (
              <Link 
                key={i} 
                href={feat.link}
                style={{ textDecoration: "none" }}
              >
                <BorderGlow
                  borderRadius={16}
                  backgroundColor="#0b110b"
                  glowColor="120 100 50"
                  colors={["#39ff14", "#0D9488", feat.accent]}
                  glowIntensity={0.8}
                >
                  <div style={{
                    padding: "32px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.3s ease"
                  }}>
                    <div>
                      <div style={{ fontSize: "36px", marginBottom: "20px" }}>{feat.emoji}</div>
                      <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>{feat.title}</h3>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: "24px" }}>{feat.description}</p>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: feat.accent, display: "flex", alignItems: "center", gap: "4px" }}>
                      Try Now →
                    </div>
                  </div>
                </BorderGlow>
              </Link>
            ))}

          </div>

        </div>
      </section>

      {/* CREATIVES GALLERY SECTION */}
      <section id="gallery" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, 
            fontWeight: 800, marginBottom: 12, color: '#e8e8f0' }}>
            See What GoVisual AI Creates
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', 
            fontSize: 15, marginBottom: 40 }}>
            Real creatives made for Mumbai businesses — 
            in under 2 minutes.
          </p>
          <div style={{ width: "100%", height: "500px", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
            <div style={{ width: "100%", height: "100%" }}>
              <DomeGallery 
                images={GALLERY_IMAGES} 
                fit={0.4} 
                minRadius={400} 
                grayscale={false} 
                overlayBlurColor="#060a06" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#ffffff", marginBottom: "16px" }}>Simple, Transparent Pricing</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px" }}>Choose the right plan to amplify your retail presence across Mumbai.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", maxWidth: "960px", margin: "0 auto" }}>
            
            {/* Plan 1: Free */}
            <div 
              onMouseEnter={() => setHoveredPlan(0)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transform: hoveredPlan === 0 ? "translateY(-4px)" : "none",
                transition: "all 0.3s ease"
              }}
            >
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>Free</h3>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#39ff14", marginBottom: "20px" }}>₹0<span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>/month</span></div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> 3 creatives/day (with watermark)</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> 1 Brand Book</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Basic Website (govisual.in/yourshop)</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Dashboard (basic stats)</li>
                  <li style={{ display: "flex", gap: "8px", opacity: 0.4 }}><span style={{ color: "#ff4444" }}>✗</span> Video reels</li>
                  <li style={{ display: "flex", gap: "8px", opacity: 0.4 }}><span style={{ color: "#ff4444" }}>✗</span> Product photoshoot</li>
                  <li style={{ display: "flex", gap: "8px", opacity: 0.4 }}><span style={{ color: "#ff4444" }}>✗</span> Direct Instagram posting</li>
                </ul>
              </div>
              <Link href="/brandbook" style={{
                textDecoration: "none",
                textAlign: "center",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px"
              }}>
                Start Free
              </Link>
            </div>

            {/* Plan 2: Growth */}
            <div 
              onMouseEnter={() => setHoveredPlan(1)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                background: "rgba(57,255,20,0.02)",
                border: "1px solid #39ff14",
                borderRadius: "20px",
                padding: "32px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transform: hoveredPlan === 1 ? "translateY(-4px)" : "none",
                boxShadow: "0 10px 30px rgba(57,255,20,0.06)",
                transition: "all 0.3s ease"
              }}
            >
              <div style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "#39ff14",
                color: "#000",
                fontSize: "10px",
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: "12px",
                textTransform: "uppercase"
              }}>
                Most Popular
              </div>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>Growth</h3>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#39ff14", marginBottom: "20px" }}>₹299<span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>/month</span></div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Unlimited creatives (no watermark)</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> 20 video reels/month</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> 5 product photoshoots/month</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Full Brand Book (PDF download)</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Custom Website domain</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Full analytics dashboard</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Direct Instagram publishing</li>
                </ul>
              </div>
              <Link href="/brandbook" style={{
                textDecoration: "none",
                textAlign: "center",
                background: "#39ff14",
                color: "#000000",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: "0 0 15px rgba(57,255,20,0.2)"
              }}>
                Start Growth Plan
              </Link>
            </div>

            {/* Plan 3: Enterprise */}
            <div 
              onMouseEnter={() => setHoveredPlan(2)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transform: hoveredPlan === 2 ? "translateY(-4px)" : "none",
                transition: "all 0.3s ease"
              }}
            >
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>Enterprise</h3>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#39ff14", marginBottom: "20px" }}>Custom</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Everything in Growth</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Multiple shop locations</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> WhatsApp Business automation</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Dedicated support</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Custom branding (white-label)</li>
                  <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#39ff14" }}>✓</span> Monthly performance report</li>
                </ul>
              </div>
              <a href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{
                textDecoration: "none",
                textAlign: "center",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px"
              }}>
                Contact Us
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* TEAM SECTION */}
      <section id="team" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, 
            fontWeight: 800, marginBottom: 12, color: '#e8e8f0' }}>
            The Team Behind GoVisual AI
          </h2>
          <p style={{ textAlign: 'center', color: "rgba(255,255,255,0.45)", fontSize: "15px", marginBottom: "40px" }}>
            The innovators driving next-generation brand graphics for Mumbai local businesses.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", maxWidth: "960px", margin: "0 auto" }}>
            
            {/* Member 1: Lakhan */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🧔🏽‍♂️</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Lakhan Karani</h3>
              <p style={{ fontSize: "13px", color: "#39ff14", fontWeight: 600, marginBottom: "10px" }}>AI Lead</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>AI model development and integration</p>
            </div>

            {/* Member 2: Chirag */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>👨🏽‍💻</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Chirag Nagra</h3>
              <p style={{ fontSize: "13px", color: "#39ff14", fontWeight: 600, marginBottom: "10px" }}>Backend Engineer</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>Backend</p>
            </div>

            {/* Member 3: Roshan */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎨</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Roshan Manjal</h3>
              <p style={{ fontSize: "13px", color: "#39ff14", fontWeight: 600, marginBottom: "10px" }}>Frontend Developer</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>Frontend</p>
            </div>

            {/* Member 4: Nihar */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>✍🏽</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Nihar Mahadik</h3>
              <p style={{ fontSize: "13px", color: "#39ff14", fontWeight: 600, marginBottom: "10px" }}>Documentation Specialist</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>Documentation</p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#030603", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "80px 40px 30px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px", marginBottom: "60px" }}>
            
            {/* Logo/Tagline */}
            <div>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#39ff14", display: "block", marginBottom: "16px" }}>GoVisual AI</span>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                AI-powered brand growth for local businesses.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <Link href="/" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Home</Link>
                <Link href="/brandbook" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Brand Book</Link>
                <Link href="/onboard" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Creatives</Link>
                <Link href="/photoshoot" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Photoshoot</Link>
                <Link href="/video" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Video</Link>
                <Link href="/minisite" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Website</Link>
                <Link href="/dashboard" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)" }}>Dashboard</Link>
              </div>
            </div>

            {/* Social Icons / Location */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>Connect</h4>
              <div style={{ display: "flex", gap: "12px", fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#39ff14" }}>Instagram 📸</a>
                <a href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#39ff14" }}>WhatsApp 💬</a>
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Made with ❤️ in Mumbai</div>
            </div>

          </div>

          {/* Bottom Copyright Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
            <span>© 2025 GoVisual AI · Privacy Policy · Terms of Use</span>
            <span>Built by Lakhan, Chirag, Roshan, Nihar</span>
          </div>

        </div>
      </footer>

      {/* WATCH HOW IT WORKS MODAL */}
      {isVideoModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "24px"
        }}>
          <div style={{
            background: "#0d160d",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "640px",
            padding: "32px",
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }}>
            <button 
              onClick={() => setIsVideoModalOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "20px",
                cursor: "pointer"
              }}>
              ✕
            </button>
            <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>How GoVisual AI Transforms Your Shop</h3>
            <div style={{ width: "100%", height: "280px", background: "#050805", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "40px" }}>🎬 Demo Video Playing...</span>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              This video demonstrates how a local shopkeeper registers, uploads a simple product photo, creates a brand book, and pushes customized marketing graphics and dynamic video reels directly to Instagram in minutes.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
