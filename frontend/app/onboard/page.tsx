'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { searchBrand, getBrandProfile } from '@/lib/api'
import { useStore } from '@/lib/store'

export default function OnboardPage() {
  const router   = useRouter()
  const setBrand = useStore(s => s.setBrand)
  const setCategory = useStore(s => s.setCategory)

  const [shopName, setShopName] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, any>[]>([])
  const [selected, setSelected] = useState<Record<string, any> | null>(null)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('')
  const [step, setStep] = useState<'search' | 'confirm'>('search')
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [color1, setColor1] = useState('#1a1a2e')
  const [color2, setColor2] = useState('#e94560')
  const [logoFile, setLogoFile] = useState<File | null>(null)

  useEffect(() => {
    const cat = sessionStorage.getItem('gv_category') || ''
    setCategory(cat)
  }, [setCategory])

  async function handleSearch() {
    if (!shopName.trim()) return
    setLoading(true)
    setManualMode(false)
    try {
      const places = await searchBrand(shopName, city)
      setResults(places || [])
      if ((places || []).length === 0) {
        setManualMode(true)
        setManualName(shopName)
      }
    } catch { 
      setResults([])
      setManualMode(true)
      setManualName(shopName)
    }
    setLoading(false)
  }

  async function handleSelect(place: Record<string, unknown>) {
    setLoading(true)
    try {
      const profile = await getBrandProfile(place.place_id as string)
      const mapped = {
        placeId: String(profile?.place_id || place.place_id || ''),
        name: String(profile?.name || place.name || ''),
        address: String(profile?.address || place.address || ''),
        logoUrl: String(profile?.logo_url || ''),
        photos: (profile?.photos || []) as { url: string; thumb: string }[],
        colors: (profile?.colors || ['#1a1a2e', '#e94560']) as string[],
        website: String(profile?.website || ''),
      }
      setSelectedPhotoUrl(mapped.photos?.[0]?.url || '')
      setSelected(profile)
      setStep('confirm')
    } catch { /* ignore */ }
    setLoading(false)
  }

  function handleConfirm() {
    if (!selected) return
    const profile = {
      placeId: String(selected.place_id || ''),
      name: String(selected.name || ''),
      address: String(selected.address || ''),
      logoUrl: String(selected.logo_url || ''),
      photos: (selected.photos || []) as { url: string; thumb: string }[],
      colors: (selected.colors || ['#1a1a2e', '#e94560']) as string[],
      website: String(selected.website || ''),
      selectedReferenceUrl: selectedPhotoUrl || ((selected.photos || [])[0]?.url || ''),
    }
    setBrand(profile)
    router.push('/wizard')
  }

  function handleManualSubmit() {
    setBrand({
      placeId: 'manual',
      name: manualName,
      address: city,
      logoUrl: logoFile ? URL.createObjectURL(logoFile) : '',
      photos: [],
      colors: [color1, color2],
      website: ''
    })
    router.push('/wizard')
  }

  if (step === 'confirm' && selected) {
    const colors = (selected.colors || []) as string[]
    const photos = (selected.photos || []) as Record<string, string>[]

    return (
      <main className="min-h-screen bg-white max-w-lg mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">We found your brand!</h2>
        <p className="text-gray-500 mb-8">Review your brand details below</p>

        <div className="border border-gray-200 rounded-2xl p-6 mb-6">
          <p className="font-semibold text-lg text-gray-900 mb-1">{selected.name as string}</p>
          <p className="text-gray-400 text-sm mb-4">{selected.address as string}</p>

          {/* Color swatches */}
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Brand colors</p>
          <div className="flex gap-2 mb-4">
            {colors.map((c: string, i: number) => (
              <div key={i} className="w-8 h-8 rounded-full border border-white shadow-sm"
                   style={{ backgroundColor: c }} title={c} />
            ))}
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Choose reference photo</p>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {photos.slice(0, 4).map((ph: Record<string, string>, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPhotoUrl(ph.url || ph.thumb)}
                    className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 ${selectedPhotoUrl === (ph.url || ph.thumb) ? 'border-blue-500' : 'border-transparent'}`}
                    title="Use this as reference"
                  >
                    <img src={ph.thumb} alt="shop" className="w-20 h-20 object-cover" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Selected photo will be used as image reference.</p>
            </>
          )}
        </div>

        <button onClick={handleConfirm}
          className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl text-base
                     hover:bg-blue-700 transition-colors">
          Yes, this is my shop — Continue
        </button>
        <button onClick={() => setStep('search')}
          className="w-full mt-3 text-gray-400 text-sm py-2">
          Not my shop — Search again
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white max-w-lg mx-auto px-6 py-16">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What&apos;s your shop name?</h2>
        <p className="text-gray-500">We&apos;ll find your brand automatically using Google</p>
      </div>

      <div className="space-y-3 mb-6">
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base
                     focus:outline-none focus:border-blue-400 transition-colors"
          placeholder="e.g. Sai Mobile Care"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base
                     focus:outline-none focus:border-blue-400 transition-colors"
          placeholder="City (e.g. Ambernath)"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl
                     hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Searching...' : 'Find my shop'}
        </button>
      </div>

      {/* Manual entry form */}
      {manualMode && (
        <div className="border border-gray-200 rounded-2xl p-6 mb-6">
          <p className="text-gray-700 mb-4">Couldn't find your shop on Google. No problem!</p>
          <div className="space-y-4">
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base
                         focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="Shop name"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Brand color 1</label>
                <input
                  type="color"
                  value={color1}
                  onChange={e => setColor1(e.target.value)}
                  className="w-full h-12 border border-gray-200 rounded-xl cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Brand color 2</label>
                <input
                  type="color"
                  value={color2}
                  onChange={e => setColor2(e.target.value)}
                  className="w-full h-12 border border-gray-200 rounded-xl cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Upload logo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base
                           focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <button onClick={handleManualSubmit}
              className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl text-base
                         hover:bg-blue-700 transition-colors">
              Continue with manual entry
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !manualMode && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 mb-3">Select your shop:</p>
          {results.map((place, i) => (
            <button key={i} onClick={() => handleSelect(place)}
              className="w-full text-left border border-gray-200 rounded-xl px-4 py-3
                         hover:border-blue-400 hover:bg-blue-50 transition-all">
              <p className="font-medium text-gray-800 text-sm">{place.name as string}</p>
              <p className="text-gray-400 text-xs mt-0.5">{place.address as string}</p>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && !manualMode && shopName && !loading && (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">Searching...</p>
        </div>
      )}
    </main>
  )
}
