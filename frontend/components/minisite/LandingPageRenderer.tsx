"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Zap,
  Award,
  ArrowRight,
  CheckCircle2,
  Globe,
  ChevronRight,
  X,
  Phone,
} from "lucide-react";

export interface MinisiteProduct {
  id?: string;
  name: string;
  price?: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  category?: string;
  emoji?: string;
}

export type MinisiteDifferentiator = string | { title: string; desc: string };

function InstagramIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export interface MinisiteData {
  shopName: string;
  slug?: string;
  tagline?: string;
  heroHeadline?: string;
  heroDescription?: string;
  heroBadge?: string;
  category?: string;
  whatsapp: string;
  instagram?: string;
  address?: string;
  hours?: string;
  upiId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  theme?: "bold_contrast" | "luxury_editorial" | "clean_minimal" | "warm_vibrant" | string;
  brandStory?: string;
  differentiators?: MinisiteDifferentiator[];
  audience?: string;
  objective?: string;
  logoUrl?: string;
  showLogo?: boolean;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  phone?: string;
  products?: MinisiteProduct[];
  featuredProductId?: string;
}

interface LandingPageRendererProps {
  data: MinisiteData;
  previewMode?: "desktop" | "mobile" | "responsive";
  onUpgradeClick?: () => void;
}

