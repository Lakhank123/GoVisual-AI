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
