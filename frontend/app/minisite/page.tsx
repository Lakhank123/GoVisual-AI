"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface MinisiteData {
  shopName: string;
  tagline: string;
  category: string;
  whatsapp: string;
  instagram: string;
  address: string;
  hours: string;
  upiId: string;
  primaryColor: string;
  products: { name: string; price: string; emoji: string }[];
}

export default function MinisitePage() {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [banner, setBanner] = useState<{ type: "success" | "warning"; message: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [data, setData] = useState<MinisiteData>({
    shopName: "", tagline: "", category: "", whatsapp: "", instagram: "",
    address: "", hours: "Mon–Sat: 10 AM – 9 PM", upiId: "",
    primaryColor: "#39ff14",
    products: [
      { name: "", price: "", emoji: "📦" },
      { name: "", price: "", emoji: "📦" },
      { name: "", price: "", emoji: "📦" },
    ]
  });

  const handleAISuggest = async () => {
    if (!data.shopName || !data.category) return;
    setAiLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBase}/api/minisite/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: data.shopName,
          category: data.category
        })
      });
      if (!response.ok) throw new Error("AI suggest API failed");
      const resData = await response.json();
      if (resData.success) {
        setData(d => ({
          ...d,
          tagline: resData.tagline || d.tagline,
          primaryColor: resData.primaryColor || d.primaryColor,
          products: resData.products && resData.products.length > 0 ? resData.products.map((p: any) => ({
            name: p.name || "",
            price: p.price ? String(p.price) : "",
            emoji: p.emoji || "📦"
          })) : d.products
        }));
      }
    } catch (e) {
      console.error("AI Suggestion error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!data.shopName || !data.whatsapp) return;
    setPublishing(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBase}/api/minisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Publishing API failed");
      const resData = await response.json();
      if (resData.success && resData.slug) {
        setPublishedSlug(resData.slug);
      }
    } catch (e) {
      console.error("Publishing error:", e);
    } finally {
      setPublishing(false);
    }
  };

  const set = (key: keyof MinisiteData, val: string) => setData(d => ({ ...d, [key]: val }));

  useEffect(() => {
    const cached = sessionStorage.getItem("gv_brand_book");
    if (cached) {
      try {
        const brandBook = JSON.parse(cached);
        setData(d => ({
          ...d,
          shopName: brandBook.businessName || d.shopName,
          tagline: brandBook.tagline || d.tagline,
          primaryColor: (brandBook.colors && brandBook.colors[0] && brandBook.colors[0].hex) || d.primaryColor,
          whatsapp: brandBook.whatsapp || d.whatsapp,
          instagram: brandBook.instagram || d.instagram
        }));
        setBanner({
          type: "success",
          message: "✅ Pre-filled from your Brand Book. Review and customise below."
        });
      } catch (e) {
        console.error("Failed to parse brand book:", e);
      }
    } else {
      setBanner({
        type: "warning",
        message: "⚠️ You haven't created a Brand Book yet. We recommend creating one first so your website matches your brand identity."
      });
    }
  }, []);

  const COLORS = ["#39ff14", "#f97316", "#a78bfa", "#38bdf8", "#f0a500", "#e1306c", "#10b981", "#ffffff"];
  const EMOJIS = ["📦", "👗", "💍", "📱", "🍕", "💊", "🪑", "💄", "🛒", "🔧", "👟", "📚"];

  const siteUrl = `govisual.in/${data.shopName.toLowerCase().replace(/\s+/g, "-") || "your-shop"}`;

  return (
    <div style={{ minHeight: "100vh", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {banner && (
          <div style={{
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: banner.type === "success" ? "rgba(57,255,20,0.1)" : "rgba(240,165,0,0.1)",
            border: banner.type === "success" ? "1px solid #39ff14" : "1px solid #f0a500",
            color: banner.type === "success" ? "#39ff14" : "#f0a500"
          }}>
            <span>{banner.message}</span>
            {banner.type === "warning" && (
              <Link href="/brandbook" style={{
                background: "#f0a500",
                color: "#000",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                marginLeft: "16px",
                display: "inline-block"
              }}>
                Create Brand Book First →
              </Link>
            )}
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: "#f0a500", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>🌐 Website Builder</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Your Shop's Digital Home — One Link</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>No website? No problem. Build a beautiful one-page shop in 2 minutes. Share it anywhere.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: step === "preview" ? "1fr 1fr" : "1fr", gap: 32 }}>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <FormSection title="🏪 Shop Details">
              <Row>
                <LabelInput label="Shop Name *" value={data.shopName} onChange={v => set("shopName", v)} placeholder="Sharma Electronics" />
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category *</label>
                  <select value={data.category} onChange={e => set("category", e.target.value)} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, height: "40px", cursor: "pointer" }}>
                    <option value="" disabled style={{background: "#111"}}>Select Category</option>
                    <option value="Electronics" style={{background: "#111"}}>Electronics</option>
                    <option value="Clothing / Fashion" style={{background: "#111"}}>Clothing / Fashion</option>
                    <option value="Food & Drinks" style={{background: "#111"}}>Food & Drinks</option>
                    <option value="Jewellery" style={{background: "#111"}}>Jewellery</option>
                    <option value="Home Decor" style={{background: "#111"}}>Home Decor</option>
                    <option value="Salon & Beauty" style={{background: "#111"}}>Salon & Beauty</option>
                    <option value="Pharmacy" style={{background: "#111"}}>Pharmacy</option>
                    <option value="Furniture" style={{background: "#111"}}>Furniture</option>
                    <option value="Grocery / Kirana" style={{background: "#111"}}>Grocery / Kirana</option>
                    <option value="Mobile Repair" style={{background: "#111"}}>Mobile Repair</option>
                  </select>
                </div>
              </Row>
              <Row>
                <LabelInput label="Tagline" value={data.tagline} onChange={v => set("tagline", v)} placeholder="Mumbai's Most Trusted Shop" />
                <LabelInput label="Business Hours" value={data.hours} onChange={v => set("hours", v)} placeholder="Mon–Sat: 10 AM – 9 PM" />
              </Row>
              <LabelInput label="Address" value={data.address} onChange={v => set("address", v)} placeholder="Shop 12, Linking Road, Bandra West, Mumbai 400050" />
              
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={handleAISuggest} 
                  disabled={!data.shopName || !data.category || aiLoading}
                  style={{
                    padding: "10px 18px",
                    background: "rgba(57,255,20,0.15)",
                    border: "1px solid #39ff14",
                    borderRadius: "8px",
                    color: "#39ff14",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: (!data.shopName || !data.category || aiLoading) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                >
                  {aiLoading ? "✨ Generating suggestions..." : "✨ Auto-Fill with OpenAI AI"}
                </button>
              </div>
            </FormSection>

            <FormSection title="📞 Contact Links">
              <Row>
                <LabelInput label="WhatsApp Number *" value={data.whatsapp} onChange={v => set("whatsapp", v)} placeholder="91XXXXXXXXXX" />
                <LabelInput label="Instagram Handle" value={data.instagram} onChange={v => set("instagram", v)} placeholder="@sharmakirana" />
              </Row>
              <LabelInput label="UPI ID (optional)" value={data.upiId} onChange={v => set("upiId", v)} placeholder="sharma@upi" />
            </FormSection>

            <FormSection title="🎨 Brand Color">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => set("primaryColor", c)} style={{ width: 36, height: 36, borderRadius: "50%", background: c, cursor: "pointer", border: `3px solid ${data.primaryColor === c ? "#fff" : "transparent"}`, boxShadow: data.primaryColor === c ? `0 0 12px ${c}` : "none" }} />
                ))}
              </div>
            </FormSection>

            <FormSection title="📦 Featured Products (up to 3)">
              {data.products.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                  <select value={p.emoji} onChange={e => { const ps = [...data.products]; ps[i] = { ...ps[i], emoji: e.target.value }; setData(d => ({ ...d, products: ps })); }} style={{ width: 52, padding: "10px 6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 18, cursor: "pointer" }}>
                    {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                  <input value={p.name} onChange={e => { const ps = [...data.products]; ps[i] = { ...ps[i], name: e.target.value }; setData(d => ({ ...d, products: ps })); }} placeholder={`Product ${i + 1} name`} style={{ flex: 2, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13 }} />
                  <input value={p.price} onChange={e => { const ps = [...data.products]; ps[i] = { ...ps[i], price: e.target.value }; setData(d => ({ ...d, products: ps })); }} placeholder="₹ Price" style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13 }} />
                </div>
              ))}
            </FormSection>

            <button onClick={() => setStep("preview")} disabled={!data.shopName || !data.whatsapp} style={{ padding: "16px 0", background: !data.shopName || !data.whatsapp ? "rgba(240,165,0,0.3)" : "#f0a500", border: "none", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 16, cursor: !data.shopName || !data.whatsapp ? "not-allowed" : "pointer" }}>
              👁️ Preview My Website →
            </button>
          </div>

          {/* Live Preview */}
          {step === "preview" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.5)" }}>LIVE PREVIEW</div>
              <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxWidth: 380, margin: "0 auto" }}>
                {/* Hero */}
                <div style={{ background: `linear-gradient(135deg, ${data.primaryColor}22, ${data.primaryColor}08)`, borderBottom: `4px solid ${data.primaryColor}`, padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: data.primaryColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>🏪</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: "#111", marginBottom: 6 }}>{data.shopName || "Your Shop"}</div>
                  <div style={{ fontSize: 13, color: "#555" }}>{data.tagline || "Your tagline here"}</div>
                  {data.address && <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>📍 {data.address}</div>}
                  {data.hours && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>🕙 {data.hours}</div>}
                </div>
                {/* Products */}
                {data.products.some(p => p.name) && (
                  <div style={{ padding: "20px 24px", borderBottom: "1px solid #eee" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 12 }}>Featured Products</div>
                    {data.products.filter(p => p.name).map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < data.products.filter(x => x.name).length - 1 ? "1px solid #f0f0f0" : "none" }}>
                        <span style={{ fontSize: 14, color: "#222" }}>{p.emoji} {p.name}</span>
                        {p.price && <span style={{ fontWeight: 700, color: data.primaryColor === "#ffffff" ? "#333" : data.primaryColor, fontSize: 14 }}>₹{p.price}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {/* CTA Buttons */}
                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.whatsapp && (
                    <div style={{ padding: "14px", background: "#25D366", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textAlign: "center" }}>
                      💬 Chat on WhatsApp
                    </div>
                  )}
                  {data.instagram && (
                    <div style={{ padding: "14px", background: "linear-gradient(135deg, #e1306c, #833ab4)", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textAlign: "center" }}>
                      📸 Follow on Instagram
                    </div>
                  )}
                  <div style={{ padding: "14px", background: "#4285f4", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textAlign: "center" }}>
                    📍 Get Directions
                  </div>
                  {data.upiId && (
                    <div style={{ padding: "14px", background: "#6739b7", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textAlign: "center" }}>
                      💳 Pay via UPI
                    </div>
                  )}
                </div>
                <div style={{ padding: "12px", textAlign: "center", fontSize: 10, color: "#aaa", borderTop: "1px solid #f0f0f0" }}>
                  Made with GoVisual AI
                </div>
              </div>

              {publishedSlug ? (
                <div style={{ marginTop: 20, background: "rgba(57,255,20,0.1)", border: "1px solid #39ff14", borderRadius: 12, padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#39ff14", marginBottom: 6 }}>Website Published!</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>Your website is live and ready to share with customers.</p>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, color: "#39ff14", border: "1px solid rgba(57,255,20,0.2)", marginBottom: 16, wordBreak: "break-all" }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/minisite-preview/${publishedSlug}` : `/minisite-preview/${publishedSlug}`}
                  </div>
                  <a 
                    href={`/minisite-preview/${publishedSlug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: "block", 
                      padding: "12px 0", 
                      background: "#39ff14", 
                      color: "#000", 
                      borderRadius: 10, 
                      fontWeight: 700, 
                      fontSize: 14, 
                      textDecoration: "none",
                      textAlign: "center"
                    }}
                  >
                    View Live Website 🌐
                  </a>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 20, background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.25)", borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Your link will be:</div>
                    <div style={{ fontWeight: 700, color: "#f0a500", fontSize: 15 }}>govisual.in/{data.shopName.toLowerCase().replace(/\s+/g, "-") || "your-shop"}</div>
                  </div>
                  <button 
                    onClick={handlePublish}
                    disabled={publishing || !data.shopName || !data.whatsapp}
                    style={{ 
                      marginTop: 16, 
                      width: "100%", 
                      padding: "14px 0", 
                      background: (!data.shopName || !data.whatsapp || publishing) ? "rgba(240,165,0,0.3)" : "#f0a500", 
                      border: "none", 
                      borderRadius: 12, 
                      color: "#000", 
                      fontWeight: 700, 
                      fontSize: 15, 
                      cursor: (!data.shopName || !data.whatsapp || publishing) ? "not-allowed" : "pointer" 
                    }}
                  >
                    {publishing ? "🚀 Publishing..." : "🚀 Publish My Website (₹49)"}
                  </button>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 8 }}>One-time setup · Free updates forever</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>{children}</div>;
}

function LabelInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13 }} />
    </div>
  );
}
