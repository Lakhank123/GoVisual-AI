"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BorderGlow from "../components/ui/BorderGlow";
import { 
  Book, 
  Image as ImageIcon, 
  Camera, 
  TrendingUp, 
  User, 
  Code, 
  PenTool, 
  FileText, 
  MessageCircle, 
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { useDemoSession } from "@/components/providers/demo-session-provider";

const GALLERY_IMAGES = [
  {
    src: "/slideshow1.jpg",
    alt: "Slideshow Image 1"
  },
  {
    src: "/slideshow2.jpg",
    alt: "Slideshow Image 2"
  },
  {
    src: "/slideshow3.jpg",
    alt: "Slideshow Image 3"
  },
  {
    src: "/Screenshot 2026-09-11 141008.png",
    alt: "Slideshow Image 4"
  },
  {
    src: "/Screenshot 2026-09-11 141017.png",
    alt: "Slideshow Image 5"
  },
  {
    src: "/Screenshot 2026-09-11 141026.png",
    alt: "Slideshow Image 6"
  },
  {
    src: "/Screenshot 2026-09-11 141032.png",
    alt: "Slideshow Image 7"
  },
  {
    src: "/Screenshot 2026-09-11 141040.png",
    alt: "Slideshow Image 8"
  },
  {
    src: "/Screenshot 2026-09-11 141047.png",
    alt: "Slideshow Image 9"
  },
  {
    src: "/Screenshot 2026-09-11 141053.png",
    alt: "Slideshow Image 10"
  },
  {
    src: "/Screenshot 2026-09-11 141102.png",
    alt: "Slideshow Image 11"
  },
  {
    src: "/Screenshot 2026-09-11 141108.png",
    alt: "Slideshow Image 12"
  },
  {
    src: "/Screenshot 2026-09-11 141115.png",
    alt: "Slideshow Image 13"
  },
  {
    src: "/Screenshot 2026-09-11 141121.png",
    alt: "Slideshow Image 14"
  },
  {
    src: "/Screenshot 2026-09-11 141134.png",
    alt: "Slideshow Image 15"
  }
];

export default function LandingPage() {
  const { session, authLoading } = useDemoSession();
  const isAuthenticated = !authLoading && Boolean(session?.user);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % GALLERY_IMAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Book,
      title: "Brand Book",
      description: "Upload your logo. Paste your Instagram. Get your complete brand identity — colors, fonts, voice, dos and don'ts — in 60 seconds.",
      link: "/brandbook",
      accent: "#38bdf8"
    },
    {
      icon: ImageIcon,
      title: "AI Creatives",
      description: "Generate 3 stunning campaign images for Instagram, WhatsApp, and Facebook — perfectly styled to your brand colors.",
      link: "/onboard",
      accent: "#E8B66F"
    },
    {
      icon: Camera,
      title: "Product Photoshoot",
      description: "Upload your product. Choose an Indian avatar model. Get 6 professional studio shots ready to post.",
      link: "/photoshoot",
      accent: "#a78bfa"
    },
    {
      icon: TrendingUp,
      title: "Growth Dashboard",
      description: "Track your Instagram followers, post reach, and engagement. See exactly how GoVisual AI is growing your business.",
      link: "/dashboard",
      accent: "#e1306c"
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", color: "#F7F3ED", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
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
          background: "radial-gradient(circle, rgba(232,182,111,0.15) 0%, rgba(111,69,44,0.06) 70%, transparent 100%)",
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
          borderBottom: "1px solid #3B2B1E",
          backdropFilter: "blur(12px)",
          background: "rgba(11, 9, 7, 0.85)"
        }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#E8B66F", letterSpacing: "-0.02em" }}>GoVisual AI</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" style={{ textDecoration: "none", color: "#F7F3ED", fontSize: "14px", fontWeight: 600, padding: "10px 16px" }}>
                  Dashboard
                </Link>
                <Link href="/dashboard" style={{
                  textDecoration: "none",
                  color: "#0B0907",
                  background: "#E8B66F",
                  fontSize: "14px",
                  fontWeight: 700,
                  padding: "10px 24px",
                  borderRadius: "30px",
                  boxShadow: "0 0 15px rgba(232,182,111,0.3)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "#F3CB8D";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "#E8B66F";
                }}
                >
                  Go to Dashboard →
                </Link>
              </>
            ) : !authLoading ? (
              <>
                <Link href="/auth" style={{ textDecoration: "none", color: "#F7F3ED", fontSize: "14px", fontWeight: 600, padding: "10px 20px" }}>
                  Sign In
                </Link>
                <Link href="/auth" style={{
                  textDecoration: "none",
                  color: "#0B0907",
                  background: "#E8B66F",
                  fontSize: "14px",
                  fontWeight: 700,
                  padding: "10px 24px",
                  borderRadius: "30px",
                  boxShadow: "0 0 15px rgba(232,182,111,0.3)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "#F3CB8D";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "#E8B66F";
                }}
                >
                  Start Free
                </Link>
              </>
            ) : null}
          </div>
        </header>

        {/* Hero Content */}
        <div style={{ position: "relative", zIndex: 5, maxWidth: "800px", margin: "100px auto 40px", textAlign: "center", padding: "0 24px" }}>
          <div style={{
            display: "inline-block",
            padding: "6px 16px",
            background: "rgba(232,182,111,0.08)",
            border: "1px solid rgba(232,182,111,0.25)",
            borderRadius: "30px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#E8B66F",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "24px"
          }}>
            🇮🇳 Made for Mumbai's Local Brands
          </div>
          
          <h1 style={{ fontSize: "64px", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#F7F3ED", marginBottom: "20px" }}>
            Mumbai ka apna<br />
            <span style={{ color: "#E8B66F" }}>AI Brand Studio</span>
          </h1>

          <p style={{ fontSize: "19px", color: "#B9AA99", lineHeight: 1.5, marginBottom: "36px", maxWidth: "600px", margin: "0 auto 36px" }}>
            From a product photo to a complete brand — creatives, videos, photoshoots, and your own website. All powered by AI. All in minutes.
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: "28px" }}>
            {isAuthenticated ? (
              <Link href="/dashboard" style={{
                textDecoration: "none",
                background: "#E8B66F",
                color: "#0B0907",
                fontWeight: 700,
                padding: "16px 36px",
                borderRadius: "12px",
                fontSize: "16px",
                boxShadow: "0 4px 20px rgba(232,182,111,0.25)"
              }}>
                Open Dashboard →
              </Link>
            ) : (
              <Link href="/auth" style={{
                textDecoration: "none",
                background: "#E8B66F",
                color: "#0B0907",
                fontWeight: 700,
                padding: "16px 36px",
                borderRadius: "12px",
                fontSize: "16px",
                boxShadow: "0 4px 20px rgba(232,182,111,0.25)"
              }}>
                Create My AI Brand
              </Link>
            )}
            <button 
              onClick={() => setIsVideoModalOpen(true)}
              style={{
                background: "transparent",
                border: "1px solid #E8B66F",
                color: "#E8B66F",
                fontWeight: 700,
                padding: "15px 36px",
                borderRadius: "12px",
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
              <PlayCircle size={20} /> Watch How It Works
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div style={{ position: "relative", zIndex: 5, textAlign: "center", marginBottom: "20px" }}>
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
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#E8B66F", color: "#0B0907", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>1</div>
              <div style={{ marginBottom: "16px", color: "#ffffff" }}><Book size={36} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Build Your Brand Book</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Upload your logo and social media handle. Our AI reads your brand identity and builds your complete brand book in 60 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#E8B66F", color: "#0B0907", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>2</div>
              <div style={{ marginBottom: "16px", color: "#ffffff" }}><ImageIcon size={36} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Create Content That Sells</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Generate image creatives, product photoshoots with Indian models, and video reels — all automatically styled to your brand.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#E8B66F", color: "#0B0907", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>3</div>
              <div style={{ marginBottom: "16px", color: "#ffffff" }}><TrendingUp size={36} strokeWidth={1.5} /></div>
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
                  backgroundColor="#21170F"
                  glowColor="36 74 67"
                  colors={["#E8B66F", "#6F452C", feat.accent]}
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
                      <div style={{ marginBottom: "20px", color: "#ffffff" }}>
                        <feat.icon size={36} strokeWidth={1.5} />
                      </div>
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
      <section id="gallery" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
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
          {/* 9:16 Story / Reel Format Showcase Container */}
          <div style={{ 
            width: "100%", 
            maxWidth: "420px", 
            margin: "0 auto", 
            position: "relative", 
            aspectRatio: "9/16", 
            overflow: "hidden", 
            borderRadius: "28px", 
            border: "1px solid rgba(232,182,111,0.25)", 
            boxShadow: "0 25px 80px rgba(0,0,0,0.85), 0 0 40px rgba(232,182,111,0.1)",
            background: "#14100D"
          }}>
            {/* Ambient blurred backdrop so any aspect ratio looks seamless */}
            {GALLERY_IMAGES.map((img, idx) => (
              <div 
                key={`bg-${idx}`}
                style={{
                  position: "absolute",
                  inset: "-15px",
                  backgroundImage: `url("${encodeURI(img.src)}")`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                  filter: "blur(25px) brightness(0.4)",
                  opacity: currentSlide === idx ? 1 : 0,
                  transform: currentSlide === idx ? "scale(1.1)" : "scale(1.15)",
                  transition: "opacity 0.8s ease-in-out, transform 3.5s ease-out",
                  pointerEvents: "none",
                  zIndex: 1
                }}
              />
            ))}

            {/* Foreground image rendered with contain - zero cropping, strictly in front of backdrop blur */}
            {GALLERY_IMAGES.map((img, idx) => (
              <img 
                key={`img-${idx}`} 
                src={img.src} 
                alt={img.alt} 
                style={{
                  position: "absolute",
                  top: 0, 
                  left: 0, 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "contain",
                  padding: "8px",
                  zIndex: 5,
                  opacity: currentSlide === idx ? 1 : 0,
                  transform: currentSlide === idx ? "scale(1)" : "scale(0.96)",
                  transition: "opacity 0.6s ease-in-out, transform 0.6s ease-out",
                  willChange: "transform, opacity",
                }}
              />
            ))}

                       {/* Slide counter badge */}
            <div style={{ 
              position: "absolute", 
              top: "16px", 
              right: "16px", 
              zIndex: 10, 
              background: "rgba(0,0,0,0.7)", 
              backdropFilter: "blur(8px)", 
              border: "1px solid rgba(255,255,255,0.15)", 
              borderRadius: "20px", 
              padding: "4px 12px", 
              fontSize: "12px", 
              fontWeight: 700, 
              color: "#E8B66F", 
              letterSpacing: "0.05em" 
            }}>
              {currentSlide + 1} / {GALLERY_IMAGES.length}
            </div>

            {/* Previous slide button */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)}
              aria-label="Previous Slide"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E8B66F";
                e.currentTarget.style.color = "#0B0907";
                e.currentTarget.style.borderColor = "#E8B66F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.65)";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            >
              <ChevronLeft size={22} />
            </button>

            {/* Next slide button */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % GALLERY_IMAGES.length)}
              aria-label="Next Slide"
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E8B66F";
                e.currentTarget.style.color = "#0B0907";
                e.currentTarget.style.borderColor = "#E8B66F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.65)";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            >
              <ChevronRight size={22} />
            </button>

            {/* Pagination indicator dots */}
            <div style={{ 
              position: "absolute", 
              bottom: "16px", 
              left: "0", 
              right: "0", 
              zIndex: 10, 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              gap: "5px", 
              padding: "0 16px", 
              flexWrap: "wrap" 
            }}>
              {GALLERY_IMAGES.map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setCurrentSlide(idx)}
                  style={{ 
                    width: currentSlide === idx ? "16px" : "6px", 
                    height: "6px", 
                    borderRadius: "3px", 
                    background: currentSlide === idx ? "#E8B66F" : "rgba(255,255,255,0.35)", 
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: currentSlide === idx ? "0 0 8px rgba(232,182,111,0.7)" : "none"
                  }} 
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
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
              <div style={{ marginBottom: "16px", color: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "center" }}><User size={40} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Lakhan Karani</h3>
              <p style={{ fontSize: "13px", color: "#E8B66F", fontWeight: 600, marginBottom: "10px" }}>AI Lead</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>AI model development and integration</p>
            </div>

            {/* Member 2: Chirag */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ marginBottom: "16px", color: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "center" }}><Code size={40} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Chirag Nagra</h3>
              <p style={{ fontSize: "13px", color: "#E8B66F", fontWeight: 600, marginBottom: "10px" }}>Backend Engineer</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>Backend</p>
            </div>

            {/* Member 3: Roshan */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ marginBottom: "16px", color: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "center" }}><PenTool size={40} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Roshan Manjal</h3>
              <p style={{ fontSize: "13px", color: "#E8B66F", fontWeight: 600, marginBottom: "10px" }}>Frontend Developer</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>Frontend</p>
            </div>

            {/* Member 4: Nihar */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <div style={{ marginBottom: "16px", color: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "center" }}><FileText size={40} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>Nihar Mahadik</h3>
              <p style={{ fontSize: "13px", color: "#E8B66F", fontWeight: 600, marginBottom: "10px" }}>Documentation Specialist</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>Documentation</p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0B0907", borderTop: "1px solid #3B2B1E", padding: "80px 40px 30px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px", marginBottom: "60px" }}>
            
            {/* Logo/Tagline */}
            <div>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#E8B66F", display: "block", marginBottom: "16px" }}>GoVisual AI</span>
              <p style={{ fontSize: "14px", color: "#B9AA99", lineHeight: 1.5 }}>
                AI-powered brand growth for local businesses.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#F7F3ED", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <Link href="/" style={{ textDecoration: "none", color: "#B9AA99" }}>Home</Link>
                <Link href="/brandbook" style={{ textDecoration: "none", color: "#B9AA99" }}>Brand Book</Link>
                <Link href="/onboard" style={{ textDecoration: "none", color: "#B9AA99" }}>Creatives</Link>
                <Link href="/photoshoot" style={{ textDecoration: "none", color: "#B9AA99" }}>Photoshoot</Link>
                <Link href="/dashboard" style={{ textDecoration: "none", color: "#B9AA99" }}>Dashboard</Link>
              </div>
            </div>

            {/* Social Icons / Location */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#F7F3ED", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>Connect</h4>
              <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#B9AA99", marginBottom: "20px", alignItems: "center" }}>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#E8B66F", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Camera size={18} /> Instagram
                </a>
                <a href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#E8B66F", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MessageCircle size={18} /> WhatsApp
                </a>
              </div>
              <div style={{ fontSize: "13px", color: "#B9AA99" }}>Made with precision in Mumbai</div>
            </div>

          </div>

          {/* Bottom Copyright Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", borderTop: "1px solid #3B2B1E", paddingTop: "24px", fontSize: "12px", color: "#B9AA99" }}>
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
            background: "#21170F",
            border: "1px solid #3B2B1E",
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
                color: "#F7F3ED",
                fontSize: "20px",
                cursor: "pointer"
              }}>
              ✕
            </button>
            <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#F7F3ED", marginBottom: "16px" }}>How GoVisual AI Transforms Your Shop</h3>
            <div style={{ width: "100%", height: "280px", background: "#14100D", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid #3B2B1E", color: "#B9AA99", gap: "8px" }}>
              <PlayCircle size={32} /> Demo Video Playing...
            </div>
            <p style={{ fontSize: "14px", color: "#B9AA99", lineHeight: 1.5 }}>
              This video demonstrates how a local shopkeeper registers, uploads a simple product photo, creates a brand book, and pushes customized marketing graphics and dynamic video reels directly to Instagram in minutes.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
