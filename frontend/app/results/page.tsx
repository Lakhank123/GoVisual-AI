'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { Download, Share2, X, Copy, Check } from 'lucide-react'

const LOADING_STEPS = [
  'Reading your brand...',
  'Building your prompts...',
  'Generating Creative 1...',
  'Generating Creative 2...',
  'Generating Creative 3...',
  'Applying watermark...',
  'Almost done...',
]

const TIER_BADGES: Record<string, { bg: string; text: string }> = {
  Basic:        { bg: 'bg-[#39ff14]',         text: 'text-black' },
  Professional: { bg: 'bg-white',             text: 'text-black' },
  Creative:     { bg: 'bg-[#0d160d] border border-[#39ff14]', text: 'text-[#39ff14]' },
}

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Hinglish']

export default function ResultsPage() {
  const router = useRouter()
  const { results, caption, brand } = useStore()
  const [loadStep, setLoadStep] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null)
  const [captionLang, setCaptionLang] = useState('English')
  const [copied, setCopied] = useState(false)
  const isLoading = results.length === 0 && !timedOut

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadStep(s => (s < LOADING_STEPS.length - 1 ? s + 1 : s))
    }, 3000)
    const timeout = setTimeout(() => setTimedOut(true), 90000)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  async function handleDownload(url: string, label: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = `GoVisual_${label}.jpg`
    a.target = '_blank'
    a.click()
  }

  async function handleShare(url: string) {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My GoVisual Creative', url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
      }
    } catch {
      await navigator.clipboard.writeText(url)
    }
  }

  function handleCopyCaption() {
    if (caption) {
      navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /* ─── Timed out state ─── */
  if (timedOut && results.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#060a06] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-[#ff6b6b] flex items-center justify-center">
              <X className="text-[#ff6b6b]" size={28} />
            </div>
            <p className="text-white text-lg font-bold mb-2">Generation took too long.</p>
            <p className="text-[#3a5a3a] text-sm mb-8">Check your API keys and try again.</p>
            <button onClick={() => router.push('/wizard')}
              className="bg-[#39ff14] text-black font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
              Try again
            </button>
          </motion.div>
        </main>
      </>
    )
  }

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#060a06] flex items-center justify-center">
        <div className="text-center">
          {/* Animated pulsing orb */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[#39ff14] to-[#0D9488] blur-xl opacity-40"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-br from-[#39ff14] to-[#0D9488] blur-md opacity-60"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            />
            <div className="absolute inset-4 rounded-full bg-[#39ff14]/20 flex items-center justify-center">
              <motion.div
                className="w-6 h-6 rounded-full bg-[#39ff14]"
                animate={{ scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>

          <h2 className="text-white text-xl font-bold mb-3">Creating your creatives</h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={loadStep}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-[#39ff14] text-sm font-medium mb-2"
            >
              {LOADING_STEPS[loadStep]}
            </motion.p>
          </AnimatePresence>

          <p className="text-[#3a5a3a] text-xs">This takes 15-30 seconds</p>
        </div>
      </main>
    )
  }

  /* ─── Results state ─── */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060a06] px-4 py-24">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="font-space-grotesk text-2xl font-bold text-white mb-1">
              Your creatives are ready! ✨
            </h2>
            <p className="text-[#3a5a3a] text-sm">
              3 AI-generated images for {brand?.name || 'your brand'}
            </p>
          </motion.div>

          {/* Image Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {results.map((img, i) => {
              const badge = TIER_BADGES[img.label] || TIER_BADGES.Basic
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-[#0d160d] rounded-xl overflow-hidden transition-all duration-200 ${
                    i === 1 ? 'border-2 border-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.1)]' : 'border border-[#1a2a1a]'
                  }`}
                >
                  <div className="relative cursor-pointer" onClick={() => setFullscreenImg(img.url)}>
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-full aspect-square object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%230d160d' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%2339ff14' text-anchor='middle' dy='.3em'%3EGoVisual AI%3C/text%3E%3C/svg%3E`
                      }}
                    />
                    <span className={`absolute top-2 left-2 ${badge.bg} ${badge.text} text-[10px] font-extrabold px-2 py-0.5 rounded`}>
                      {img.label}
                    </span>
                  </div>
                  <div className="p-3 flex gap-2">
                    <button
                      onClick={() => handleDownload(img.url, img.label)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-[#1a2a1a] text-[#3a5a3a] text-xs py-2 rounded-lg
                                 hover:border-[#39ff14] hover:text-[#39ff14] transition-colors duration-150 cursor-pointer"
                    >
                      <Download size={13} /> Download
                    </button>
                    <button
                      onClick={() => handleShare(img.url)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#39ff14] text-black text-xs font-bold py-2 rounded-lg
                                 hover:opacity-90 transition-opacity duration-150 cursor-pointer"
                    >
                      <Share2 size={13} /> Share
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Caption Card */}
          {caption && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0d160d] border border-[#1a2a1a] rounded-xl p-5 mb-6"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-white text-sm font-semibold">Caption</span>
                <button
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1 text-[#39ff14] text-xs hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>

              {/* Language tabs */}
              <div className="flex gap-1 mb-4">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setCaptionLang(lang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                      captionLang === lang
                        ? 'bg-[#39ff14] text-black'
                        : 'text-[#2a4a2a] hover:text-[#39ff14] border border-[#1a2a1a]'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <p className="text-[#3a5a3a] text-sm leading-relaxed whitespace-pre-line">{caption}</p>
            </motion.div>
          )}

          {/* Bottom Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-3"
          >
            <button
              onClick={() => router.push('/wizard')}
              className="flex-1 border border-[#1a2a1a] text-[#3a5a3a] text-sm font-medium py-3 rounded-xl
                         hover:border-[#39ff14] hover:text-[#39ff14] transition-colors duration-150 cursor-pointer"
            >
              Create another
            </button>
            <button
              onClick={() => alert('Upgrade coming soon!')}
              className="flex-1 bg-white text-black text-sm font-bold py-3 rounded-xl
                         hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
            >
              Remove watermark
            </button>
          </motion.div>
        </div>
      </main>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setFullscreenImg(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setFullscreenImg(null)}
                className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X size={28} />
              </button>
              <img
                src={fullscreenImg}
                alt="Fullscreen creative"
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
