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
          ? 'border-[#E8B66F] bg-[#E8B66F]/10 shadow-[0_0_15px_rgba(232,182,111,0.1)]' 
          : 'border-[#3B2B1E] bg-[#21170F] hover:border-[#6F452C]'
      }`}
    >
      {isRecommended && !isSelected && (
        <span className="absolute top-2 right-2 bg-[#3B2B1E] text-[#E8B66F] text-[9px] uppercase px-1.5 py-0.5 rounded">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
          isSelected ? 'border-[#E8B66F] bg-[#E8B66F]' : 'border-[#3B2B1E] bg-transparent'
        }`}>
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-[#0B0907]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className={`font-medium ${isSelected ? 'text-[#E8B66F]' : 'text-white'}`}>
          {segment.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </span>
      </div>
    </button>
  );
}
