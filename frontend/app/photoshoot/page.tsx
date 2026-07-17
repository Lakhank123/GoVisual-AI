"use client";
import { useState, useRef, useEffect } from "react";

interface Avatar {
  id: string;
  name: string;
  description: string;
  emoji: string;
  style: string;
  filename?: string | null;
  chatgpt_prompt?: string | null;
}

const gradients: Record<string, string> = {
  "urban-woman": "135deg, #833ab4, #fd1d1d",
  "professional-man": "135deg, #1a1a2e, #16213e",
  "traditional-woman": "135deg, #f0a500, #e05d00",
  "young-man": "135deg, #39ff14, #00b09b",
  "bride": "135deg, #f7971e, #ffd200",
  "shopkeeper": "135deg, #4facfe, #00f2fe",
  "fitness-woman": "135deg, #f953c6, #b91d73",
  "studio-plain": "135deg, #e0e0e0, #b0b0b0",
};

const DEFAULT_AVATARS: Avatar[] = [
  { id: "urban-woman", name: "Priya", description: "Urban Mumbai woman, 25–35", emoji: "👩🏽", style: "Modern, trendy, confident", filename: "priya.jpg", chatgpt_prompt: null },
  { id: "professional-man", name: "Rahul", description: "Professional businessman, 30–40", emoji: "👨🏽‍💼", style: "Smart, corporate, trustworthy", filename: "rahul.jpg", chatgpt_prompt: null },
  { id: "traditional-woman", name: "Sunita", description: "Traditional Indian woman, 35–50", emoji: "👩🏽‍🦱", style: "Elegant, saree, warm & welcoming", filename: "sunita.jpg", chatgpt_prompt: null },
  { id: "young-man", name: "Arjun", description: "Young college guy, 18–25", emoji: "🧑🏽", style: "Casual, Gen Z, energetic", filename: "arjun.jpg", chatgpt_prompt: null },
  { id: "bride", name: "Kavya", description: "Bridal / festive look", emoji: "👰🏽", style: "Festive, jewellery-ready, glowing", filename: "kavya.jpg", chatgpt_prompt: null },
  { id: "shopkeeper", name: "Ramesh", description: "Local shopkeeper / vendor, 40–55", emoji: "🧔🏽", style: "Approachable, authentic, Mumbai local", filename: "ramesh.jpg", chatgpt_prompt: null },
  { id: "fitness-woman", name: "Anjali", description: "Fitness / sporty woman, 22–32", emoji: "🏋🏽‍♀️", style: "Active, healthy, modern", filename: "anjali.jpg", chatgpt_prompt: null },
  { id: "studio-plain", name: "No Avatar", description: "Plain studio background only", emoji: "⬜", style: "Clean white / gradient studio", filename: null, chatgpt_prompt: null },
];

const BACKGROUNDS = [
  { id: "white-studio", label: "White Studio", emoji: "⬜" },
  { id: "gradient-blue", label: "Blue Gradient", emoji: "🔵" },
  { id: "mumbai-street", label: "Mumbai Street", emoji: "🏙️" },
  { id: "festive-diwali", label: "Diwali Festive", emoji: "🪔" },
  { id: "nature-green", label: "Nature Green", emoji: "🌿" },
  { id: "luxury-dark", label: "Luxury Dark", emoji: "🖤" },
];

