"use client";
import { useState, useRef } from "react";

const ANIMATION_STYLES = [
  { id: "text-reveal", label: "Text Reveal", description: "Words appear one by one with fade + slide", emoji: "✨", duration: "15s" },
  { id: "product-zoom", label: "Product Zoom", description: "Dramatic zoom-in on product, logo fade-in", emoji: "🔍", duration: "15s" },
  { id: "ken-burns", label: "Ken Burns", description: "Slow pan + zoom across the image", emoji: "🎥", duration: "30s" },
  { id: "split-screen", label: "Split Screen", description: "Before/after or two products side by side", emoji: "⬛", duration: "20s" },
  { id: "festival-burst", label: "Festival Burst", description: "Fireworks, sparkle effects — perfect for Diwali/Eid", emoji: "🎆", duration: "15s" },
  { id: "countdown-offer", label: "Countdown Offer", description: "Ticking timer + sale price reveal", emoji: "⏳", duration: "15s" },
];

const MUSIC_OPTIONS = [
  { id: "none", label: "No Music", emoji: "🔇" },
  { id: "upbeat-hindi", label: "Upbeat Hindi", emoji: "🎵" },
  { id: "corporate-clean", label: "Clean Corporate", emoji: "🎶" },
  { id: "festive-dhol", label: "Festive Dhol", emoji: "🥁" },
  { id: "lo-fi-calm", label: "Lo-fi Calm", emoji: "🎹" },
];

export default function VideoPage() {
  const [step, setStep] = useState<"setup" | "generating" | "done">("setup");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("text-reveal");
  const [selectedMusic, setSelectedMusic] = useState("none");
  const [mainText, setMainText] = useState("");
  const [subText, setSubText] = useState("");
  const [format, setFormat] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setSourceImage(f); setPreview(URL.createObjectURL(f)); }
  };

  const generate = async () => {
    setStep("generating");
    // Simulate progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(i);
    }
    setStep("done");
  };

  const formatDims: Record<string, string> = { "9:16": "1080×1920 (Reels/Story)", "1:1": "1080×1080 (Feed)", "16:9": "1920×1080 (YouTube)" };

  return (
    <div style={{ minHeight: "100vh", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: "#f97316", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>🎬 Video Animation Studio</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Turn Your Creative Into a Video Reel</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Upload your creative or product image → add animation + music → download Instagram-ready MP4 in minutes.</p>
        </div>

        {step === "setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Upload */}
            <Card title="1. Upload Your Creative or Product Image">
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer" }}>
                {preview ? <img src={preview} alt="" style={{ maxHeight: 200, borderRadius: 8 }} /> : (
                  <><div style={{ fontSize: 36, marginBottom: 12 }}>🖼️</div><div style={{ fontWeight: 600 }}>Click to upload</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Use an existing GoVisual creative or any image</div></>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            </Card>

            {/* Text */}
            <Card title="2. Add Text for the Video">
              <input value={mainText} onChange={e => setMainText(e.target.value)} placeholder="Main headline (e.g. BIGGEST SALE OF THE YEAR)" style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#e8e8f0", fontSize: 14, marginBottom: 10 }} />
              <input value={subText} onChange={e => setSubText(e.target.value)} placeholder="Subtext / offer (e.g. Flat 40% off — Today Only!)" style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#e8e8f0", fontSize: 14 }} />
            </Card>

            {/* Animation Style */}
            <Card title="3. Choose Animation Style">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {ANIMATION_STYLES.map(s => (
                  <div key={s.id} onClick={() => setSelectedStyle(s.id)} style={{ cursor: "pointer", borderRadius: 12, border: `1px solid ${selectedStyle === s.id ? "#f97316" : "rgba(255,255,255,0.08)"}`, background: selectedStyle === s.id ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)", padding: "14px 12px" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{s.emoji}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: selectedStyle === s.id ? "#f97316" : "#e8e8f0" }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{s.description}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>⏱ {s.duration} reel</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Format + Music */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card title="4. Video Format">
                {(["9:16", "1:1", "16:9"] as const).map(f => (
                  <div key={f} onClick={() => setFormat(f)} style={{ cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: `1px solid ${format === f ? "#f97316" : "rgba(255,255,255,0.08)"}`, background: format === f ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: format === f ? "#f97316" : "#e8e8f0" }}>{f}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{formatDims[f]}</div>
                  </div>
                ))}
              </Card>
              <Card title="5. Background Music">
                {MUSIC_OPTIONS.map(m => (
                  <div key={m.id} onClick={() => setSelectedMusic(m.id)} style={{ cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: `1px solid ${selectedMusic === m.id ? "#f97316" : "rgba(255,255,255,0.08)"}`, background: selectedMusic === m.id ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span style={{ fontSize: 13, color: selectedMusic === m.id ? "#f97316" : "#e8e8f0", fontWeight: selectedMusic === m.id ? 600 : 400 }}>{m.label}</span>
                  </div>
                ))}
              </Card>
            </div>

            <button onClick={generate} disabled={!sourceImage} style={{ padding: "16px 0", background: !sourceImage ? "rgba(249,115,22,0.3)" : "linear-gradient(135deg, #f97316, #ea580c)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 16, cursor: !sourceImage ? "not-allowed" : "pointer" }}>
              🎬 Generate MP4 Video →
            </button>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Uses 3 credits per video</div>
          </div>
        )}

        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 32 }}>Rendering your video...</div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 100, height: 10, maxWidth: 400, margin: "0 auto 16px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 100, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>{progress}% complete</div>
            {progress > 30 && <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Rendering {ANIMATION_STYLES.find(s => s.id === selectedStyle)?.label} animation...</div>}
            {progress > 70 && <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Adding audio and final export...</div>}
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>Your Video is Ready!</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 32 }}>
              {format} · {ANIMATION_STYLES.find(s => s.id === selectedStyle)?.duration} · MP4
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "60px 40px", maxWidth: 360, margin: "0 auto 32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
              🎬
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={{ padding: "14px 28px", background: "#f97316", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>📥 Download MP4</button>
              <button style={{ padding: "14px 28px", background: "linear-gradient(135deg, #e1306c, #833ab4)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>📸 Post to Instagram</button>
              <button style={{ padding: "14px 28px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#e8e8f0", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>💬 Share on WhatsApp</button>
            </div>
            <button onClick={() => { setStep("setup"); setSourceImage(null); setPreview(null); setProgress(0); }} style={{ marginTop: 24, padding: "12px 24px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>
              ← Make Another Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}
