import { useOnboardingStore, ConfidenceField } from '../../lib/store';
import ConfidenceBadge from './ConfidenceBadge';
import BrandCompletionCard from './BrandCompletionCard';
import ColorPaletteEditor from './ColorPaletteEditor';
import { motion } from 'framer-motion';

export default function BrandProfileEditor() {
  const { inferredProfile, updateInferredField, setStep } = useOnboardingStore();

  if (!inferredProfile) return null;

  const renderField = (key: string, label: string, type: 'text' | 'textarea' = 'text') => {
    const field = inferredProfile[key] as ConfidenceField<any>;
    if (!field) return null;

    return (
      <div className="bg-[#0d160d] border border-[#1a2a1a] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm text-white font-semibold">{label}</label>
          <ConfidenceBadge field={field} />
        </div>
        
        {type === 'textarea' ? (
          <textarea
            className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#39ff14] min-h-[80px]"
            value={field.value || ''}
            onChange={(e) => updateInferredField(key, e.target.value)}
          />
        ) : (
          <input
            className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#39ff14]"
            value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
            onChange={(e) => {
              const val = Array.isArray(field.value) ? e.target.value.split(',').map(s => s.trim()) : e.target.value;
              updateInferredField(key, val);
            }}
          />
        )}
      </div>
    );
  };

  const renderColorField = (key: string, label: string) => {
    const field = inferredProfile[key] as ConfidenceField<any>;
    if (!field) return null;

    return (
      <div className="bg-[#0d160d] border border-[#1a2a1a] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm text-white font-semibold">{label}</label>
          <ConfidenceBadge field={field} />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#1a2a1a] shrink-0">
            <input
              type="color"
              className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
              value={field.value || '#000000'}
              onChange={(e) => updateInferredField(key, e.target.value)}
            />
          </div>
          <input
            className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#39ff14]"
            value={field.value || ''}
            onChange={(e) => updateInferredField(key, e.target.value)}
            placeholder="#HEXCODE"
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2">Review Brand Identity</h2>
          <p className="text-[#3a5a3a] mb-6">We've extracted the following details. Everything is editable.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('brand_tone', 'Brand Tone')}
            {renderField('visual_style', 'Visual Style')}
            {renderField('primary_language', 'Primary Language')}
            {renderField('price_positioning', 'Price Positioning')}
          </div>
          
          <div className="mt-4">
            {renderField('brand_personality_tags', 'Personality Tags')}
          </div>
        </div>

        <div>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 mt-8">Brand Colors</h2>
          <ColorPaletteEditor />
        </div>

        <div>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2 mt-8">Visual DNA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('photography_style', 'Photography Style')}
            {renderField('color_grading', 'Color Grading')}
            {renderField('image_mood', 'Image Mood')}
            {renderField('lighting', 'Lighting')}
          </div>
        </div>
        
        <div className="flex gap-4 pt-4">
          <button onClick={() => setStep(3)} className="w-1/3 bg-[#0d160d] border border-[#1a2a1a] text-white py-4 rounded-xl hover:bg-[#1a2a1a] transition-all font-semibold">
            Re-Analyze
          </button>
          <button onClick={() => setStep(5)} className="w-2/3 bg-[#39ff14] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all cursor-pointer">
            Looks Good — Next
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
