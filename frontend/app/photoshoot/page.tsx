"use client";

import { useState, useRef, useEffect } from "react";
import { supabase, getSafeSession } from "@/lib/supabase";
import { useDemoSession } from "@/components/providers/demo-session-provider";
import { CREATIVE_QUESTIONS, type CreativeQuestion } from "@/lib/creativeQuestions";
import Navbar from "@/components/Navbar";
import InstagramPublishModal from "@/components/studio/InstagramPublishModal";
import {
  getInstagramStatus,
  getInstagramConnectUrl,
  openInstagramOAuthPopup,
} from "@/lib/instagramApi";
import CaptionSelector from "@/components/captions/CaptionSelector";
import { downloadAsPng, shareToWhatsAppContact, resolveFullImageUrl } from "@/lib/imageDownload";
import {
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Eye,
  Bookmark,
  Share2,
  Layers,
  Sliders,
  X,
  Plus,
  User,
  Check,
  Download,
  MessageCircle,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type PhotoshootMode = "model" | "product_only" | "lifestyle";
export type PhotoshootStep = "select_product" | "questions" | "mode" | "review" | "generating" | "results";

export interface AIModel {
  id: string;
  name: string;
  gender: "male" | "female";
  style: string;
  description: string;
  imagePath: string;
  intendedUse?: string;
}

const PRESET_MODELS: AIModel[] = [
  {
    id: "aarav",
    name: "Aarav",
    gender: "male",
    style: "Modern Commercial",
    description: "Modern commercial Indian male model, confident, premium lifestyle",
    imagePath: "/models/photoshoot/aarav.png",
  },
  {
    id: "rohan",
    name: "Rohan",
    gender: "male",
    style: "Clean Professional",
    description: "Clean professional Indian male model, sharp corporate aesthetic",
    imagePath: "/models/photoshoot/rohan.png",
  },
  {
    id: "kabir",
    name: "Kabir",
    gender: "male",
    style: "Bold Editorial",
    description: "Bold editorial Indian male model, high-fashion attitude",
    imagePath: "/models/photoshoot/kabir.png",
  },
  {
    id: "ananya",
    name: "Ananya",
    gender: "female",
    style: "Natural Contemporary",
    description: "Natural contemporary Indian female model, fresh, authentic elegance",
    imagePath: "/models/photoshoot/ananya.png",
  },
  {
    id: "meera",
    name: "Meera",
    gender: "female",
    style: "Elegant Luxury",
    description: "Elegant luxury Indian female model, sophisticated poise, regal grace",
    imagePath: "/models/photoshoot/meera.png",
  },
  {
    id: "isha",
    name: "Isha",
    gender: "female",
    style: "Youthful Expressive",
    description: "Youthful expressive Indian female model, vibrant energy, trend-forward vibe",
    imagePath: "/models/photoshoot/isha.png",
  },
];

const MODES: { id: PhotoshootMode; title: string; subtitle: string; icon: string; badge: string }[] = [
  {
    id: "model",
    title: "AI Model Photoshoot",
    subtitle: "Showcase your product worn or held naturally by an approved Indian AI model.",
    icon: "👤",
    badge: "Model Featured",
  },
  {
    id: "product_only",
    title: "Product Studio / No Model",
    subtitle: "Clean, high-end e-commerce product photography with neutral studio backgrounds.",
    icon: "📦",
    badge: "Product Only",
  },
  {
    id: "lifestyle",
    title: "Lifestyle Photoshoot",
    subtitle: "Contextual, real-world scenes with optional human presence adapted to category.",
    icon: "🌿",
    badge: "Lifestyle Context",
  },
];

export default function PhotoshootPage() {
  const { session, addAssetToLibrary, addRecentWork } = useDemoSession();

  // Workflow Step State
  const [step, setStep] = useState<PhotoshootStep>("select_product");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);

  // Product Selection State
  const [productSource, setProductSource] = useState<"catalog" | "upload">(
    session.products && session.products.length > 0 ? "catalog" : "upload"
  );
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Creative Questions Answers State (Initialized with defaults)
  const [creativeAnswers, setCreativeAnswers] = useState<Record<string, string>>({
    product: "",
    price: "",
    offer: "No offer",
    mood: "Premium & luxurious",
    background: "Bright studio white",
    lighting: "Soft natural light",
    mainText: "",
    language: "English",
    urgency: "No urgency",
  });

  // Photoshoot Mode & Model State
  const [mode, setMode] = useState<PhotoshootMode>("model");
  const [models, setModels] = useState<AIModel[]>(PRESET_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>("aarav");
  const [includeLifestyleModel, setIncludeLifestyleModel] = useState<boolean>(true);
  const [includeLogo, setIncludeLogo] = useState(false);

  // Custom Model Form State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customAge, setCustomAge] = useState(26);
  const [customGender, setCustomGender] = useState<"male" | "female">("female");
  const [customStyle, setCustomStyle] = useState("Modern Commercial");
  const [customSkinTone, setCustomSkinTone] = useState("medium");
  const [customHairStyle, setCustomHairStyle] = useState("neat professional");
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);
  const [creatingModel, setCreatingModel] = useState(false);
  const [customModelError, setCustomModelError] = useState<string | null>(null);

  // Generation Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [shots, setShots] = useState<{ label: string; url: string; success: boolean; error?: string }[]>([]);
  const [currentCaption, setCurrentCaption] = useState<string>("");
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Save to Library State
  const [savingShotIdx, setSavingShotIdx] = useState<number | null>(null);
  const [savedShots, setSavedShots] = useState<{ [key: number]: boolean }>({});
  const [saveFeedback, setSaveFeedback] = useState<{ [key: number]: string }>({});

  // Instagram publishing state
  const [publishModalShot, setPublishModalShot] = useState<{
    shot: { label: string; url: string; success: boolean; error?: string };
    connectedUsername: string;
    index: number;
  } | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [instagramToast, setInstagramToast] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const questionFileRef = useRef<HTMLInputElement>(null);

  // Default logo inclusion if user has uploaded a logo
  useEffect(() => {
    if (session.brandProfile?.logoUrl) {
      setIncludeLogo(true);
    }
  }, [session.brandProfile?.logoUrl]);

  // Load custom models from backend/disk if available
  useEffect(() => {
    fetch("/models/photoshoot/models.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
        }
      })
      .catch(() => {});
  }, []);

  // Update creativeAnswers when product selection changes
  const updateAnswer = (key: string, value: string) => {
    setCreativeAnswers((prev) => ({ ...prev, [key]: value }));
  };

  // Handle Catalog Selection
  const handleSelectCatalogProduct = async (prod: any) => {
    setSelectedCatalogId(prod.id);
    const pName = prod.name || "";
    setProductName(pName);
    updateAnswer("product", pName);
    if (prod.price) {
      updateAnswer("price", String(prod.price));
    }
    setUploadError(null);
    setProductImage(null);
    setProductPreview(null);

    const imgUrl = prod.imageUrl || prod.image_url;
    if (!imgUrl) {
      setUploadError("This catalog item has no photo. Please upload a reference photo for this product below.");
      return;
    }

    setProductPreview(imgUrl);

    if (imgUrl.startsWith("data:")) {
      try {
        const arr = imgUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], `${pName.replace(/\s+/g, "_") || "product"}.jpg`, { type: mime });
        setProductImage(file);
      } catch (err) {
        console.warn("Could not decode catalog data URL:", err);
        setUploadError("Could not process product image. You can upload it directly below.");
      }
      return;
    }

    try {
      const resp = await fetch(imgUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const file = new File([blob], `${pName.replace(/\s+/g, "_") || "product"}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      setProductImage(file);
    } catch (err) {
      console.warn("Could not load catalog product image file:", err);
      setUploadError("Could not download catalog reference image. You can upload the photo directly below.");
    }
  };

  // File drop/picker handler for Step 1
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file (JPEG, PNG, WEBP).");
      return;
    }
    if (file.size < 100) {
      setUploadError("Image file appears corrupt or empty (minimum 100 bytes).");
      return;
    }

    setUploadError(null);
    setProductImage(file);
    const url = URL.createObjectURL(file);
    setProductPreview(url);
    setSelectedCatalogId(null);
  };

  // Determine effective avatarId sent to backend
  const getEffectiveAvatarId = (): string => {
    if (mode === "product_only") {
      return "studio-plain";
    }
    if (mode === "lifestyle") {
      return includeLifestyleModel ? selectedModelId : "studio-plain";
    }
    return selectedModelId;
  };

  // Generate Photoshoot
  const handleGenerate = async () => {
    if (!productImage) {
      setGenerationError("Please select or upload a valid product image.");
      setStep("select_product");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setStep("generating");

    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const formData = new FormData();
      formData.append("productImage", productImage);
      formData.append("productName", creativeAnswers.product || productName || "Product");
      formData.append("avatarId", getEffectiveAvatarId());
      formData.append("backgroundId", creativeAnswers.background || "white-studio");
      formData.append("mode", mode);
      formData.append("includeModel", String(mode === "lifestyle" ? includeLifestyleModel : mode === "model"));
      formData.append("includeLogo", String(includeLogo));

      // Append all 10 creative questions answers
      formData.append("price", creativeAnswers.price || "");
      formData.append("offer", creativeAnswers.offer || "No offer");
      formData.append("mood", creativeAnswers.mood || "Premium & luxurious");
      formData.append("background", creativeAnswers.background || "Bright studio white");
      formData.append("lighting", creativeAnswers.lighting || "Soft natural light");
      formData.append("mainText", creativeAnswers.mainText || "");
      formData.append("language", creativeAnswers.language || "English");
      formData.append("urgency", creativeAnswers.urgency || "No urgency");
      formData.append("creativeAnswers", JSON.stringify(creativeAnswers));

      if (includeLogo && session.brandProfile?.logoUrl) {
        try {
          const logoResp = await fetch(session.brandProfile.logoUrl);
          if (logoResp.ok) {
            const logoBlob = await logoResp.blob();
            formData.append("logoImage", new File([logoBlob], "brand-logo.png", { type: logoBlob.type }));
          }
        } catch (le) {
          console.warn("Could not fetch brand logo for photoshoot:", le);
        }
      }

      const sessionData = await getSafeSession();
      const token = sessionData?.access_token;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${BASE}/api/photoshoot`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.shots) {
        const normalizedShots = data.shots.map((shot: any) => ({
          ...shot,
          url: resolveFullImageUrl(shot.url),
        }));
        setShots(normalizedShots);
        setStep("results");
      } else {
        throw new Error("Failed to generate photoshoot shots.");
      }
    } catch (err: any) {
      console.error("[Photoshoot] Generation error:", err);
      setGenerationError(err.message || "Photoshoot generation failed. Please try again.");
      setStep("review");
    } finally {
      setIsGenerating(false);
    }
  };

  // Custom Model Registration
  const handleCreateCustomModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setCustomModelError("Please enter a model name.");
      return;
    }
    if (customAge < 18) {
      setCustomModelError("Model must be an adult (age 18+).");
      return;
    }

    setCreatingModel(true);
    setCustomModelError(null);

    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const formData = new FormData();
      formData.append("name", customName.trim());
      formData.append("gender", customGender);
      formData.append("age", String(customAge));
      formData.append("style", customStyle);
      formData.append("skinTone", customSkinTone);
      formData.append("hairStyle", customHairStyle);
      if (customImageFile) {
        formData.append("modelImage", customImageFile);
      }

      const res = await fetch(`${BASE}/api/photoshoot/custom-model`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.model) {
        const createdModel: AIModel = {
          id: data.model.id,
          name: data.model.name,
          gender: data.model.gender,
          style: data.model.style,
          description: data.model.description,
          imagePath: customImagePreview || "/models/photoshoot/custom-placeholder.png",
        };

        setModels((prev) => [createdModel, ...prev]);
        setSelectedModelId(createdModel.id);
        setShowCustomModal(false);
        setCustomName("");
        setCustomAge(26);
        setCustomImageFile(null);
        setCustomImagePreview(null);
      } else {
        throw new Error("Model registration failed.");
      }
    } catch (err: any) {
      setCustomModelError(err.message || "Failed to create custom model.");
    } finally {
      setCreatingModel(false);
    }
  };

  // Save to Library
  const handleSaveAsset = async (shot: { label: string; url: string; success: boolean }, idx: number) => {
    if (!shot.success || !shot.url) return;
    if (savingShotIdx !== null || savedShots[idx]) return;

    setSavingShotIdx(idx);
    setSaveFeedback((prev) => ({ ...prev, [idx]: "Saving to Library..." }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const authSession = await getSafeSession();
      const token = authSession?.access_token;

      if (!token) {
        throw new Error("Authentication required. Please sign in to save assets to your library.");
      }

      const pTitle = creativeAnswers.product || productName || "Product";
      const targetUrl = resolveFullImageUrl(shot.url);

      const res = await fetch(`${BASE}/api/photoshoot/save-to-library`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: targetUrl,
          productName: pTitle,
          mode: mode,
          label: shot.label,
        }),
        signal: controller.signal,
      });

      const saveRes = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(saveRes.detail || `Server returned HTTP ${res.status}`);
      }

      if (saveRes.success && saveRes.asset) {
        const persistedUrl = resolveFullImageUrl(saveRes.asset?.assetUrl || targetUrl);
        addAssetToLibrary({
          id: saveRes.asset?.id || `shoot_${Date.now()}_${idx}`,
          type: "photoshoot",
          url: persistedUrl,
          metadata: {
            title: `${pTitle} — ${shot.label}`,
            format: "image/jpeg",
            mode: mode,
            caption: currentCaption,
          },
          createdAt: new Date().toISOString(),
        });

        addRecentWork({
          type: "photoshoot",
          url: persistedUrl,
          label: `${pTitle} (${shot.label})`,
        });

        setSavedShots((prev) => ({ ...prev, [idx]: true }));
        setSaveFeedback((prev) => ({ ...prev, [idx]: "Saved to Library! ✓" }));
      } else {
        throw new Error(saveRes.error || saveRes.detail || "Failed to persist asset to library.");
      }
    } catch (err: any) {
      const errorMsg =
        err.name === "AbortError"
          ? "Request timed out. Please try again."
          : err.message || "Failed to save asset";
      setSaveFeedback((prev) => ({ ...prev, [idx]: `Error: ${errorMsg}` }));
    } finally {
      clearTimeout(timeoutId);
      setSavingShotIdx(null);
    }
  };

  // Instagram Publish
  const handlePostToInstagram = async (shot: { label: string; url: string; success: boolean }, index: number) => {
    try {
      const status = await getInstagramStatus();
      if (!status.connected) {
        setConnectingInstagram(true);
        const authUrl = await getInstagramConnectUrl();
        await openInstagramOAuthPopup(authUrl);
        setConnectingInstagram(false);

        const newStatus = await getInstagramStatus();
        if (newStatus.connected) {
          setPublishModalShot({
            shot,
            connectedUsername: newStatus.username || "instagram",
            index,
          });
          setIsPublishModalOpen(true);
        } else {
          setInstagramToast("Instagram connection was not completed. Please connect to publish.");
          setTimeout(() => setInstagramToast(null), 4000);
        }
      } else {
        setPublishModalShot({
          shot,
          connectedUsername: status.username || "instagram",
          index,
        });
        setIsPublishModalOpen(true);
      }
    } catch (e: any) {
      setConnectingInstagram(false);
      setInstagramToast(e.message || "Failed to start Instagram connection.");
      setTimeout(() => setInstagramToast(null), 4000);
    }
  };

  // PNG Download state & handler
  const [downloadingIdx, setDownloadingIdx] = useState<Record<number, boolean>>({});
  const [downloadFeedback, setDownloadFeedback] = useState<Record<number, string>>({});

  // WhatsApp share modal state
  const [whatsAppModalShot, setWhatsAppModalShot] = useState<{
    shot: { label: string; url: string; success: boolean };
    idx: number;
  } | null>(null);
  const [whatsAppStatusDone, setWhatsAppStatusDone] = useState(false);

  const handleDownloadPng = async (shot: { label: string; url: string; success: boolean }, idx: number) => {
    if (!shot.success || !shot.url) return;
    setDownloadingIdx((prev) => ({ ...prev, [idx]: true }));
    setDownloadFeedback((prev) => ({ ...prev, [idx]: "Exporting PNG..." }));

    const pTitle = creativeAnswers.product || productName || "product";
    const filename = `${pTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${shot.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;

    try {
      const ok = await downloadAsPng(shot.url, filename);
      if (ok) {
        setDownloadFeedback((prev) => ({ ...prev, [idx]: "PNG Downloaded ✓" }));
        setTimeout(() => setDownloadFeedback((prev) => ({ ...prev, [idx]: "" })), 3000);
      } else {
        setDownloadFeedback((prev) => ({ ...prev, [idx]: "Failed to download" }));
      }
    } catch (err: any) {
      setDownloadFeedback((prev) => ({ ...prev, [idx]: `Error: ${err.message || "Download error"}` }));
    } finally {
      setDownloadingIdx((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleWhatsAppContactShare = async () => {
    if (!whatsAppModalShot) return;
    const { shot } = whatsAppModalShot;
    const pTitle = creativeAnswers.product || productName || "product";
    await shareToWhatsAppContact(shot.url, currentCaption, pTitle);
  };

  const handleWhatsAppStatusShare = async () => {
    if (!whatsAppModalShot) return;
    const { shot } = whatsAppModalShot;
    const pTitle = creativeAnswers.product || productName || "product";
    const filename = `${pTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${shot.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;

    // 1. Download valid PNG
    await downloadAsPng(shot.url, filename);

    // 2. Copy caption to clipboard
    if (currentCaption && typeof navigator !== "undefined") {
      try {
        await navigator.clipboard.writeText(currentCaption);
      } catch {}
    }

    setWhatsAppStatusDone(true);
  };

  const activeModel = models.find((m) => m.id === selectedModelId);
  const currentQuestion: CreativeQuestion = CREATIVE_QUESTIONS[currentQuestionIdx];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0B0907] text-[#F7F3ED] pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#21170F] border border-[#3B2B1E] text-[#E8B66F] text-xs font-semibold mb-3">
              <Camera size={14} />
              <span>AI Product Photoshoot Studio</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-space-grotesk text-white mb-2">
              Professional Product Photoshoot
            </h1>
            <p className="text-[#B9AA99] text-sm max-w-2xl">
              Complete creative control: Select your product, answer the 10 creative questions, choose your photoshoot mode, and generate 3 commercial-grade compositions.
            </p>
          </div>

          {/* Stepper Navigation */}
          {step !== "generating" && (
            <div className="mb-8 p-4 rounded-2xl bg-[#14100D] border border-[#3B2B1E] flex flex-wrap items-center justify-between gap-2 text-xs">
              {[
                { id: "select_product", label: "1. Select Product" },
                { id: "questions", label: "2. Creative Questions (10)" },
                { id: "mode", label: "3. Photoshoot Mode" },
                { id: "review", label: "4. Review Settings" },
                { id: "results", label: "5. Generated Results" },
              ].map((s, idx) => {
                const isActive = step === s.id;
                const isPast =
                  (s.id === "select_product" && step !== "select_product") ||
                  (s.id === "questions" && ["mode", "review", "results"].includes(step)) ||
                  (s.id === "mode" && ["review", "results"].includes(step)) ||
                  (s.id === "review" && step === "results");

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#21170F] text-[#E8B66F] border border-[#E8B66F]/40 shadow-sm"
                        : isPast
                        ? "text-white hover:text-[#E8B66F]"
                        : "text-[#8A7B6D]"
                    }`}
                  >
                    {isPast && <Check size={12} className="text-emerald-400" />}
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {generationError && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-sm flex items-center justify-between">
              <span>{generationError}</span>
              <button
                onClick={() => setGenerationError(null)}
                className="text-red-400 hover:text-white text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ─── STEP 1: SELECT PRODUCT ─── */}
            {step === "select_product" && (
              <motion.div
                key="step-product"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1">
                      Step 1: Select Product & Reference Image
                    </h2>
                    <p className="text-[#B9AA99] text-xs sm:text-sm">
                      Choose an existing catalog item or upload a clear photo of your product.
                    </p>
                  </div>

                  {session.products && session.products.length > 0 && (
                    <div className="flex rounded-xl bg-[#0B0907] p-1 border border-[#3B2B1E] shrink-0">
                      <button
                        onClick={() => setProductSource("catalog")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          productSource === "catalog"
                            ? "bg-[#21170F] text-[#E8B66F] border border-[#3B2B1E]"
                            : "text-[#B9AA99] hover:text-white"
                        }`}
                      >
                        From Catalog ({session.products.length})
                      </button>
                      <button
                        onClick={() => setProductSource("upload")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          productSource === "upload"
                            ? "bg-[#21170F] text-[#E8B66F] border border-[#3B2B1E]"
                            : "text-[#B9AA99] hover:text-white"
                        }`}
                      >
                        Upload Photo
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                {/* Catalog Product Selection */}
                {productSource === "catalog" && session.products && session.products.length > 0 ? (
                  <div className="space-y-4 mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                      {session.products.map((prod: any) => {
                        const isSelected = selectedCatalogId === prod.id;
                        const pImg = prod.imageUrl || prod.image_url;

                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectCatalogProduct(prod)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center group ${
                              isSelected
                                ? "bg-[#21170F] border-[#E8B66F] shadow-md shadow-[#E8B66F]/10"
                                : "bg-[#0B0907] border-[#3B2B1E] hover:border-[#E8B66F]/50"
                            }`}
                          >
                            <div className="w-full h-24 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60 mb-2 flex items-center justify-center overflow-hidden">
                              {pImg ? (
                                <img src={pImg} alt={prod.name} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <ShoppingBag size={20} className="text-[#8A7B6D]" />
                              )}
                            </div>
                            <p className="font-semibold text-xs text-white line-clamp-1 group-hover:text-[#E8B66F]">
                              {prod.name}
                            </p>
                            {prod.price && <p className="text-[11px] text-[#E8B66F] mt-0.5">₹{prod.price}</p>}
                          </div>
                        );
                      })}
                    </div>

                    {uploadError && (
                      <p className="text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800">
                        {uploadError}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Direct Upload Path */
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                        Product Name <span className="text-[#E8B66F]">*</span>
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => {
                          setProductName(e.target.value);
                          updateAnswer("product", e.target.value);
                        }}
                        placeholder="e.g. Zari Kanjivaram Silk Saree, Bluetooth Speaker"
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-sm"
                      />
                    </div>

                    <div
                      onClick={() => fileRef.current?.click()}
                      className="p-8 rounded-2xl border-2 border-dashed border-[#3B2B1E] hover:border-[#E8B66F]/60 bg-[#0B0907]/60 hover:bg-[#21170F]/40 transition-all text-center cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-[#21170F] border border-[#3B2B1E] rounded-xl flex items-center justify-center mx-auto mb-2 text-[#B9AA99] group-hover:text-[#E8B66F] transition-colors">
                        <Upload size={20} />
                      </div>
                      <p className="font-semibold text-white text-sm mb-1">Upload Product Reference Photo</p>
                      <p className="text-xs text-[#8A7B6D]">Click to select a photo of your product (JPEG, PNG, WEBP)</p>
                    </div>

                    {uploadError && (
                      <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800">
                        {uploadError}
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Product Preview Card */}
                {productPreview && (
                  <div className="mb-8 p-4 rounded-xl bg-[#0B0907] border border-[#E8B66F]/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-[#14100D] border border-[#3B2B1E] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={productPreview} alt="Selected Product" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{productName || "Selected Product"}</p>
                        <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={12} /> Reference conditioned & ready
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-[#E8B66F] hover:underline cursor-pointer shrink-0"
                    >
                      Replace Photo
                    </button>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => {
                      if (!productName.trim() && creativeAnswers.product) {
                        setProductName(creativeAnswers.product);
                      }
                      setStep("questions");
                    }}
                    disabled={!productPreview || (!productName.trim() && !creativeAnswers.product.trim())}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md shadow-[#E8B66F]/10"
                  >
                    <span>Continue to Creative Questions (10)</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: ANSWER ALL 10 CREATIVE QUESTIONS ─── */}
            {step === "questions" && (
              <motion.div
                key={`question-${currentQuestionIdx}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                {/* Question Progress Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-[#B9AA99] mb-2 font-medium">
                    <span>
                      Question {currentQuestionIdx + 1} of {CREATIVE_QUESTIONS.length}
                    </span>
                    <span className="text-[#E8B66F]">
                      {Math.round(((currentQuestionIdx + 1) / CREATIVE_QUESTIONS.length) * 100)}% Completed
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#21170F] rounded-full overflow-hidden border border-[#3B2B1E]/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] transition-all duration-300"
                      style={{ width: `${((currentQuestionIdx + 1) / CREATIVE_QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Label & Description */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-2">
                    {currentQuestion.label}
                  </h2>
                  {currentQuestion.hint && (
                    <p className="text-[#B9AA99] text-xs sm:text-sm">{currentQuestion.hint}</p>
                  )}
                </div>

                <input
                  type="file"
                  ref={questionFileRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                {/* Question Inputs by Type */}
                <div className="mb-8 min-h-[160px]">
                  {/* Text Input */}
                  {currentQuestion.type === "text" && (
                    <input
                      type="text"
                      value={creativeAnswers[currentQuestion.key] || ""}
                      onChange={(e) => updateAnswer(currentQuestion.key, e.target.value)}
                      placeholder={currentQuestion.placeholder}
                      className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-4 py-3.5 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-base"
                      autoFocus
                    />
                  )}

                  {/* Number Input */}
                  {currentQuestion.type === "number" && (
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-[#E8B66F] font-bold text-base">₹</span>
                      <input
                        type="number"
                        value={creativeAnswers[currentQuestion.key] || ""}
                        onChange={(e) => updateAnswer(currentQuestion.key, e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl pl-9 pr-4 py-3.5 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-base"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Choice Buttons */}
                  {currentQuestion.type === "choice" && currentQuestion.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQuestion.options.map((opt: string) => {
                        const isSelected = creativeAnswers[currentQuestion.key] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => updateAnswer(currentQuestion.key, opt)}
                            className={`p-4 rounded-xl border text-left font-medium transition-all cursor-pointer flex items-center justify-between text-sm ${
                              isSelected
                                ? "bg-[#21170F] text-[#E8B66F] border-[#E8B66F] shadow-sm shadow-[#E8B66F]/10"
                                : "bg-[#0B0907] text-[#B9AA99] border-[#3B2B1E] hover:border-[#E8B66F]/50 hover:text-white"
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check size={16} className="text-[#E8B66F]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Image Question */}
                  {currentQuestion.type === "image" && (
                    <div className="space-y-4">
                      {productPreview ? (
                        <div className="p-6 rounded-2xl bg-[#0B0907] border border-[#E8B66F]/40 flex flex-col sm:flex-row items-center gap-6">
                          <div className="w-28 h-28 rounded-xl bg-[#14100D] border border-[#3B2B1E] p-2 flex items-center justify-center shrink-0 overflow-hidden">
                            <img src={productPreview} alt="Reference Photo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div>
                            <p className="font-semibold text-white text-base mb-1">
                              {creativeAnswers.product || productName || "Current Product Photo"}
                            </p>
                            <p className="text-xs text-emerald-400 flex items-center gap-1 mb-3">
                              <CheckCircle2 size={13} /> Active reference image ready for generation
                            </p>
                            <button
                              onClick={() => questionFileRef.current?.click()}
                              className="text-xs font-semibold text-[#E8B66F] hover:underline cursor-pointer"
                            >
                              Upload different photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => questionFileRef.current?.click()}
                          className="p-8 rounded-2xl border-2 border-dashed border-[#3B2B1E] hover:border-[#E8B66F]/60 bg-[#0B0907]/60 text-center cursor-pointer"
                        >
                          <Upload size={24} className="mx-auto mb-2 text-[#E8B66F]" />
                          <p className="font-semibold text-white text-sm">Upload product reference photo</p>
                          <p className="text-xs text-[#8A7B6D]">Click to select a photo</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Back / Next Navigation */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => {
                      if (currentQuestionIdx > 0) {
                        setCurrentQuestionIdx(currentQuestionIdx - 1);
                      } else {
                        setStep("select_product");
                      }
                    }}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={() => {
                      // Validate required text for product question
                      if (currentQuestion.key === "product" && !creativeAnswers.product?.trim()) {
                        alert("Please enter your main product name.");
                        return;
                      }
                      if (currentQuestionIdx < CREATIVE_QUESTIONS.length - 1) {
                        setCurrentQuestionIdx(currentQuestionIdx + 1);
                      } else {
                        setStep("mode");
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md shadow-[#E8B66F]/10"
                  >
                    <span>
                      {currentQuestionIdx === CREATIVE_QUESTIONS.length - 1
                        ? "Continue to Photoshoot Mode"
                        : "Next Question"}
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: PHOTOSHOOT MODE ─── */}
            {step === "mode" && (
              <motion.div
                key="step-mode"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1.5">
                    Step 3: Select Photoshoot Mode
                  </h2>
                  <p className="text-[#B9AA99] text-sm">
                    Choose how your product should be framed and composed.
                  </p>
                </div>

                {/* 3 Photoshoot Mode Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {MODES.map((m) => {
                    const isSelected = mode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#21170F] border-[#E8B66F] shadow-lg shadow-[#E8B66F]/10"
                            : "bg-[#0B0907] border-[#3B2B1E] hover:border-[#E8B66F]/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">{m.icon}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isSelected
                                  ? "bg-[#E8B66F]/20 text-[#E8B66F] border-[#E8B66F]/40"
                                  : "bg-[#14100D] text-[#8A7B6D] border-[#3B2B1E]"
                              }`}
                            >
                              {m.badge}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-base mb-1">{m.title}</h3>
                          <p className="text-xs text-[#B9AA99] leading-relaxed">{m.subtitle}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#3B2B1E]/60 flex items-center text-xs font-semibold">
                          {isSelected ? (
                            <span className="text-[#E8B66F] flex items-center gap-1">
                              <Check size={14} /> Selected Mode
                            </span>
                          ) : (
                            <span className="text-[#8A7B6D]">Select Mode</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Model Selection Grid (When mode is "model") */}
                {mode === "model" && (
                  <div className="mb-8 pt-6 border-t border-[#3B2B1E]">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-white text-base">Choose an Indian AI Model</h4>
                        <p className="text-xs text-[#B9AA99]">
                          Approved adult models representing distinct Indian aesthetics.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowCustomModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#21170F] border border-[#3B2B1E] text-xs text-[#E8B66F] hover:border-[#E8B66F] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Custom Model</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {models.map((m) => {
                        const isChosen = selectedModelId === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedModelId(m.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isChosen
                                ? "bg-[#21170F] border-[#E8B66F] shadow-md shadow-[#E8B66F]/10"
                                : "bg-[#0B0907] border-[#3B2B1E] hover:border-[#E8B66F]/40"
                            }`}
                          >
                            <div className="w-full h-24 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60 mb-2 overflow-hidden flex items-center justify-center">
                              <img src={m.imagePath} alt={m.name} className="w-full h-full object-cover" />
                            </div>
                            <p className="font-bold text-xs text-white">{m.name}</p>
                            <p className="text-[10px] text-[#8A7B6D] truncate">{m.style}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lifestyle Mode Toggle */}
                {mode === "lifestyle" && (
                  <div className="mb-8 p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E] flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white text-sm">Include human presence in lifestyle scene</p>
                      <p className="text-xs text-[#B9AA99]">
                        When enabled, a model is placed naturally using or holding the product.
                      </p>
                    </div>
                    <button
                      onClick={() => setIncludeLifestyleModel(!includeLifestyleModel)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        includeLifestyleModel ? "bg-[#E8B66F]" : "bg-[#3B2B1E]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-[#0B0907] absolute top-1 transition-transform ${
                          includeLifestyleModel ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => {
                      setStep("questions");
                      setCurrentQuestionIdx(CREATIVE_QUESTIONS.length - 1);
                    }}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Questions</span>
                  </button>

                  <button
                    onClick={() => setStep("review")}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md shadow-[#E8B66F]/10"
                  >
                    <span>Continue to Review Settings</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 4: REVIEW GENERATION SETTINGS ─── */}
            {step === "review" && (
              <motion.div
                key="step-review"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1.5">
                    Step 4: Review Generation Settings
                  </h2>
                  <p className="text-[#B9AA99] text-sm">
                    Review your selected product, photoshoot mode, and all 10 creative answers before generating.
                  </p>
                </div>

                <div className="space-y-6 mb-8">
                  {/* Selected Product & Mode Banner */}
                  <div className="p-5 rounded-2xl bg-[#0B0907] border border-[#3B2B1E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {productPreview && (
                        <div className="w-16 h-16 rounded-xl bg-[#14100D] border border-[#3B2B1E] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={productPreview} alt="Reference" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-white text-lg">{creativeAnswers.product || productName}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs bg-[#21170F] text-[#E8B66F] px-2.5 py-0.5 rounded-full border border-[#3B2B1E]">
                            Mode: {MODES.find((m) => m.id === mode)?.title}
                          </span>
                          {mode === "model" && activeModel && (
                            <span className="text-xs text-[#B9AA99]">
                              Model: <span className="text-white font-medium">{activeModel.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setStep("select_product")}
                      className="text-xs text-[#E8B66F] hover:underline cursor-pointer shrink-0"
                    >
                      Change Product
                    </button>
                  </div>

                  {/* 10 Creative Questions Review Table */}
                  <div className="p-5 rounded-2xl bg-[#0B0907] border border-[#3B2B1E]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-white text-sm">Creative Preferences (10 Answers)</h4>
                      <button
                        onClick={() => {
                          setStep("questions");
                          setCurrentQuestionIdx(0);
                        }}
                        className="text-xs text-[#E8B66F] hover:underline cursor-pointer"
                      >
                        Edit Answers
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">1. Main Product</span>
                        <span className="text-white font-medium">{creativeAnswers.product || productName}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">2. Price</span>
                        <span className="text-white font-medium">₹{creativeAnswers.price || "N/A"}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">3. Special Offer</span>
                        <span className="text-white font-medium">{creativeAnswers.offer}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">4. Visual Mood</span>
                        <span className="text-white font-medium">{creativeAnswers.mood}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">5. Background Setting</span>
                        <span className="text-white font-medium">{creativeAnswers.background}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">6. Lighting Style</span>
                        <span className="text-white font-medium">{creativeAnswers.lighting}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">7. Reference Photo</span>
                        <span className="text-emerald-400 font-medium">Attached (Conditioned)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">8. Main Text on Creative</span>
                        <span className="text-white font-medium">{creativeAnswers.mainText || "None (Clean)"}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">9. Caption Language</span>
                        <span className="text-white font-medium">{creativeAnswers.language}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#14100D] border border-[#3B2B1E]/60">
                        <span className="text-[#8A7B6D] block">10. Urgency</span>
                        <span className="text-white font-medium">{creativeAnswers.urgency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Logo Overlay Toggle */}
                  <div className="p-5 rounded-2xl bg-[#0B0907] border border-[#3B2B1E] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {session.brandProfile?.logoUrl ? (
                        <div className="w-10 h-10 rounded-lg bg-[#14100D] border border-[#3B2B1E] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={session.brandProfile.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#21170F] border border-[#3B2B1E] flex items-center justify-center text-[#E8B66F] font-bold text-xs shrink-0">
                          WM
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white text-sm">Apply Brand Logo / Watermark</p>
                        <p className="text-xs text-[#8A7B6D]">
                          {session.brandProfile?.logoUrl
                            ? "Overlays your uploaded brand logo cleanly on the top-right of every shot."
                            : "No logo uploaded in Brand Profile. Clean presentation will be used."}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIncludeLogo(!includeLogo)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        includeLogo ? "bg-[#E8B66F]" : "bg-[#3B2B1E]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-[#0B0907] absolute top-1 transition-transform ${
                          includeLogo ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Back / Generate Navigation */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => setStep("mode")}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Mode</span>
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-lg shadow-[#E8B66F]/15"
                  >
                    <Sparkles size={16} />
                    <span>Generate Photoshoot (3 Shots)</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 5: GENERATING PROGRESS ─── */}
            {step === "generating" && (
              <motion.div
                key="step-generating"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-10 text-center shadow-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#21170F] border border-[#E8B66F] flex items-center justify-center mx-auto mb-6 text-[#E8B66F] shadow-lg shadow-[#E8B66F]/20">
                  <RefreshCw size={32} className="animate-spin text-[#E8B66F]" />
                </div>

                <h2 className="text-2xl font-bold font-space-grotesk text-white mb-2">
                  Rendering Commercial Photoshoot...
                </h2>
                <p className="text-[#B9AA99] text-sm max-w-md mx-auto mb-8">
                  Conditioning physical reference details, applying {creativeAnswers.lighting} lighting and {creativeAnswers.mood} aesthetic across 3 commercial compositions.
                </p>

                <div className="max-w-md mx-auto space-y-3 text-left p-5 rounded-2xl bg-[#0B0907] border border-[#3B2B1E] text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>Visual product reference conditioned</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>Lighting: {creativeAnswers.lighting}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>Mood: {creativeAnswers.mood}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#E8B66F] animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Rendering 3 distinct commercial advertisement compositions...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 6: RESULTS ─── */}
            {step === "results" && (
              <motion.div
                key="step-results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Result Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#14100D] border border-[#3B2B1E]">
                  <div>
                    <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1">
                      Photoshoot Results (3 Shots)
                    </h2>
                    <p className="text-[#B9AA99] text-xs sm:text-sm">
                      Generated for <span className="text-[#E8B66F] font-semibold">{creativeAnswers.product || productName}</span> in {mode} mode.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-4 py-2.5 rounded-xl border border-[#3B2B1E] bg-[#21170F] text-[#E8B66F] hover:border-[#E8B66F] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw size={14} />
                      <span>Regenerate</span>
                    </button>

                    <button
                      onClick={() => {
                        setStep("select_product");
                        setShots([]);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition-all shadow-md shadow-[#E8B66F]/10"
                    >
                      <Plus size={14} />
                      <span>New Photoshoot</span>
                    </button>
                  </div>
                </div>

                {/* 3 Shots Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {shots.map((shot, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#14100D] border border-[#3B2B1E] overflow-hidden flex flex-col justify-between shadow-xl"
                    >
                      {/* Shot Image & Zoom Preview */}
                      <div className="relative aspect-square bg-[#0B0907] overflow-hidden group">
                        {shot.success && shot.url ? (
                          <>
                            <img
                              src={resolveFullImageUrl(shot.url)}
                              alt={shot.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => setPreviewModalUrl(resolveFullImageUrl(shot.url))}
                                className="p-2.5 rounded-xl bg-[#0B0907]/90 text-white hover:text-[#E8B66F] border border-[#3B2B1E] cursor-pointer"
                                title="Zoom Preview"
                              >
                                <Eye size={18} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-red-400">
                            <X size={24} className="mb-2" />
                            <p className="text-xs">{shot.error || "Generation error"}</p>
                          </div>
                        )}

                        <div className="absolute top-3 left-3 bg-[#0B0907]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#3B2B1E] text-[11px] font-semibold text-white">
                          {shot.label}
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="p-4 space-y-2">
                        {/* Primary Row: Save to Library + Download PNG */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveAsset(shot, idx)}
                            disabled={savedShots[idx] || savingShotIdx === idx || !shot.success}
                            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              savedShots[idx]
                                ? "bg-emerald-950/60 border border-emerald-700 text-emerald-400"
                                : "bg-[#21170F] border border-[#3B2B1E] text-white hover:border-[#E8B66F] hover:text-[#E8B66F]"
                            }`}
                          >
                            <Bookmark size={14} />
                            <span>{saveFeedback[idx] || (savedShots[idx] ? "Saved ✓" : "Save to Library")}</span>
                          </button>

                          <button
                            onClick={() => handleDownloadPng(shot, idx)}
                            disabled={downloadingIdx[idx] || !shot.success}
                            className="flex-1 py-2.5 rounded-xl bg-[#21170F] border border-[#3B2B1E] text-white hover:border-[#E8B66F] hover:text-[#E8B66F] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            title="Download verified PNG image"
                          >
                            <Download size={14} />
                            <span>{downloadFeedback[idx] || (downloadingIdx[idx] ? "Exporting..." : "Download PNG")}</span>
                          </button>
                        </div>

                        {/* Social Row: WhatsApp Share + Instagram Publish */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setWhatsAppModalShot({ shot, idx });
                              setWhatsAppStatusDone(false);
                            }}
                            disabled={!shot.success}
                            className="flex-1 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-600 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handlePostToInstagram(shot, idx)}
                            disabled={!shot.success || connectingInstagram}
                            className="flex-1 py-2 rounded-xl bg-[#21170F] border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F] transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Publish directly to Instagram"
                          >
                            <Share2 size={14} />
                            <span>Instagram</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Caption Alternatives Selector */}
                <div className="p-6 rounded-2xl bg-[#14100D] border border-[#3B2B1E]">
                  <h3 className="font-bold text-white text-base mb-1">
                    Image-Aware Captions & Hashtags
                  </h3>
                  <p className="text-xs text-[#B9AA99] mb-4">
                    Choose from Punchy, Story, or Offer-driven captions tailored to {creativeAnswers.product || productName}.
                  </p>
                  <CaptionSelector
                    productName={creativeAnswers.product || productName}
                    brandName={session.brandProfile?.businessName || session.workspace?.businessName || "Our Brand"}
                    category={session.brandProfile?.category || "Fashion"}
                    shotLabel="Photoshoot Commercial"
                    tone={creativeAnswers.mood || "Premium & luxurious"}
                    offer={creativeAnswers.offer}
                    onCaptionChange={(cap: string) => setCurrentCaption(cap)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom Preview Modal */}
          {previewModalUrl && (
            <div
              onClick={() => setPreviewModalUrl(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-3xl max-h-[90vh] bg-[#14100D] border border-[#3B2B1E] rounded-2xl overflow-hidden shadow-2xl relative"
              >
                <button
                  onClick={() => setPreviewModalUrl(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-[#0B0907]/80 text-white hover:text-[#E8B66F] border border-[#3B2B1E] cursor-pointer"
                >
                  <X size={18} />
                </button>
                <img src={resolveFullImageUrl(previewModalUrl)} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
              </div>
            </div>
          )}

          {/* Custom Model Registration Modal */}
          {showCustomModal && (
            <div
              onClick={() => setShowCustomModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg">Create Custom Adult Model</h3>
                  <button onClick={() => setShowCustomModal(false)} className="text-[#8A7B6D] hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateCustomModel} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1">Model Name *</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Maya"
                      className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-3 py-2 text-white text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#B9AA99] mb-1">Gender *</label>
                      <select
                        value={customGender}
                        onChange={(e) => setCustomGender(e.target.value as any)}
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-3 py-2 text-white text-sm"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#B9AA99] mb-1">Age (18+) *</label>
                      <input
                        type="number"
                        min={18}
                        max={65}
                        value={customAge}
                        onChange={(e) => setCustomAge(parseInt(e.target.value) || 18)}
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-3 py-2 text-white text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1">Style Aesthetic</label>
                    <input
                      type="text"
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      placeholder="e.g. Traditional Bridal, High Fashion"
                      className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-3 py-2 text-white text-sm"
                    />
                  </div>

                  {customModelError && (
                    <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800">
                      {customModelError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomModal(false)}
                      className="px-4 py-2 rounded-xl border border-[#3B2B1E] text-xs text-[#B9AA99]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingModel}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold text-xs"
                    >
                      {creatingModel ? "Creating..." : "Save Custom Model"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* WhatsApp Share Modal */}
          {whatsAppModalShot && (
            <div
              onClick={() => {
                setWhatsAppModalShot(null);
                setWhatsAppStatusDone(false);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Share on WhatsApp</h3>
                      <p className="text-[11px] text-[#B9AA99]">{whatsAppModalShot.shot.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setWhatsAppModalShot(null);
                      setWhatsAppStatusDone(false);
                    }}
                    className="p-1 rounded-lg text-[#8A7B6D] hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Option 1: Contact / Group Share */}
                  <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E] hover:border-emerald-700/50 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-semibold text-white text-xs">Option 1: Contact or Group Chat</h4>
                        <p className="text-[11px] text-[#8A7B6D] mt-0.5">
                          Sends image and marketing caption directly to a customer, client, or group.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleWhatsAppContactShare}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle size={15} />
                      <span>Share with Contact / Group</span>
                    </button>
                  </div>

                  {/* Option 2: WhatsApp Status */}
                  <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E] hover:border-[#E8B66F]/40 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-semibold text-white text-xs">Option 2: WhatsApp Status</h4>
                        <p className="text-[11px] text-[#8A7B6D] mt-0.5">
                          WhatsApp does not permit 3rd-party web apps to post Status stories automatically. We export your high-res PNG and copy the caption for 1-tap posting.
                        </p>
                      </div>
                    </div>

                    {whatsAppStatusDone ? (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-xs text-emerald-300 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> PNG downloaded & caption copied!
                        </p>
                        <p className="text-[11px] text-emerald-400/80">
                          Now open WhatsApp &gt; Updates &gt; Tap "My Status" &gt; select your downloaded PNG and paste the caption.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleWhatsAppStatusShare}
                        className="w-full py-2.5 rounded-xl bg-[#21170F] border border-[#3B2B1E] hover:border-[#E8B66F] text-[#E8B66F] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Download size={15} />
                        <span>Download PNG &amp; Copy Caption for Status</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setWhatsAppModalShot(null);
                      setWhatsAppStatusDone(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#3B2B1E] text-xs text-[#B9AA99] hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instagram Publish Modal */}
          {isPublishModalOpen && publishModalShot && (
            <InstagramPublishModal
              isOpen={isPublishModalOpen}
              onClose={() => {
                setIsPublishModalOpen(false);
                setPublishModalShot(null);
              }}
              candidateId={`shoot_${publishModalShot.index}`}
              imageUrl={publishModalShot.shot.url}
              initialCaption={currentCaption}
              productName={creativeAnswers.product || productName}
              connectedUsername={publishModalShot.connectedUsername}
            />
          )}

          {/* Instagram Toast */}
          {instagramToast && (
            <div className="fixed bottom-6 right-6 z-50 bg-[#14100D] border border-[#E8B66F] text-white px-4 py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#E8B66F]" />
              <span>{instagramToast}</span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
