import { useOnboardingStore } from '../../lib/store';
import AudienceCard from './AudienceCard';
import BrandCompletionCard from './BrandCompletionCard';
import { motion } from 'framer-motion';

const ALL_SEGMENTS = [
  'youth_18_25', 'young_professionals', 'families', 'parents', 'children', 
  'senior_citizens', 'tourists', 'students', 'corporate', 'local_neighbourhood', 
  'high_income', 'budget_conscious'
];

export default function AudienceSelector() {
  const { inferredProfile, audienceSegments, setAudienceSegments, setStep } = useOnboardingStore();

  const recommendedSegments = inferredProfile?.audience_segments?.value || [];

  const toggleSegment = (seg: string) => {
    if (audienceSegments.includes(seg)) {
      setAudienceSegments(audienceSegments.filter(s => s !== seg));
    } else {
      setAudienceSegments([...audienceSegments, seg]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2">Target Audience</h2>
          <p className="text-[#3a5a3a] mb-6">Select the groups most likely to buy from you. We've pre-selected recommendations based on your brand analysis.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_SEGMENTS.map(seg => (
              <AudienceCard 
                key={seg}
                segment={seg}
                isSelected={audienceSegments.includes(seg) || (recommendedSegments.includes(seg) && audienceSegments.length === 0)}
                isRecommended={recommendedSegments.includes(seg)}
                onClick={() => toggleSegment(seg)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={() => setStep(5)} className="w-1/3 bg-[#0d160d] border border-[#1a2a1a] text-white py-4 rounded-xl hover:bg-[#1a2a1a] transition-all font-semibold">
            Back
          </button>
          <button onClick={() => setStep(7)} className="w-2/3 bg-[#39ff14] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all cursor-pointer">
            Preview Brand Brain
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
