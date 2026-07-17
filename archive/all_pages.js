// ============================================================
// GoVisual AI — Complete Next.js Frontend
// ============================================================
// FILE STRUCTURE:
//   frontend/
//     app/
//       page.tsx              ← Landing page
//       layout.tsx            ← Root layout
//       onboard/page.tsx      ← Brand setup (shop name lookup)
//       samples/page.tsx      ← Free sample generation (hook screen)
//       create/page.tsx       ← Creative type selection
//       wizard/page.tsx       ← 10-question MCQ wizard
//       results/page.tsx      ← Output gallery
//     components/
//       BrandSearch.tsx       ← Shop name typeahead
//       ColorSwatch.tsx       ← Brand color preview
//       WizardStep.tsx        ← MCQ question screen
//       ImageCard.tsx         ← Result image card
//       LoadingGenerate.tsx   ← Animated generation screen
//     lib/
//       api.ts                ← All API calls
//       store.ts              ← Zustand state store
//     package.json
// ============================================================
// HOW TO CREATE THIS PROJECT:
//   npx create-next-app@latest govisual-frontend --typescript --tailwind --app
//   cd govisual-frontend
//   npm install zustand framer-motion
//   Then replace app/page.tsx etc with the code below
// ============================================================


// ════════════════════════════════════════════════════════════
// lib/store.ts — Global state (paste as lib/store.ts)
// ════════════════════════════════════════════════════════════
const STORE = `
import { create } from 'zustand'

interface BrandProfile {
  placeId:    string
  name:       string
  address:    string
  logoUrl:    string
  photos:     { url: string; thumb: string }[]
  colors:     string[]
  website:    string
}

interface WizardAnswers {
  product:    string
  price:      string
  format:     string
  imageType:  string
  purpose:    string
  mood:       string
  background: string
  lighting:   string
  offer:      string
  mainText:   string
  language:   string
  urgency:    string
  productImageFile: File | null
}

interface GeneratedImage {
  tier:          string
  label:         string
  url:           string
  promptPreview: string
}

interface AppState {
  category:    string
  brand:       BrandProfile | null
  wizard:      Partial<WizardAnswers>
  results:     GeneratedImage[]
  caption:     string
  sessionId:   string

  setCategory: (c: string)              => void
  setBrand:    (b: BrandProfile)        => void
  setWizard:   (w: Partial<WizardAnswers>) => void
  setResults:  (r: GeneratedImage[], caption: string, id: string) => void
  reset:       ()                       => void
}

export const useStore = create<AppState>((set) => ({
  category:  '',
  brand:     null,
  wizard:    {},
  results:   [],
  caption:   '',
  sessionId: '',

  setCategory: (category) => set({ category }),
  setBrand:    (brand)    => set({ brand }),
  setWizard:   (wizard)   => set((s) => ({ wizard: { ...s.wizard, ...wizard } })),
  setResults:  (results, caption, sessionId) => set({ results, caption, sessionId }),
  reset:       ()         => set({ brand: null, wizard: {}, results: [], caption: '' }),
}))
`;


// ════════════════════════════════════════════════════════════
// lib/api.ts — All API calls (paste as lib/api.ts)
// ════════════════════════════════════════════════════════════
const API = `
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function searchBrand(q: string, city: string) {
  const r = await fetch(\`\${BASE}/brand-lookup?q=\${encodeURIComponent(q)}&city=\${encodeURIComponent(city)}\`)
  if (!r.ok) throw new Error('Search failed')
  return r.json()
}

export async function getBrandProfile(placeId: string) {
  const r = await fetch(\`\${BASE}/brand-profile/\${placeId}\`)
  if (!r.ok) throw new Error('Profile fetch failed')
  return r.json()
}

export async function generateSamples(placeId: string, category: string) {
  const form = new FormData()
  form.append('place_id', placeId)
  form.append('category', category)
  const r = await fetch(\`\${BASE}/generate-samples\`, { method: 'POST', body: form })
  if (!r.ok) throw new Error('Sample generation failed')
  return r.json()
}

export async function generateCreatives(answers: any, brandName: string, brandColors: string, category: string, productImage: File) {
  const form = new FormData()
  Object.entries(answers).forEach(([k, v]) => {
    if (v !== null && v !== undefined && k !== 'productImageFile') {
      form.append(k === 'imageType' ? 'image_type' : 
                  k === 'mainText'  ? 'main_text'  : k, String(v))
    }
  })
  form.append('brand_name',   brandName)
  form.append('brand_colors', brandColors)
  form.append('category',     category)
  form.append('product_image', productImage)
  
  const r = await fetch(\`\${BASE}/generate\`, { method: 'POST', body: form })
  if (!r.ok) throw new Error('Generation failed')
  return r.json()
}
`;


