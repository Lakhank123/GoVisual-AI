import { useState } from 'react';
import { ConfidenceField } from '../../lib/store';

export default function ConfidenceBadge({ field }: { field: ConfidenceField<any> }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!field || typeof field.confidence !== 'number') return null;

  const conf = field.confidence;
  let color = 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14]/30'; // High > 80
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#0a150a] border border-[#1a2a1a] rounded-xl shadow-2xl z-50">
          <p className="text-white text-xs font-semibold mb-1">AI Confidence: {conf}%</p>
          <p className="text-[#3a5a3a] text-[10px] mb-2">{field.reason}</p>
          {field.sources && field.sources.length > 0 && (
            <div>
              <p className="text-[#2a4a2a] text-[9px] uppercase font-bold tracking-wider mb-1">Sources</p>
              <div className="flex flex-wrap gap-1">
                {field.sources.map(s => (
                  <span key={s} className="bg-[#1a2a1a] text-[#39ff14] px-1.5 py-0.5 rounded text-[9px]">
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
