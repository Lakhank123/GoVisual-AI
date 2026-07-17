import { useState } from 'react';
import { searchBrand } from '../../lib/api';
import { useOnboardingStore } from '../../lib/store';
import { motion } from 'framer-motion';

export default function BusinessSearch() {
  const { shopName, city, updateSearch, setStep } = useOnboardingStore();
  const [localShop, setLocalShop] = useState(shopName);
  const [localCity, setLocalCity] = useState(city);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>[]>([]);

  async function handleSearch() {
    if (!localShop.trim()) return;
    setLoading(true);
    try {
      const places = await searchBrand(localShop, localCity);
      setResults(places || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }

  function handleSelect(place: Record<string, any>) {
    updateSearch(localShop, localCity, place.place_id || null);
    setStep(2); // Move to Signal Collection
  }

  function handleSkip() {
    updateSearch(localShop, localCity, null);
    setStep(2);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-10 text-center">
        <h2 className="font-space-grotesk text-3xl font-bold text-white mb-3">Find Your Business</h2>
        <p className="text-[#3a5a3a]">Enter your shop name to find it on Google Maps</p>
      </div>

      <div className="space-y-4 mb-8">
        <input
          className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-xl px-4 py-4 text-base text-white focus:outline-none focus:border-[#39ff14] transition-colors duration-150 placeholder-[#2a4a2a]"
          placeholder="Shop name (e.g. Sai Mobile Care)"
          value={localShop}
          onChange={e => setLocalShop(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <input
          className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-xl px-4 py-4 text-base text-white focus:outline-none focus:border-[#39ff14] transition-colors duration-150 placeholder-[#2a4a2a]"
          placeholder="City (e.g. Mumbai)"
          value={localCity}
          onChange={e => setLocalCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}
          className="w-full bg-[#39ff14] text-black font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
          {loading ? 'Searching...' : 'Find My Business'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[#2a4a2a] mb-2 font-medium">Select your business:</p>
          {results.map((place, i) => (
            <button key={i} onClick={() => handleSelect(place)}
              className="w-full text-left border border-[#1a2a1a] rounded-xl p-4 bg-[#080f08] hover:border-[#39ff14] hover:bg-[#0a1a0a] transition-all duration-150 cursor-pointer flex justify-between items-center group">
              <div>
                <p className="font-semibold text-white text-base group-hover:text-[#39ff14] transition-colors">{place.name}</p>
                <p className="text-[#3a5a3a] text-xs mt-1">{place.address}</p>
              </div>
              {place.rating && (
                <div className="bg-[#1a2a1a] px-2 py-1 rounded flex items-center gap-1">
                  <span className="text-[#39ff14] text-xs">★</span>
                  <span className="text-white text-xs font-bold">{place.rating}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && localShop && (
        <div className="text-center py-6 border border-dashed border-[#1a2a1a] rounded-xl mt-6">
          <p className="text-[#3a5a3a] text-sm mb-4">Couldn't find it on Google?</p>
          <button onClick={handleSkip} className="text-[#39ff14] text-sm font-semibold hover:underline">
            Enter details manually
          </button>
        </div>
      )}
    </motion.div>
  );
}