// ════════════════════════════════════════════════════════════
// app/layout.tsx
// ════════════════════════════════════════════════════════════
const LAYOUT = `
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'GoVisual AI — Premium marketing creatives for your brand',
  description: 'Turn your shop into a premium brand in 2 minutes. AI-powered marketing images for local businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
`;


// ════════════════════════════════════════════════════════════
// app/page.tsx — Landing page
// ════════════════════════════════════════════════════════════
const LANDING = `
'use client'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'electronics', label: 'Electronics',  emoji: '📱' },
  { id: 'clothing',    label: 'Clothing',      emoji: '👗' },
  { id: 'food',        label: 'Food & Drinks', emoji: '🍕' },
  { id: 'jewellery',   label: 'Jewellery',     emoji: '💍' },
  { id: 'pharmacy',    label: 'Pharmacy',      emoji: '💊' },
  { id: 'home_decor',  label: 'Home Decor',    emoji: '🏠' },
  { id: 'salon',       label: 'Salon & Beauty',emoji: '✂️' },
  { id: 'furniture',   label: 'Furniture',     emoji: '🛋️' },
]

export default function LandingPage() {
  const router = useRouter()

  function handleStart(category: string) {
    // Store category in sessionStorage for the onboarding flow
    sessionStorage.setItem('gv_category', category)
    router.push('/onboard')
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Free to start · No design skills needed
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          Turn your shop into a<br/>
          <span className="text-blue-600">premium brand</span> — in 2 minutes
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Get AI-generated Instagram posts, banners, WhatsApp creatives and more.
          Automatically branded with your shop colors and logo.
        </p>
      </section>

      {/* Category selection */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <p className="text-center text-gray-500 text-sm mb-6 font-medium uppercase tracking-wide">
          Choose your business type to get started
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleStart(cat.id)}
              className="flex flex-col items-center gap-2 p-5 border border-gray-200 rounded-2xl
                         hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm
                         transition-all duration-150 cursor-pointer text-center"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-2xl mx-auto text-center px-6">
          <p className="text-gray-400 text-sm mb-3">Used by local businesses in</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Thane', 'Nagpur'].map(city => (
              <span key={city} className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                {city}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
`;


// ════════════════════════════════════════════════════════════
// app/onboard/page.tsx — Business profile setup
// ════════════════════════════════════════════════════════════
const ONBOARD = `
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { searchBrand, getBrandProfile } from '@/lib/api'
import { useStore } from '@/lib/store'

export default function OnboardPage() {
  const router   = useRouter()
  const setBrand = useStore(s => s.setBrand)
  const setCategory = useStore(s => s.setCategory)

  const [shopName, setShopName]   = useState('')
  const [city,     setCity]       = useState('')
  const [results,  setResults]    = useState<any[]>([])
  const [loading,  setLoading]    = useState(false)
  const [selected, setSelected]   = useState<any>(null)
  const [step,     setStep]       = useState<'search' | 'confirm'>('search')

  useEffect(() => {
    const cat = sessionStorage.getItem('gv_category') || ''
    setCategory(cat)
  }, [])

  async function handleSearch() {
    if (!shopName.trim()) return
    setLoading(true)
    try {
      const data = await searchBrand(shopName, city)
      setResults(data.places || [])
    } catch { 
      setResults([])
    }
    setLoading(false)
  }

  async function handleSelect(place: any) {
    setLoading(true)
    try {
      const profile = await getBrandProfile(place.place_id)
      setBrand(profile)
      setSelected(profile)
      setStep('confirm')
    } catch { }
    setLoading(false)
  }

  function handleConfirm() {
    router.push('/samples')
  }

  if (step === 'confirm' && selected) {
    return (
      <main className="min-h-screen bg-white max-w-lg mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">We found your brand!</h2>
        <p className="text-gray-500 mb-8">Review your brand details below</p>

        <div className="border border-gray-200 rounded-2xl p-6 mb-6">
          <p className="font-semibold text-lg text-gray-900 mb-1">{selected.name}</p>
          <p className="text-gray-400 text-sm mb-4">{selected.address}</p>

          {/* Color swatches */}
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Brand colors</p>
          <div className="flex gap-2 mb-4">
            {(selected.colors || []).map((c: string, i: number) => (
              <div key={i} className="w-8 h-8 rounded-full border border-white shadow-sm"
                   style={{ backgroundColor: c }} title={c} />
            ))}
          </div>

          {/* Photos */}
          {selected.photos?.length > 0 && (
            <>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Your photos</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selected.photos.slice(0, 4).map((ph: any, i: number) => (
                  <img key={i} src={ph.thumb} alt="shop" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                ))}
              </div>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your shop name?</h2>
        <p className="text-gray-500">We'll find your brand automatically using Google</p>
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

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 mb-3">Select your shop:</p>
          {results.map((place, i) => (
            <button key={i} onClick={() => handleSelect(place)}
              className="w-full text-left border border-gray-200 rounded-xl px-4 py-3
                         hover:border-blue-400 hover:bg-blue-50 transition-all">
              <p className="font-medium text-gray-800 text-sm">{place.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{place.address}</p>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && shopName && !loading && (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm mb-4">Shop not found? No problem.</p>
          <button onClick={() => {
            setBrand({ placeId: 'manual', name: shopName, address: city,
                       logoUrl: '', photos: [], colors: ['#1a1a2e', '#e94560'], website: '' })
            router.push('/samples')
          }} className="text-blue-600 text-sm font-medium underline">
            Continue without Google lookup →
          </button>
        </div>
      )}
    </main>
  )
}
`;


