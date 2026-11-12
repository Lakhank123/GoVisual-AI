'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useDemoSession } from '@/components/providers/demo-session-provider'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { Download, Share2, X, Copy, Check, Bookmark, MessageCircle, CheckCircle2 } from 'lucide-react'
import { downloadAsPng, shareToWhatsAppContact } from '@/lib/imageDownload'

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
  Basic:        { bg: 'bg-[#E8B66F]',         text: 'text-[#0B0907]' },
  Professional: { bg: 'bg-white',             text: 'text-black' },
  Creative:     { bg: 'bg-[#21170F] border border-[#E8B66F]', text: 'text-[#E8B66F]' },
}

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Hinglish']

export default function ResultsPage() {
  const router = useRouter()
  const { results, caption, brand } = useStore()
  const { addAssetToLibrary, addRecentWork } = useDemoSession()
  const [loadStep, setLoadStep] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null)
  const [captionLang, setCaptionLang] = useState('English')
  const [copied, setCopied] = useState(false)
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({})
  const [saveFeedback, setSaveFeedback] = useState<Record<number, string>>({})
  const [downloadingIdx, setDownloadingIdx] = useState<Record<number, boolean>>({})
  const [whatsAppModalImg, setWhatsAppModalImg] = useState<{ url: string; label: string; index: number } | null>(null)
  const [statusDone, setStatusDone] = useState(false)
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

  async function handleDownload(url: string, label: string, index: number) {
    setDownloadingIdx(prev => ({ ...prev, [index]: true }))
    try {
      const cleanLabel = (label || 'creative').toLowerCase().replace(/[^a-z0-9]/g, '_')
      const brandName = (brand?.name || 'govisual').toLowerCase().replace(/[^a-z0-9]/g, '_')
      const filename = `${brandName}_${cleanLabel}.png`
      await downloadAsPng(url, filename)
    } catch (e) {
      console.error("PNG download error:", e)
      window.open(url, '_blank')
    } finally {
      setDownloadingIdx(prev => ({ ...prev, [index]: false }))
    }
  }

  function handleSaveToLibrary(img: any, index: number) {
    if (savedMap[index]) return
    const pTitle = brand?.name ? `${brand.name} Creative` : "Creative"
    const label = img.strategy_name || img.label || `Strategy ${index + 1}`

    addAssetToLibrary({
      id: `creative_${Date.now()}_${index}`,
      type: "creative",
      url: img.url,
      metadata: {
        title: `${pTitle} — ${label}`,
        format: "image/png",
        caption: caption,
      },
      createdAt: new Date().toISOString(),
    })

    addRecentWork({
      type: "creative",
      url: img.url,
      label: `${pTitle} (${label})`,
    })

    setSavedMap(prev => ({ ...prev, [index]: true }))
    setSaveFeedback(prev => ({ ...prev, [index]: "Saved ✓" }))
  }

  async function handleWhatsAppContactShare() {
    if (!whatsAppModalImg) return
    const brandName = brand?.name || 'Our Brand'
    await shareToWhatsAppContact(whatsAppModalImg.url, caption, `${brandName} ${whatsAppModalImg.label}`)
  }

  async function handleWhatsAppStatusShare() {
    if (!whatsAppModalImg) return
    const cleanLabel = (whatsAppModalImg.label || 'creative').toLowerCase().replace(/[^a-z0-9]/g, '_')
    const brandName = (brand?.name || 'govisual').toLowerCase().replace(/[^a-z0-9]/g, '_')
    const filename = `${brandName}_${cleanLabel}.png`

    await downloadAsPng(whatsAppModalImg.url, filename)

    if (caption && typeof navigator !== "undefined") {
      try {
        await navigator.clipboard.writeText(caption)
      } catch {}
    }

    setStatusDone(true)
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
        <main className="min-h-screen bg-[#0B0907] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-[#ef4444] flex items-center justify-center">
              <X className="text-[#ef4444]" size={28} />
            </div>
            <p className="text-[#F7F3ED] text-lg font-bold mb-2">Generation took too long.</p>
            <p className="text-[#B9AA99] text-sm mb-8">Check your API keys and try again.</p>
            <button onClick={() => router.push('/wizard')}
              className="bg-[#E8B66F] text-[#0B0907] font-bold px-8 py-3 rounded-xl hover:bg-[#F3CB8D] transition-colors cursor-pointer">
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
      <main className="min-h-screen bg-[#0B0907] flex items-center justify-center">
        <div className="text-center">
          {/* Animated pulsing orb */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E8B66F] to-[#6F452C] blur-xl opacity-40"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-br from-[#E8B66F] to-[#6F452C] blur-md opacity-60"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            />
            <div className="absolute inset-4 rounded-full bg-[rgba(232,182,111,0.2)] flex items-center justify-center">
              <motion.div
                className="w-6 h-6 rounded-full bg-[#E8B66F]"
                animate={{ scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>

          <h2 className="text-[#F7F3ED] text-xl font-bold mb-3">Creating your creatives</h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={loadStep}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-[#E8B66F] text-sm font-medium mb-2"
            >
              {LOADING_STEPS[loadStep]}
            </motion.p>
          </AnimatePresence>

          <p className="text-[#B9AA99] text-xs">This takes 15-30 seconds</p>
        </div>
      </main>
    )
  }

  /* ─── Results state ─── */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0B0907] px-4 py-24">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="font-space-grotesk text-2xl font-bold text-[#F7F3ED] mb-1">
              Your creatives are ready! ✨
            </h2>
            <p className="text-[#B9AA99] text-sm">
              3 AI-generated images for {brand?.name || 'your brand'}
            </p>
          </motion.div>

          {/* Image Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {results.map((img, i) => {
              const isRecommended = img.is_recommended;
              const strategy = img.strategy_name || img.label || `Strategy ${i+1}`
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-[#21170F] rounded-xl overflow-hidden transition-all duration-200 ${
                    isRecommended ? 'border-2 border-[#E8B66F] shadow-[0_0_20px_rgba(232,182,111,0.15)]' : 'border border-[#3B2B1E]'
                  }`}
                >
                  <div className="relative cursor-pointer" onClick={() => setFullscreenImg(img.url)}>
                    <img
                      src={img.url}
                      alt={strategy}
                      className="w-full aspect-square object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%2321170F' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%23E8B66F' text-anchor='middle' dy='.3em'%3EGoVisual AI%3C/text%3E%3C/svg%3E`
                      }}
                    />
                    <span className="absolute top-2 left-2 bg-[#E8B66F] text-[#0B0907] text-[10px] font-extrabold px-2 py-0.5 rounded">
                      Candidate {i+1}
                    </span>
                  </div>
                  <div className="p-3 border-b border-[#3B2B1E]">
                    <p className="text-xs font-bold text-[#F7F3ED] mb-1">{strategy}</p>
                    <p className="text-[10px] text-[#B9AA99] truncate">{img.prompt_used || img.promptPreview || "No prompt preview"}</p>
                    {img.status === "FAILED" && <p className="text-[10px] text-red-500 mt-1">Generation Failed</p>}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveToLibrary(img, i)}
                        disabled={savedMap[i]}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-semibold transition-colors duration-150 cursor-pointer ${
                          savedMap[i]
                            ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-400'
                            : 'border border-[#3B2B1E] text-white hover:border-[#E8B66F] hover:text-[#E8B66F]'
                        }`}
                      >
                        <Bookmark size={13} /> {saveFeedback[i] || 'Save to Library'}
                      </button>
                      <button
                        onClick={() => handleDownload(img.url, strategy, i)}
                        disabled={downloadingIdx[i]}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-[#3B2B1E] text-[#B9AA99] text-xs py-2 rounded-lg
                                   hover:border-[#E8B66F] hover:text-[#E8B66F] transition-colors duration-150 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={13} /> {downloadingIdx[i] ? 'Exporting...' : 'Download PNG'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setWhatsAppModalImg({ url: img.url, label: strategy, index: i });
                          setStatusDone(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-semibold py-1.5 rounded-lg
                                   hover:bg-emerald-900/40 hover:border-emerald-600 transition-colors duration-150 cursor-pointer"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                      <button
                        onClick={() => handleShare(img.url)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#E8B66F] text-[#0B0907] text-xs font-bold py-1.5 rounded-lg
                                   hover:bg-[#F3CB8D] transition-colors duration-150 cursor-pointer"
                      >
                        <Share2 size={13} /> Share Link
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* AI Recommendation */}
          {results.some(r => r.is_recommended) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#21170F] border border-[#E8B66F] rounded-xl p-5 mb-6 shadow-[0_0_15px_rgba(232,182,111,0.15)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl text-[#E8B66F]">★</span>
                <span className="text-[#E8B66F] text-sm font-bold">GO VISUAL AI RECOMMENDATION</span>
              </div>
              <p className="text-[#F7F3ED] text-sm mb-4">
                We recommend <strong>Candidate {results.findIndex(r => r.is_recommended) + 1}</strong> because it scored highest across our aesthetic and brand-consistency metrics.
              </p>
              <p className="text-[#B9AA99] text-xs italic">
                "{results.find(r => r.is_recommended)?.recommendation_reason || "Based on automated analysis of image composition and product preservation."}"
              </p>
            </motion.div>
          )}

          {/* Caption Card */}
          {caption && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#21170F] border border-[#3B2B1E] rounded-xl p-5 mb-6"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[#F7F3ED] text-sm font-semibold">Caption</span>
                <button
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1 text-[#E8B66F] text-xs hover:opacity-80 transition-opacity cursor-pointer"
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
                        ? 'bg-[#E8B66F] text-[#0B0907]'
                        : 'text-[#B9AA99] hover:text-[#E8B66F] border border-[#3B2B1E]'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <p className="text-[#B9AA99] text-sm leading-relaxed whitespace-pre-line">{caption}</p>
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
              className="flex-1 border border-[#3B2B1E] text-[#B9AA99] text-sm font-medium py-3 rounded-xl
                         hover:border-[#E8B66F] hover:text-[#E8B66F] transition-colors duration-150 cursor-pointer"
            >
              Create another
            </button>
            <button
              onClick={() => alert('Upgrade coming soon!')}
              className="flex-1 bg-[#E8B66F] text-[#0B0907] text-sm font-bold py-3 rounded-xl
                         hover:bg-[#F3CB8D] transition-colors duration-150 cursor-pointer"
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

      {/* WhatsApp Share Modal */}
      {whatsAppModalImg && (
        <div
          onClick={() => {
            setWhatsAppModalImg(null);
            setStatusDone(false);
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#14100D] border border-[#3B2B1E] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Share on WhatsApp</h3>
                  <p className="text-[11px] text-[#B9AA99]">{whatsAppModalImg.label}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWhatsAppModalImg(null);
                  setStatusDone(false);
                }}
                className="p-1 rounded-lg text-[#8A7B6D] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Contact / Group Share */}
              <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E] hover:border-emerald-700/50 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs">Option 1: Contact or Group Chat</h4>
                    <p className="text-[11px] text-[#8A7B6D] mt-0.5">
                      Sends your creative image and marketing caption directly to a customer, client, or group.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleWhatsAppContactShare}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Share with Contact / Group</span>
                </button>
              </div>

              {/* Option 2: WhatsApp Status */}
              <div className="p-4 rounded-xl bg-[#0B0907] border border-[#3B2B1E] hover:border-[#E8B66F]/40 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs">Option 2: WhatsApp Status</h4>
                    <p className="text-[11px] text-[#8A7B6D] mt-0.5">
                      WhatsApp does not allow 3rd-party web apps to publish Status automatically. We export your high-resolution PNG and copy your marketing caption for instant 1-tap posting.
                    </p>
                  </div>
                </div>

                {statusDone ? (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-xs text-emerald-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> PNG downloaded & caption copied!
                    </p>
                    <p className="text-[11px] text-emerald-400/80">
                      Now open WhatsApp &gt; Updates &gt; Tap "My Status" &gt; select your downloaded PNG and paste your caption.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleWhatsAppStatusShare}
                    className="w-full py-2.5 rounded-xl bg-[#21170F] border border-[#3B2B1E] hover:border-[#E8B66F] text-[#E8B66F] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download PNG &amp; Copy Caption for Status</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setWhatsAppModalImg(null);
                  setStatusDone(false);
                }}
                className="px-4 py-2 rounded-xl border border-[#3B2B1E] text-xs text-[#B9AA99] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
