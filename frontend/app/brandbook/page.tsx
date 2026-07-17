"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { searchBrand, getBrandProfile } from "@/lib/api";

// Color and category utilities for premium rendering
function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  return { r, g, b };
}

function rgbToCmyk(r: number, g: number, b: number) {
  let c = 1 - (r / 255);
  let m = 1 - (g / 255);
  let y = 1 - (b / 255);
  let k = Math.min(c, Math.min(m, y));
  
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  
  c = Math.round(((c - k) / (1 - k)) * 100);
  m = Math.round(((m - k) / (1 - k)) * 100);
  y = Math.round(((y - k) / (1 - k)) * 100);
  k = Math.round(k * 100);
  
  return { c, m, y, k };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function getFullColorMetrics(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const cmyk = rgbToCmyk(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  return {
    hex,
    rgb: `${r}, ${g}, ${b}`,
    cmyk: `${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`,
    hsl: `${hsl.h}, ${hsl.s}%, ${hsl.l}%`
  };
}

function getCategoryCoverUrl(categoryName: string) {
  const cat = (categoryName || "").toLowerCase();
  
  if (cat.includes("cake") || cat.includes("bakery") || cat.includes("sweet") || cat.includes("dessert")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1200";
  }
  if (cat.includes("bike") || cat.includes("motor") || cat.includes("cycle") || cat.includes("car") || cat.includes("automotive")) {
    return "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200";
  }
  if (cat.includes("cafe") || cat.includes("coffee")) {
    return "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200";
  }
  if (cat.includes("book") || cat.includes("library") || cat.includes("stationery")) {
    return "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1200";
  }
  if (cat.includes("pet") || cat.includes("dog") || cat.includes("cat") || cat.includes("animal")) {
    return "https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=1200";
  }
  if (cat.includes("fashion") || cat.includes("cloth") || cat.includes("boutique") || cat.includes("garment") || cat.includes("tailor")) {
    return "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200";
  }
  if (cat.includes("food") || cat.includes("drink") || cat.includes("restaurant") || cat.includes("biryani") || cat.includes("dhaba")) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200";
  }
  if (cat.includes("jewel") || cat.includes("gold") || cat.includes("silver") || cat.includes("diamond")) {
    return "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200";
  }
  if (cat.includes("pharmacy") || cat.includes("medical") || cat.includes("health") || cat.includes("clinic") || cat.includes("doctor")) {
    return "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=1200";
  }
  if (cat.includes("decor") || cat.includes("interior") || cat.includes("home") || cat.includes("paint")) {
    return "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200";
  }
  if (cat.includes("salon") || cat.includes("beauty") || cat.includes("spa") || cat.includes("cosmetic") || cat.includes("makeup") || cat.includes("barber")) {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200";
  }
  if (cat.includes("furniture") || cat.includes("wood") || cat.includes("sofa")) {
    return "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200";
  }
  if (cat.includes("grocery") || cat.includes("kirana") || cat.includes("supermarket") || cat.includes("mart") || cat.includes("store")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200";
  }
  if (cat.includes("repair") || cat.includes("service") || cat.includes("mobile") || cat.includes("phone") || cat.includes("hardware")) {
    return "https://images.unsplash.com/photo-1597740985671-2a8a3b80f02e?q=80&w=1200";
  }
  if (cat.includes("electronic") || cat.includes("appliance") || cat.includes("tv") || cat.includes("ac")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200";
  }

  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200";
}

interface BrandBookData {
  businessName: string;
  category: string;
  tagline: string;
  vibe?: string;
  colors: { hex: string; name: string; use: string }[];
  fonts: { name: string; use: string; style: string }[];
  voiceWords: string[];
  doList: string[];
  dontList: string[];
  hashtagSets: { local: string; category: string; branded: string; combined: string };
  captionAnalysis?: {
    tone: string;
    avg_length: string;
    themes: string[];
  };
  whatsapp?: string;
  instagram?: string;
}

export default function BrandBookPage() {
  const setBrand = useStore(s => s.setBrand);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingStep, setLoadingStep] = useState(0);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  
  // Google Shop Search state
  const [onboardMode, setOnboardMode] = useState<'choice' | 'search' | 'confirm' | 'manual'>('choice');
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("Mumbai");
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Record<string, any> | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState("");

  async function handleGoogleSearch() {
    if (!searchName.trim()) return;
    setIsSearching(true);
    try {
      const places = await searchBrand(searchName, searchCity);
      setSearchResults(places || []);
    } catch (e) {
      setSearchResults([]);
    }
    setIsSearching(false);
  }

  async function handleGoogleSelect(place: Record<string, any>) {
    setIsSearching(true);
    try {
      const profile = await getBrandProfile(place.place_id);
      if (profile) {
        const mapped = {
          placeId: String(profile.place_id || place.place_id || ''),
          name: String(profile.name || place.name || ''),
          address: String(profile.address || place.address || ''),
          logoUrl: String(profile.logo_url || ''),
          photos: (profile.photos || []) as { url: string; thumb: string }[],
          colors: (profile.colors || ['#1a1a2e', '#e94560']) as string[],
          website: String(profile.website || ''),
        };
        setSelectedPlace(profile);
        setSelectedPhotoUrl(mapped.photos?.[0]?.url || '');
        setOnboardMode('confirm');
      }
    } catch (e) {
      // ignore
    }
    setIsSearching(false);
  }

  function handleGoogleConfirm() {
    if (!selectedPlace) return;
    const profile = {
      placeId: String(selectedPlace.place_id || ''),
      name: String(selectedPlace.name || ''),
      address: String(selectedPlace.address || ''),
      logoUrl: String(selectedPlace.logo_url || ''),
      photos: (selectedPlace.photos || []) as { url: string; thumb: string }[],
      colors: (selectedPlace.colors || ['#1a1a2e', '#e94560']) as string[],
      website: String(selectedPlace.website || ''),
      selectedReferenceUrl: selectedPhotoUrl || ((selectedPlace.photos || [])[0]?.url || ''),
    };
    
    setBrand(profile);
    localStorage.setItem('gv_brand_profile', JSON.stringify(profile));

    setBusinessName(profile.name);
    setCity(searchCity || "Mumbai");
    if (profile.colors && profile.colors.length > 0) {
      setLogoColors(profile.colors);
    }
    if (profile.logoUrl) {
      setLogoPreview(profile.logoUrl);
    }
    if (profile.photos && profile.photos.length > 0) {
      setPostImagesPreviews(profile.photos.map((p: any) => p.url));
      setPostImagesCount(profile.photos.length);
    }
    
    setStep(2);
  }
  
  // Step 2 Form
  const [instagramHandle, setInstagramHandle] = useState("");
  const [otherSocialLink, setOtherSocialLink] = useState("");
  const [captionsText, setCaptionsText] = useState("");
  const [postImagesCount, setPostImagesCount] = useState(0);
  const [postImagesPreviews, setPostImagesPreviews] = useState<string[]>([]);
  
  // Step 3 Form
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [city, setCity] = useState("Mumbai");
  const [tagline, setTagline] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [brandBook, setBrandBook] = useState<BrandBookData | null>(null);

  const categories = [
    "Electronics", "Clothing/Fashion", "Food & Drinks", "Jewellery", 
    "Pharmacy", "Home Decor", "Salon & Beauty", "Furniture", 
    "Grocery/Kirana", "Mobile Repair"
  ];

  // Pre-fill Instagram handle in Step 3 if entered in Step 2
  useEffect(() => {
    if (step === 3 && instagramHandle && !instagramHandle.startsWith("@")) {
      // Just ensure we pass it along correctly
    }
  }, [step]);

  // Color extraction helper
  const extractColors = (imgElement: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return ["#39ff14", "#060a06", "#ffffff"];
    
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(imgElement, 0, 0, size, size);
    
    const imgData = ctx.getImageData(0, 0, size, size).data;
    const colorMap: Record<string, number> = {};
    
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i+1];
      const b = imgData[i+2];
      const a = imgData[i+3];
      
      if (a < 128) continue;
      if (r > 220 && g > 220 && b > 220) continue; // Skip near white
      if (r < 30 && g < 30 && b < 30) continue;    // Skip near black
      
      // Bucket colors to group similar hues
      const bucketR = Math.round(r / 24) * 24;
      const bucketG = Math.round(g / 24) * 24;
      const bucketB = Math.round(b / 24) * 24;
      
      const hex = rgbToHex(bucketR, bucketG, bucketB);
      colorMap[hex] = (colorMap[hex] || 0) + 1;
    }
    
    const sorted = Object.keys(colorMap).sort((a, b) => colorMap[b] - colorMap[a]);
    const fallbacks = ["#39ff14", "#f97316", "#a78bfa"];
    const finalColors = [];
    
    for (let i = 0; i < 3; i++) {
      if (sorted[i]) {
        finalColors.push(sorted[i]);
      } else {
        finalColors.push(fallbacks[i]);
      }
    }
    return finalColors;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + toHex(r) + toHex(g) + toHex(b);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setLogoPreview(dataUrl);
        
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const colors = extractColors(img);
          setLogoColors(colors);
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePostImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const previews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          previews.push(event.target.result as string);
          if (previews.length === files.length) {
            setPostImagesPreviews(prev => [...prev, ...previews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    setPostImagesCount(prev => prev + files.length);
  };

  const startLoadingTimer = () => {
    setLoadingStep(0);
    const intervals = [1000, 2000, 3000, 4000];
    intervals.forEach((ms, idx) => {
      setTimeout(() => {
        setLoadingStep(idx + 1);
      }, ms);
    });
  };

  const triggerGenerate = async () => {
    setStep(4);
    startLoadingTimer();

    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    try {
      const payload = {
        businessName: businessName,
        category: category,
        tagline: tagline || undefined,
        existingColors: logoColors.length > 0 ? logoColors : undefined,
        logoColors: logoColors.length > 0 ? logoColors : undefined,
        captionsText: captionsText || undefined,
        postImagesCount: postImagesCount,
        whatsapp: whatsapp,
        instagram: instagramHandle || undefined
      };

      const res = await fetch(`${BASE}/api/brandbook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.success && data.brandBook) {
        const book = data.brandBook as BrandBookData;
        setBrandBook(book);
        // Store in sessionStorage as requested
        sessionStorage.setItem("gv_brand_book", JSON.stringify(book));
      } else {
        throw new Error("Failed to generate brand book");
      }
    } catch (err) {
      console.error(err);
      // Fallback in case of server failure so that user does not get stuck
      const fallbackBook: BrandBookData = {
        businessName,
        category,
        tagline: tagline || `${businessName} — Quality You Can Trust`,
        colors: [
          { hex: logoColors[0] || "#39ff14", name: "Primary", use: "CTAs, headings, highlights" },
          { hex: logoColors[1] || "#060a06", name: "Secondary", use: "Background, deep contrast" },
          { hex: logoColors[2] || "#ffffff", name: "Accent", use: "Borders, icons, clean space" }
        ],
        fonts: [
          { name: "Poppins Bold", use: "Headlines", style: "Google Fonts — free to use" },
          { name: "Inter Regular", use: "Body", style: "Google Fonts — free to use" },
          { name: "Noto Sans Devanagari", use: "Accent", style: "Google Fonts — free to use" }
        ],
        voiceWords: ["Trustworthy", "Affordable", "Local", "Premium", "Fast"],
        doList: [
          "Always show MRP and offer price clearly",
          "Add 'Warranty included' badge",
          "Post unboxing videos on Instagram Reels",
          "Always show the price — Mumbai customers value transparency",
          "Use Hinglish or Marathi in captions for connection"
        ],
        dontList: [
          "Don't post blurry product images",
          "Don't hide the price",
          "Don't post without a warranty mention",
          "Don't use more than 3 colors in one creative",
          "Don't ignore comments and DMs on Instagram"
        ],
        hashtagSets: {
          local: "#Mumbai #MumbaiShopping #MumbaiLocal",
          category: `#${category.replace("/", "")} #ShopLocal`,
          branded: `#${businessName.replace(/\s+/g, "")} #GoVisualAI`,
          combined: `#Mumbai #${category.replace("/", "")}`
        },
        whatsapp: whatsapp,
        instagram: instagramHandle
      };
      setBrandBook(fallbackBook);
      sessionStorage.setItem("gv_brand_book", JSON.stringify(fallbackBook));
    }
  };

  const loadingMessages = [
    "Reading your logo colors...",
    "Analysing your content style...",
    "Building your brand identity...",
    "Generating your brand book..."
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, -apple-system, sans-serif", padding: "60px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Main Header (Hidden on final result page for prints) */}
        {step < 4 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: "12px", color: "#39ff14", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              📘 Brand Book Generator (Step {step}/3)
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
              {step === 1 && "Build Your Brand Vibe"}
              {step === 2 && "Understand Your Voice"}
              {step === 3 && "Complete Your Identity"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
              Our AI reads your logo and content to build a gorgeous brand guide.
            </p>
          </div>
        )}

        {/* STEP 1: LOGO UPLOAD */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {onboardMode === 'choice' && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>Choose how to start</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "32px" }}>
                  Connect with Google Maps to automatically import your brand assets, or upload details manually.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <button 
                    onClick={() => setOnboardMode('search')}
                    style={{
                      padding: "20px",
                      background: "rgba(57,255,20,0.08)",
                      border: "1px solid #39ff14",
                      borderRadius: "12px",
                      color: "#39ff14",
                      fontWeight: 700,
                      fontSize: "16px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>🔍 Search Google Maps (Recommended)</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>Pull logo, address, reference photos, and brand colors automatically.</div>
                  </button>

                  <button 
                    onClick={() => setOnboardMode('manual')}
                    style={{
                      padding: "20px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "16px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>📁 Upload Assets Manually</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>Manually upload your logo file, select colors, and fill details.</div>
                  </button>
                </div>
              </div>
            )}

            {onboardMode === 'search' && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>What is your shop name?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px" }}>We'll automatically extract your brand profile using Google.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  <input 
                    type="text"
                    placeholder="e.g. Sai Mobile Care"
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGoogleSearch()}
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }}
                  />
                  <input 
                    type="text"
                    placeholder="City (e.g. Mumbai)"
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGoogleSearch()}
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }}
                  />
                  <button 
                    onClick={handleGoogleSearch}
                    disabled={isSearching}
                    style={{
                      padding: "14px",
                      background: "#39ff14",
                      border: "none",
                      borderRadius: "10px",
                      color: "#000",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    {isSearching ? "Searching..." : "Find my shop"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                    {searchResults.map((place, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleGoogleSelect(place)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>{place.name}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{place.address}</div>
                      </button>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setOnboardMode('choice')}
                  style={{
                    marginTop: "16px",
                    width: "100%",
                    padding: "12px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  Back
                </button>
              </div>
            )}

            {onboardMode === 'confirm' && selectedPlace && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>Is this your shop?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px" }}>Confirm your brand details</p>

                <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", background: "rgba(255,255,255,0.02)", marginBottom: "20px" }}>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "#ffffff", marginBottom: "4px" }}>{selectedPlace.name}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>{selectedPlace.address}</div>

                  {/* Colors */}
                  {selectedPlace.colors && selectedPlace.colors.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>Extracted Colors</div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {selectedPlace.colors.map((c: string, idx: number) => (
                          <div key={idx} style={{ width: "24px", height: "24px", borderRadius: "50%", background: c, border: "1px solid rgba(255,255,255,0.2)" }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {selectedPlace.photos && selectedPlace.photos.length > 0 && (
                    <div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>Shop Photos</div>
                      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                        {selectedPlace.photos.slice(0, 4).map((p: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedPhotoUrl(p.url || p.thumb)}
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "8px",
                              overflow: "hidden",
                              border: `2px solid ${selectedPhotoUrl === (p.url || p.thumb) ? "#39ff14" : "transparent"}`,
                              flexShrink: 0,
                              cursor: "pointer"
                            }}
                          >
                            <img src={p.thumb || p.url} alt="shop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button 
                    onClick={handleGoogleConfirm}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "#39ff14",
                      border: "none",
                      borderRadius: "10px",
                      color: "#000",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Yes, this is my shop — Continue
                  </button>

                  <button 
                    onClick={() => setOnboardMode('search')}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Not my shop — Search again
                  </button>
                </div>
              </div>
            )}

            {onboardMode === 'manual' && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>Let's start with your logo</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "32px" }}>
                  Your logo contains your brand's entire identity. Upload it to read its style.
                </p>

                {/* Upload Drag & Drop Area */}
                <div style={{
                  border: "2px dashed rgba(57,255,20,0.3)",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  background: "rgba(57,255,20,0.02)",
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  marginBottom: "24px"
                }}>
                  <input 
                    type="file" 
                    accept="image/png, image/svg+xml, image/jpeg" 
                    onChange={handleLogoChange}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} 
                  />
                  <span style={{ fontSize: "40px" }}>📁</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#39ff14" }}>Click or Drag Logo Image here</span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Supports PNG, SVG, JPG (Max 5MB)</span>
                </div>

                {/* Preview & Swatches */}
                {logoPreview && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginTop: "20px", marginBottom: "20px" }}>
                    <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
                      <img src={logoPreview} alt="Logo Preview" style={{ maxHeight: "120px", maxWidth: "200px", objectFit: "contain" }} />
                    </div>
                    {logoColors.length > 0 && (
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", fontWeight: 600 }}>Extracted Colors:</div>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                          {logoColors.map((color, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: color, border: "2px solid rgba(255,255,255,0.2)" }} />
                              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>{color}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                  <button 
                    onClick={() => setOnboardMode('choice')}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "16px",
                      cursor: "pointer"
                    }}
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(2)}
                    disabled={!logoPreview}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: logoPreview ? "#39ff14" : "rgba(57,255,20,0.2)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: "16px",
                      cursor: logoPreview ? "pointer" : "not-allowed"
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SOCIAL MEDIA INFO */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>Where do you post content?</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "32px" }}>
                Paste your Instagram handle or any social media link. Our AI will analyse your existing posts, captions, and visual style to understand your brand voice.
              </p>

              {/* Instagram Handle */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Your Instagram handle</label>
                <input 
                  type="text" 
                  value={instagramHandle} 
                  onChange={e => setInstagramHandle(e.target.value)} 
                  placeholder="@yourshopname" 
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                />
              </div>

              {/* Other Social Link */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Any other social media link (optional)</label>
                <input 
                  type="text" 
                  value={otherSocialLink} 
                  onChange={e => setOtherSocialLink(e.target.value)} 
                  placeholder="Facebook page URL / YouTube channel" 
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                />
              </div>

              {/* Captions Textarea */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Paste 3–5 of your recent captions here</label>
                <textarea 
                  value={captionsText} 
                  onChange={e => setCaptionsText(e.target.value)} 
                  placeholder="Copy-paste your recent Instagram captions. This helps the AI understand how you talk to customers." 
                  rows={6}
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} 
                />
              </div>

              {/* Upload Post Images */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Upload 3–5 of your recent post images</label>
                <div style={{
                  border: "1px dashed rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  padding: "20px",
                  background: "rgba(255,255,255,0.01)",
                  cursor: "pointer",
                  position: "relative",
                  textAlign: "center",
                  marginBottom: "16px"
                }}>
                  <input 
                    type="file" 
                    multiple 
                    onChange={handlePostImagesChange}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} 
                  />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Select images to upload</span>
                </div>

                {postImagesPreviews.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {postImagesPreviews.map((src, idx) => (
                      <img key={idx} src={src} alt="Post preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "16px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#ffffff", fontWeight: 700, fontSize: "16px", cursor: "pointer" }}>Back</button>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: "16px", background: "#39ff14", border: "none", borderRadius: "12px", color: "#000", fontWeight: 700, fontSize: "16px", cursor: "pointer" }}>Next →</button>
            </div>
          </div>
        )}

        {/* STEP 3: BUSINESS DETAILS */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "32px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>A few quick details</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "32px" }}>Provide basic shop information to complete the Brand Book profile.</p>

              {/* Shop Name */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Shop / Business Name *</label>
                <input 
                  type="text" 
                  value={businessName} 
                  onChange={e => setBusinessName(e.target.value)} 
                  placeholder="e.g. Sharma Electronics" 
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                />
              </div>

              {/* Business Category */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Business Category *</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      setCategory("");
                    }}
                    style={{ background: "transparent", border: "none", color: "#39ff14", fontSize: "12px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    {isCustomCategory ? "Select from list" : "Type custom category"}
                  </button>
                </div>
                
                {isCustomCategory ? (
                  <input 
                    type="text" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    placeholder="e.g. Pet Care, Bookstore, Cafe" 
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                  />
                ) : (
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px", cursor: "pointer" }}
                  >
                    <option value="" style={{ background: "#060a06", color: "#e8e8f0" }}>Select a Category</option>
                    {categories.map(c => (
                      <option key={c} value={c} style={{ background: "#060a06", color: "#e8e8f0" }}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* City */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Your City</label>
                <input 
                  type="text" 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  placeholder="e.g. Mumbai" 
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                />
              </div>

              {/* Tagline */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>Tagline / Slogan (optional)</label>
                <input 
                  type="text" 
                  value={tagline} 
                  onChange={e => setTagline(e.target.value)} 
                  placeholder="e.g. Quality and Trust since 1995" 
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                />
              </div>

              {/* WhatsApp */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>WhatsApp Number * (used on website)</label>
                <input 
                  type="text" 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="e.g. 919876543210" 
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e8e8f0", fontSize: "14px" }} 
                />
              </div>

              {/* Instagram Handle Display/Pre-filled */}
              {instagramHandle && (
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                  Connected Instagram: <span style={{ color: "#39ff14", fontWeight: 600 }}>{instagramHandle}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "16px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#ffffff", fontWeight: 700, fontSize: "16px", cursor: "pointer" }}>Back</button>
              <button 
                onClick={triggerGenerate} 
                disabled={!businessName || !category || !whatsapp}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: (!businessName || !category || !whatsapp) ? "rgba(57,255,20,0.2)" : "#39ff14",
                  border: "none",
                  borderRadius: "12px",
                  color: "#000000",
                  fontWeight: 700,
                  fontSize: "16px",
                  cursor: (!businessName || !category || !whatsapp) ? "not-allowed" : "pointer"
                }}>
                Generate My Brand Book →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: LOADING OR FINAL RESULT VIEW */}
        {step === 4 && (
          <div>
            {!brandBook ? (
              // Loading screen
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div style={{ fontSize: "64px", marginBottom: "24px" }}>📘</div>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", marginBottom: "16px" }}>
                  {loadingMessages[loadingStep] || "Processing..."}
                </h2>
                <div style={{ maxWidth: "400px", margin: "0 auto", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    background: "#39ff14",
                    width: `${(loadingStep / 4) * 100}%`,
                    transition: "width 1s linear",
                    boxShadow: "0 0 10px #39ff14"
                  }} />
                </div>
              </div>
            ) : (
              // Final Brand Book view (5 pages + navigation control)
              <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
                
                {/* Dynamic Font & Print Styles Injection */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');
                  
                  /* Clean A4 view in browser */
                  .brand-book-container {
                    width: 100%;
                    max-width: 800px;
                    margin: 0 auto;
                  }
                  
                  .brand-book-page {
                    background: #ffffff;
                    color: #121212;
                    font-family: 'Open Sans', sans-serif;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 60px 48px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    margin-bottom: 40px;
                    min-height: 1000px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-sizing: border-box;
                    position: relative;
                    overflow: hidden;
                  }

                  .brand-book-page h1, .brand-book-page h2, .brand-book-page h3 {
                    font-family: 'Playfair Display', Georgia, serif;
                  }

                  .brand-book-page label, .brand-book-page .label-header {
                    font-family: 'Montserrat', sans-serif;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    font-weight: 700;
                  }

                  /* Page break directives for print layout */
                  @media print {
                    body {
                      background: #ffffff !important;
                      color: #000000 !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    .brand-book-container {
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    .brand-book-page {
                      border: none !important;
                      box-shadow: none !important;
                      margin-bottom: 0 !important;
                      padding: 50px !important;
                      height: 100vh !important;
                      min-height: 100vh !important;
                      page-break-after: always !important;
                      break-after: page !important;
                      border-radius: 0 !important;
                      background: #ffffff !important;
                      color: #000000 !important;
                    }
                    .brand-book-page.cover-page {
                      background-size: cover !important;
                      background-position: center !important;
                      color: #ffffff !important;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                    .brand-book-page * {
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                  }
                `}} />

                {/* Banner & Control Panel */}
                <div className="no-print" style={{ width: "100%", maxWidth: "800px", background: "rgba(57,255,20,0.08)", border: "1px solid #39ff14", borderRadius: "16px", padding: "24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", color: "#ffffff", fontWeight: 700 }}>Your Brand Book is Generated!</h3>
                    <p style={{ margin: "4px 0 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>Scroll below to preview the pages. Click the download button to save it as a PDF.</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => window.print()} style={{ background: "#39ff14", color: "#000", fontWeight: 700, border: "none", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
                      Download PDF
                    </button>
                    <Link href="/minisite" style={{ textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontWeight: 700, padding: "10px 20px", borderRadius: "8px", fontSize: "14px" }}>
                      Setup Website
                    </Link>
                  </div>
                </div>

                {/* Brand Book container */}
                <div className="brand-book-container">

                  {/* ================= PAGE 1: COVER PAGE ================= */}
                  <div className="brand-book-page cover-page" style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.78)), url(${getCategoryCoverUrl(brandBook.category)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    color: "#ffffff",
                    border: "none"
                  }}>
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                      <div className="label-header" style={{ fontSize: "11px", color: "#39ff14" }}>GoVisual AI — Brand Guide</div>
                      <div style={{ fontSize: "11px", opacity: 0.6 }}>EST. 2026</div>
                    </div>

                    {/* Middle Content */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "auto 0" }}>
                      {logoPreview && (
                        <div style={{ background: "rgba(255,255,255,0.95)", padding: "16px", borderRadius: "8px", width: "fit-content", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                          <img src={logoPreview} alt="Logo" style={{ maxHeight: "80px", maxWidth: "160px", objectFit: "contain" }} />
                        </div>
                      )}
                      <h1 style={{ fontSize: "52px", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                        {brandBook.businessName}
                      </h1>
                      <div className="label-header" style={{ fontSize: "16px", letterSpacing: "0.3em", opacity: 0.8, marginTop: "8px" }}>
                        B R A N D &nbsp; B O O K
                      </div>
                      {brandBook.tagline && (
                        <p style={{ fontSize: "18px", opacity: 0.8, fontStyle: "italic", margin: "12px 0 0 0", borderLeft: "3px solid #39ff14", paddingLeft: "12px" }}>
                          "{brandBook.tagline}"
                        </p>
                      )}
                    </div>

                    {/* Footer bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "20px", fontSize: "11px", opacity: 0.6 }}>
                      <span>DESIGN SYSTEM & GUIDELINES</span>
                      <span>PAGE 01</span>
                    </div>
                  </div>

                  {/* ================= PAGE 2: LOGO & TYPOGRAPHY ================= */}
                  <div className="brand-book-page">
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(0,0,0,0.4)", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <span className="label-header" style={{ color: "#000000" }}>01. Visual Assets</span>
                      <span>{brandBook.businessName}</span>
                    </div>

                    {/* Main Layout */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "40px", margin: "40px 0" }}>
                      <div>
                        <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0", lineHeight: 1.2 }}>Logo & Typography</h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
                          Consistency in layout and visual rhythm ensures recognizable identity. Sizing restrictions and typefaces maintain visual hierarchy across print and screen environments.
                        </p>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                        {/* Logo Clear space & variants */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "12px" }}>Logo Usage & Sizing</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                            {logoPreview && (
                              <div style={{ border: "2px dashed #d1d5db", padding: "16px", borderRadius: "8px", position: "relative", background: "#f9fafb" }}>
                                <img src={logoPreview} alt="Logo" style={{ height: "48px", maxWidth: "120px", objectFit: "contain" }} />
                                <span style={{ position: "absolute", bottom: "2px", right: "4px", fontSize: "8px", color: "#9ca3af", fontFamily: "monospace" }}>+65px clearspace</span>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "10px" }}>
                              {logoPreview && (
                                <>
                                  <div style={{ background: "#000000", padding: "8px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
                                    <img src={logoPreview} alt="Logo White" style={{ height: "32px", maxWidth: "80px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                                  </div>
                                  <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", padding: "8px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
                                    <img src={logoPreview} alt="Logo Black" style={{ height: "32px", maxWidth: "80px", objectFit: "contain", filter: "brightness(0)" }} />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px" }}>
                            Minimum size: 150px wide digital. Always secure the clearspace padding around the badge.
                          </div>
                        </div>

                        {/* Typography Specimens */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "12px" }}>Typography Hierarchy</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ borderLeft: "3px solid #111827", paddingLeft: "12px" }}>
                              <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>PRIMARY HEADLINES (SERIF)</span>
                              <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", color: "#111827" }}>Playfair Display</span>
                              <span style={{ fontSize: "11px", color: "#9ca3af", display: "block", fontFamily: "monospace", marginTop: "2px" }}>Aa Bb Cc Dd Ee Ff Gg 012345</span>
                            </div>
                            
                            <div style={{ borderLeft: "3px solid #111827", paddingLeft: "12px" }}>
                              <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>BODY & DIGITAL COPY (SANS-SERIF)</span>
                              <span style={{ fontSize: "18px", fontWeight: 600, fontFamily: "'Montserrat', sans-serif", color: "#111827" }}>Montserrat</span>
                              <span style={{ fontSize: "11px", color: "#9ca3af", display: "block", fontFamily: "monospace", marginTop: "2px" }}>Aa Bb Cc Dd Ee Ff Gg 012345</span>
                            </div>

                            <div style={{ borderLeft: "3px solid #111827", paddingLeft: "12px" }}>
                              <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>SECONDARY SPECIMEN (SANS-SERIF)</span>
                              <span style={{ fontSize: "16px", fontWeight: 400, fontFamily: "'Open Sans', sans-serif", color: "#111827" }}>Open Sans Regular</span>
                              <span style={{ fontSize: "11px", color: "#9ca3af", display: "block", fontFamily: "monospace", marginTop: "2px" }}>Aa Bb Cc Dd Ee Ff Gg 012345</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "20px", fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>
                      <span>BRAND DESIGN SPECIFICATIONS</span>
                      <span>PAGE 02</span>
                    </div>
                  </div>

                  {/* ================= PAGE 3: BRAND VOICE & AUDIENCE ================= */}
                  <div className="brand-book-page">
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(0,0,0,0.4)", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <span className="label-header" style={{ color: "#000000" }}>02. Strategy & Tone</span>
                      <span>{brandBook.businessName}</span>
                    </div>

                    {/* Main Layout */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "40px", margin: "40px 0" }}>
                      <div>
                        <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0", lineHeight: 1.2 }}>Voice & Demographics</h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
                          Establishing core values and clear guidelines for customer interaction. This dictates how the brand speaks, acts, and aligns with local demographics.
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        {/* Voice Adjectives */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "10px" }}>Brand Voice Attributes</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {brandBook.voiceWords.map((w, idx) => (
                              <span key={idx} style={{ border: "1px solid #e5e7eb", background: "#f9fafb", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Location Details */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "6px" }}>Target Audience Factors</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "16px", borderRadius: "8px" }}>
                            <div>
                              <span style={{ fontSize: "11px", color: "#9ca3af", display: "block" }}>PRIMARY REGION</span>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{city || "Mumbai"}</span>
                            </div>
                            <div>
                              <span style={{ fontSize: "11px", color: "#9ca3af", display: "block" }}>CUSTOMER PROFILE</span>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Local Consumers</span>
                            </div>
                          </div>
                        </div>

                        {/* Do's and Don'ts */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "14px", borderRadius: "8px" }}>
                            <span className="label-header" style={{ fontSize: "9px", color: "#15803d", display: "block", marginBottom: "8px" }}>✅ Always Do</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "#166534" }}>
                              {brandBook.doList.slice(0, 3).map((item, idx) => (
                                <div key={idx} style={{ paddingLeft: "8px", borderLeft: "2px solid #22c55e" }}>{item}</div>
                              ))}
                            </div>
                          </div>
                          
                          <div style={{ border: "1px solid #fecaca", background: "#fef2f2", padding: "14px", borderRadius: "8px" }}>
                            <span className="label-header" style={{ fontSize: "9px", color: "#b91c1c", display: "block", marginBottom: "8px" }}>❌ Never Do</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "#991b1b" }}>
                              {brandBook.dontList.slice(0, 3).map((item, idx) => (
                                <div key={idx} style={{ paddingLeft: "8px", borderLeft: "2px solid #ef4444" }}>{item}</div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Footer bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "20px", fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>
                      <span>STRATEGIC VOICE MANUAL</span>
                      <span>PAGE 03</span>
                    </div>
                  </div>

                  {/* ================= PAGE 4: COLOR PALETTE & REFERENCE UPLOADS ================= */}
                  <div className="brand-book-page">
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(0,0,0,0.4)", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <span className="label-header" style={{ color: "#000000" }}>03. Palette & References</span>
                      <span>{brandBook.businessName}</span>
                    </div>

                    {/* Main Layout */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "40px", margin: "40px 0" }}>
                      <div>
                        <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0", lineHeight: 1.2 }}>Colors & Assets</h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
                          Exact color formulas ensure cross-medium match. The reference directory groups assets uploaded during the generation process for style locking.
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                        {/* Detailed Color Palette */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "12px" }}>Color Palette Details</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {brandBook.colors.map((c, idx) => {
                              const metrics = getFullColorMetrics(c.hex);
                              return (
                                <div key={idx} style={{ display: "flex", gap: "12px", alignItems: "center", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px" }}>
                                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: c.hex, border: "1px solid #d1d5db" }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#111827" }}>{c.name} — {metrics.hex}</div>
                                    <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "#6b7280", marginTop: "2px", fontFamily: "monospace" }}>
                                      <span>RGB: {metrics.rgb}</span>
                                      <span>CMYK: {metrics.cmyk}</span>
                                      <span>HSL: {metrics.hsl}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Reference Gallery */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "12px" }}>Uploaded Reference Gallery</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "10px" }}>
                            {logoPreview && (
                              <div style={{ border: "1px solid #e5e7eb", padding: "8px", borderRadius: "6px", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <img src={logoPreview} alt="Logo Ref" style={{ maxHeight: "60px", maxWidth: "100%", objectFit: "contain" }} />
                              </div>
                            )}
                            {postImagesPreviews.slice(0, 5).map((src, idx) => (
                              <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden", background: "#ffffff", position: "relative", aspectRatio: "1" }}>
                                <img src={src} alt={`Ref Upload ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            ))}
                            {postImagesPreviews.length === 0 && !logoPreview && (
                              <div style={{ gridColumn: "span 4", textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: "12px" }}>No uploads uploaded.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "20px", fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>
                      <span>PALETTE SPECIFICATIONS</span>
                      <span>PAGE 04</span>
                    </div>
                  </div>

                  {/* ================= PAGE 5: STRATEGIC SUMMARY & CONCLUSION ================= */}
                  <div className="brand-book-page">
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(0,0,0,0.4)", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <span className="label-header" style={{ color: "#000000" }}>04. Guidelines & Execution</span>
                      <span>{brandBook.businessName}</span>
                    </div>

                    {/* Main Layout */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "40px", margin: "40px 0" }}>
                      <div>
                        <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0", lineHeight: 1.2 }}>Executive Summary</h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
                          A solid visual direction is only as good as its deployment. Implement these guidelines to scale customer engagement.
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        {/* Strategic Summary Paragraph */}
                        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "18px", borderRadius: "8px" }}>
                          <span className="label-header" style={{ fontSize: "10px", color: "#4b5563", display: "block", marginBottom: "8px" }}>Brand Narrative Direction</span>
                          <p style={{ fontSize: "13px", color: "#1f2937", lineHeight: 1.6, margin: 0 }}>
                            {brandBook.businessName} establishes a "{brandBook.vibe}" identity. By matching the colors with primary typography, the brand coordinates clean digital touchpoints for its target audience in {city || "Mumbai"}. Use these principles consistently across socials, website packaging, and banners.
                          </p>
                        </div>

                        {/* Posting Tips */}
                        <div>
                          <div className="label-header" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "10px" }}>Campaign Deployment Tips</div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#4b5563", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <li><strong>Peak Traffic</strong>: Target active posting times around 9 AM, 1 PM, and 7 PM for highest local reach.</li>
                            <li><strong>Rich Media</strong>: Prioritize Instagram Reels for 3× higher visibility over flat posts.</li>
                            <li><strong>Instant CTA</strong>: Embed your verified WhatsApp handle ({whatsapp || "provided handle"}) directly in your profile bio.</li>
                            <li><strong>Scale</strong>: Update your storefront content via GoVisual AI regularly to maintain style consistency.</li>
                          </ul>
                        </div>

                        {/* Signoff footer */}
                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                          <div>
                            <span style={{ fontSize: "10px", color: "#9ca3af", display: "block" }}>VERSION</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>v1.0 (Active)</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "10px", color: "#9ca3af", display: "block" }}>RELEASE DATE</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>July 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "20px", fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>
                      <span>EXECUTIVE STRATEGY GUIDE</span>
                      <span>PAGE 05</span>
                    </div>
                  </div>

                </div>

                {/* Bottom navigation panel */}
                <div className="no-print" style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                  <button onClick={() => window.print()} style={{ background: "#39ff14", color: "#000", border: "none", borderRadius: "8px", padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                    Print / Download PDF
                  </button>
                  <Link href="/minisite" style={{ textDecoration: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, fontSize: "14px" }}>
                    Build Minisite
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