export function LandingPageRenderer({
  data,
  previewMode = "responsive",
  onUpgradeClick,
}: LandingPageRendererProps) {
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [selectedProductForEnquiry, setSelectedProductForEnquiry] = useState<MinisiteProduct | null>(null);

  const theme = data.theme || "bold_contrast";
  const primaryColor = data.primaryColor || "#E8B66F";
  const cleanPhone = (data.whatsapp || "").replace(/[^0-9]/g, "");
  const shopName = data.shopName || "Your Shop";

  // Filter products that have at least a name
  const validProducts = (data.products || []).filter((p) => p && p.name && p.name.trim());
  const featuredProduct = validProducts[0] || null;

  // Theme-specific styling tokens
  const themeStyles = {
    bold_contrast: {
      bg: "bg-[#09090b]",
      heroBg: "bg-gradient-to-b from-[#121217] via-[#09090b] to-[#09090b]",
      cardBg: "bg-[#18181b]/70 border border-[#27272a] hover:border-[#38bdf8]/50",
      accentText: "text-[#38bdf8]",
      accentGlow: "shadow-[0_0_30px_rgba(56,189,248,0.15)]",
      badgeClass: "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30",
      fontHeading: "font-sans tracking-tight font-black",
      btnPrimary: "bg-[#38bdf8] text-[#09090b] hover:bg-[#7dd3fc] font-bold shadow-lg shadow-[#38bdf8]/20",
    },
    luxury_editorial: {
      bg: "bg-[#0c0a09]",
      heroBg: "bg-gradient-to-b from-[#17120e] via-[#0c0a09] to-[#0c0a09]",
      cardBg: "bg-[#14100d]/80 border border-[#3B2B1E] hover:border-[#E8B66F]/60",
      accentText: "text-[#E8B66F]",
      accentGlow: "shadow-[0_0_30px_rgba(232,182,111,0.18)]",
      badgeClass: "bg-[#E8B66F]/10 text-[#E8B66F] border-[#E8B66F]/30",
      fontHeading: "font-serif tracking-normal font-semibold",
      btnPrimary: "bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] hover:opacity-95 font-bold shadow-lg shadow-[#E8B66F]/20",
    },
    clean_minimal: {
      bg: "bg-[#0b0f17]",
      heroBg: "bg-gradient-to-b from-[#111827] via-[#0b0f17] to-[#0b0f17]",
      cardBg: "bg-[#161e2e]/60 border border-[#1f293d] hover:border-[#E8B66F]/40",
      accentText: "text-[#E8B66F]",
      accentGlow: "shadow-[0_0_20px_rgba(232,182,111,0.12)]",
      badgeClass: "bg-[#E8B66F]/10 text-[#E8B66F] border-[#E8B66F]/30",
      fontHeading: "font-sans tracking-tight font-bold",
      btnPrimary: "bg-[#E8B66F] text-[#0b0f17] hover:bg-[#f3c88a] font-bold shadow-md shadow-[#E8B66F]/15",
    },
    warm_vibrant: {
      bg: "bg-[#140d0a]",
      heroBg: "bg-gradient-to-b from-[#24130c] via-[#140d0a] to-[#140d0a]",
      cardBg: "bg-[#21140e]/70 border border-[#3d2318] hover:border-[#f97316]/50",
      accentText: "text-[#f97316]",
      accentGlow: "shadow-[0_0_30px_rgba(249,115,22,0.18)]",
      badgeClass: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30",
      fontHeading: "font-sans tracking-tight font-extrabold",
      btnPrimary: "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white hover:opacity-95 font-bold shadow-lg shadow-[#f97316]/20",
    },
  }[theme as "bold_contrast" | "luxury_editorial" | "clean_minimal" | "warm_vibrant"] || {
    bg: "bg-[#09090b]",
    heroBg: "bg-gradient-to-b from-[#121217] via-[#09090b] to-[#09090b]",
    cardBg: "bg-[#18181b]/70 border border-[#27272a]",
    accentText: "text-[#E8B66F]",
    accentGlow: "shadow-none",
    badgeClass: "bg-white/10 text-white border-white/20",
    fontHeading: "font-sans font-bold",
    btnPrimary: "bg-[#E8B66F] text-black font-bold",
  };

  const heroHeadline =
    data.heroHeadline ||
    data.tagline ||
    `${shopName} — Quality ${data.category || "Collection"}`;

  const heroSubtitle =
    data.heroDescription ||
    data.tagline ||
    `Welcome to the official digital storefront for ${shopName}. Handpicked products, trusted local service, and direct WhatsApp ordering.`;

  const heroBadge = data.heroBadge || (data.category ? `⭐ ${data.category.toUpperCase()}` : "⚡ OFFICIAL STORE");

  const primaryCta = data.primaryCtaText || "Order on WhatsApp";
  const secondaryCta = data.secondaryCtaText || "Explore Products";

  const defaultDifferentiators = [
    {
      title: "100% Genuine Quality",
      desc: "Every item is personally inspected for authenticity and craftsmanship.",
    },
    {
      title: "Direct WhatsApp Ordering",
      desc: "Instant assistance, customized recommendations, and live updates.",
    },
    {
      title: "Fast Store Dispatch",
      desc: "Prompt order handling and safe packaging direct to your location.",
    },
  ];

  const differentiators: { title: string; desc: string }[] =
    data.differentiators && data.differentiators.length > 0
      ? data.differentiators.map((d) => {
          if (typeof d === "string") {
            return {
              title: d,
              desc: `Guaranteed authentic offering from ${shopName}.`,
            };
          }
          return d;
        })
      : defaultDifferentiators;

  const content = (
    <div className={`min-h-screen ${themeStyles.bg} text-[#F7F3ED] font-sans antialiased selection:bg-[#E8B66F]/20 selection:text-[#E8B66F]`}>
      {/* ─────────────────────────────────────────────────────────────────
          SECTION A: NAVIGATION
      ───────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/60 border-b border-white/5 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand Wordmark */}
          <div className="flex items-center gap-3">
            {data.logoUrl && data.showLogo !== false ? (
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-white/10 shadow-md">
                <img
                  src={data.logoUrl}
                  alt={shopName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-black shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                {shopName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight line-clamp-1">
                {shopName}
              </span>
              {data.category && (
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-medium">
                  {data.category}
                </span>
              )}
            </div>
          </div>

          {/* Quick Anchor Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            {validProducts.length > 0 && (
              <a href="#products" className="hover:text-white transition-colors">
                Featured Products
              </a>
            )}
            <a href="#about" className="hover:text-white transition-colors">
              Our Story
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact & Store
            </a>
          </nav>

          {/* Nav Action CTA */}
          <div className="flex items-center gap-2">
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${shopName}, I'm browsing your online store and would like to enquire.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#25D366] hover:bg-[#22bf5b] text-white flex items-center gap-2 transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
              >
                <MessageCircle size={15} />
                <span className="hidden sm:inline">{primaryCta}</span>
                <span className="sm:hidden">Chat</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION B: HERO SECTION (boAt visual hierarchy inspiration)
      ───────────────────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden pt-10 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 ${themeStyles.heroBg} border-b border-white/5`}>
        {/* Subtle background ambient glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-25"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          {/* Hero Copy */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider backdrop-blur-md"
              style={{
                borderColor: `${primaryColor}40`,
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              <Sparkles size={13} />
              <span>{heroBadge}</span>
            </div>

            <h1 className={`text-3xl sm:text-5xl lg:text-6xl text-white leading-[1.12] ${themeStyles.fontHeading}`}>
              {heroHeadline}
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base sm:leading-relaxed max-w-xl mx-auto lg:mx-0">
              {heroSubtitle}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${shopName}, I'm interested in your featured offerings. Could you assist me?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${themeStyles.btnPrimary}`}
                  style={{
                    backgroundColor: theme === "bold_contrast" ? undefined : primaryColor,
                    color: theme === "bold_contrast" ? "#09090b" : "#0B0907",
                  }}
                >
                  <MessageCircle size={18} />
                  <span>{primaryCta}</span>
                  <ArrowRight size={16} />
                </a>
              )}

              {validProducts.length > 0 && (
                <a
                  href="#products"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShoppingBag size={16} />
                  <span>{secondaryCta}</span>
                </a>
              )}
            </div>

            {/* Micro Trust Points */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Verified Direct Seller</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Transparent Pricing</span>
              </span>
              {data.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#E8B66F]" />
                  <span>{data.address.split(",")[0]}</span>
                </span>
              )}
            </div>
          </div>

          {/* Hero Visual / Featured Showcase Card */}
          <div className="lg:col-span-5 flex justify-center">
            {featuredProduct ? (
              <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-5 shadow-2xl relative group overflow-hidden">
                {/* Floating Highlight Pill */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-white border border-white/15 backdrop-blur-md">
                    {featuredProduct.badge || "Featured Pick"}
                  </span>
                </div>

                {/* Product Image Frame */}
                <div className="w-full aspect-square rounded-xl bg-black/40 overflow-hidden flex items-center justify-center relative mb-4 border border-white/5">
                  {featuredProduct.imageUrl ? (
                    <img
                      src={featuredProduct.imageUrl}
                      alt={featuredProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                      <ShoppingBag size={48} className="mb-2 text-zinc-600" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {featuredProduct.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Metadata */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold text-white text-base leading-snug line-clamp-1">
                      {featuredProduct.name}
                    </h3>
                    {featuredProduct.price && (
                      <span
                        className="font-extrabold text-base whitespace-nowrap"
                        style={{ color: primaryColor }}
                      >
                        ₹{featuredProduct.price}
                      </span>
                    )}
                  </div>
                  {featuredProduct.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {featuredProduct.description}
                    </p>
                  )}
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${shopName}, I'd like to order "${featuredProduct.name}"${featuredProduct.price ? ` priced at ₹${featuredProduct.price}` : ""}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 mt-2 rounded-lg bg-white/10 hover:bg-[#25D366] text-white hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle size={14} />
                      <span>Order on WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              // Default Store Visual if no products
              <div className="w-full max-w-sm rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 text-center space-y-4 shadow-2xl">
                <div
                  className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black text-black shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {shopName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{shopName}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{data.tagline || "Official Store"}</p>
                </div>
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle size={16} />
                    <span>Connect on WhatsApp</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION C: BRAND STORY & DIFFERENTIATORS
      ───────────────────────────────────────────────────────────────── */}
      <section id="about" className="py-14 sm:py-20 px-4 sm:px-6 border-b border-white/5 bg-black/40">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span
              className="text-xs font-bold uppercase tracking-widest block"
              style={{ color: primaryColor }}
            >
              Why Choose {shopName}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Designed Around Quality and Trust
            </h2>
            {data.brandStory && (
              <p className="text-sm text-zinc-400 leading-relaxed pt-1">
                {data.brandStory}
              </p>
            )}
          </div>

          {/* Differentiator 3-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {differentiators.map((diff, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl ${themeStyles.cardBg} transition-all duration-300 space-y-3`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: `${primaryColor}18`,
                    color: primaryColor,
                    border: `1px solid ${primaryColor}40`,
                  }}
                >
                  {idx === 0 && <ShieldCheck size={20} />}
                  {idx === 1 && <Zap size={20} />}
                  {idx === 2 && <Award size={20} />}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {diff.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {diff.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION D: FEATURED PRODUCTS / SERVICES
      ───────────────────────────────────────────────────────────────── */}
      {validProducts.length > 0 && (
        <section id="products" className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Products Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <span
                  className="text-xs font-bold uppercase tracking-widest block"
                  style={{ color: primaryColor }}
                >
                  Featured Collection
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Explore Handpicked Offerings
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Tap any item to enquire or order directly on WhatsApp.
                </p>
              </div>

              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${shopName}, I'd like to see your full product catalogue.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  style={{ color: primaryColor }}
                >
                  <span>Request Full Catalog</span>
                  <ChevronRight size={14} />
                </a>
              )}
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {validProducts.map((prod, idx) => (
                <div
                  key={prod.id || idx}
                  className={`rounded-2xl ${themeStyles.cardBg} p-4 sm:p-5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1`}
                >
                  <div>
                    {/* Real Product Image Frame */}
                    <div className="w-full aspect-[4/3] rounded-xl bg-black/50 overflow-hidden flex items-center justify-center relative mb-4 border border-white/5">
                      {prod.badge && (
                        <span
                          className="absolute top-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-white border border-white/20"
                        >
                          {prod.badge}
                        </span>
                      )}

                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-4">
                          <ShoppingBag size={40} className="mb-2 text-zinc-700" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            {prod.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 mb-4">
                      {prod.category && (
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                          {prod.category}
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white text-base leading-snug line-clamp-1 group-hover:text-white transition-colors">
                          {prod.name}
                        </h3>
                        {prod.price && (
                          <span
                            className="font-extrabold text-base whitespace-nowrap"
                            style={{ color: primaryColor }}
                          >
                            ₹{prod.price}
                          </span>
                        )}
                      </div>
                      {prod.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CTA / Order Action */}
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${shopName}, I'm interested in ordering "${prod.name}"${prod.price ? ` (₹${prod.price})` : ""}. Please share availability.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#25D366] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle size={15} />
                      <span>Order on WhatsApp</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          SECTION E: CONVERSION & STORE VISIT CHANNELS
      ───────────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-16 sm:py-20 px-4 sm:px-6 border-b border-white/5 bg-black/50">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 p-6 sm:p-12 shadow-2xl space-y-10">
            {/* Header */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span
                className="text-xs font-bold uppercase tracking-widest block"
                style={{ color: primaryColor }}
              >
                Connect & Visit
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Get in Touch with {shopName}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Reach us directly for instant orders, location directions, and quick inquiries.
              </p>
            </div>

            {/* Contact Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* WhatsApp Card */}
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${shopName}, I'd like to get in touch.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 hover:border-[#25D366] transition-all flex flex-col justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center">
                      <MessageCircle size={20} />
                    </div>
                    <ExternalLink size={14} className="text-[#25D366]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">WhatsApp</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Instant messaging & orders</p>
                  </div>
                  <span className="text-xs font-bold text-[#25D366] flex items-center gap-1">
                    <span>Chat Now</span>
                    <ArrowRight size={13} />
                  </span>
                </a>
              )}

              {/* Instagram Card */}
              {data.instagram && (
                <a
                  href={`https://instagram.com/${data.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#e1306c]/10 to-[#833ab4]/10 border border-[#e1306c]/30 hover:border-[#e1306c] transition-all flex flex-col justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e1306c] to-[#833ab4] text-white flex items-center justify-center">
                      <InstagramIcon size={20} />
                    </div>
                    <ExternalLink size={14} className="text-[#e1306c]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Instagram</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Follow latest updates</p>
                  </div>
                  <span className="text-xs font-bold text-[#e1306c] flex items-center gap-1">
                    <span>@{data.instagram.replace("@", "")}</span>
                    <ArrowRight size={13} />
                  </span>
                </a>
              )}

              {/* Location / Directions Card */}
              {data.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shopName} ${data.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-[#4285f4]/10 border border-[#4285f4]/30 hover:border-[#4285f4] transition-all flex flex-col justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#4285f4] text-white flex items-center justify-center">
                      <MapPin size={20} />
                    </div>
                    <ExternalLink size={14} className="text-[#4285f4]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Store Location</h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{data.address}</p>
                  </div>
                  <span className="text-xs font-bold text-[#4285f4] flex items-center gap-1">
                    <span>Get Directions</span>
                    <ArrowRight size={13} />
                  </span>
                </a>
              )}

              {/* UPI Payments Card */}
              {data.upiId ? (
                <button
                  type="button"
                  onClick={() => setShowUpiModal(true)}
                  className="p-5 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 hover:border-[#8b5cf6] transition-all flex flex-col justify-between gap-4 group text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#8b5cf6] text-white flex items-center justify-center">
                      <QrCode size={20} />
                    </div>
                    <ExternalLink size={14} className="text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Instant UPI Pay</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Scan & pay with any UPI app</p>
                  </div>
                  <span className="text-xs font-bold text-[#8b5cf6] flex items-center gap-1">
                    <span>View QR Code</span>
                    <ArrowRight size={13} />
                  </span>
                </button>
              ) : (
                /* Business Hours Fallback */
                data.hours && (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-zinc-300 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Opening Hours</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{data.hours}</p>
                    </div>
                    <span className="text-xs text-zinc-500 font-semibold">Store Schedule</span>
                  </div>
                )
              )}
            </div>

            {/* Store Hours & Additional Details */}
            {(data.address || data.hours) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
                {data.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-zinc-500 shrink-0" />
                    <span>{data.address}</span>
                  </div>
                )}
                {data.hours && (
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-zinc-500 shrink-0" />
                    <span>{data.hours}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION F: "GET A COMPLETE WEBSITE" PROMO CTA (Honest & Transparent)
      ───────────────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 bg-gradient-to-r from-zinc-950 via-[#14100D] to-zinc-950 border-b border-white/5">
        <div className="max-w-4xl mx-auto rounded-2xl bg-zinc-900/60 border border-[#E8B66F]/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E8B66F]/10 text-[#E8B66F] border border-[#E8B66F]/30">
              <Globe size={11} />
              <span>GoVisual Enterprise Suite</span>
            </div>
            <h3 className="font-extrabold text-white text-lg sm:text-xl">
              Want a Complete Multi-Page Custom Website?
            </h3>
            <p className="text-xs text-zinc-400 max-w-xl">
              Upgrade to a fully managed custom domain (e.g. yourshop.com), automated catalog inventory, online cart checkout, and Google SEO indexing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onUpgradeClick) onUpgradeClick();
              else setShowWebsiteModal(true);
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold text-xs sm:text-sm hover:opacity-95 transition-all whitespace-nowrap cursor-pointer shadow-lg shadow-[#E8B66F]/15"
          >
            Enquire for Custom Domain
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION G: FOOTER
      ───────────────────────────────────────────────────────────────── */}
      <footer className="py-12 px-4 sm:px-6 bg-black text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {data.logoUrl && data.showLogo !== false ? (
              <img
                src={data.logoUrl}
                alt={shopName}
                className="w-7 h-7 object-contain rounded-md bg-white/10 p-0.5"
              />
            ) : (
              <span className="font-black text-sm text-white">{shopName}</span>
            )}
            <span className="text-zinc-400">© {new Date().getFullYear()} {shopName}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-zinc-400">
            {data.instagram && (
              <a
                href={`https://instagram.com/${data.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
            )}
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp
              </a>
            )}
            <span>
              Powered by <strong className="text-zinc-300 font-semibold">GoVisual AI</strong>
            </span>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 1: UPI PAYMENT QR MODAL
      ───────────────────────────────────────────────────────────────── */}
      {showUpiModal && data.upiId && (
        <div
          onClick={() => setShowUpiModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#14100D] border border-[#3B2B1E] p-6 text-center space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Pay via UPI</span>
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(shopName)}&cu=INR`)}`}
                alt="UPI QR Code"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-300">UPI ID: {data.upiId}</p>
              <p className="text-[11px] text-zinc-500">Scan using Google Pay, PhonePe, Paytm, or BHIM</p>
            </div>

            <a
              href={`upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(shopName)}&cu=INR`}
              className="w-full py-2.5 rounded-xl bg-[#8b5cf6] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open in UPI App</span>
            </a>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 2: "GET A COMPLETE WEBSITE" ENQUIRY MODAL (Transparent)
      ───────────────────────────────────────────────────────────────── */}
      {showWebsiteModal && (
        <div
          onClick={() => setShowWebsiteModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#14100D] border border-[#E8B66F]/40 p-6 sm:p-7 space-y-5 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-[#E8B66F]" />
                <h3 className="font-bold text-white text-base">Custom Website Upgrade</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWebsiteModal(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
              <p>
                Your current MiniSite is an instant one-page storefront preview. If you need a fully custom multi-page e-commerce website with:
              </p>
              <ul className="space-y-1.5 pl-4 list-disc text-zinc-400">
                <li>Your own branded custom domain (e.g. <strong className="text-white">{shopName.toLowerCase().replace(/\s+/g, "")}.com</strong>)</li>
                <li>Direct online payment gateway (Razorpay / Stripe)</li>
                <li>Comprehensive product catalog with search and filters</li>
                <li>Google Search Console SEO indexing & analytics</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-[#21170F] border border-[#3B2B1E] text-xs text-[#E8B66F] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles size={14} /> GoVisual AI Web Team Assistance
              </p>
              <p className="text-[11px] text-zinc-400">
                Our design and engineering team sets up custom websites tailored to your exact catalog and branding requirements.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWebsiteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
              <a
                href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi GoVisual AI team, I am interested in upgrading ${shopName} to a complete multi-page custom website with a custom domain.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold text-xs flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                <span>Enquire with Web Team</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // If previewMode is mobile, wrap in a simulated smartphone container
  if (previewMode === "mobile") {
    return (
      <div className="flex justify-center p-4 sm:p-8 bg-zinc-950/80">
        <div className="w-[390px] h-[820px] rounded-[48px] border-[10px] border-[#27272a] bg-black shadow-2xl overflow-hidden flex flex-col relative">
          {/* Simulated phone notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-[#27272a] rounded-b-2xl z-50 flex items-center justify-center">
            <div className="w-12 h-1 bg-zinc-700 rounded-full" />
          </div>
          {/* Scrollable content inside phone */}
          <div className="flex-1 overflow-y-auto pt-6 scrollbar-thin">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}

export default LandingPageRenderer;
