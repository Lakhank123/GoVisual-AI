import { useState } from 'react';
import { ConfidenceField } from '../../lib/store';

export default function ConfidenceBadge({ field }: { field: ConfidenceField<any> }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!field || typeof field.confidence !== 'number') return null;

  const conf = field.confidence;
  let color = 'text-[#E8B66F] bg-[#E8B66F]/10 border-[#E8B66F]/30'; // High > 80
  if (conf < 80 && conf >= 50) color = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'; // Medium
  if (conf < 50) color = 'text-red-400 bg-red-400/10 border-red-400/30'; // Low

  return (
    <div className="relative inline-flex items-center" 
         onMouseEnter={() => setShowTooltip(true)} 
         onMouseLeave={() => setShowTooltip(false)}>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-help ${color}`}>
        {conf}% AI
      </span>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#14100D] border border-[#3B2B1E] rounded-xl shadow-2xl z-50">
          <p className="text-white text-xs font-semibold mb-1">AI Confidence: {conf}%</p>
          <p className="text-[#B9AA99] text-[10px] mb-2">{field.reason}</p>
          {field.sources && field.sources.length > 0 && (
            <div>
              <p className="text-[#8A7B6D] text-[9px] uppercase font-bold tracking-wider mb-1">Sources</p>
              <div className="flex flex-wrap gap-1">
                {field.sources.map(s => (
                  <span key={s} className="bg-[#3B2B1E] text-[#E8B66F] px-1.5 py-0.5 rounded text-[9px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