export default function PhotoshootPage() {
  const [step, setStep] = useState<"setup" | "generating" | "results">("setup");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>(DEFAULT_AVATARS);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [selectedAvatar, setSelectedAvatar] = useState<string>("urban-woman");
  const [selectedBg, setSelectedBg] = useState<string>("white-studio");
  const [productName, setProductName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [shots, setShots] = useState<{ label: string; url: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    fetch("/avatars/avatars.json")
      .then(res => res.json())
      .then(data => {
        if (data && data.avatars) {
          setAvatars(data.avatars);
        }
      })
      .catch(err => console.error("Failed to load avatars JSON:", err));
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const url = URL.createObjectURL(file);
      setProductPreview(url);
    }
  };

  const generate = async () => {
    if (!productImage || !productName) return;
    setStep("generating");
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const formData = new FormData();
      formData.append("productImage", productImage);
      formData.append("productName", productName);
      formData.append("avatarId", selectedAvatar);
      formData.append("backgroundId", selectedBg);

      const res = await fetch(`${BASE}/api/photoshoot`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success && data.shots) {
        setShots(data.shots);
      } else {
        throw new Error("Failed to generate photoshoot");
      }
    } catch (err: any) {
      console.error(err);
      // Fallback placeholder images so the user isn't fully blocked if backend fails
      setShots([
        { label: "Lifestyle Close-Up", url: "", success: false, error: err.message },
        { label: "Full Body Shot", url: "", success: false, error: err.message },
        { label: "Product Hero", url: "", success: false, error: err.message },
        { label: "Detail Shot", url: "", success: false, error: err.message },
        { label: "Contextual Use", url: "", success: false, error: err.message },
        { label: "White Studio", url: "", success: false, error: err.message },
      ]);
    }
    setStep("results");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>📷 AI Product Photoshoot</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Professional Product Photos in 60 Seconds</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Upload your product photo → pick an Indian avatar + background → get 6 professional shots instantly.</p>
        </div>

        {step === "setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Product Upload */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>1. Upload Your Product Photo</div>
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, padding: "32px", textAlign: "center", cursor: "pointer", background: productPreview ? "transparent" : "rgba(255,255,255,0.02)" }}>
                {productPreview ? (
                  <img src={productPreview} alt="product" style={{ maxHeight: 200, borderRadius: 8, objectFit: "contain" }} />
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to upload product photo</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>JPG, PNG — best if product is on white/plain background</div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Product name (e.g. iPhone 16 Pro, Silk Saree, Gold Necklace)" style={{ marginTop: 12, width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#e8e8f0", fontSize: 14 }} />
            </div>

            {/* Avatar Selection */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>2. Choose an Indian Avatar Model</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>The AI will place your product naturally with this avatar</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {avatars.map(a => (
                  <div key={a.id} onClick={() => setSelectedAvatar(a.id)} style={{ cursor: "pointer", borderRadius: 12, border: `2px solid ${selectedAvatar === a.id ? "#a78bfa" : "rgba(255,255,255,0.08)"}`, background: selectedAvatar === a.id ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)", padding: "16px 12px", textAlign: "center", transition: "all 0.2s" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: a.filename && !imgError[a.id] ? "transparent" : `linear-gradient(${gradients[a.id] || "135deg, #e0e0e0, #b0b0b0"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 10px", overflow: "hidden" }}>
                      {a.filename && !imgError[a.id] ? (
                        <img 
                          src={`/avatars/${a.filename}`} 
                          onError={() => setImgError(prev => ({ ...prev, [a.id]: true }))} 
                          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} 
                          alt={a.name} 
                        />
                      ) : (
                        a.emoji
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{a.description}</div>
                    {selectedAvatar === a.id && <div style={{ marginTop: 6, fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>✓ Selected</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Background Selection */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>3. Choose Background</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {BACKGROUNDS.map(b => (
                  <div key={b.id} onClick={() => setSelectedBg(b.id)} style={{ cursor: "pointer", padding: "14px 16px", borderRadius: 10, border: `1px solid ${selectedBg === b.id ? "#a78bfa" : "rgba(255,255,255,0.08)"}`, background: selectedBg === b.id ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{b.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: selectedBg === b.id ? 600 : 400, color: selectedBg === b.id ? "#a78bfa" : "#e8e8f0" }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={generate} disabled={!productImage || !productName} style={{ padding: "16px 0", background: !productImage || !productName ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg, #a78bfa, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 16, cursor: !productImage || !productName ? "not-allowed" : "pointer" }}>
              📷 Generate 6 Product Photos →
            </button>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Uses 2 credits per photoshoot session</div>
          </div>
        )}

        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Creating your product photoshoot...</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Placing {productName} with {avatars.find(a => a.id === selectedAvatar)?.name} in 6 different compositions
            </div>
            {["Removing product background...", "Compositing with avatar...", "Applying professional lighting...", "Generating 6 shots..."].map((msg, i) => (
              <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>✓ {msg}</div>
            ))}
          </div>
        )}

        {step === "results" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Your 6 Product Photos are Ready! 🎉</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>{productName} with {avatars.find(a => a.id === selectedAvatar)?.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {shots.map((shot, i) => {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const imgUrl = shot.url ? (shot.url.startsWith("http") ? shot.url : `${apiBase}${shot.url}`) : "";
                return (
                  <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ height: 200, background: `linear-gradient(${135 + i * 20}deg, hsl(${i * 40 + 250}, 60%, 15%), hsl(${i * 40 + 290}, 60%, 8%))`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      {shot.success && imgUrl ? (
                        <img src={imgUrl} alt={shot.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ textAlign: "center", padding: 16 }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Generation Failed</div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{shot.label}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {shot.success && imgUrl ? (
                          <a href={imgUrl} download target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "7px 0", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 6, color: "#a78bfa", fontSize: 12, cursor: "pointer", textDecoration: "none", textAlign: "center", display: "inline-block" }}>Download</a>
                        ) : (
                          <button disabled style={{ flex: 1, padding: "7px 0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "not-allowed" }}>Download</button>
                        )}
                        <button style={{ flex: 1, padding: "7px 0", background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.3)", borderRadius: 6, color: "#39ff14", fontSize: 12, cursor: "pointer" }}>Post to IG</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => { setStep("setup"); setProductImage(null); setProductPreview(null); setProductName(""); setShots([]); }} style={{ padding: "14px 32px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#e8e8f0", fontWeight: 600, cursor: "pointer" }}>
              ← New Photoshoot
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
