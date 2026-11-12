import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '../../lib/store';
import BrandCompletionCard from './BrandCompletionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemoSession } from '../providers/demo-session-provider';
import { getSafeSession } from '@/lib/supabase';
import { createProduct, uploadProductImage } from '@/lib/productApi';

export default function BrandBrainPreview() {
  const router = useRouter();
  const { 
    shopName, city, googlePlaceId, websiteUrl, instagramHandle, manualData, logoFile,
    inferredProfile, products, audienceSegments, setStep 
  } = useOnboardingStore();
  
  const [saving, setSaving] = useState(false);
  const [showWow, setShowWow] = useState(false);

  const { updateBrandProfileAndPersist, approveBrandProfile, refreshProducts } = useDemoSession();

  async function handleCreateBrandBrain() {
    setSaving(true);
    try {
      // Resolve logo URL if logoFile was uploaded
      let resolvedLogoUrl = manualData.logo || '';
      if (!resolvedLogoUrl && logoFile) {
        resolvedLogoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(logoFile);
        });
      }

      // Create session payload
      const sessionData = {
        shopName, city, googlePlaceId, websiteUrl, instagramHandle, manualData: { ...manualData, logo: resolvedLogoUrl },
        inferredProfile, products, audienceSegments
      };

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const authSession = await getSafeSession();
      const token = authSession?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        await fetch(`${apiBase}/brand/onboard/save`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ brand_brain_session: sessionData })
        });
      } catch (saveErr) {
        console.warn('Backend brand onboard save warning:', saveErr);
      }
      
      // Update DemoSession and persist with Supabase
      await updateBrandProfileAndPersist({
        businessName: shopName,
        category: inferredProfile?.category?.value || '',
        city: city || '',
        logoUrl: resolvedLogoUrl,
        primaryColor: inferredProfile?.visual_dna?.palette?.find((p: any) => p.role === 'primary')?.hex || '',
        secondaryColor: inferredProfile?.visual_dna?.palette?.find((p: any) => p.role === 'secondary')?.hex || '',
        typography: inferredProfile?.visual_style?.value || '',
        targetAudience: audienceSegments.join(', '),
        brandPersonality: inferredProfile?.brand_personality_tags?.value?.join(', ') || '',
        website: websiteUrl,
        instagram: instagramHandle
      });

      // Persist any products added during onboarding into the real catalog
      if (products && products.length > 0) {
        for (const prod of products) {
          try {
            let uploadedImageUrl = prod.image || '';
            if (prod.imageFile && authSession?.user?.id) {
              try {
                uploadedImageUrl = await uploadProductImage(prod.imageFile, authSession.user.id);
              } catch (upErr) {
                console.warn('Could not upload onboarding product image:', prod.name, upErr);
              }
            }
            await createProduct({
              name: prod.name,
              category: prod.category || inferredProfile?.category?.value || '',
              price_positioning: prod.price || '',
              description: prod.description || '',
              image_url: uploadedImageUrl,
            });
          } catch (prodErr) {
            console.warn('Could not persist onboarding product:', prod.name, prodErr);
          }
        }
        await refreshProducts();
      }

      approveBrandProfile();
      
      // Wow Moment
      setShowWow(true);
      setTimeout(() => {
        router.push(products.length > 0 ? '/dashboard' : '/products/setup'); 
      }, 2500);

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
          <p className="flex items-center gap-3 text-white"><span className="text-[#E8B66F]">✓</span> Brand Identity Created</p>
          <p className="flex items-center gap-3 text-white"><span className="text-[#E8B66F]">✓</span> Visual DNA Generated</p>
          <p className="flex items-center gap-3 text-white"><span className="text-[#E8B66F]">✓</span> Audience Learned</p>
          <p className="flex items-center gap-3 text-white"><span className="text-[#E8B66F]">✓</span> Brand Brain Activated</p>
        </div>
        <p className="text-[#E8B66F] animate-pulse">Generating your first AI creatives...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="font-space-grotesk text-3xl font-bold text-white mb-2">Final Review</h2>
          <p className="text-[#B9AA99] mb-6">Your Brand Brain is almost ready. Review your setup below.</p>
          
          <div className="space-y-6">
            {/* Identity Summary */}
            <div className="border border-[#3B2B1E] bg-[#21170F] p-5 rounded-2xl">
              <h4 className="text-white font-semibold mb-4 border-b border-[#3B2B1E] pb-2">Core Identity</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-[#B9AA99] text-xs">Name:</span> <p className="text-sm text-white">{shopName}</p></div>
                <div><span className="text-[#B9AA99] text-xs">Tone:</span> <p className="text-sm text-[#E8B66F]">{inferredProfile?.brand_tone?.value}</p></div>
                <div><span className="text-[#B9AA99] text-xs">Languages:</span> <p className="text-sm text-white">{inferredProfile?.primary_language?.value}</p></div>
                <div><span className="text-[#B9AA99] text-xs">Positioning:</span> <p className="text-sm text-white">{inferredProfile?.price_positioning?.value}</p></div>
              </div>
            </div>

            {/* Visual DNA Summary */}
            <div className="border border-[#3B2B1E] bg-[#21170F] p-5 rounded-2xl">
              <h4 className="text-white font-semibold mb-4 border-b border-[#3B2B1E] pb-2">Visual DNA</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-[#B9AA99] text-xs">Style:</span> <p className="text-sm text-[#E8B66F]">{inferredProfile?.visual_style?.value}</p></div>
                <div><span className="text-[#B9AA99] text-xs">Photography:</span> <p className="text-sm text-white">{inferredProfile?.photography_style?.value}</p></div>
                <div><span className="text-[#B9AA99] text-xs">Mood:</span> <p className="text-sm text-white">{inferredProfile?.image_mood?.value}</p></div>
                <div><span className="text-[#B9AA99] text-xs">Lighting:</span> <p className="text-sm text-white">{inferredProfile?.lighting?.value}</p></div>
              </div>
              
              {inferredProfile?.visual_dna?.palette?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#3B2B1E]">
                  <span className="text-[#B9AA99] text-xs block mb-2">Palette:</span>
                  <div className="flex flex-wrap gap-2">
                    {inferredProfile?.visual_dna?.palette?.map((color: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 bg-[#3B2B1E] pr-2 rounded-full overflow-hidden border border-[#6F452C]">
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
              <div className="border border-[#3B2B1E] bg-[#21170F] p-5 rounded-2xl">
                <h4 className="text-white font-semibold mb-2">Audience ({audienceSegments.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {audienceSegments.map(s => <span key={s} className="bg-[#3B2B1E] text-xs px-2 py-1 rounded text-white">{s}</span>)}
                </div>
              </div>
              <div className="border border-[#3B2B1E] bg-[#21170F] p-5 rounded-2xl">
                <h4 className="text-white font-semibold mb-2">Products ({products.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {products.map(p => <span key={p.id} className="bg-[#3B2B1E] text-xs px-2 py-1 rounded text-white">{p.name}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8">
          <button onClick={() => setStep(6)} disabled={saving} className="w-1/3 bg-[#21170F] border border-[#3B2B1E] text-white py-4 rounded-xl hover:bg-[#2B1E14] transition-all font-semibold">
            Edit
          </button>
          <button onClick={handleCreateBrandBrain} disabled={saving} className="w-2/3 bg-[#E8B66F] text-[#0B0907] font-bold py-4 rounded-xl hover:bg-[#F3CB8D] transition-all cursor-pointer shadow-[0_0_20px_rgba(232,182,111,0.2)]">
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
