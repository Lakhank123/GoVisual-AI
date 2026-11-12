"use client";
import React, { useState, useEffect } from "react";
import { useDemoSession } from "@/components/providers/demo-session-provider";
import Link from "next/link";
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, getSafeSession } from "@/lib/supabase";
import InstagramPublishModal from "@/components/studio/InstagramPublishModal";
import { getInstagramStatus, getInstagramConnectUrl, openInstagramOAuthPopup } from "@/lib/instagramApi";
import CaptionSelector from "@/components/captions/CaptionSelector";


// --- Question Definitions ---
interface Question {
  key: string;
  label: string;
  type: 'choice' | 'text' | 'product_select' | 'creative_select' | 'image_upload';
  options?: string[];
  placeholder?: string;
  condition?: (answers: Record<string, string>) => boolean;
  recommendations?: Record<string, string[]>;
}

const CREATIVE_QUESTIONS: Question[] = [
  { key: 'product', label: 'Which product are we promoting?', type: 'product_select' },
  { key: 'reference_image', label: 'Upload a reference image (Optional)', type: 'image_upload' },
  { 
    key: 'image_intent', 
    label: 'What would you like the AI to preserve?', 
    type: 'choice', 
    options: ['Product only', 'Product + Camera Angle', 'Product + Lighting', 'Product + Background', 'Entire Composition', 'Use only as inspiration'],
    condition: (answers) => !!answers['reference_image'] && answers['reference_image'] !== 'skipped'
  },
  { key: 'platform', label: 'Where will this be published?', type: 'choice', options: ['Instagram Feed (1:1)', 'Instagram Story (9:16)', 'Facebook Post', 'LinkedIn Post'] },
  { 
    key: 'goal', 
    label: 'What are we trying to achieve with this campaign?', 
    type: 'choice', 
    options: ['Increase Sales', 'Festival Campaign', 'Product Launch', 'Brand Awareness'],
    recommendations: {
      'Increase Sales': ['Use a strong Call to Action', 'Highlight any discounts', 'Use urgent messaging'],
      'Festival Campaign': ['Use festive, warm colors', 'Connect emotionally with the audience', 'Include seasonal greetings'],
      'Product Launch': ['Highlight new features', 'Build curiosity and hype', 'Use bold typography'],
      'Brand Awareness': ['Focus on brand values', 'Use lifestyle imagery', 'Keep text minimal']
    }
  },
  {
    key: 'festival_name',
    label: 'Which festival are you targeting?',
    type: 'text',
    placeholder: 'e.g., Diwali, Christmas, Eid',
    condition: (answers) => answers['goal'] === 'Festival Campaign'
  },
  { key: 'audience', label: 'Who do you want this campaign to speak to?', type: 'text', placeholder: 'e.g., Young professionals, Parents, Fitness enthusiasts' },
  { key: 'cta', label: 'What is the primary action you want them to take?', type: 'text', placeholder: 'e.g., Shop Now, Learn More, Get 20% Off' },
  { key: 'tone', label: 'What feeling should people get when they see this?', type: 'choice', options: ['Premium & Luxurious', 'Bold & Energetic', 'Clean & Minimal', 'Warm & Friendly'] },
  { key: 'logo_image', label: 'Upload your brand logo (Optional)', type: 'image_upload' },
  { 
    key: 'logo_variants', 
    label: 'Which variants should include the logo?', 
    type: 'choice', 
    options: ['All variants', 'Basic variant', 'Professional variant', 'Creative variant'],
    condition: (answers) => !!answers['logo_image'] && answers['logo_image'] !== 'skipped'
  },
  { key: 'style', label: 'Select your creative direction', type: 'choice', options: ['Minimal', 'Professional', 'Premium', 'Luxury', 'Modern', 'Festival', 'Bold', 'Creative', 'Cinematic', 'Studio Product Shot', 'Lifestyle'] }
];

const PHOTOSHOOT_QUESTIONS: Question[] = [
  { key: 'product', label: 'Which product are we shooting?', type: 'product_select' },
  { key: 'avatar', label: 'Who should model this product?', type: 'choice', options: ['No Model (Product Only)', 'Female Model', 'Male Model', 'Hand Model'] },
  { key: 'background', label: 'Where should this photoshoot take place?', type: 'choice', options: ['Bright Studio White', 'Dark Minimalist', 'Outdoor Lifestyle', 'Cozy Indoor', 'Festive Setup'] },
  { key: 'lighting', label: 'What kind of lighting fits the mood?', type: 'choice', options: ['Soft Natural Light', 'Dramatic Shadows', 'Neon Glow', 'Cinematic Dark'] }
];

const GENERATION_STEPS = [
  "Understanding your business...",
  "Reading Brand Profile...",
  "Analyzing Reference Image...",
  "Planning campaign strategy...",
  "Generating Master Prompt...",
  "Writing marketing copy...",
  "Expanding prompt variations...",
  "Generating final creatives..."
];

