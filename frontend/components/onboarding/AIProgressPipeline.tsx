import { useEffect, useState } from 'react';
import { useOnboardingStore } from '../../lib/store';
import { motion, AnimatePresence } from 'framer-motion';

const phases = [
  "Collecting Brand Signals",
  "Understanding Brand",
  "Building Brand Brain",
  "Preparing AI Assets"
];

export default function AIProgressPipeline() {
  const { googlePlaceId, websiteUrl, instagramHandle, manualData, setInferredProfile, setStep } = useOnboardingStore();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runPipeline() {
      try {
        // Phase 1: Collecting
        setCurrentPhase(0);
        let currentManualData = { ...manualData };
        
        if (useOnboardingStore.getState().logoFile) {
          const file = useOnboardingStore.getState().logoFile;
          if (file) {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            currentManualData.logo_base64 = base64;
          }
        }

        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const extractRes = await fetch(`${apiBase}/brand/onboard/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            google_place_id: googlePlaceId,
            website_url: websiteUrl,
            instagram_handle: instagramHandle,
            manual_data: currentManualData
          })
        });
        if (!extractRes.ok) throw new Error("Failed to extract signals");
        const extractData = await extractRes.json();
        
        if (!isMounted) return;

        // Phase 2: Understanding
        setCurrentPhase(1);
        const analyseRes = await fetch(`${apiBase}/brand/onboard/analyse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_data: extractData.raw_data })
        });
        if (!analyseRes.ok) throw new Error("Failed to analyse brand");
        const analyseData = await analyseRes.json();
        
        if (!isMounted) return;

        // Phase 3 & 4 Simulation
        setCurrentPhase(2);
        await new Promise(r => setTimeout(r, 1000));
        if (!isMounted) return;
        
        setCurrentPhase(3);
        await new Promise(r => setTimeout(r, 1000));
        if (!isMounted) return;

        // Done
        setInferredProfile(analyseData.analysis);
        setStep(4);

      } catch (err: any) {
        if (isMounted) setError(err.message || "Something went wrong.");
      }
    }

    runPipeline();
    return () => { isMounted = false; };
  }, [googlePlaceId, websiteUrl, instagramHandle, manualData, setInferredProfile, setStep]);

  const handleManualFallback = () => {
    setInferredProfile({
      brand_tone: { value: 'Warm, Authentic & Approachable', confidence: 'inferred' },
      visual_style: { value: 'Modern Commercial', confidence: 'inferred' },
      primary_language: { value: 'English / Hinglish', confidence: 'inferred' },
      price_positioning: { value: 'Premium Value', confidence: 'inferred' },
      brand_personality_tags: { value: ['Authentic', 'Reliable', 'Customer-First'], confidence: 'inferred' },
      visual_dna: {
        palette: [
          { hex: '#E8B66F', role: 'primary' },
          { hex: '#0B0907', role: 'secondary' },
          { hex: '#FFFFFF', role: 'accent' },
        ],
      },
    });
    setStep(4);
  };

  if (error) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <h2 className="text-[#E8B66F] text-xl font-bold mb-3">AI Analysis Temporarily Unavailable</h2>
        <p className="text-[#B9AA99] text-sm mb-6">
          We couldn't automatically extract signals from the connected sources ({error}). You can continue right away by entering your brand details manually.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => setStep(2)} className="bg-[#21170F] border border-[#3B2B1E] text-white px-5 py-3 rounded-xl hover:bg-[#2B1E14] text-sm font-semibold">
            ← Change Sources
          </button>
          <button onClick={handleManualFallback} className="bg-[#E8B66F] text-[#0B0907] px-5 py-3 rounded-xl hover:bg-[#F3CB8D] text-sm font-bold shadow-[0_0_15px_rgba(232,182,111,0.2)]">
            Setup Brand Manually →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto pt-10">
      <div className="flex justify-center mb-10">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-[#3B2B1E] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#E8B66F] rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
      
      <div className="space-y-4">
        {phases.map((phase, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-500 ${
              currentPhase > i ? 'bg-[#E8B66F] border-[#E8B66F]' :
              currentPhase === i ? 'bg-transparent border-[#E8B66F]' :
              'bg-[#21170F] border-[#3B2B1E]'
            }`}>
              {currentPhase > i && (
                <svg className="w-3 h-3 text-[#0B0907]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {currentPhase === i && (
                <div className="w-2 h-2 bg-[#E8B66F] rounded-full animate-pulse"></div>
              )}
            </div>
            <p className={`text-sm font-medium transition-colors duration-500 ${
              currentPhase >= i ? 'text-white' : 'text-[#8A7B6D]'
            }`}>
              {phase}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
