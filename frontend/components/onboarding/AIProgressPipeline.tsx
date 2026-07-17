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

        const extractRes = await fetch('http://localhost:8000/brand/onboard/extract', {
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
        const analyseRes = await fetch('http://localhost:8000/brand/onboard/analyse', {
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

  if (error) {
    return (
      <div className="text-center">
        <h2 className="text-red-400 text-xl font-bold mb-4">Pipeline Error</h2>
        <p className="text-[#3a5a3a] mb-6">{error}</p>
        <button onClick={() => setStep(2)} className="bg-[#1a2a1a] text-white px-6 py-2 rounded-lg hover:bg-[#2a4a2a]">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto pt-10">
      <div className="flex justify-center mb-10">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-[#1a2a1a] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#39ff14] rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
      
      <div className="space-y-4">
        {phases.map((phase, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-500 ${
              currentPhase > i ? 'bg-[#39ff14] border-[#39ff14]' :
              currentPhase === i ? 'bg-transparent border-[#39ff14]' :
              'bg-[#0d160d] border-[#1a2a1a]'
            }`}>
              {currentPhase > i && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {currentPhase === i && (
                <div className="w-2 h-2 bg-[#39ff14] rounded-full animate-pulse"></div>
              )}
            </div>
            <p className={`text-sm font-medium transition-colors duration-500 ${
              currentPhase >= i ? 'text-white' : 'text-[#2a4a2a]'
            }`}>
              {phase}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
