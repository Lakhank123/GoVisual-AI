import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '../../lib/store';
import BrandCompletionCard from './BrandCompletionCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function BrandBrainPreview() {
  const router = useRouter();
  const { 
    shopName, city, googlePlaceId, websiteUrl, instagramHandle, manualData, logoFile,
    inferredProfile, products, audienceSegments, setStep 
  } = useOnboardingStore();
  
  const [saving, setSaving] = useState(false);
  const [showWow, setShowWow] = useState(false);

  async function handleCreateBrandBrain() {
    setSaving(true);
    try {
      // Create session payload
      const sessionData = {
        shopName, city, googlePlaceId, websiteUrl, instagramHandle, manualData,
        inferredProfile, products, audienceSegments
      };

      const res = await fetch('http://localhost:8000/brand/onboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_brain_session: sessionData })
      });
      
      if (!res.ok) throw new Error("Failed to save brand brain");
      const { business_id } = await res.json();
      
      // Wow Moment
      setShowWow(true);
      setTimeout(() => {
        // Automatically trigger generate samples using the new business_id (mocked route for demo)
        router.push(`/wizard`); 
      }, 3000);

    } catch (err) {
      console.error(err);
      setSaving(false);
      alert("Failed to save Brand Brain. Please try again.");
    }
  }

  if (showWow) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-20">
        <h1 className="text-4xl font-space-grotesk font-bold text-white mb-6">🎉 Your AI Marketing Manager is Ready</h1>
        <div className="space-y-4 text-left max-w-sm mx-auto mb-10">
          <p className="flex items-center gap-3 text-white"><span className="text-[#39ff14]">✓</span> Brand Identity Created</p>
          <p className="flex items-center gap-3 text-white"><span className="text-[#39ff14]">✓</span> Visual DNA Generated</p>
          <p className="flex items-center gap-3 text-white"><span className="text-[#39ff14]">✓</span> Audience Learned</p>
          <p className="flex items-center gap-3 text-white"><span className="text-[#39ff14]">✓</span> Brand Brain Activated</p>
        </div>
        <p className="text-[#39ff14] animate-pulse">Generating your first AI creatives...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="font-space-grotesk text-3xl font-bold text-white mb-2">Final Review</h2>
          <p className="text-[#3a5a3a] mb-6">Your Brand Brain is almost ready. Review your setup below.</p>
          
          <div className="space-y-6">
            {/* Identity Summary */}
            <div className="border border-[#1a2a1a] bg-[#0d160d] p-5 rounded-2xl">
              <h4 className="text-white font-semibold mb-4 border-b border-[#1a2a1a] pb-2">Core Identity</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-[#3a5a3a] text-xs">Name:</span> <p className="text-sm text-white">{shopName}</p></div>
                <div><span className="text-[#3a5a3a] text-xs">Tone:</span> <p className="text-sm text-[#39ff14]">{inferredProfile?.brand_tone?.value}</p></div>
                <div><span className="text-[#3a5a3a] text-xs">Languages:</span> <p className="text-sm text-white">{inferredProfile?.primary_language?.value}</p></div>
                <div><span className="text-[#3a5a3a] text-xs">Positioning:</span> <p className="text-sm text-white">{inferredProfile?.price_positioning?.value}</p></div>
              </div>
            </div>

            {/* Visual DNA Summary */}
            <div className="border border-[#1a2a1a] bg-[#0d160d] p-5 rounded-2xl">
              <h4 className="text-white font-semibold mb-4 border-b border-[#1a2a1a] pb-2">Visual DNA</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-[#3a5a3a] text-xs">Style:</span> <p className="text-sm text-[#39ff14]">{inferredProfile?.visual_style?.value}</p></div>
                <div><span className="text-[#3a5a3a] text-xs">Photography:</span> <p className="text-sm text-white">{inferredProfile?.photography_style?.value}</p></div>
                <div><span className="text-[#3a5a3a] text-xs">Mood:</span> <p className="text-sm text-white">{inferredProfile?.image_mood?.value}</p></div>
                <div><span className="text-[#3a5a3a] text-xs">Lighting:</span> <p className="text-sm text-white">{inferredProfile?.lighting?.value}</p></div>
              </div>
              
              {inferredProfile?.visual_dna?.palette?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1a2a1a]">
                  <span className="text-[#3a5a3a] text-xs block mb-2">Palette:</span>
                  <div className="flex flex-wrap gap-2">
                    {inferredProfile?.visual_dna?.palette?.map((color: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 bg-[#1a2a1a] pr-2 rounded-full overflow-hidden border border-[#2a4a2a]">
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color.hex }} />
                        <span className="text-[10px] text-white uppercase">{color.role === 'primary' ? 'PRI' : color.role === 'secondary' ? 'SEC' : 'ACC'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audience & Products */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[#1a2a1a] bg-[#0d160d] p-5 rounded-2xl">
                <h4 className="text-white font-semibold mb-2">Audience ({audienceSegments.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {audienceSegments.map(s => <span key={s} className="bg-[#1a2a1a] text-xs px-2 py-1 rounded">{s}</span>)}
                </div>
              </div>
              <div className="border border-[#1a2a1a] bg-[#0d160d] p-5 rounded-2xl">
                <h4 className="text-white font-semibold mb-2">Products ({products.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {products.map(p => <span key={p.id} className="bg-[#1a2a1a] text-xs px-2 py-1 rounded">{p.name}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8">
          <button onClick={() => setStep(6)} disabled={saving} className="w-1/3 bg-[#0d160d] border border-[#1a2a1a] text-white py-4 rounded-xl hover:bg-[#1a2a1a] transition-all font-semibold">
            Edit
          </button>
          <button onClick={handleCreateBrandBrain} disabled={saving} className="w-2/3 bg-[#39ff14] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-[0_0_20px_rgba(57,255,20,0.2)]">
            {saving ? 'Activating Brand Brain...' : 'Create Brand Brain'}
          </button>
        </div>
      </div>
      
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <BrandCompletionCard />
        </div>
      </div>
    </motion.div>
  );
}