export default function ContentStudioPage() {
  const { session, addAssetToLibrary } = useDemoSession();
  const [activeTab, setActiveTab] = useState<"creatives" | "photoshoots">("creatives");
  
  // State
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [wizardState, setWizardState] = useState<"questionnaire" | "generating" | "results">("questionnaire");
  const [generationStep, setGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Results
  const [generatedResults, setGeneratedResults] = useState<any[]>([]);
  const [generatedCaption, setGeneratedCaption] = useState("");

  // Instagram publishing state
  const [publishModalCandidate, setPublishModalCandidate] = useState<any | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [instagramToast, setInstagramToast] = useState<string | null>(null);

  async function handlePostToInstagram(candidate: any) {
    try {
      const status = await getInstagramStatus();
      if (!status.connected) {
        setConnectingInstagram(true);
        const authUrl = await getInstagramConnectUrl();
        const popupRes = await openInstagramOAuthPopup(authUrl);
        setConnectingInstagram(false);

        const newStatus = await getInstagramStatus();
        if (newStatus.connected) {
          setPublishModalCandidate({ ...candidate, connectedUsername: newStatus.username });
          setIsPublishModalOpen(true);
        } else {
          setInstagramToast("Instagram connection was not completed. Click 'Post to Instagram' to connect.");
          setTimeout(() => setInstagramToast(null), 4000);
        }
      } else {
        setPublishModalCandidate({ ...candidate, connectedUsername: status.username });
        setIsPublishModalOpen(true);
      }
    } catch (e: any) {
      setConnectingInstagram(false);
      alert(e.message || "Failed to start Instagram connection.");
    }
  }


  // Helper function to extract File from Base64
  function dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1],
      bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const allQuestions = activeTab === "creatives" ? CREATIVE_QUESTIONS : PHOTOSHOOT_QUESTIONS;
  const activeQuestions = allQuestions.filter(q => !q.condition || q.condition(answers));
  const q = activeQuestions[step];

  useEffect(() => {
    const draftKey = `gv_studio_draft_${activeTab}`;
    const draft = sessionStorage.getItem(draftKey);
    
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed && Object.keys(parsed).length > 0) {
          if (confirm("You have a saved draft for this campaign. Would you like to continue?")) {
            setAnswers(parsed);
            let nextStep = 0;
            const updatedActive = allQuestions.filter(q => !q.condition || q.condition(parsed));
            for (let i = 0; i < updatedActive.length; i++) {
              if (parsed[updatedActive[i].key]) {
                nextStep = i + 1;
              } else {
                break;
              }
            }
            if (nextStep >= updatedActive.length) {
              setStep(updatedActive.length - 1);
            } else {
              setStep(nextStep);
            }
            return;
          } else {
             sessionStorage.removeItem(draftKey);
          }
        }
      } catch (e) {}
    }
    
    const defaults: Record<string, string> = {};
    if (activeTab === "creatives") {
       if (session.brandProfile?.targetAudience) {
          defaults['audience'] = session.brandProfile.targetAudience;
       }
       if (session.brandProfile?.brandPersonality) {
          const p = session.brandProfile.brandPersonality.toLowerCase();
          if (p.includes('premium') || p.includes('luxury')) defaults['tone'] = 'Premium & Luxurious';
          else if (p.includes('bold') || p.includes('energetic')) defaults['tone'] = 'Bold & Energetic';
          else if (p.includes('clean') || p.includes('minimal')) defaults['tone'] = 'Clean & Minimal';
          else defaults['tone'] = 'Warm & Friendly';
       }
       // Read search parameters if navigating from Dashboard Action Cards
       if (typeof window !== "undefined") {
         const params = new URLSearchParams(window.location.search);
         const goalParam = params.get("goal");
         if (goalParam) {
           defaults['goal'] = goalParam;
         }
         const platformParam = params.get("platform");
         if (platformParam) {
           defaults['platform'] = platformParam;
         } else if (params.get("tab") === "instagram") {
           defaults['platform'] = 'Instagram Feed (1:1)';
         }
       }
    }
    setAnswers(defaults);
    setStep(0);
    setWizardState("questionnaire");
  }, [activeTab, session.brandProfile]);

  useEffect(() => {
    if (wizardState === "questionnaire" && Object.keys(answers).length > 0) {
      sessionStorage.setItem(`gv_studio_draft_${activeTab}`, JSON.stringify(answers));
    }
  }, [answers, activeTab, wizardState]);

  const handleTabChange = (tab: "creatives" | "photoshoots") => {
    setActiveTab(tab);
    setWizardState("questionnaire");
    setCurrentAnswer("");
  };

  const handleNext = (overrideAnswer?: string) => {
    const finalAnswer = overrideAnswer || currentAnswer;
    if (!finalAnswer && !answers[q.key]) return;
    
    let newAnswers = { ...answers, [q.key]: finalAnswer || answers[q.key] };
    
    // Auto-populate from Product Catalog if product is selected
    if (q.type === 'product_select' && finalAnswer) {
      const selectedProduct = session.products.find(p => p.name === finalAnswer);
      if (selectedProduct) {
        newAnswers.product_id = selectedProduct.id;
        newAnswers.product_category = selectedProduct.category;
        newAnswers.product_description = selectedProduct.description;
        newAnswers.product_price = selectedProduct.price;
        
        if (selectedProduct.imageUrl) {
          // Pre-fill the reference image with the URL from the provider
          newAnswers.reference_image = selectedProduct.imageUrl;
          newAnswers.reference_image_filename = `catalog_${selectedProduct.id}.jpg`;
        } else {
          // Explicitly clear stale reference image when switching to a product without one
          newAnswers.reference_image = '';
          newAnswers.reference_image_filename = '';
        }
      }
    }

    setAnswers(newAnswers);
    setCurrentAnswer('');
    
    const nextQuestions = allQuestions.filter(question => !question.condition || question.condition(newAnswers));
    
    if (step < nextQuestions.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      startGeneration(newAnswers);
    }
  };

  const startGeneration = async (finalAnswers: Record<string, string>) => {
    setWizardState("generating");
    setGenerationStep(0);
    setGenerationError(null);
    
    // UI progression simulator (runs parallel to API call)
    let currentGenerationStep = 0;
    const interval = setInterval(() => {
      currentGenerationStep++;
      if (currentGenerationStep < GENERATION_STEPS.length - 1) {
        setGenerationStep(currentGenerationStep);
      }
    }, 1500);

    try {
      const formData = new FormData();
      
      formData.append("product", finalAnswers.product || "");
      formData.append("price", finalAnswers.product_price || "see store");
      formData.append("description", finalAnswers.product_description || "");
      if (finalAnswers.product_ingredients) {
        formData.append("ingredients", finalAnswers.product_ingredients);
      }
      if (finalAnswers.product_features) {
        formData.append("features", finalAnswers.product_features);
      }
      formData.append("format", finalAnswers.platform || "1:1");
      formData.append("image_type", finalAnswers.platform || "Instagram post");
      formData.append("purpose", finalAnswers.goal || "");
      formData.append("mood", finalAnswers.tone || "Premium");
      formData.append("background", finalAnswers.background || finalAnswers.style || "Minimal");
      formData.append("lighting", finalAnswers.lighting || (finalAnswers.tone === "Bold & Energetic" ? "Dramatic spotlight" : "Soft natural light"));
      formData.append("offer", finalAnswers.cta || "no offer");
      const derivedMainText = finalAnswers.main_text || (finalAnswers.festival_name ? `${finalAnswers.festival_name} Special` : (finalAnswers.goal === "Product Launch" ? "New Arrival" : ""));
      formData.append("main_text", derivedMainText);
      const effectiveBrandName = session.brandProfile?.businessName || session.workspace?.businessName || "Your Brand";
      const effectiveCategory = finalAnswers.product_category || session.brandProfile?.category || session.workspace?.category || "Retail";
      formData.append("brand_name", effectiveBrandName);
      const profileColors = [session.brandProfile?.primaryColor, session.brandProfile?.secondaryColor].filter(Boolean);
      formData.append("brand_colors", profileColors.length ? profileColors.join(', ') : "#ffffff");
      formData.append("category", effectiveCategory);
      formData.append("brand_dna", JSON.stringify({
        ...session.brandProfile,
        business_name: effectiveBrandName,
        category: effectiveCategory,
        city: session.workspace?.city,
      }));
      
      // Append Reference Image
      const refImg = finalAnswers.reference_image;
      if (refImg && refImg !== 'skipped') {
        if (refImg.startsWith("data:")) {
           const filename = finalAnswers.reference_image_filename || "reference.jpg";
           const file = dataURLtoFile(refImg, filename);
           formData.append("product_image", file);
        } else {
           // Resolve relative or absolute URL into full URL
           const fullUrl = refImg.startsWith("/") ? `${window.location.origin}${refImg}` : refImg;
           try {
              const imgResp = await fetch(fullUrl);
              if (imgResp.ok) {
                 const blob = await imgResp.blob();
                 const filename = finalAnswers.reference_image_filename || "catalog_product.jpg";
                 const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
                 formData.append("product_image", file);
              } else {
                 formData.append("reference_image_url", fullUrl);
              }
           } catch (e) {
              console.warn("Could not fetch catalog reference image:", e);
              formData.append("reference_image_url", fullUrl);
           }
        }
      }
      
      // Append Logo Image (Fall back to brand profile logo if not manually uploaded in answers)
      const effectiveLogo = (finalAnswers.logo_image && finalAnswers.logo_image !== 'skipped')
        ? finalAnswers.logo_image
        : session.brandProfile?.logoUrl;

      if (effectiveLogo && effectiveLogo !== 'skipped') {
        if (effectiveLogo.startsWith("data:")) {
           const filename = finalAnswers.logo_image_filename || "brand_logo.png";
           const file = dataURLtoFile(effectiveLogo, filename);
           formData.append("logo_image", file);
        } else {
           const fullLogoUrl = effectiveLogo.startsWith("/") ? `${window.location.origin}${effectiveLogo}` : effectiveLogo;
           try {
             const logoResp = await fetch(fullLogoUrl);
             if (logoResp.ok) {
               const blob = await logoResp.blob();
               const filename = finalAnswers.logo_image_filename || "brand_logo.png";
               formData.append("logo_image", new File([blob], filename, { type: blob.type || "image/png" }));
             }
           } catch (e) {
             console.warn("Could not fetch logo image URL:", e);
           }
        }
      }
      if (finalAnswers.logo_variants) {
         formData.append("logo_variants", finalAnswers.logo_variants);
      }
      if (finalAnswers.logo_position) {
        formData.append("logo_position", finalAnswers.logo_position);
      }

      // Pass Image Intent to backend
      if (finalAnswers.image_intent) {
         formData.append("image_intent", finalAnswers.image_intent);
      }

      const supabaseSession = await getSafeSession();
      const token = supabaseSession?.access_token || "";
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 180000);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/generate`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      clearInterval(interval);
      setGenerationStep(GENERATION_STEPS.length - 1); // Done

      if (!res.ok) {
        const err = await res.json();
        const errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail, null, 2);
        throw new Error(errorMessage || "Failed to generate creatives");
      }

      const data = await res.json();
      const resultsArray = (data.candidates || []).slice(0, 3);
      setGeneratedResults(resultsArray);
      setGeneratedCaption(data.caption);
      
      // Save all 3 to library automatically (Optional, or wait for user to save)
      resultsArray.forEach((img: any) => {
         const newAsset = {
             id: Math.random().toString(36).substring(7),
           type: activeTab === 'creatives' ? 'creative' : activeTab === 'photoshoots' ? 'photoshoot' : 'video',
           url: img.url,
           createdAt: new Date().toISOString(),
           metadata: {
             title: finalAnswers.product ? `${finalAnswers.product} (${img.strategy_name || img.label})` : `Generated ${activeTab.slice(0,-1)}`,
             answers: finalAnswers,
             prompt: img.prompt_used || img.prompt_preview,
             caption: img.caption || `${finalAnswers.product || "Product"} by ${session.brandProfile?.businessName || session.workspace?.businessName || "Our Brand"}. Available now.`,
             hashtags: `#${(finalAnswers.product || "Product").replace(/\s+/g, "")} #${(session.brandProfile?.businessName || "Brand").replace(/\s+/g, "")} #ShopLocal #NewArrivals`
           }
         };
         addAssetToLibrary(newAsset as any);
      });

      sessionStorage.removeItem(`gv_studio_draft_${activeTab}`);
      setWizardState("results");

    } catch (err: any) {
      clearInterval(interval);
      setGenerationError(err.name === "AbortError"
        ? "Generation timed out. Please retry; the image provider may be temporarily slow."
        : err.message || "An unknown error occurred");
    }
  };

  const downloadImage = async (url: string, candidateIndex: number) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `govisual-candidate-${candidateIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Could not download generated image", error);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const currentRecommendation = q.recommendations && answers['goal'] ? q.recommendations[answers['goal']] : null;
  const progress = ((step) / activeQuestions.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", color: "#F7F3ED", display: "flex", flexDirection: "column" }}>
      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid #3B2B1E", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#E8B66F", fontWeight: 700, fontSize: 18 }}>GoVisual AI</span>
          <span style={{ color: "#3B2B1E", fontSize: 18 }}>|</span>
          <span style={{ color: "#B9AA99", fontSize: 14 }}>Content Studio</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 1200, margin: "0 auto", padding: "32px 24px", width: "100%" }}>
        
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: "#F7F3ED" }}>AI Campaign Builder</h1>
          <p style={{ color: "#B9AA99", fontSize: 14 }}>Your AI Marketing Strategist is ready to plan and create.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: "1px solid #3B2B1E" }}>
          {(["creatives", "photoshoots"] as const).map((tab) => (
            <button key={tab} onClick={() => handleTabChange(tab)} disabled={wizardState === "generating"} style={{ padding: "12px 24px", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #E8B66F" : "2px solid transparent", color: activeTab === tab ? "#E8B66F" : "#B9AA99", fontWeight: activeTab === tab ? 600 : 400, fontSize: 14, cursor: wizardState === "generating" ? "not-allowed" : "pointer", textTransform: "capitalize", marginBottom: -1 }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: wizardState === "results" ? "1fr" : "1.2fr 0.8fr", gap: 32, flex: 1 }}>
          
          {/* Left Panel: The Strategist */}
          {wizardState !== "results" && (
            <div style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
              
              {wizardState === "questionnaire" && (
                <div style={{ flex: 1, padding: 40, display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: 40 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#B9AA99", marginBottom: 12 }}>
                      <span>Building Campaign... Step {step + 1} of {activeQuestions.length}</span>
                      <span style={{ color: "#E8B66F" }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: 4, background: "#14100D", borderRadius: 4, overflow: "hidden" }}>
                      <motion.div
                        style={{ height: "100%", background: "#E8B66F", borderRadius: 4, boxShadow: "0 0 8px rgba(232,182,111,0.4)" }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, position: "relative" }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ position: "absolute", width: "100%", height: "100%", overflowY: "auto", paddingRight: "8px", paddingBottom: "24px" }}
                      >
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#F7F3ED", marginBottom: 24, lineHeight: 1.4 }}>{q.label}</h2>
                        
                        {answers[q.key] && currentAnswer === '' && q.type !== 'image_upload' && (
                           <div style={{ marginBottom: 16, color: "#B9AA99", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                             <span>✨ Using existing profile:</span> <strong style={{ color: "#E8B66F" }}>{answers[q.key]}</strong>
                           </div>
                        )}

                        {q.type === 'text' && (
                          <input
                            type="text"
                            style={{ width: "100%", background: "#14100D", border: "1px solid #3B2B1E", borderRadius: 12, padding: "16px 20px", fontSize: 16, color: "#F7F3ED", outline: "none" }}
                            placeholder={q.placeholder}
                            value={currentAnswer || answers[q.key] || ''}
                            onChange={e => setCurrentAnswer(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleNext()}
                            autoFocus
                          />
                        )}

                        {q.type === 'choice' && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {q.options!.map(opt => (
                              <button
                                key={opt}
                                onClick={() => {
                                  setCurrentAnswer(opt);
                                  setTimeout(() => handleNext(opt), 150);
                                }}
                                style={{ padding: "16px", borderRadius: 12, border: (currentAnswer || answers[q.key]) === opt ? "1px solid #E8B66F" : "1px solid #3B2B1E", background: (currentAnswer || answers[q.key]) === opt ? "rgba(232,182,111,0.1)" : "#14100D", color: (currentAnswer || answers[q.key]) === opt ? "#E8B66F" : "#F7F3ED", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "0.2s" }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === 'product_select' && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {session.products.length === 0 ? (
                              <div style={{ padding: 16, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 12, fontSize: 14 }}>
                                No products found. <Link href="/products/setup" style={{ color: "#E8B66F", textDecoration: "underline" }}>Add a product</Link> to your brand profile first.
                              </div>
                            ) : (
                              session.products.map(p => (
                                 <button
                                  key={p.id}
                                  onClick={() => {
                                    setCurrentAnswer(p.name);
                                    setAnswers(prev => ({
                                      ...prev,
                                      [q.key]: p.name,
                                      'product_id': p.id,
                                      'product_category': p.category || '',
                                      'product_description': p.description || '',
                                      'product_price': p.price || '',
                                      'reference_image': p.imageUrl || '',
                                      'reference_image_filename': p.imageUrl ? `${p.name} (Catalog Reference)` : ''
                                    }));
                                    setTimeout(() => handleNext(p.name), 150);
                                  }}
                                  style={{
                                    padding: "14px 16px",
                                    borderRadius: 12,
                                    border: (currentAnswer || answers[q.key]) === p.name ? "1px solid #E8B66F" : "1px solid #3B2B1E",
                                    background: (currentAnswer || answers[q.key]) === p.name ? "rgba(232,182,111,0.1)" : "#14100D",
                                    color: (currentAnswer || answers[q.key]) === p.name ? "#E8B66F" : "#F7F3ED",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    {p.imageUrl ? (
                                      <img src={p.imageUrl} alt={p.name} style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover", border: "1px solid #3B2B1E" }} />
                                    ) : (
                                      <span style={{ fontSize: 22 }}>📦</span>
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                                      {p.category && <div style={{ fontSize: 11, color: "#B9AA99" }}>{p.category}</div>}
                                    </div>
                                  </div>
                                  {p.imageUrl && (
                                    <span style={{ fontSize: 11, color: "#E8B66F", background: "rgba(232,182,111,0.12)", border: "1px solid rgba(232,182,111,0.25)", padding: "3px 8px", borderRadius: 6 }}>
                                      ✓ Visual Reference Attached
                                    </span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        {q.type === 'creative_select' && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {(!session.library || session.library.filter(a => a.type === 'creative').length === 0) ? (
                              <div style={{ padding: 16, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 12, fontSize: 14 }}>
                                No creatives found. Generate a creative first to animate it.
                              </div>
                            ) : (
                              session.library.filter(a => a.type === 'creative').map(a => (
                                 <button
                                  key={a.id}
                                  onClick={() => { setCurrentAnswer(a.metadata?.title || a.id); setTimeout(() => handleNext(a.metadata?.title || a.id), 150); }}
                                  style={{ padding: "16px", borderRadius: 12, border: (currentAnswer || answers[q.key]) === (a.metadata?.title || a.id) ? "1px solid #E8B66F" : "1px solid #3B2B1E", background: (currentAnswer || answers[q.key]) === (a.metadata?.title || a.id) ? "rgba(232,182,111,0.1)" : "#14100D", color: (currentAnswer || answers[q.key]) === (a.metadata?.title || a.id) ? "#E8B66F" : "#F7F3ED", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "0.2s" }}
                                >
                                  {a.metadata?.title || "Creative"} ({new Date(a.createdAt).toLocaleDateString()})
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        {q.type === 'image_upload' && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {uploadError && (
                              <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 8, fontSize: 14 }}>
                                {uploadError}
                              </div>
                            )}

                            {/* Quick Action: Use Saved Brand Logo if available */}
                            {q.key === 'logo_image' && session.brandProfile?.logoUrl && (
                              <div style={{ padding: 14, background: "rgba(232, 182, 111, 0.08)", border: "1px solid rgba(232, 182, 111, 0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <img src={session.brandProfile.logoUrl} alt="Brand Logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "#14100D", border: "1px solid #3B2B1E", padding: 2 }} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F7F3ED" }}>Use Verified Brand Profile Logo</div>
                                    <div style={{ fontSize: 11, color: "#E8B66F" }}>{session.brandProfile.businessName || "Your Brand Logo"}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentAnswer(session.brandProfile!.logoUrl!);
                                    setAnswers(prev => ({
                                      ...prev,
                                      [q.key]: session.brandProfile!.logoUrl!,
                                      [`${q.key}_filename`]: "brand_profile_logo.png"
                                    }));
                                  }}
                                  style={{ padding: "8px 14px", background: "#E8B66F", color: "#0B0907", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                >
                                  Use Profile Logo
                                </button>
                              </div>
                            )}

                            {/* Reference Fidelity Disclosure for product references */}
                            {q.key === 'reference_image' && (
                              <div style={{ padding: "10px 14px", background: "rgba(232, 182, 111, 0.06)", border: "1px solid rgba(232, 182, 111, 0.2)", borderRadius: 8, fontSize: 12, color: "#B9AA99", display: "flex", alignItems: "center", gap: 8 }}>
                                <span>ℹ️</span>
                                <span><strong>Reference-guided AI:</strong> The model guides composition, product silhouette, and color balance based on your image. Environmental lighting adapts naturally.</span>
                              </div>
                            )}

                            <div 
                              style={{ padding: "32px", border: "2px dashed #3B2B1E", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#14100D" }} 
                              onClick={() => document.getElementById('file-upload')?.click()}
                            >
                              <span style={{ fontSize: 32, marginBottom: 12 }}>📸</span>
                              <span style={{ color: "#fff", fontWeight: 500 }}>
                                {(currentAnswer || answers[q.key]) && (currentAnswer || answers[q.key]) !== 'skipped' ? 'Click to replace image' : 'Click to upload an image'}
                              </span>
                              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>JPG, PNG, WEBP up to 10MB</span>
                              <input 
                                id="file-upload" 
                                type="file" 
                                accept="image/jpeg, image/png, image/webp" 
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  setUploadError(null);
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    
                                    // Validation
                                    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
                                    if (!validTypes.includes(file.type)) {
                                      setUploadError("Unsupported file type. Please upload JPG, PNG, or WEBP.");
                                      return;
                                    }
                                    if (file.size > 10 * 1024 * 1024) {
                                      setUploadError("File is too large. Maximum size is 10 MB.");
                                      return;
                                    }

                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (event.target?.result) {
                                        setAnswers(prev => ({ ...prev, [`${q.key}_filename`]: file.name }));
                                        setCurrentAnswer(event.target.result as string);
                                        // Removed auto-advance here to let user review upload and manually click Next
                                      }
                                    };
                                    reader.onerror = () => {
                                      setUploadError("File could not be read. It may be corrupted.");
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </div>
                            
                            {/* If they already selected one, show preview */}
                            {(currentAnswer || answers[q.key]) && (currentAnswer || answers[q.key]) !== 'skipped' && (
                               <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, background: "#14100D", border: "1px solid #3B2B1E", padding: 12, borderRadius: 12 }}>
                                 <img src={currentAnswer || answers[q.key]} alt="Product reference preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: "1px solid #3B2B1E" }} />
                                 <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                   <span style={{ color: '#E8B66F', fontSize: 14, fontWeight: 500 }}>
                                      {answers[`${q.key}_filename`]?.startsWith('catalog_') ? 'Using Master Product Image' : 'Image attached'}
                                   </span>
                                   <span style={{ color: '#B9AA99', fontSize: 12, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 200 }}>
                                     {answers[`${q.key}_filename`] || "reference_image.jpg"}
                                   </span>
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); setCurrentAnswer('skipped'); setAnswers(prev => ({...prev, [q.key]: 'skipped', [`${q.key}_filename`]: ''})); }} style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", fontSize: 13, cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontWeight: 500 }}>Remove</button>
                               </div>
                            )}

                            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                              <button 
                                onClick={() => {
                                  setCurrentAnswer('skipped');
                                  handleNext('skipped');
                                }}
                                style={{ flex: 1, padding: "14px", background: "transparent", border: "1px solid #3B2B1E", color: "#B9AA99", borderRadius: 12, fontWeight: 600, cursor: "pointer" }}
                              >
                                Skip this step
                              </button>
                              {((currentAnswer || answers[q.key]) && (currentAnswer || answers[q.key]) !== 'skipped') && (
                                <button 
                                  onClick={() => handleNext()}
                                  style={{ flex: 1, padding: "14px", background: "#E8B66F", border: "none", color: "#0B0907", borderRadius: 12, fontWeight: 600, cursor: "pointer" }}
                                >
                                  Continue
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between" }}>
                           <button 
                              onClick={() => {
                                 if (step > 0) {
                                    setDirection(-1);
                                    setStep(step - 1);
                                 }
                              }}
                              style={{ padding: "12px 24px", background: "transparent", color: "#B9AA99", border: "none", borderRadius: 8, fontWeight: 600, cursor: step > 0 ? "pointer" : "not-allowed", opacity: step > 0 ? 1 : 0.5 }}
                            >
                              Back
                            </button>
                            
                            {(q.type === 'text') && (
                              <button 
                                onClick={() => handleNext()}
                                style={{ padding: "12px 32px", background: "#E8B66F", color: "#0B0907", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                              >
                                {step === activeQuestions.length - 1 ? 'Generate Campaign' : 'Next'}
                              </button>
                            )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {wizardState === "generating" && (
                 <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 40 }}>
                   
                   {generationError ? (
                     <div style={{ textAlign: "center", maxWidth: 400 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>Generation Failed</h3>
                        <p style={{ color: "#B9AA99", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                          {generationError}
                        </p>
                        <button onClick={() => setWizardState("questionnaire")} style={{ padding: "12px 24px", background: "transparent", border: "1px solid #3B2B1E", color: "#F7F3ED", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Go Back & Retry</button>
                     </div>
                   ) : (
                     <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 350 }}>
                        {GENERATION_STEPS.map((s, idx) => (
                           <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, opacity: generationStep >= idx ? 1 : 0.3, transition: "0.5s" }}>
                              <div style={{ 
                                 width: 20, height: 20, borderRadius: "50%", 
                                 background: generationStep > idx ? "#E8B66F" : generationStep === idx ? "transparent" : "transparent",
                                 border: generationStep === idx ? "2px solid #E8B66F" : generationStep > idx ? "none" : "2px solid #3B2B1E",
                                 display: "flex", alignItems: "center", justifyContent: "center", color: "#0B0907", fontSize: 10, fontWeight: 700
                              }}>
                                 {generationStep > idx && "✓"}
                              </div>
                              <span style={{ fontSize: 14, fontWeight: generationStep === idx ? 600 : 400, color: generationStep >= idx ? "#F7F3ED" : "#B9AA99" }}>{s}</span>
                           </div>
                        ))}
                     </div>
                   )}
                   
                 </div>
              )}
            </div>
          )}

          {/* Right Panel: Live Campaign Brief */}
          {wizardState !== "results" && (
            <div style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 16, padding: 24, height: "fit-content" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#F7F3ED", display: "flex", alignItems: "center", gap: 8 }}>
                 📝 Live Campaign Brief
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #3B2B1E", paddingBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#B9AA99" }}>Business</span>
                    <span style={{ fontSize: 13, color: "#F7F3ED", fontWeight: 500, textAlign: "right" }}>{session.workspace?.businessName || "Your Shop"}</span>
                 </div>
                 
                 {allQuestions.map(question => {
                    if (!answers[question.key] && !question.condition?.(answers)) return null; 
                    if (question.type === 'image_upload' && answers[question.key]) {
                        return (
                           <div key={question.key} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #3B2B1E", paddingBottom: 12 }}>
                              <span style={{ fontSize: 13, color: "#B9AA99" }}>Reference Image</span>
                              <span style={{ fontSize: 13, color: "#E8B66F", fontWeight: 500, textAlign: "right" }}>
                                 {answers[question.key] === 'skipped' ? 'Skipped' : 'Attached ✓'}
                              </span>
                           </div>
                        );
                    }
                    return (
                       <div key={question.key} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #3B2B1E", paddingBottom: 12 }}>
                          <span style={{ fontSize: 13, color: "#B9AA99" }}>
                             {question.key.charAt(0).toUpperCase() + question.key.slice(1).replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: 13, color: answers[question.key] ? "#F7F3ED" : "#B9AA99", opacity: answers[question.key] ? 1 : 0.5, fontWeight: 500, textAlign: "right", maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                             {answers[question.key] || "Pending..."}
                          </span>
                       </div>
                    )
                 })}
              </div>

              {currentRecommendation && wizardState === "questionnaire" && (
                 <div style={{ marginTop: 24, padding: 16, background: "rgba(232, 182, 111, 0.08)", border: "1px solid rgba(232, 182, 111, 0.25)", borderRadius: 12 }}>
                    <h4 style={{ fontSize: 12, color: "#E8B66F", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                       💡 AI Recommendations
                    </h4>
                    <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13, color: "#F7F3ED" }}>
                       {currentRecommendation.map((rec, i) => <li key={i} style={{ marginBottom: 4 }}>{rec}</li>)}
                    </ul>
                 </div>
              )}

              {wizardState === "questionnaire" && (
                 <div style={{ marginTop: 24, fontSize: 12, color: "#B9AA99", textAlign: "center" }}>
                    Draft saved automatically.
                 </div>
              )}
            </div>
          )}

          {/* Results Workspace */}
          {wizardState === "results" && (
             <div style={{ flex: 1, padding: "20px 0", display: "flex", flexDirection: "column" }}>
               <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>🎉</div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: "#F7F3ED" }}>Campaign Successfully Created</h2>
                 </div>
                 <div style={{ display: "flex", gap: 12 }}>
                   <button onClick={() => setWizardState("questionnaire")} style={{ padding: "10px 16px", background: "transparent", border: "1px solid #3B2B1E", color: "#F7F3ED", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Edit Brief</button>
                   <button onClick={() => startGeneration(answers)} style={{ padding: "10px 16px", background: "transparent", border: "1px solid #3B2B1E", color: "#F7F3ED", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Generate Variations</button>
                   <Link href="/library" style={{ textDecoration: "none" }}>
                     <button style={{ padding: "10px 16px", background: "#21170F", border: "1px solid #3B2B1E", color: "#F7F3ED", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>View Library</button>
                   </Link>
                 </div>
               </div>
               
               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
                  {generatedResults.map((img, i) => (
                    <div key={i} style={{ background: "#21170F", border: "1px solid #3B2B1E", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                       <div style={{ padding: "12px 16px", borderBottom: "1px solid #3B2B1E", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#14100D" }}>
                         <span style={{ fontSize: 14, fontWeight: 600, color: "#F7F3ED" }}>{img.strategy_name || img.label || `Strategy ${i+1}`}</span>
                         <span style={{ fontSize: 11, padding: "4px 8px", background: img.is_recommended ? "rgba(232, 182, 111, 0.15)" : "rgba(255,255,255,0.05)", color: img.is_recommended ? "#E8B66F" : "#B9AA99", borderRadius: 4, textTransform: "uppercase" }}>{img.is_recommended ? "⭐ RECOMMENDED BY GO VISUAL AI" : (img.tier || "CANDIDATE")}</span>
                       </div>
                       
                       <div style={{ width: "100%", aspectRatio: "1/1", position: "relative" }}>
                          <img src={img.url} alt={img.strategy_name || `Generated candidate ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       </div>
                       
                       <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                         {img.scores && (
                           <div style={{ marginBottom: 12, color: "#B9AA99", fontSize: 12 }}>
                             <div style={{ marginBottom: 8 }}>AI score: <strong style={{ color: img.is_recommended ? "#E8B66F" : "#F7F3ED" }}>{img.scores.weighted_total}/100</strong></div>
                             <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px" }}>
                               {[
                                 ["Product Fidelity", img.scores.product_fidelity],
                                 ["Product Placement", img.scores.product_placement],
                                 ["Scene Integration", img.scores.scene_integration],
                                 ["Composition", img.scores.composition],
                                 ["Brand Consistency", img.scores.brand_consistency],
                                 ["Marketing Effectiveness", img.scores.marketing_effectiveness],
                                 ["Text/Logo Safety", img.scores.text_logo_safety],
                               ].map(([label, score]) => <React.Fragment key={label}><span>{label}</span><strong style={{ color: "#F7F3ED" }}>{score}</strong></React.Fragment>)}
                             </div>
                           </div>
                         )}
                         {img.critic_pass === false && (
                           <div style={{ marginBottom: 12, color: "#f59e0b", fontSize: 12 }}>Quality gate failed: {img.critic_issues?.join(", ") || "See critic details."}</div>
                         )}
                         <details style={{ marginBottom: 16 }}>
                            <summary style={{ fontSize: 12, color: "#B9AA99", cursor: "pointer", outline: "none" }}>View Generated Prompt</summary>
                            <p style={{ fontSize: 12, color: "#F7F3ED", marginTop: 8, lineHeight: 1.4, padding: 8, background: "#14100D", borderRadius: 4, border: "1px solid #3B2B1E" }}>
                               {img.prompt_used || img.prompt_preview}
                            </p>
                            {img.recommendation_reason && (
                               <p style={{ fontSize: 12, color: "#E8B66F", marginTop: 8, lineHeight: 1.4, padding: 8, background: "rgba(232,182,111,0.08)", border: "1px solid rgba(232,182,111,0.25)", borderRadius: 4 }}>
                                  💡 <strong>Critic Reason:</strong> {img.recommendation_reason}
                               </p>
                            )}
                         </details>
                         
                         <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: 6 }}>
                             <button onClick={() => downloadImage(img.url, i)} style={{ padding: "8px 4px", background: "#14100D", border: "1px solid #3B2B1E", color: "#F7F3ED", borderRadius: 6, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Download</button>
                             <button onClick={() => handlePostToInstagram(img)} style={{ padding: "8px 4px", background: "linear-gradient(135deg, rgba(225,48,108,0.2), rgba(131,58,180,0.2))", border: "1px solid rgba(225,48,108,0.4)", color: "#ff80ab", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>Post to Instagram</button>
                             <button style={{ padding: "8px 4px", background: "#14100D", border: "1px solid #3B2B1E", color: "#F7F3ED", borderRadius: 6, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Use in Video</button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Marketing Copy Section (Requirement E) */}
               <div style={{ marginTop: 32 }}>
                  <CaptionSelector
                    productName={answers["product"] || session.products?.[0]?.name || "Product"}
                    brandName={session.brandProfile?.businessName || session.workspace?.businessName || "Our Shop"}
                    category={session.brandProfile?.category || answers["category"] || "Commercial"}
                    shotLabel={answers["goal"] || "Campaign Creative"}
                    tone={answers["tone"] || "Premium & Luxurious"}
                    offer={answers["offer"] || answers["cta"] || ""}
                    background={answers["style"] || "Minimal"}
                    visualDescription={`Campaign visual with ${answers["style"] || "clean"} setting, ${answers["tone"] || "premium"} mood`}
                    initialCaption={generatedCaption}
                    onCaptionChange={(cap) => setGeneratedCaption(cap)}
                  />
               </div>
               
             </div>
          )}
          
          {/* Instagram Publish Modal */}
          {publishModalCandidate && (
            <InstagramPublishModal
              isOpen={isPublishModalOpen}
              onClose={() => {
                setIsPublishModalOpen(false);
                setPublishModalCandidate(null);
              }}
              candidateId={publishModalCandidate.candidate_id || `cand_${step}`}
              imageUrl={publishModalCandidate.url}
              connectedUsername={publishModalCandidate.connectedUsername || "instagram"}
              initialCaption={generatedCaption || ""}
              productName={answers["product"] || session.products?.[0]?.name || "Product"}
              brandName={session.workspace?.businessName || "Brand"}
              category={session.workspace?.category || "Commercial"}
              mood={answers["tone"] || answers["style"] || "Modern"}
            />
          )}

          {instagramToast && (
            <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#160d0d', border: '1px solid #ff4d4f', color: '#ff7875', padding: '12px 20px', borderRadius: 8, fontSize: 13, zIndex: 10000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {instagramToast}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

