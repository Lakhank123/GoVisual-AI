"use client";
import { useState } from "react";

export default function PromptInspector() {
  const [creativeRequest, setCreativeRequest] = useState(JSON.stringify({
    platform: "Instagram",
    creative_type: "Post",
    product: "Smartphone"
  }, null, 2));

  const [brandBrain, setBrandBrain] = useState(JSON.stringify({
    visual_dna: {
      primary_color: { value: "#FF0000" },
      visual_style: { value: "Minimalist" }
    },
    core: {
      brand_tone: { value: "Professional" }
    }
  }, null, 2));

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backendUrl = "http://localhost:8000";

  const handleProcess = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${backendUrl}/generation/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user",
          business_id: "demo-business",
          creative_request: JSON.parse(creativeRequest),
          brand_brain_snapshot: JSON.parse(brandBrain)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setResult({ type: "process", data });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleAssemble = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${backendUrl}/generation/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user",
          business_id: "demo-business",
          creative_request: JSON.parse(creativeRequest),
          brand_brain_snapshot: JSON.parse(brandBrain)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setResult({ type: "assemble", data });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleOptimize = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // First assemble to get structured prompt
      const assembleRes = await fetch(`${backendUrl}/generation/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user",
          business_id: "demo-business",
          creative_request: JSON.parse(creativeRequest),
          brand_brain_snapshot: JSON.parse(brandBrain)
        })
      });
      const assembleData = await assembleRes.json();
      if (!assembleRes.ok) throw new Error(JSON.stringify(assembleData));

      const res = await fetch(`${backendUrl}/generation/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assembleData.structured_prompt)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setResult({ type: "optimize", data });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 40, background: "#060a06", color: "#fff", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#39ff14" }}>Prompt Inspector</h1>
      <p style={{ color: "#aaa" }}>Debug and test the prompt generation endpoints.</p>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <h3>Creative Request JSON</h3>
          <textarea
            style={{ width: "100%", height: 150, background: "#111", color: "#fff", padding: 10, border: "1px solid #333" }}
            value={creativeRequest}
            onChange={(e) => setCreativeRequest(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3>Brand Brain JSON</h3>
          <textarea
            style={{ width: "100%", height: 150, background: "#111", color: "#fff", padding: 10, border: "1px solid #333" }}
            value={brandBrain}
            onChange={(e) => setBrandBrain(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button 
          onClick={handleProcess} 
          style={{ padding: "10px 20px", background: "#39ff14", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer" }}>
          Run /process (Default)
        </button>
        <button 
          onClick={handleAssemble} 
          style={{ padding: "10px 20px", background: "#444", color: "#fff", border: "none", cursor: "pointer" }}>
          Run /assemble
        </button>
        <button 
          onClick={handleOptimize} 
          style={{ padding: "10px 20px", background: "#444", color: "#fff", border: "none", cursor: "pointer" }}>
          Run /optimize
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <div style={{ color: "red", marginTop: 20, background: "#220000", padding: 10 }}>{error}</div>}
      
      {result && (
        <div style={{ marginTop: 30, background: "#111", padding: 20, border: "1px solid #333", borderRadius: 8 }}>
          <h2 style={{ margin: "0 0 10px 0", color: "#39ff14" }}>Result: {result.type}</h2>
          <pre style={{ overflowX: "auto", color: "#ddd" }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
