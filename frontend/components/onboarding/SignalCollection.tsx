import { useState } from 'react';
import { useOnboardingStore } from '../../lib/store';
import { motion } from 'framer-motion';

export default function SignalCollection() {
  const { websiteUrl, instagramHandle, manualData, updateSignals, setStep } = useOnboardingStore();
  
  const [localWeb, setLocalWeb] = useState(websiteUrl);
  const [localIg, setLocalIg] = useState(instagramHandle);
  const [localLogo, setLocalLogo] = useState<File | null>(null);

  function handleContinue() {
    updateSignals({
      websiteUrl: localWeb,
      instagramHandle: localIg,
      logoFile: localLogo
    });
    setStep(3); // Move to AI Progress Pipeline
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8 text-center">
        <h2 className="font-space-grotesk text-3xl font-bold text-white mb-2">Connect Sources</h2>
        <p className="text-[#B9AA99]">The more you connect, the smarter your Brand Brain gets.</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-[#21170F] border border-[#3B2B1E] rounded-xl p-5">
          <label className="block text-sm text-white font-semibold mb-1">Website URL</label>
          <p className="text-[#B9AA99] text-xs mb-3">We'll scrape your site for brand context.</p>
          <input
            className="w-full bg-[#14100D] border border-[#3B2B1E] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E8B66F]"
            placeholder="https://yourwebsite.com"
            value={localWeb}
            onChange={e => setLocalWeb(e.target.value)}
          />
        </div>

        <div className="bg-[#21170F] border border-[#3B2B1E] rounded-xl p-5">
          <label className="block text-sm text-white font-semibold mb-1">Instagram Handle</label>
          <p className="text-[#B9AA99] text-xs mb-3">To analyze your current visual style.</p>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-[#8A7B6D]">@</span>
            <input
              className="w-full bg-[#14100D] border border-[#3B2B1E] rounded-lg pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#E8B66F]"
              placeholder="yourbrand"
              value={localIg}
              onChange={e => setLocalIg(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-[#21170F] border border-[#3B2B1E] rounded-xl p-5">
          <label className="block text-sm text-white font-semibold mb-1">Brand Logo</label>
          <p className="text-[#B9AA99] text-xs mb-3">Upload a high-quality logo.</p>
          <input
            type="file"
            accept="image/*"
            onChange={e => setLocalLogo(e.target.files?.[0] || null)}
            className="w-full text-sm text-[#B9AA99] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#3B2B1E] file:text-[#E8B66F] hover:file:bg-[#6F452C] cursor-pointer"
          />
        </div>
      </div>

      <button onClick={handleContinue}
        className="w-full bg-[#E8B66F] text-[#0B0907] font-bold py-4 rounded-xl hover:bg-[#F3CB8D] transition-all cursor-pointer">
        Analyze My Brand
      </button>
      
      <button onClick={() => setStep(1)}
        className="w-full mt-4 text-[#8A7B6D] text-sm py-2 hover:text-white transition-colors cursor-pointer font-medium">
        Back
      </button>
    </motion.div>
  );
}
