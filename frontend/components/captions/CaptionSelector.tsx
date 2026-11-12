"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Sparkles, MessageSquare, Tag, RefreshCw } from "lucide-react";

export interface CaptionAlternative {
  id: string;
  label: string;
  badge: string;
  tone: string;
  caption: string;
  description: string;
}

interface CaptionSelectorProps {
  productName: string;
  brandName?: string;
  category?: string;
  shotLabel?: string;
  tone?: string;
  offer?: string;
  visualDescription?: string;
  background?: string;
  lighting?: string;
  initialCaption?: string;
  onCaptionChange?: (caption: string) => void;
  compact?: boolean;
}

export default function CaptionSelector({
  productName,
  brandName = "Our Shop",
  category = "",
  shotLabel = "Showcase",
  tone = "Premium",
  offer = "",
  visualDescription = "",
  background = "",
  lighting = "",
  initialCaption = "",
  onCaptionChange,
  compact = false,
}: CaptionSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>("punchy");
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [alternatives, setAlternatives] = useState<CaptionAlternative[]>([]);
  const [hashtags, setHashtags] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedTags, setCopiedTags] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Generate fallback alternatives locally
  const generateFallback = (prod: string, brand: string) => {
    const p = prod || "Product";
    const b = brand || "Our Shop";
    const punchy = `Pure craft. Timeless grace. Discover ${p} by ${b}. ✨`;
    const story = `Behind every fold of ${p} lies an obsession with authentic detail. Handcrafted by ${b} to bring lasting elegance to your moments. ✨🌿`;
    const off = offer && offer.trim() && offer.toLowerCase() !== "none"
      ? `Exclusive limited drop! ${p} by ${b} is now available with ${offer}. Tap link in bio to shop now! 🛍️`
      : `Ready to elevate your style with ${p}? Handcrafted by ${b} with premium quality and fast dispatch. Tap link in bio to order! 🚀`;

    const cleanB = b.replace(/[^a-zA-Z0-9]/g, "") || "GoVisual";
    const cleanP = p.replace(/[^a-zA-Z0-9]/g, "") || "Product";
    const tags = `#${cleanB} #${cleanP} #ShopLocal #NewArrivals #Handcrafted #IndianBrand`;

    return {
      alternatives: [
        {
          id: "punchy",
          label: "Short & Punchy",
          badge: "High Reach",
          tone: "Impactful",
          caption: punchy,
          description: "Concise hook ideal for quick feed scanning.",
        },
        {
          id: "story",
          label: "Storytelling & Craft",
          badge: "Brand Connection",
          tone: "Warm & Authentic",
          caption: story,
          description: "Evocative narrative highlighting craftsmanship and heritage.",
        },
        {
          id: "offer",
          label: "Promotional & Offer",
          badge: "Conversion Focus",
          tone: "Action-Oriented",
          caption: off,
          description: "Direct call-to-action tailored to drive inquiries and orders.",
        },
      ],
      hashtags: tags,
    };
  };

  const fetchAlternatives = async () => {
    setLoading(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${BASE}/api/captions/alternatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productName,
          brandName,
          category,
          shotLabel,
          tone,
          offer,
          visualDescription,
          background,
          lighting,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.alternatives)) {
          setAlternatives(data.alternatives);
          setHashtags(data.hashtags || "");
          const initialMap: Record<string, string> = {};
          data.alternatives.forEach((alt: CaptionAlternative) => {
            initialMap[alt.id] = alt.caption;
          });
          if (initialCaption) {
            initialMap[selectedId] = initialCaption;
          }
          setEditedCaptions(initialMap);
          if (onCaptionChange) {
            onCaptionChange(initialMap[selectedId] || data.alternatives[0]?.caption || "");
          }
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Fall through to deterministic local fallback
    }

    const fallback = generateFallback(productName, brandName);
    setAlternatives(fallback.alternatives);
    setHashtags(fallback.hashtags);
    const initialMap: Record<string, string> = {};
    fallback.alternatives.forEach((alt) => {
      initialMap[alt.id] = alt.caption;
    });
    if (initialCaption) {
      initialMap[selectedId] = initialCaption;
    }
    setEditedCaptions(initialMap);
    if (onCaptionChange) {
      onCaptionChange(initialMap[selectedId] || fallback.alternatives[0].caption);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlternatives();
  }, [productName, brandName, shotLabel]);

  const currentText = editedCaptions[selectedId] ?? "";

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditedCaptions((prev) => ({ ...prev, [selectedId]: val }));
    if (onCaptionChange) {
      onCaptionChange(val);
    }
  };

  const handleSelectAlternative = (id: string) => {
    setSelectedId(id);
    const text = editedCaptions[id] ?? alternatives.find((a) => a.id === id)?.caption ?? "";
    if (onCaptionChange) {
      onCaptionChange(text);
    }
  };

  const copyToClipboard = async (text: string, isTag = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isTag) {
        setCopiedTags(true);
        setTimeout(() => setCopiedTags(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div
      style={{
        background: "#14100D",
        border: "1px solid #3B2B1E",
        borderRadius: 14,
        padding: compact ? "16px" : "20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "#E8B66F" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F7F3ED", letterSpacing: "0.02em" }}>
            Image-Aware Captions & Copy
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 6,
              background: "rgba(232, 182, 111, 0.12)",
              color: "#E8B66F",
              fontWeight: 600,
            }}
          >
            3 Styles
          </span>
        </div>

        <button
          onClick={fetchAlternatives}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            color: "#B9AA99",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
          }}
          title="Regenerate copy options"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Regenerate</span>
        </button>
      </div>

      {/* Alternative Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {alternatives.map((alt) => {
          const isSelected = selectedId === alt.id;
          return (
            <button
              key={alt.id}
              onClick={() => handleSelectAlternative(alt.id)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: isSelected ? "1px solid #E8B66F" : "1px solid #2B1E14",
                background: isSelected ? "rgba(232, 182, 111, 0.12)" : "#21170F",
                color: isSelected ? "#E8B66F" : "#B9AA99",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {alt.label}
              </span>
              <span style={{ fontSize: 9, color: isSelected ? "rgba(232, 182, 111, 0.8)" : "#6F5E4E" }}>
                {alt.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Editable Caption Textarea */}
      <div style={{ position: "relative" }}>
        <textarea
          value={currentText}
          onChange={handleTextChange}
          rows={compact ? 3 : 4}
          placeholder="Crafting caption..."
          style={{
            width: "100%",
            background: "#0B0907",
            border: "1px solid #3B2B1E",
            borderRadius: 10,
            padding: "12px 14px",
            color: "#F7F3ED",
            fontSize: 13,
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
            fontSize: 10,
            color: "#6F5E4E",
          }}
        >
          <span>✏️ Click text to edit freely before copying</span>
          <span>{currentText.length} characters • {currentText.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>

      {/* Action Buttons: Copy Caption & Copy Hashtags */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => copyToClipboard(currentText)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 14px",
            borderRadius: 8,
            background: copied ? "rgba(34, 197, 94, 0.15)" : "#E8B66F",
            color: copied ? "#22c55e" : "#0B0907",
            border: copied ? "1px solid #22c55e" : "none",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied to Clipboard!" : "Copy Caption"}</span>
        </button>

        {hashtags && (
          <button
            onClick={() => copyToClipboard(hashtags, true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "9px 12px",
              borderRadius: 8,
              background: copiedTags ? "rgba(34, 197, 94, 0.15)" : "#21170F",
              color: copiedTags ? "#22c55e" : "#B9AA99",
              border: copiedTags ? "1px solid #22c55e" : "1px solid #3B2B1E",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Copy hashtag cluster"
          >
            {copiedTags ? <Check size={13} /> : <Tag size={13} />}
            <span>{copiedTags ? "Tags Copied!" : "Copy #Tags"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
