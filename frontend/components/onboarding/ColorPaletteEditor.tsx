import React, { useState } from 'react';
import { useOnboardingStore, PaletteColor } from '../../lib/store';
import ConfidenceBadge from './ConfidenceBadge';

export default function ColorPaletteEditor() {
  const { inferredProfile, updateInferredField } = useOnboardingStore();
  const [newColor, setNewColor] = useState('');

  if (!inferredProfile || !inferredProfile.visual_dna) return null;
  const visualDna = inferredProfile.visual_dna;
  const palette: PaletteColor[] = visualDna.palette || [];

  const handleUpdatePalette = (newPalette: PaletteColor[]) => {
    updateInferredField('visual_dna', {
      ...visualDna,
      palette: newPalette,
    });
  };

  const handleUpdatePrimary = (hex: string) => {
    updateInferredField('visual_dna', {
      ...visualDna,
      primary_color: { ...visualDna.primary_color, value: hex, confidence: 100 },
      palette: palette.map(p => ({
        ...p,
        role: p.hex === hex ? 'primary' : p.role === 'primary' ? 'secondary' : p.role
      }))
    });
  };

  const handleUpdateSecondary = (hex: string) => {
    updateInferredField('visual_dna', {
      ...visualDna,
      secondary_color: { ...visualDna.secondary_color, value: hex, confidence: 100 },
      palette: palette.map(p => ({
        ...p,
        role: p.hex === hex ? 'secondary' : p.role === 'secondary' ? 'accent' : p.role
      }))
    });
  };

  const handleRemove = (hex: string) => {
    handleUpdatePalette(palette.filter(p => p.hex !== hex));
  };

  const handleEditColor = (oldHex: string, newHex: string) => {
    const updated = palette.map(p => {
      if (p.hex === oldHex) {
        return { ...p, hex: newHex, manual_override: true };
      }
      return p;
    });
    handleUpdatePalette(updated);
  };

  const handleAddColor = () => {
    if (!newColor.match(/^#[0-9a-fA-F]{6}$/)) return;
    const exists = palette.find(p => p.hex.toLowerCase() === newColor.toLowerCase());
    if (exists) return;
    
    const newEntry: PaletteColor = {
      hex: newColor,
      role: 'accent',
      source: 'manual',
      confidence: 100,
      manual_override: true
    };
    handleUpdatePalette([...palette, newEntry]);
    setNewColor('');
  };

  return (
    <div className="bg-[#21170F] border border-[#3B2B1E] rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-lg text-white font-bold">Brand Palette Editor</label>
        <span className="text-xs text-[#B9AA99]">{palette.length} Colors</span>
      </div>

      <div className="space-y-4">
        {palette.map((color, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#14100D] border border-[#3B2B1E] p-3 rounded-lg">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#3B2B1E] shrink-0">
                <input
                  type="color"
                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                  value={color.hex}
                  onChange={(e) => handleEditColor(color.hex, e.target.value)}
                />
              </div>
              <input
                className="w-24 bg-transparent border-b border-[#3B2B1E] text-sm text-white focus:outline-none focus:border-[#E8B66F]"
                value={color.hex}
                onChange={(e) => handleEditColor(color.hex, e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-grow">
              <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider ${color.role === 'primary' ? 'bg-[#E8B66F] text-[#0B0907] font-bold' : color.role === 'secondary' ? 'bg-[#6F452C] text-white' : 'bg-[#3B2B1E] text-[#B9AA99]'}`}>
                {color.role}
              </span>
              <span className="text-[10px] px-2 py-1 rounded border border-[#3B2B1E] text-[#B9AA99]">
                SRC: {color.source}
              </span>
              {color.manual_override && (
                <span className="text-[10px] px-2 py-1 rounded bg-yellow-900/30 text-yellow-500 border border-yellow-700/50">
                  MANUAL
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              {color.role !== 'primary' && (
                <button onClick={() => handleUpdatePrimary(color.hex)} className="text-xs text-white hover:text-[#E8B66F] border border-[#3B2B1E] px-2 py-1 rounded">
                  Set Primary
                </button>
              )}
              {color.role !== 'secondary' && color.role !== 'primary' && (
                <button onClick={() => handleUpdateSecondary(color.hex)} className="text-xs text-white hover:text-[#E8B66F] border border-[#3B2B1E] px-2 py-1 rounded">
                  Set Sec.
                </button>
              )}
              <button onClick={() => handleRemove(color.hex)} className="text-xs text-red-500 hover:text-red-400 border border-[#3B2B1E] px-2 py-1 rounded">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <input
          placeholder="#RRGGBB"
          className="bg-[#14100D] border border-[#3B2B1E] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#E8B66F] w-32"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
        />
        <button onClick={handleAddColor} className="bg-[#3B2B1E] hover:bg-[#6F452C] text-white px-4 py-2 rounded-lg text-sm transition-all">
          Add Color
        </button>
      </div>
    </div>
  );
}