// ════════════════════════════════════════════════════════════
// app/wizard/page.tsx — 10-question MCQ wizard
// ════════════════════════════════════════════════════════════
const WIZARD = `
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { generateCreatives } from '@/lib/api'

const QUESTIONS = [
  {
    key: 'product', label: 'What is your main product?',
    type: 'text', placeholder: 'e.g. iPhone 16, Men\\'s Kurta, Special Biryani',
  },
  {
    key: 'price', label: 'What is the price?',
    type: 'number', placeholder: 'e.g. 29999',
  },
  {
    key: 'offer', label: 'Any special offer?',
    type: 'choice',
    options: ['No offer', '10% discount', '20% off', 'Buy 1 Get 1 Free', 'Flat ₹500 off', 'Free gift'],
  },
  {
    key: 'mood', label: 'How should it feel?',
    type: 'choice',
    options: ['Premium & luxurious', 'Bold & energetic', 'Clean & minimal', 'Warm & friendly', 'Festive & colorful'],
  },
  {
    key: 'background', label: 'What kind of background?',
    type: 'choice',
    options: ['Dark tech', 'Bright studio white', 'Outdoor lifestyle', 'Abstract gradient', 'Festive themed', 'Plain white'],
  },
  {
    key: 'lighting', label: 'What kind of lighting?',
    type: 'choice',
    options: ['Dramatic spotlight', 'Soft natural light', 'Neon glow', 'Bright daylight', 'Cinematic dark'],
  },
  {
    key: 'productImageFile', label: 'Upload your product photo',
    type: 'image',
    hint: 'A clear photo of the product on any background. This helps AI match your exact product.',
  },
  {
    key: 'mainText', label: 'Main text on the image?',
    type: 'text', placeholder: 'e.g. New Arrival! or Diwali Special',
  },
  {
    key: 'language', label: 'Caption language?',
    type: 'choice',
    options: ['English', 'Hindi', 'Marathi', 'Hinglish'],
  },
  {
    key: 'urgency', label: 'Is this time-limited?',
    type: 'choice',
    options: ['No urgency', 'Today only', 'This weekend', 'Limited stock'],
  },
]

export default function WizardPage() {
  const router     = useRouter()
  const { wizard, setWizard, setResults, brand, category } = useStore()
  const [step,     setStep]     = useState(0)
  const [answer,   setAnswer]   = useState<any>('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const fileRef    = useRef<HTMLInputElement>(null)
  const q          = QUESTIONS[step]

  function handleNext() {
    if (!answer && q.type !== 'image') return
    setWizard({ [q.key]: answer })
    setAnswer('')
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1)
    } else {
      handleGenerate()
    }
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    router.push('/results?loading=true')
    
    try {
      const allAnswers = { ...wizard, urgency: answer || 'No urgency' }
      const imageFile  = wizard.productImageFile as unknown as File
      
      if (!imageFile) throw new Error('Product image required')
      if (!brand)     throw new Error('Brand profile missing')

      const data = await generateCreatives(
        allAnswers,
        brand.name,
        brand.colors.join(' & '),
        category,
        imageFile,
      )
      setResults(data.images, data.caption, data.session_id)
      router.push('/results')
    } catch (e: any) {
      setError(e.message || 'Generation failed')
      setLoading(false)
    }
  }

  const progress = ((step + 1) / QUESTIONS.length) * 100

  return (
    <main className="min-h-screen bg-white max-w-lg mx-auto px-6 py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
               style={{ width: \`\${progress}%\` }} />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{q.label}</h2>
      {q.hint && <p className="text-gray-400 text-sm mb-6">{q.hint}</p>}
      {!q.hint && <div className="mb-6" />}

      {/* Answer input */}
      {(q.type === 'text' || q.type === 'number') && (
        <input
          type={q.type}
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base
                     focus:outline-none focus:border-blue-400 mb-6"
          placeholder={q.placeholder}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          autoFocus
        />
      )}

      {q.type === 'choice' && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {q.options!.map(opt => (
            <button key={opt} onClick={() => setAnswer(opt)}
              className={\`py-3 px-4 rounded-xl border text-sm font-medium transition-all
                \${answer === opt
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }\`}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === 'image' && (
        <div className="mb-6">
          <input type="file" accept="image/*" ref={fileRef} className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) setAnswer(file)
              setWizard({ productImageFile: file as any })
            }} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-10
                       flex flex-col items-center gap-2 hover:border-blue-400 transition-colors">
            {answer
              ? <p className="text-green-600 font-medium text-sm">Photo selected: {(answer as File).name}</p>
              : <>
                  <span className="text-3xl">📷</span>
                  <p className="text-gray-500 text-sm">Tap to upload product photo</p>
                </>
            }
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="px-6 py-4 border border-gray-200 rounded-2xl text-gray-600 font-medium">
            Back
          </button>
        )}
        <button onClick={handleNext} disabled={!answer && q.type !== 'choice'}
          className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-2xl
                     hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {step === QUESTIONS.length - 1 ? 'Generate my creatives →' : 'Next →'}
        </button>
      </div>
    </main>
  )
}
`;


