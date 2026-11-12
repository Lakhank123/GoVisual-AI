"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoSession } from "@/components/providers/demo-session-provider";

import { useOnboardingStore } from "@/lib/store";

export default function WorkspacePage() {
  const router = useRouter();
  const { session, updateWorkspace } = useDemoSession();
  const { updateSearch } = useOnboardingStore();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session.workspace?.businessName) {
      router.push("/dashboard");
    }
  }, [session.workspace, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !category.trim() || !city.trim()) {
      setError("Please fill in all fields to continue.");
      return;
    }
    updateWorkspace({ businessName, category, city });
    updateSearch(businessName, city, null);
    router.push("/onboard"); // Moves to Brand Profile
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "400px", width: "100%", background: "#21170F", padding: "40px 32px", borderRadius: "20px", border: "1px solid #3B2B1E" }}>
        
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#F7F3ED", marginBottom: "8px", textAlign: "center" }}>
          Create Workspace
        </h1>
        <p style={{ color: "#B9AA99", fontSize: "14px", textAlign: "center", marginBottom: "32px" }}>
          Tell us about your business to set up your AI marketing space.
        </p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "12px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#F7F3ED", marginBottom: "8px" }}>
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Sharma Sweets"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "10px",
                background: "#14100D", border: "1px solid #3B2B1E",
                color: "#F7F3ED", fontSize: "14px", outline: "none", boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#F7F3ED", marginBottom: "8px" }}>
              Business Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Bakery, Clothing, Electronics"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "10px",
                background: "#14100D", border: "1px solid #3B2B1E",
                color: "#F7F3ED", fontSize: "14px", outline: "none", boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#F7F3ED", marginBottom: "8px" }}>
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai, Delhi"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "10px",
                background: "#14100D", border: "1px solid #3B2B1E",
                color: "#F7F3ED", fontSize: "14px", outline: "none", boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%", padding: "14px", borderRadius: "10px",
              background: "#E8B66F", color: "#0B0907", fontWeight: 700,
              fontSize: "15px", border: "none", cursor: "pointer",
              marginTop: "12px"
            }}
          >
            Create Workspace
          </button>
        </form>
      </div>
    </div>
  );
}
