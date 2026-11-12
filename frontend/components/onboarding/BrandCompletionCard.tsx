import { useOnboardingStore } from '../../lib/store';

export default function BrandCompletionCard() {
  const { inferredProfile, products, instagramHandle, logoFile, websiteUrl } = useOnboardingStore();
  
  if (!inferredProfile) return null;

  const checks = [
    { name: 'Instagram', done: !!instagramHandle },
    { name: 'Logo', done: !!logoFile },
    { name: 'Products', done: products.length > 0 },
    { name: 'Website', done: !!websiteUrl },
    { name: 'Brand Tone', done: !!inferredProfile.brand_tone?.value },
    { name: 'Primary Color', done: !!inferredProfile.visual_dna?.primary_color?.value },
    { name: 'Sec. Color', done: !!inferredProfile.visual_dna?.secondary_color?.value }
  ];

  const completed = checks.filter(c => c.done).length;
  const percentage = Math.round((completed / checks.length) * 100);

  return (
    <div className="border border-[#3B2B1E] bg-[#21170F] rounded-2xl p-5 w-full max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-semibold">Brand Brain</h4>
        <span className="text-[#E8B66F] font-bold text-lg">{percentage}% Complete</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-[#14100D] rounded-full h-2 mb-5">
        <div 
          className="bg-[#E8B66F] h-2 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="space-y-2">
        <p className="text-[#8A7B6D] text-xs uppercase font-bold tracking-wider mb-2">Checklist</p>
        <div className="grid grid-cols-2 gap-2">
          {checks.map(c => (
            <div key={c.name} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded flex items-center justify-center ${c.done ? 'bg-[#E8B66F]' : 'border border-[#3B2B1E]'}`}>
                {c.done && (
                  <svg className="w-2 h-2 text-[#0B0907]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs ${c.done ? 'text-white' : 'text-[#8A7B6D]'}`}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
