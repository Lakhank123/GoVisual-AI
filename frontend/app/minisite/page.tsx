"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useDemoSession } from "@/components/providers/demo-session-provider";
import { LandingPageRenderer, type MinisiteData, type MinisiteProduct } from "@/components/minisite/LandingPageRenderer";

const THEME_OPTIONS: { id: "bold_contrast" | "luxury_editorial" | "clean_minimal" | "warm_vibrant"; name: string; tag: string; description: string; previewAccent: string; previewBg: string }[] = [
  {
    id: "bold_contrast",
    name: "⚡ Bold Contrast",
    tag: "High Energy & Tech",
    description: "Inspired by boAt & modern consumer tech. Dark mode, vibrant accents, and high-impact product cards.",
    previewAccent: "#38bdf8",
    previewBg: "#06090e",
  },
  {
    id: "luxury_editorial",
    name: "✨ Luxury Editorial",
    tag: "Premium & Refined",
    description: "Tailored for jewellery, couture fashion, and luxury goods. Warm champagne gold, serif headers, and spacious layouts.",
    previewAccent: "#E8B66F",
    previewBg: "#0B0907",
  },
  {
    id: "clean_minimal",
    name: "🌿 Clean Minimal",
    tag: "Contemporary & Crisp",
    description: "Designed for modern lifestyle, home decor, and services. Crisp typography, balanced cards, and high legibility.",
    previewAccent: "#10b981",
    previewBg: "#090d16",
  },
  {
    id: "warm_vibrant",
    name: "☀️ Warm Vibrant",
    tag: "Inviting & Culinary",
    description: "Perfect for cafes, bakeries, street food, and artisanal gifts. Sunset orange accents, warm cards, and friendly copy.",
    previewAccent: "#f97316",
    previewBg: "#0f0805",
  },
];

const PRESET_COLORS = [
  "#E8B66F", // Champagne Gold
  "#38bdf8", // Cyber Cyan
  "#f97316", // Sunset Orange
  "#10b981", // Emerald Green
  "#a78bfa", // Electric Violet
  "#f43f5e", // Crimson Rose
  "#e1306c", // Instagram Magenta
  "#ffffff", // Crisp White
];

