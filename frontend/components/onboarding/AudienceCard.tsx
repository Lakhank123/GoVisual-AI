export default function AudienceCard({
  segment, isSelected, isRecommended, onClick
}: {
  segment: string;
  isSelected: boolean;
  isRecommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-[#39ff14] bg-[#39ff14]/5 shadow-[0_0_15px_rgba(57,255,20,0.1)]' 
          : 'border-[#1a2a1a] bg-[#0d160d] hover:border-[#2a4a2a]'
      }`}
    >
      {isRecommended && !isSelected && (
        <span className="absolute top-2 right-2 bg-[#2a4a2a] text-[#39ff14] text-[9px] uppercase px-1.5 py-0.5 rounded">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
          isSelected ? 'border-[#39ff14] bg-[#39ff14]' : 'border-[#2a4a2a] bg-transparent'
        }`}>
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={`font-medium ${isSelected ? 'text-[#39ff14]' : 'text-white'}`}>
          {segment.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </span>
      </div>
    </button>
  );
}