// ════════════════════════════════════════════════════════════
// app/results/page.tsx — Output gallery
// ════════════════════════════════════════════════════════════
const RESULTS = `
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

const LOADING_STEPS = [
  'Reading your brand...',
  'Building your prompts...',
  'Generating Creative 1...',
  'Generating Creative 2...',
  'Generating Creative 3...',
  'Applying watermark...',
  'Almost done...',
]

export default function ResultsPage() {
  const router      = useRouter()
  const params      = useSearchParams()
  const isLoading   = params.get('loading') === 'true'
  const { results, caption, brand } = useStore()

  const [loadStep, setLoadStep] = useState(0)

  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => {
      setLoadStep(s => s < LOADING_STEPS.length - 1 ? s + 1 : s)
    }, 2800)
    return () => clearInterval(interval)
  }, [isLoading])

  async function handleDownload(url: string, label: string) {
    const a    = document.createElement('a')
    a.href     = url
    a.download = \`GoVisual_\${label.replace(' ', '_')}.jpg\`
    a.click()
  }

  async function handleShare(url: string) {
    if (navigator.share) {
      await navigator.share({ title: 'My GoVisual Creative', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  function copyCaption() {
    navigator.clipboard.writeText(caption)
    alert('Caption copied!')
  }

  // Loading state
  if (isLoading || results.length === 0) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-8" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Creating your creatives</h2>
          <p className="text-blue-600 text-sm font-medium h-6 transition-all">
            {LOADING_STEPS[loadStep]}
          </p>
          <p className="text-gray-400 text-xs mt-4">This takes 15–30 seconds</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Your creatives are ready!</h2>
          <p className="text-gray-500 mt-1">3 versions — choose the style that works best for you</p>
        </div>

        {/* Image cards */}
        <div className="space-y-5 mb-8">
          {results.map((img, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 h-3 flex items-center px-3 gap-1.5">
                <span className="text-xs font-medium text-gray-500">{img.label}</span>
              </div>
              <img src={img.url} alt={img.label}
                   className="w-full object-cover"
                   onError={(e) => (e.currentTarget.src = '/placeholder.jpg')} />
              <div className="p-4 flex gap-2">
                <button onClick={() => handleDownload(img.url, img.label)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium
                             text-gray-700 hover:bg-gray-50 transition-colors">
                  Download
                </button>
                <button onClick={() => handleShare(img.url)}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium
                             hover:bg-blue-700 transition-colors">
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Caption */}
        {caption && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-gray-700">Auto-generated caption</p>
              <button onClick={copyCaption}
                className="text-xs text-blue-600 font-medium">Copy</button>
            </div>
            <p className="text-gray-600 text-sm whitespace-pre-line">{caption}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => router.push('/wizard')}
            className="flex-1 border border-gray-200 rounded-2xl py-3.5 text-sm font-medium text-gray-700">
            Create another
          </button>
          <button onClick={() => alert('Upgrade coming soon!')}
            className="flex-1 bg-gray-900 text-white rounded-2xl py-3.5 text-sm font-medium">
            Remove watermark ✨
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs mt-4">
          Made with GoVisual AI · govisual.in
        </p>
      </div>
    </main>
  )
}
`;

// Export marker so this file is readable
module.exports = { STORE, API, LAYOUT, LANDING, ONBOARD, WIZARD, RESULTS };
