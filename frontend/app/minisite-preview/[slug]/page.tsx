"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Product {
  name: string;
  price: string;
  emoji: string;
}

interface MinisiteData {
  shopName: string;
  tagline: string;
  category: string;
  whatsapp: string;
  instagram?: string;
  address?: string;
  hours?: string;
  upiId?: string;
  primaryColor: string;
  products: Product[];
}

export default function MinisitePreviewPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<MinisiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    fetch(`${apiBase}/s/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Shop website not found");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: "bounce 1.5s infinite" }}>🌐</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", color: "#39ff14" }}>Loading Digital Shop...</div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#060a06", color: "#e8e8f0", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#f0a500" }}>Website Not Found</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, maxWidth: 400, marginBottom: 24 }}>We couldn't load this website. Make sure the link is correct or build a new one in the builder.</p>
        <Link href="/minisite" style={{ padding: "12px 24px", background: "#f0a500", color: "#000", border: "none", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          Go to Website Builder
        </Link>
      </div>
    );
  }

  // Derive styles from selected brand color
  const accentColor = data.primaryColor || "#39ff14";

  return (
    <div style={{ minHeight: "100vh", background: "#050705", color: "#e8e8f0", fontFamily: "system-ui, -apple-system, sans-serif", padding: "40px 16px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", background: "#0e130e", borderRadius: 24, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 50px ${accentColor}10` }}>
        
        {/* Header Cover Banner */}
        <div style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}08)`, borderBottom: `4px solid ${accentColor}`, padding: "40px 24px", textAlign: "center", position: "relative" }}>
          {/* Shop Icon */}
          <div style={{ 
            width: 72, 
            height: 72, 
            borderRadius: "50%", 
            background: accentColor, 
            color: "#000",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: 32, 
            margin: "0 auto 16px",
            boxShadow: `0 0 20px ${accentColor}44`,
            fontWeight: 800
          }}>
            🏪
          </div>
          <h1 style={{ fontWeight: 850, fontSize: 24, color: "#ffffff", marginBottom: 6, letterSpacing: "-0.02em" }}>{data.shopName}</h1>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{data.tagline || "Welcome to our shop!"}</div>
          
          <div style={{ fontSize: 11, background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: 12, color: "rgba(255,255,255,0.5)", display: "inline-block", marginTop: 12 }}>
            🏷️ {data.category}
          </div>
        </div>

        {/* Content body */}
        <div style={{ padding: "24px" }}>
          
          {/* Details */}
          {(data.address || data.hours) && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", marginBottom: 20 }}>
              {data.address && (
                <div style={{ display: "flex", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: data.hours ? 12 : 0 }}>
                  <span style={{ fontSize: 15 }}>📍</span>
                  <span>{data.address}</span>
                </div>
              )}
              {data.hours && (
                <div style={{ display: "flex", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  <span style={{ fontSize: 15 }}>🕙</span>
                  <span>{data.hours}</span>
                </div>
              )}
            </div>
          )}

          {/* Products */}
          {data.products && data.products.some(p => p.name) && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                📦 Featured Products
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.products.filter(p => p.name).map((p, i) => (
                  <div key={i} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "12px 16px", 
                    background: "rgba(255,255,255,0.02)", 
                    border: "1px solid rgba(255,255,255,0.04)", 
                    borderRadius: 12,
                    transition: "all 0.2s"
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                      <span style={{ marginRight: 8, fontSize: 16 }}>{p.emoji}</span>
                      {p.name}
                    </span>
                    {p.price && (
                      <span style={{ fontWeight: 700, color: accentColor, fontSize: 14 }}>
                        ₹{p.price}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.whatsapp && (
              <a 
                href={`https://wa.me/${data.whatsapp.replace(/[^0-9]/g, "")}?text=Hi%20there,%20I'm%20interested%20in%20your%20products!`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  padding: "14px", 
                  background: "#25D366", 
                  borderRadius: 12, 
                  color: "#fff", 
                  fontWeight: 700, 
                  fontSize: 14, 
                  textAlign: "center", 
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(37,211,102,0.2)"
                }}
              >
                <span>💬</span> Chat on WhatsApp
              </a>
            )}

            {data.instagram && (
              <a 
                href={`https://instagram.com/${data.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  padding: "14px", 
                  background: "linear-gradient(135deg, #e1306c, #833ab4)", 
                  borderRadius: 12, 
                  color: "#fff", 
                  fontWeight: 700, 
                  fontSize: 14, 
                  textAlign: "center", 
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(225,48,108,0.2)"
                }}
              >
                <span>📸</span> Follow on Instagram
              </a>
            )}

            {data.address && (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.shopName + " " + data.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  padding: "14px", 
                  background: "#4285f4", 
                  borderRadius: 12, 
                  color: "#fff", 
                  fontWeight: 700, 
                  fontSize: 14, 
                  textAlign: "center", 
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(66,133,244,0.2)"
                }}
              >
                <span>📍</span> Get Directions
              </a>
            )}

            {data.upiId && (
              <a 
                href={`upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.shopName)}&cu=INR`}
                style={{ 
                  padding: "14px", 
                  background: "#6739b7", 
                  borderRadius: 12, 
                  color: "#fff", 
                  fontWeight: 700, 
                  fontSize: 14, 
                  textAlign: "center", 
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(103,57,183,0.2)"
                }}
              >
                <span>💳</span> Pay via UPI
              </a>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "16px", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          Made with <span style={{ color: "#39ff14", fontWeight: 700 }}>GoVisual AI</span> website builder
        </div>
      </div>
    </div>
  );
}
