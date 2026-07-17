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
    <div className="border border-[#1a2a1a] bg-[#0a150a] rounded-2xl p-5 w-full max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-semibold">Brand Brain</h4>
        <span className="text-[#39ff14] font-bold text-lg">{percentage}% Complete</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-[#1a2a1a] rounded-full h-2 mb-5">
        <div 
          className="bg-[#39ff14] h-2 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="space-y-2">
        <p className="text-[#2a4a2a] text-xs uppercase font-bold tracking-wider mb-2">Checklist</p>
        <div className="grid grid-cols-2 gap-2">
          {checks.map(c => (
            <div key={c.name} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded flex items-center justify-center ${c.done ? 'bg-[#39ff14]' : 'border border-[#2a4a2a]'}`}>
                {c.done && (
                  <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs ${c.done ? 'text-white' : 'text-[#3a5a3a]'}`}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