export default function MinisitePage() {
  const { session } = useDemoSession();

  // Active builder tab
  const [activeTab, setActiveTab] = useState<"brand" | "story" | "products" | "contact">("brand");
  // Split preview vs full-width form
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);

  // Main Minisite Data State
  const [data, setData] = useState<MinisiteData>({
    shopName: "",
    slug: "",
    tagline: "",
    category: "",
    theme: "bold_contrast",
    primaryColor: "#38bdf8",
    secondaryColor: "#06090e",
    whatsapp: "",
    instagram: "",
    address: "",
    hours: "Mon–Sat: 10:00 AM – 9:00 PM",
    upiId: "",
    logoUrl: "",
    showLogo: true,
    heroHeadline: "",
    heroDescription: "",
    heroBadge: "⚡ Exclusive Direct Showcase",
    primaryCtaText: "Order on WhatsApp",
    secondaryCtaText: "View Featured Products",
    brandStory: "",
    differentiators: [
      "Authentic Products with 100% Quality Guarantee",
      "Fast & Safe Dispatch Directly from Our Store",
      "Dedicated Customer Support on WhatsApp",
    ],
    audience: "",
    objective: "WhatsApp Enquiries & Direct Sales",
    featuredProductId: "",
    products: [
      {
        name: "Wireless Bass Earbuds Pro",
        price: "1,999",
        badge: "Best Seller",
        description: "True wireless earbuds with 40-hour playback and deep bass.",
        emoji: "🎧",
        imageUrl: "",
      },
      {
        name: "Smart Fitness Tracker 2.0",
        price: "2,499",
        badge: "Trending",
        description: "AMOLED screen with continuous heart rate and sleep monitoring.",
        emoji: "⌚",
        imageUrl: "",
      },
      {
        name: "Fast Charging Power Bank 20000mAh",
        price: "1,499",
        badge: "Popular",
        description: "Dual output fast charger compatible with all smartphones.",
        emoji: "🔋",
        imageUrl: "",
      },
    ],
  });

  // Auto prefill from session once on mount or when session updates
  useEffect(() => {
    const brand = session?.brandProfile;
    const ws = session?.workspace;
    const bName = brand?.businessName || ws?.businessName;
    const cat = brand?.category || ws?.category;

    if (bName || cat) {
      const generatedSlug = (bName || "my-shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      
      // Select appropriate theme based on category
      let recommendedTheme: MinisiteData["theme"] = "bold_contrast";
      let recommendedColor = "#38bdf8";

      const catLower = (cat || "").toLowerCase();
      if (catLower.includes("jewel") || catLower.includes("fashion") || catLower.includes("cloth")) {
        recommendedTheme = "luxury_editorial";
        recommendedColor = brand?.primaryColor || "#E8B66F";
      } else if (catLower.includes("food") || catLower.includes("cafe") || catLower.includes("bakery") || catLower.includes("drink")) {
        recommendedTheme = "warm_vibrant";
        recommendedColor = "#f97316";
      } else if (catLower.includes("home") || catLower.includes("furniture") || catLower.includes("salon")) {
        recommendedTheme = "clean_minimal";
        recommendedColor = "#10b981";
      }

      setData((prev) => ({
        ...prev,
        shopName: bName || prev.shopName,
        slug: prev.slug || generatedSlug,
        category: cat || prev.category || "Electronics",
        theme: prev.theme || recommendedTheme,
        primaryColor: brand?.primaryColor || prev.primaryColor || recommendedColor,
        instagram: brand?.instagram || prev.instagram,
        address: brand?.city || ws?.city || prev.address,
        logoUrl: brand?.logoUrl || prev.logoUrl,
        showLogo: Boolean(brand?.logoUrl) || prev.showLogo,
        audience: brand?.targetAudience || prev.audience,
        heroHeadline: prev.heroHeadline || `${bName || "Premium Quality"} — Crafted for Performance`,
        heroDescription: prev.heroDescription || brand?.brandSummary || "Discover our handpicked collection, designed for those who demand excellence.",
        brandStory: prev.brandStory || brand?.brandSummary || `At ${bName || "our brand"}, we believe quality and authenticity speak for themselves. Every product is carefully curated for our community.`,
        // If products exist in catalog, map up to 4
        products: session?.products && session.products.length > 0
          ? session.products.slice(0, 4).map((p) => ({
              name: p.name,
              price: p.price ? String(p.price).replace(/[^0-9,]/g, "") : "",
              badge: "Catalogue Pick",
              description: p.description || "",
              imageUrl: p.imageUrl || "",
              emoji: "📦",
            }))
          : prev.products,
      }));
    }
  }, [session]);

  // Handle Slug Generation
  const handleShopNameChange = (val: string) => {
    setData((d) => {
      const newSlug = !d.slug || d.slug === d.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        ? val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : d.slug;
      return { ...d, shopName: val, slug: newSlug };
    });
  };

  // AI Suggestion Handler (Calls existing /api/minisite/ai-suggest endpoint)
  const handleAISuggest = async () => {
    if (!data.shopName || !data.category) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiBase}/api/minisite/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: data.shopName,
          category: data.category,
          audience: data.audience || undefined,
          objective: data.objective || undefined,
          visualDirection: data.theme || undefined,
        }),
      });

      if (!response.ok) throw new Error("AI suggest failed");
      const res = await response.json();

      if (res.success) {
        setData((d) => ({
          ...d,
          tagline: res.tagline || d.tagline,
          heroHeadline: res.heroHeadline || d.heroHeadline,
          heroDescription: res.heroDescription || d.heroDescription,
          heroBadge: res.heroBadge || d.heroBadge,
          brandStory: res.brandStory || d.brandStory,
          differentiators: res.differentiators && res.differentiators.length > 0 ? res.differentiators : d.differentiators,
          theme: res.theme || d.theme,
          primaryColor: res.primaryColor || d.primaryColor,
          primaryCtaText: res.primaryCtaText || d.primaryCtaText,
          products: res.products && res.products.length > 0
            ? res.products.map((p: any, idx: number) => ({
                name: p.name || `Product ${idx + 1}`,
                price: p.price ? String(p.price) : "",
                badge: p.badge || "Featured",
                description: p.description || "",
                imageUrl: d.products?.[idx]?.imageUrl || "", // keep user's uploaded images
                emoji: p.emoji || "📦",
              }))
            : d.products,
        }));
        setAiMessage("✨ Brand copy, layout theme, and differentiators updated!");
        setTimeout(() => setAiMessage(null), 4000);
      }
    } catch (e) {
      console.error("AI Suggestion error:", e);
      setAiMessage("⚠️ Could not reach AI service; existing content preserved.");
    } finally {
      setAiLoading(false);
    }
  };

  // Publish / Save Storefront Handler
  const handlePublish = async () => {
    if (!data.shopName || !data.whatsapp) {
      alert("Please provide both a Shop Name and a WhatsApp Number.");
      return;
    }
    setPublishing(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const payload = {
        ...data,
        slug: data.slug || data.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      };

      const res = await fetch(`${apiBase}/api/minisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save minisite");
      const resData = await res.json();
      if (resData.success && resData.slug) {
        setPublishedSlug(resData.slug);
        setSaveSuccessModal(true);
      }
    } catch (e) {
      console.error("Publishing error:", e);
      alert("Failed to save storefront. Please verify your connection.");
    } finally {
      setPublishing(false);
    }
  };

  // Catalogue product importer
  const handleImportCatalogueProduct = (prod: any) => {
    setData((d) => {
      const current = d.products || [];
      const updated = [
        ...current,
        {
          name: prod.name,
          price: prod.price ? String(prod.price).replace(/[^0-9,]/g, "") : "",
          badge: "Catalogue Pick",
          description: prod.description || "",
          imageUrl: prod.imageUrl || "",
          emoji: "📦",
        },
      ];
      return { ...d, products: updated };
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080605", color: "#F7F3ED", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Builder Navigation */}
      <header style={{
        background: "#0D0A08",
        borderBottom: "1px solid #241A12",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/dashboard"
            style={{
              color: "rgba(255,255,255,0.6)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            ← Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Brand Storefront Builder</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(232,182,111,0.15)", color: "#E8B66F", fontWeight: 700, textTransform: "uppercase" }}>
                AI-Assisted
              </span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {data.shopName ? `Configuring ${data.shopName} · /minisite-preview/${data.slug || "store"}` : "Configure your brand-specific landing page"}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Live Preview Toggle */}
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            style={{
              padding: "8px 14px",
              background: showLivePreview ? "rgba(232,182,111,0.15)" : "rgba(255,255,255,0.06)",
              color: showLivePreview ? "#E8B66F" : "rgba(255,255,255,0.7)",
              border: showLivePreview ? "1px solid #E8B66F" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showLivePreview ? "👁️ Hide Split Preview" : "👁️ Show Split Preview"}
          </button>

          {/* AI Suggest Button */}
          <button
            onClick={handleAISuggest}
            disabled={!data.shopName || !data.category || aiLoading}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, rgba(232,182,111,0.2), rgba(56,189,248,0.2))",
              border: "1px solid #E8B66F",
              borderRadius: 8,
              color: "#E8B66F",
              fontSize: 12,
              fontWeight: 700,
              cursor: (!data.shopName || !data.category || aiLoading) ? "not-allowed" : "pointer",
              opacity: (!data.shopName || !data.category || aiLoading) ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {aiLoading ? "✨ Generating Copy & Layout..." : "✨ AI Auto-Fill"}
          </button>

          {/* Save & Publish Button */}
          <button
            onClick={handlePublish}
            disabled={publishing || !data.shopName || !data.whatsapp}
            style={{
              padding: "8px 20px",
              background: (!data.shopName || !data.whatsapp || publishing) ? "rgba(232,182,111,0.25)" : "#E8B66F",
              color: (!data.shopName || !data.whatsapp || publishing) ? "#999" : "#0B0907",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: (!data.shopName || !data.whatsapp || publishing) ? "not-allowed" : "pointer",
            }}
          >
            {publishing ? "Saving..." : "Save & Preview 🌐"}
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {aiMessage && (
        <div style={{
          background: "rgba(56,189,248,0.15)",
          borderBottom: "1px solid rgba(56,189,248,0.3)",
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 600,
          color: "#38bdf8",
          textAlign: "center",
        }}>
          {aiMessage}
        </div>
      )}

      {/* Main Workspace: Form Editor (Left) + Live Preview (Right) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: showLivePreview ? "minmax(420px, 520px) 1fr" : "minmax(480px, 800px)",
        maxWidth: showLivePreview ? "100%" : 860,
        margin: "0 auto",
        minHeight: "calc(100vh - 73px)",
      }}>
        {/* LEFT COLUMN: BUILDER TABS & FORM */}
        <div style={{
          padding: "24px",
          borderRight: showLivePreview ? "1px solid #241A12" : "none",
          background: "#0D0A08",
          overflowY: "auto",
          maxHeight: "calc(100vh - 73px)",
        }}>
          {/* Tab Selection Navigation */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 24, background: "#14100D", padding: 4, borderRadius: 10, border: "1px solid #2B1E14" }}>
            {[
              { id: "brand", label: "1. Brand & Style" },
              { id: "story", label: "2. Story & Hero" },
              { id: "products", label: "3. Products" },
              { id: "contact", label: "4. Contact & CTA" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "8px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === tab.id ? "#E8B66F" : "transparent",
                  color: activeTab === tab.id ? "#0B0907" : "rgba(255,255,255,0.6)",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: BRAND IDENTITY & VISUAL DIRECTION */}
          {activeTab === "brand" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionHeader
                title="🎨 Brand Identity & Visual Direction"
                description="Set your shop name, category, and visual aesthetic. Themes customize typography, spacing, and component styling."
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Shop / Business Name *" />
                  <Input
                    value={data.shopName}
                    onChange={handleShopNameChange}
                    placeholder="e.g. boAt Audio World"
                  />
                </div>
                <div>
                  <Label text="Category *" />
                  <select
                    value={data.category}
                    onChange={(e) => setData({ ...data, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#18130F",
                      border: "1px solid #332317",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      height: 42,
                    }}
                  >
                    <option value="" disabled>Select Business Category</option>
                    <option value="Electronics">Electronics & Gadgets</option>
                    <option value="Clothing / Fashion">Clothing & Fashion Apparel</option>
                    <option value="Jewellery">Jewellery & Luxury Ornaments</option>
                    <option value="Food & Drinks">Food, Cafe & Beverages</option>
                    <option value="Home Decor">Home Decor & Furnishing</option>
                    <option value="Salon & Beauty">Salon, Spa & Beauty</option>
                    <option value="Pharmacy">Pharmacy & Healthcare</option>
                    <option value="Automobile / Two-Wheeler">Automobile & Two-Wheeler</option>
                    <option value="Retail / Kirana">Retail Store</option>
                  </select>
                </div>
              </div>

              {/* Slug Preview */}
              <div>
                <Label text="Custom Web Address Slug" />
                <div style={{ display: "flex", alignItems: "center", background: "#18130F", border: "1px solid #332317", borderRadius: 8, overflow: "hidden" }}>
                  <span style={{ padding: "0 12px", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "#120E0A" }}>
                    /minisite-preview/
                  </span>
                  <input
                    value={data.slug || ""}
                    onChange={(e) => setData({ ...data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                    placeholder="my-shop"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "transparent",
                      border: "none",
                      color: "#E8B66F",
                      fontSize: 13,
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Layout Theme Selection (Visual Cards) */}
              <div>
                <Label text="Visual Layout Direction (Select Theme)" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {THEME_OPTIONS.map((theme) => {
                    const isSelected = data.theme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setData({ ...data, theme: theme.id, primaryColor: theme.previewAccent, secondaryColor: theme.previewBg })}
                        style={{
                          padding: "12px",
                          borderRadius: 10,
                          background: isSelected ? "rgba(232,182,111,0.12)" : "#14100D",
                          border: isSelected ? "2px solid #E8B66F" : "1px solid #2B1E14",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#E8B66F" : "#fff" }}>{theme.name}</span>
                          <span style={{ width: 12, height: 12, borderRadius: "50%", background: theme.previewAccent }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#E8B66F", fontWeight: 600, marginBottom: 4 }}>{theme.tag}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{theme.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Palettes */}
              <div>
                <Label text="Primary Accent Color" />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setData({ ...data, primaryColor: c })}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: c,
                        border: data.primaryColor === c ? "3px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                        cursor: "pointer",
                        boxShadow: data.primaryColor === c ? `0 0 10px ${c}` : "none",
                      }}
                    />
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Hex:</span>
                    <input
                      value={data.primaryColor || ""}
                      onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                      style={{
                        width: 80,
                        padding: "6px 8px",
                        background: "#18130F",
                        border: "1px solid #332317",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Brand Logo Upload / URL */}
              <div>
                <Label text="Brand Logo" />
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {data.logoUrl ? (
                    <img
                      src={data.logoUrl}
                      alt="Logo preview"
                      style={{ width: 44, height: 44, objectFit: "contain", background: "#18130F", borderRadius: 8, border: "1px solid #332317", padding: 4 }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "#18130F", border: "1px dashed #332317", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      🏷️
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <Input
                      value={data.logoUrl || ""}
                      onChange={(v) => setData({ ...data, logoUrl: v })}
                      placeholder="https://... logo image URL"
                    />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                  <input
                    type="checkbox"
                    checked={data.showLogo ?? true}
                    onChange={(e) => setData({ ...data, showLogo: e.target.checked })}
                    style={{ accentColor: "#E8B66F" }}
                  />
                  Display Logo on Header and Footer
                </label>
              </div>

              <NextStepButton onClick={() => setActiveTab("story")} label="Next: Story & Hero Copy →" />
            </div>
          )}

          {/* TAB 2: STORY, HERO COPY & POSITIONING */}
          {activeTab === "story" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionHeader
                title="📖 Hero Section & Brand Storytelling"
                description="Craft your high-conversion value proposition, brand mission, and 3 key differentiators. (Use 'AI Auto-Fill' anytime!)"
              />

              <div>
                <Label text="Target Audience" />
                <Input
                  value={data.audience || ""}
                  onChange={(v) => setData({ ...data, audience: v })}
                  placeholder="e.g. Audiophiles, gamers, fitness enthusiasts, college youth"
                />
              </div>

              <div>
                <Label text="Hero Tagline / Badge" />
                <Input
                  value={data.heroBadge || ""}
                  onChange={(v) => setData({ ...data, heroBadge: v })}
                  placeholder="e.g. ⚡ India's No. 1 Audio Choice"
                />
              </div>

              <div>
                <Label text="Hero Main Headline *" />
                <Input
                  value={data.heroHeadline || ""}
                  onChange={(v) => setData({ ...data, heroHeadline: v })}
                  placeholder="e.g. Engineered For Pure Bass. Designed For Creators."
                />
              </div>

              <div>
                <Label text="Hero Supporting Description" />
                <textarea
                  value={data.heroDescription || ""}
                  onChange={(e) => setData({ ...data, heroDescription: e.target.value })}
                  placeholder="Tell customers what you offer and why they should buy today..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#18130F",
                    border: "1px solid #332317",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <Label text="Brand Story & Heritage Statement" />
                <textarea
                  value={data.brandStory || ""}
                  onChange={(e) => setData({ ...data, brandStory: e.target.value })}
                  placeholder="Authentic story of how your shop started and what standards you uphold..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#18130F",
                    border: "1px solid #332317",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Differentiators */}
              <div>
                <Label text="3 Key Brand Differentiators (Why choose you?)" />
                {(data.differentiators || []).map((diff, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#E8B66F", fontWeight: 700, width: 20 }}>#{idx + 1}</span>
                    <input
                      value={typeof diff === "string" ? diff : diff.title}
                      onChange={(e) => {
                        const updated = [...(data.differentiators || [])];
                        updated[idx] = typeof diff === "string" ? e.target.value : { ...diff, title: e.target.value };
                        setData({ ...data, differentiators: updated });
                      }}
                      placeholder={`Differentiator ${idx + 1}`}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#18130F",
                        border: "1px solid #332317",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <PrevStepButton onClick={() => setActiveTab("brand")} label="← Back to Brand" />
                <NextStepButton onClick={() => setActiveTab("products")} label="Next: Featured Products →" />
              </div>
            </div>
          )}

          {/* TAB 3: FEATURED PRODUCTS FROM CATALOGUE */}
          {activeTab === "products" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionHeader
                title="📦 Featured Products & Real Photography"
                description="Select genuine products from your catalogue or enter custom items with real image URLs, price tags, and offer badges."
              />

              {/* Quick Catalogue Picker from session.products */}
              {session?.products && session.products.length > 0 && (
                <div style={{ background: "rgba(232,182,111,0.06)", border: "1px solid rgba(232,182,111,0.2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#E8B66F", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>📁 Available in Your Catalogue ({session.products.length})</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Click &apos;+ Add&apos; to include</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
                    {session.products.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          minWidth: 140,
                          maxWidth: 160,
                          background: "#18130F",
                          border: "1px solid #332317",
                          borderRadius: 8,
                          padding: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: 4 }} />
                        ) : (
                          <div style={{ width: "100%", height: 60, background: "#110D0A", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            📦
                          </div>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                        <span style={{ fontSize: 10, color: "#E8B66F" }}>₹{p.price || "Contact"}</span>
                        <button
                          onClick={() => handleImportCatalogueProduct(p)}
                          style={{
                            marginTop: 4,
                            padding: "4px 8px",
                            background: "rgba(232,182,111,0.15)",
                            color: "#E8B66F",
                            border: "1px solid #E8B66F",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Add to Minisite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product List Editor */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Label text={`Active Featured Products (${(data.products || []).length})`} />
                  <button
                    onClick={() => {
                      const updated = [...(data.products || [])];
                      updated.push({ name: "", price: "", badge: "New", description: "", imageUrl: "", emoji: "📦" });
                      setData({ ...data, products: updated });
                    }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6,
                      color: "#E8B66F",
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Add Custom Product
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(data.products || []).map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#14100D",
                        border: "1px solid #2B1E14",
                        borderRadius: 10,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#E8B66F" }}>Product #{idx + 1}</span>
                        <button
                          onClick={() => {
                            const updated = [...(data.products || [])];
                            updated.splice(idx, 1);
                            setData({ ...data, products: updated });
                          }}
                          style={{ background: "transparent", border: "none", color: "#f43f5e", fontSize: 12, cursor: "pointer" }}
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                        <input
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...(data.products || [])];
                            updated[idx].name = e.target.value;
                            setData({ ...data, products: updated });
                          }}
                          placeholder="Product Name *"
                          style={{ padding: "8px 10px", background: "#18130F", border: "1px solid #332317", borderRadius: 6, color: "#fff", fontSize: 12 }}
                        />
                        <input
                          value={p.price || ""}
                          onChange={(e) => {
                            const updated = [...(data.products || [])];
                            updated[idx].price = e.target.value;
                            setData({ ...data, products: updated });
                          }}
                          placeholder="₹ Price"
                          style={{ padding: "8px 10px", background: "#18130F", border: "1px solid #332317", borderRadius: 6, color: "#fff", fontSize: 12 }}
                        />
                        <input
                          value={p.badge || ""}
                          onChange={(e) => {
                            const updated = [...(data.products || [])];
                            updated[idx].badge = e.target.value;
                            setData({ ...data, products: updated });
                          }}
                          placeholder="Offer Badge (e.g. 20% OFF)"
                          style={{ padding: "8px 10px", background: "#18130F", border: "1px solid #332317", borderRadius: 6, color: "#fff", fontSize: 12 }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input
                          value={p.imageUrl || ""}
                          onChange={(e) => {
                            const updated = [...(data.products || [])];
                            updated[idx].imageUrl = e.target.value;
                            setData({ ...data, products: updated });
                          }}
                          placeholder="Image URL (e.g. https://... or leave empty)"
                          style={{ padding: "8px 10px", background: "#18130F", border: "1px solid #332317", borderRadius: 6, color: "#fff", fontSize: 12 }}
                        />
                        <input
                          value={p.description || ""}
                          onChange={(e) => {
                            const updated = [...(data.products || [])];
                            updated[idx].description = e.target.value;
                            setData({ ...data, products: updated });
                          }}
                          placeholder="Short description / specs"
                          style={{ padding: "8px 10px", background: "#18130F", border: "1px solid #332317", borderRadius: 6, color: "#fff", fontSize: 12 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <PrevStepButton onClick={() => setActiveTab("story")} label="← Back to Story" />
                <NextStepButton onClick={() => setActiveTab("contact")} label="Next: Contact & Conversion →" />
              </div>
            </div>
          )}

          {/* TAB 4: CONTACT & CONVERSION CHANNELS */}
          {activeTab === "contact" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionHeader
                title="📞 Conversion Channels & Store Location"
                description="Connect your verified channels. WhatsApp is configured for 1-tap customer enquiry with pre-filled message."
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="WhatsApp Number * (Digits only)" />
                  <Input
                    value={data.whatsapp}
                    onChange={(v) => setData({ ...data, whatsapp: v })}
                    placeholder="e.g. 919876543210"
                  />
                </div>
                <div>
                  <Label text="Instagram Handle" />
                  <Input
                    value={data.instagram || ""}
                    onChange={(v) => setData({ ...data, instagram: v })}
                    placeholder="e.g. @boat.nirvana"
                  />
                </div>
              </div>

              <div>
                <Label text="Store Physical Address" />
                <Input
                  value={data.address || ""}
                  onChange={(v) => setData({ ...data, address: v })}
                  placeholder="e.g. Store 4B, Phoenix Palladium, Lower Parel, Mumbai 400013"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Business Operating Hours" />
                  <Input
                    value={data.hours || ""}
                    onChange={(v) => setData({ ...data, hours: v })}
                    placeholder="e.g. Mon–Sat: 10:00 AM – 9:00 PM"
                  />
                </div>
                <div>
                  <Label text="UPI ID (For instant QR payment modal)" />
                  <Input
                    value={data.upiId || ""}
                    onChange={(v) => setData({ ...data, upiId: v })}
                    placeholder="e.g. storename@upi"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Primary CTA Button Label" />
                  <Input
                    value={data.primaryCtaText || ""}
                    onChange={(v) => setData({ ...data, primaryCtaText: v })}
                    placeholder="e.g. Order on WhatsApp"
                  />
                </div>
                <div>
                  <Label text="Secondary CTA Button Label" />
                  <Input
                    value={data.secondaryCtaText || ""}
                    onChange={(v) => setData({ ...data, secondaryCtaText: v })}
                    placeholder="e.g. View Featured Catalogue"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <PrevStepButton onClick={() => setActiveTab("products")} label="← Back to Products" />
                <button
                  onClick={handlePublish}
                  disabled={publishing || !data.shopName || !data.whatsapp}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: (!data.shopName || !data.whatsapp || publishing) ? "rgba(232,182,111,0.25)" : "#E8B66F",
                    color: (!data.shopName || !data.whatsapp || publishing) ? "#888" : "#0B0907",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: (!data.shopName || !data.whatsapp || publishing) ? "not-allowed" : "pointer",
                  }}
                >
                  {publishing ? "Saving..." : "Save & Open Interactive Storefront →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW */}
        {showLivePreview && (
          <div style={{
            background: "#080605",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 73px)",
            position: "relative",
          }}>
            {/* Live Preview Floating Toolbar */}
            <div style={{
              padding: "10px 16px",
              background: "#0E0B09",
              borderBottom: "1px solid #241A12",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>LIVE INTERACTIVE PREVIEW</span>
              </div>
              <div style={{ display: "flex", gap: 6, background: "#18130F", padding: 3, borderRadius: 6 }}>
                <button
                  onClick={() => setPreviewViewport("desktop")}
                  style={{
                    padding: "4px 10px",
                    background: previewViewport === "desktop" ? "#E8B66F" : "transparent",
                    color: previewViewport === "desktop" ? "#000" : "rgba(255,255,255,0.6)",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🖥️ Desktop
                </button>
                <button
                  onClick={() => setPreviewViewport("mobile")}
                  style={{
                    padding: "4px 10px",
                    background: previewViewport === "mobile" ? "#E8B66F" : "transparent",
                    color: previewViewport === "mobile" ? "#000" : "rgba(255,255,255,0.6)",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📱 Mobile
                </button>
              </div>
            </div>

            {/* Embedded Renderer */}
            <div style={{ flex: 1, overflowY: "auto", padding: previewViewport === "mobile" ? "30px 16px" : 0 }}>
              <LandingPageRenderer data={data} previewMode={previewViewport} />
            </div>
          </div>
        )}
      </div>

      {/* SAVE SUCCESS MODAL */}
      {saveSuccessModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: 20,
        }}>
          <div style={{
            background: "#14100D",
            border: "1px solid #E8B66F",
            borderRadius: 16,
            padding: "32px 28px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(232,182,111,0.15)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#E8B66F", marginBottom: 8 }}>Brand Storefront Saved!</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 20, lineHeight: 1.5 }}>
              Your brand-specific landing page for <strong style={{ color: "#fff" }}>{data.shopName}</strong> has been assembled and saved to your GoVisual workspace.
            </p>

            <div style={{
              background: "#090706",
              padding: "12px",
              borderRadius: 8,
              fontFamily: "monospace",
              fontSize: 13,
              color: "#E8B66F",
              border: "1px solid #2B1E14",
              marginBottom: 20,
              wordBreak: "break-all",
            }}>
              {typeof window !== "undefined" ? `${window.location.origin}/minisite-preview/${publishedSlug || data.slug}` : `/minisite-preview/${publishedSlug || data.slug}`}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setSaveSuccessModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Keep Editing
              </button>
              <Link
                href={`/minisite-preview/${publishedSlug || data.slug}`}
                target="_blank"
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#E8B66F",
                  color: "#0B0907",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Open Storefront ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{description}</p>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
      {text}
    </label>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: "#18130F",
        border: "1px solid #332317",
        borderRadius: 8,
        color: "#fff",
        fontSize: 13,
        outline: "none",
      }}
    />
  );
}

function NextStepButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px",
        background: "rgba(232,182,111,0.15)",
        border: "1px solid #E8B66F",
        borderRadius: 8,
        color: "#E8B66F",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        marginTop: 8,
      }}
    >
      {label}
    </button>
  );
}

function PrevStepButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 18px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 8,
      }}
    >
      {label}
    </button>
  );
}
