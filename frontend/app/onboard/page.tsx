'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoSession } from '@/components/providers/demo-session-provider';
import Navbar from '@/components/Navbar';
import { searchBrand } from '@/lib/api';
import {
  Search,
  Building2,
  MapPin,
  Globe,
  Upload,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Sparkles,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'Clothing / Fashion',
  'Electronics',
  'Food & Drinks',
  'Jewellery',
  'Salon & Beauty',
  'Pharmacy',
  'Home Decor',
  'Furniture',
  'Grocery / Kirana',
  'Mobile Repair',
  'Retail',
  'Other',
];

interface OnboardingData {
  step: number;
  businessName: string;
  category: string;
  city: string;
  description: string;
  website: string;
  logoUrl: string | null;
  instagram: string;
}

const STORAGE_KEY = 'govisual_onboarding_draft';

export default function OnboardPage() {
  const router = useRouter();
  const { session, authLoading, hasCompletedOnboarding, updateBrandProfileAndPersist, markBrandBookGenerated } = useDemoSession();

  const [step, setStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState<string>('');
  const [category, setCategory] = useState<string>('Clothing / Fashion');
  const [city, setCity] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [instagram, setInstagram] = useState<string>('');

  // Search state
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchAttempted, setSearchAttempted] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Brand Book optional generation state (Screen 6)
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [bookGenerated, setBookGenerated] = useState(false);
  const [brandBookError, setBrandBookError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect returning onboarded users (only if step < 6 so users currently completing Screen 6 are not prematurely booted)
  useEffect(() => {
    if (!authLoading && hasCompletedOnboarding && step < 6) {
      router.replace('/dashboard');
    }
  }, [authLoading, hasCompletedOnboarding, router, step]);

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Partial<OnboardingData> = JSON.parse(saved);
        if (parsed.step && parsed.step >= 1 && parsed.step <= 6) setStep(parsed.step);
        if (parsed.businessName) setBusinessName(parsed.businessName);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.city) setCity(parsed.city);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.website) setWebsite(parsed.website);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.instagram) setInstagram(parsed.instagram);
        return;
      }
    } catch (e) {
      console.warn('Could not parse onboarding draft from localStorage:', e);
    }

    // Prefill from current session if exists and not default
    if (session.brandProfile?.businessName && session.brandProfile.businessName !== 'My Brand') {
      setBusinessName(session.brandProfile.businessName);
    }
    if (session.brandProfile?.category) {
      setCategory(session.brandProfile.category);
    }
    if (session.brandProfile?.city) {
      setCity(session.brandProfile.city);
    }
    if (session.brandProfile?.website) {
      setWebsite(session.brandProfile.website);
    }
    if (session.brandProfile?.instagram) {
      setInstagram(session.brandProfile.instagram);
    }
    if (session.brandProfile?.logoUrl) {
      setLogoUrl(session.brandProfile.logoUrl);
    }
  }, [session]);

  // Auto-persist draft to localStorage
  useEffect(() => {
    if (step === 6) return; // Don't persist on success screen
    try {
      const draft: OnboardingData = {
        step,
        businessName,
        category,
        city,
        description,
        website,
        logoUrl,
        instagram,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // Storage quota or private mode
    }
  }, [step, businessName, category, city, description, website, logoUrl, instagram]);

  // Handle Search on Google Maps
  const handleSearchGoogle = async () => {
    if (!businessName.trim()) return;
    setSearchLoading(true);
    setSearchAttempted(true);
    try {
      const places = await searchBrand(businessName, city);
      setSearchResults(places || []);
    } catch (err) {
      console.warn('Google search failed or unconfigured:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    setBusinessName(place.name || businessName);
    if (place.address) {
      const parts = place.address.split(',');
      if (parts.length > 1) {
        setCity(parts[parts.length - 2]?.trim() || city);
      }
    }
    if (place.website) setWebsite(place.website);
    setStep(2);
  };

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Brand Profile (Screen 5 -> Screen 6)
  const handleSaveBrand = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateBrandProfileAndPersist({
        businessName: businessName.trim() || 'My Brand',
        category: category.trim() || 'Retail',
        city: city.trim() || undefined,
        brandSummary: description.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        logoUrl: logoUrl || undefined,
        onboardingComplete: true,
      });

      // Clear draft on successful persistence
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}

      setStep(6);
    } catch (err: any) {
      console.error('Failed to save brand profile:', err);
      setSaveError(err.message || 'Failed to save brand profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Optional Brand Book generation (Screen 6)
  const handleGenerateBrandBook = async () => {
    setIsGeneratingBook(true);
    setBrandBookError(null);
    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
      const payload = {
        businessName: businessName.trim() || 'My Brand',
        category: category.trim() || 'Clothing / Fashion',
        city: city.trim() || 'Mumbai',
        tagline: description.trim() || undefined,
        instagram: instagram.trim() || undefined,
      };

      const res = await fetch(`${BASE}/api/brandbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.detail) {
            errorDetail = Array.isArray(errJson.detail)
              ? errJson.detail.map((d: any) => `${d.loc?.filter((x: any) => x !== 'body').join('.') || 'field'}: ${d.msg}`).join('; ')
              : String(errJson.detail);
          }
        } catch {}
        throw new Error(`Generation failed (${res.status}): ${errorDetail}`);
      }

      const data = await res.json();
      if (data.success && data.brandBook) {
        try {
          localStorage.setItem('gv_brand_book', JSON.stringify(data.brandBook));
          sessionStorage.setItem('gv_brand_book', JSON.stringify(data.brandBook));
        } catch {}
        if (markBrandBookGenerated) {
          markBrandBookGenerated();
        }
        setBookGenerated(true);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err: any) {
      console.error('[Onboarding] Brand Book generation error:', err);
      setBrandBookError(err.message || 'Failed to generate Brand Book. You can continue to your dashboard and generate it anytime.');
    } finally {
      setIsGeneratingBook(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0907] flex items-center justify-center text-[#E8B66F] text-sm">
        Setting up your workspace...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0B0907] text-[#F7F3ED] pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator (Screens 1 to 5) */}
          {step <= 5 && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs text-[#B9AA99] mb-2 font-medium">
                <span>Step {step} of 5</span>
                <span>
                  {step === 1 && 'Find Business'}
                  {step === 2 && 'Confirm Details'}
                  {step === 3 && 'Upload Logo'}
                  {step === 4 && 'Instagram'}
                  {step === 5 && 'Review & Save'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#21170F] rounded-full overflow-hidden border border-[#3B2B1E]/40">
                <div
                  className="h-full bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ─── SCREEN 1: FIND YOUR BUSINESS ─── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-[#21170F] border border-[#3B2B1E] rounded-xl flex items-center justify-center mx-auto mb-4 text-[#E8B66F]">
                    <Search size={24} />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-space-grotesk text-white mb-2">
                    Let's find your business on Google
                  </h1>
                  <p className="text-[#B9AA99] text-sm">
                    Search for your business to automatically import your location and details, or enter them manually.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                      Business Name <span className="text-[#E8B66F]">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-3.5 text-[#8A7B6D]" size={18} />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchGoogle()}
                        placeholder="e.g. Meera Silks or Apex Gym"
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                      City / Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 text-[#8A7B6D]" size={18} />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchGoogle()}
                        placeholder="e.g. Mumbai, Varanasi, Bengaluru"
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSearchGoogle}
                    disabled={searchLoading || !businessName.trim()}
                    className="w-full bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold py-3.5 rounded-xl hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#E8B66F]/10"
                  >
                    {searchLoading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Searching Google Maps...</span>
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        <span>Find My Business</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#21170F] border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 font-medium py-3 rounded-xl transition-all cursor-pointer text-sm"
                  >
                    Enter Details Manually
                  </button>
                </div>

                {/* Google Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#3B2B1E]/60">
                    <p className="text-xs font-semibold text-[#B9AA99] uppercase tracking-wider mb-3">
                      Matching Google Places:
                    </p>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {searchResults.map((place, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectPlace(place)}
                          className="w-full text-left p-3.5 rounded-xl bg-[#0B0907] border border-[#3B2B1E] hover:border-[#E8B66F] transition-all flex items-start justify-between group cursor-pointer"
                        >
                          <div>
                            <p className="font-semibold text-white group-hover:text-[#E8B66F] transition-colors text-sm">
                              {place.name}
                            </p>
                            <p className="text-xs text-[#B9AA99] mt-0.5 line-clamp-1">{place.address}</p>
                          </div>
                          {place.rating && (
                            <span className="text-xs bg-[#21170F] text-[#E8B66F] px-2 py-0.5 rounded border border-[#3B2B1E] font-medium ml-2">
                              ★ {place.rating}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchAttempted && searchResults.length === 0 && !searchLoading && (
                  <div className="mt-6 p-4 rounded-xl bg-[#21170F]/50 border border-dashed border-[#3B2B1E] text-center">
                    <p className="text-xs text-[#B9AA99] mb-2">No matching businesses found on Google Maps.</p>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-[#E8B66F] hover:underline cursor-pointer"
                    >
                      Continue with manual details →
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── SCREEN 2: CONFIRM BUSINESS DETAILS ─── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1.5">
                    Confirm Business Details
                  </h2>
                  <p className="text-[#B9AA99] text-sm">
                    These details guide your brand book, typography, color palette, and photoshoot styling.
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                      Business Name <span className="text-[#E8B66F]">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Meera Silks"
                      className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                        Category <span className="text-[#E8B66F]">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-4 py-3 text-white focus:border-[#E8B66F] focus:outline-none transition-colors text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c} className="bg-[#14100D] text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                        Location / City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai, Maharashtra"
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                      Business Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Authentic handcrafted Banarasi silk sarees, bridal lehengas, and festive wear."
                      className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl px-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-3.5 text-[#8A7B6D]" size={16} />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://www.yourshop.com"
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!businessName.trim() || !category.trim()}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md shadow-[#E8B66F]/10"
                  >
                    <span>Continue to Logo</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── SCREEN 3: UPLOAD BRAND LOGO ─── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1.5">
                    Upload Brand Logo
                  </h2>
                  <p className="text-[#B9AA99] text-sm">
                    Add your logo for watermark branding and photoshoot overlays. If you don't have one, we'll create an elegant wordmark.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />

                {logoUrl ? (
                  <div className="mb-8">
                    <div className="p-6 rounded-2xl bg-[#0B0907] border border-[#E8B66F]/40 flex flex-col items-center justify-center text-center relative group">
                      <button
                        onClick={() => setLogoUrl(null)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#21170F] text-[#B9AA99] hover:text-white hover:bg-red-500/20 hover:border-red-500 transition-colors border border-[#3B2B1E] cursor-pointer"
                        title="Remove Logo"
                      >
                        <X size={16} />
                      </button>

                      <div className="w-32 h-32 rounded-xl bg-[#14100D] border border-[#3B2B1E] p-2 flex items-center justify-center overflow-hidden mb-4 shadow-inner">
                        <img src={logoUrl} alt="Brand Logo Preview" className="max-w-full max-h-full object-contain" />
                      </div>

                      <p className="font-semibold text-white text-sm mb-1">{businessName} Logo</p>
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        Logo ready for watermark & brand book
                      </p>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 text-xs font-semibold text-[#E8B66F] hover:underline cursor-pointer"
                      >
                        Replace with different image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-8 p-8 rounded-2xl border-2 border-dashed border-[#3B2B1E] hover:border-[#E8B66F]/60 bg-[#0B0907]/60 hover:bg-[#21170F]/40 transition-all text-center cursor-pointer group"
                  >
                    <div className="w-14 h-14 bg-[#21170F] border border-[#3B2B1E] rounded-xl flex items-center justify-center mx-auto mb-3 text-[#B9AA99] group-hover:text-[#E8B66F] transition-colors">
                      <Upload size={24} />
                    </div>
                    <p className="font-semibold text-white text-sm mb-1">Click to upload your logo</p>
                    <p className="text-xs text-[#8A7B6D]">PNG, JPG, SVG, or WEBP (transparent background recommended)</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {!logoUrl && (
                      <button
                        onClick={() => setStep(4)}
                        className="px-4 py-3 rounded-xl text-xs text-[#B9AA99] hover:text-white transition-colors cursor-pointer"
                      >
                        Skip for now (Use Wordmark)
                      </button>
                    )}

                    <button
                      onClick={() => setStep(4)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md shadow-[#E8B66F]/10"
                    >
                      <span>Continue to Instagram</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── SCREEN 4: INSTAGRAM DETAILS ─── */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="mb-6">
                  <div className="w-12 h-12 bg-[#21170F] border border-[#3B2B1E] rounded-xl flex items-center justify-center text-[#E8B66F] mb-3">
                    <Camera size={24} />
                  </div>
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1.5">
                    Add Instagram Details
                  </h2>
                  <p className="text-[#B9AA99] text-sm">
                    Enter your Instagram handle or profile link to tailor captions and prepare for direct publishing.
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-semibold text-[#B9AA99] mb-1.5 uppercase tracking-wider">
                      Instagram Username or Profile URL
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-[#8A7B6D] text-sm font-semibold">@</span>
                      <input
                        type="text"
                        value={instagram.replace(/^@/, '')}
                        onChange={(e) => setInstagram(e.target.value.trim())}
                        placeholder="meerasilks"
                        className="w-full bg-[#0B0907] border border-[#3B2B1E] rounded-xl pl-9 pr-4 py-3 text-white placeholder-[#685848] focus:border-[#E8B66F] focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#21170F]/50 border border-[#3B2B1E] text-xs text-[#B9AA99] space-y-1">
                    <p className="font-semibold text-[#E8B66F]">Privacy Guarantee</p>
                    <p>We will never ask for your Instagram password. Account publishing connects securely via official Meta OAuth when you are ready to publish.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {!instagram && (
                      <button
                        onClick={() => setStep(5)}
                        className="px-4 py-3 rounded-xl text-xs text-[#B9AA99] hover:text-white transition-colors cursor-pointer"
                      >
                        Skip for now
                      </button>
                    )}

                    <button
                      onClick={() => setStep(5)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md shadow-[#E8B66F]/10"
                    >
                      <span>Review Brand Profile</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── SCREEN 5: REVIEW BRAND PROFILE ─── */}
            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold font-space-grotesk text-white mb-1.5">
                    Review Brand Profile
                  </h2>
                  <p className="text-[#B9AA99] text-sm">
                    Review your brand details before finalizing your workspace. You can edit any section below.
                  </p>
                </div>

                {saveError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-sm">
                    {saveError}
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  {/* Brand Card Preview */}
                  <div className="p-5 rounded-2xl bg-[#0B0907] border border-[#3B2B1E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <div className="w-16 h-16 rounded-xl bg-[#14100D] border border-[#3B2B1E] p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#21170F] to-[#3B2B1E] border border-[#E8B66F]/40 p-2 flex items-center justify-center text-center shrink-0">
                          <span className="font-bold text-[#E8B66F] text-xs leading-tight">
                            {businessName.slice(0, 8)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-white text-lg">{businessName}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs bg-[#21170F] text-[#E8B66F] px-2.5 py-0.5 rounded-full border border-[#3B2B1E]">
                            {category}
                          </span>
                          {city && (
                            <span className="text-xs text-[#B9AA99] flex items-center gap-1">
                              <MapPin size={12} /> {city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setStep(2)}
                      className="text-xs text-[#E8B66F] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Edit3 size={12} /> Edit Details
                    </button>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E]">
                      <p className="text-xs font-semibold text-[#8A7B6D] uppercase mb-1">Description</p>
                      <p className="text-white text-xs line-clamp-2">
                        {description || 'No description provided'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E]">
                      <p className="text-xs font-semibold text-[#8A7B6D] uppercase mb-1">Website</p>
                      <p className="text-white text-xs truncate">
                        {website || 'Not provided'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E]">
                      <p className="text-xs font-semibold text-[#8A7B6D] uppercase mb-1">Logo Format</p>
                      <p className="text-white text-xs">
                        {logoUrl ? 'Uploaded Brand Logo' : 'Generated Elegant Wordmark'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E]">
                      <p className="text-xs font-semibold text-[#8A7B6D] uppercase mb-1">Instagram</p>
                      <p className="text-white text-xs">
                        {instagram ? `@${instagram.replace(/^@/, '')}` : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3B2B1E]">
                  <button
                    onClick={() => setStep(4)}
                    className="px-5 py-3 rounded-xl border border-[#3B2B1E] text-[#B9AA99] hover:text-white hover:border-[#E8B66F]/50 transition-colors flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleSaveBrand}
                    disabled={isSaving}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-lg shadow-[#E8B66F]/15"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Saving Brand Workspace...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Save & Build My Brand</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── SCREEN 6: OPTIONAL BRAND BOOK GENERATION ─── */}
            {step === 6 && (
              <motion.div
                key="step-6"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#14100D] border border-[#E8B66F]/50 rounded-2xl p-8 sm:p-10 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-tr from-[#21170F] to-[#3B2B1E] border border-[#E8B66F] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#E8B66F] shadow-lg shadow-[#E8B66F]/20">
                  <CheckCircle2 size={36} />
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold font-space-grotesk text-white mb-3">
                  Your brand profile is ready
                </h1>

                <p className="text-[#B9AA99] text-base max-w-md mx-auto mb-6">
                  Build your Brand Book for a consistent visual identity across your marketing.
                </p>

                <div className="p-5 rounded-2xl bg-[#0B0907] border border-[#3B2B1E] max-w-md mx-auto mb-8 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8A7B6D]">Business Name:</span>
                    <span className="text-white font-semibold">{businessName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8A7B6D]">Category:</span>
                    <span className="text-[#E8B66F]">{category}</span>
                  </div>
                  {city && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#8A7B6D]">Location:</span>
                      <span className="text-white">{city}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8A7B6D]">Profile Status:</span>
                    <span className="text-emerald-400 font-medium">Saved & Verified</span>
                  </div>
                </div>

                {brandBookError && (
                  <div className="p-4 mb-6 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs max-w-md mx-auto text-left">
                    <p className="font-semibold mb-1">Brand Book generation notice:</p>
                    <p>{brandBookError}</p>
                  </div>
                )}

                {bookGenerated ? (
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-sm flex items-center justify-center gap-2">
                      <Sparkles size={18} className="text-[#E8B66F]" />
                      <span>Brand Book generated and added to your workspace!</span>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold py-4 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#E8B66F]/20 text-base"
                    >
                      <span>Go to My Dashboard</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto space-y-3">
                    <button
                      onClick={handleGenerateBrandBook}
                      disabled={isGeneratingBook}
                      className="w-full bg-gradient-to-r from-[#C49B5A] to-[#E8B66F] text-[#0B0907] font-bold py-4 rounded-xl hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#E8B66F]/20 text-base"
                    >
                      {isGeneratingBook ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          <span>Generating Brand Book...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          <span>Generate My Brand Book</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => router.push('/dashboard')}
                      disabled={isGeneratingBook}
                      className="w-full py-3 text-sm text-[#B9AA99] hover:text-white transition-colors cursor-pointer"
                    >
                      Skip for Now
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
