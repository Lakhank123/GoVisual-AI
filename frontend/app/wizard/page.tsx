'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { generateCreatives } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { motion, AnimatePresence } from 'framer-motion'

interface Question {
  key: string
  label: string
  type: 'text' | 'number' | 'choice' | 'image'
  placeholder?: string
  hint?: string
  options?: string[]
}

const QUESTIONS: Question[] = [
  {
    key: 'product', label: 'What is your main product?',
    type: 'text', placeholder: "e.g. iPhone 16, Men's Kurta, Special Biryani",
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
  const router = useRouter()
  const { wizard, setWizard, setResults, brand, category } = useStore()
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<string | File>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const q = QUESTIONS[step]



  function handleNext() {
    if (!answer && q.type !== 'image') return
    setWizard({ [q.key]: answer })
    setAnswer('')
    if (step < QUESTIONS.length - 1) {
      setDirection(1)
      setStep(step + 1)
    } else {
      handleGenerate()
    }
  }

  function handleBack() {
    setDirection(-1)
    setStep(step - 1)
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    router.push('/results?loading=true')

    try {
      const answersToSend: Record<string, string> = {}
      Object.entries(wizard).forEach(([k, v]) => {
        if (typeof v === 'string') {
          answersToSend[k] = v
        }
      })
      answersToSend.format = '1:1'
      answersToSend.imageType = 'Instagram post'
      answersToSend.purpose = 'Sales promotion'
      answersToSend.urgency = typeof answer === 'string' && answer ? answer : 'No urgency'

      const imageFile = (wizard.productImageFile as unknown as File) || null
      const referenceImageUrl = brand?.selectedReferenceUrl || ''

      if (!imageFile && !referenceImageUrl) throw new Error('Upload product image or select shop photo')
      if (!brand) throw new Error('Brand profile missing')

      const data = await generateCreatives(
        answersToSend,
        brand.name,
        brand.colors.join(' & '),
        category || 'general',
        imageFile,
        referenceImageUrl,
      )
      setResults(data.images, data.caption, data.session_id)
      router.push('/results')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Generation failed'
      setError(msg)
      setLoading(false)
    }
  }

  const progress = ((step + 1) / QUESTIONS.length) * 100

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060a06] max-w-lg mx-auto px-6 py-24 text-white">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between text-xs text-[#2a4a2a] mb-3">
            <span>Question {step + 1} of {QUESTIONS.length}</span>
            <span className="text-[#39ff14]">{Math.round(progress)}%</span>
          </div>
          <div className="h-[3px] bg-[#0d160d] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#39ff14] rounded-full shadow-[0_0_8px_rgba(57,255,20,0.4)]"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Question Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Question Title */}
            <h2 className="font-space-grotesk text-2xl font-bold text-white mb-2">{q.label}</h2>
            {q.hint && <p className="text-[#3a5a3a] text-xs mb-8">{q.hint}</p>}
            {!q.hint && <div className="mb-8" />}

            {/* Text / Number Input */}
            {(q.type === 'text' || q.type === 'number') && (
              <input
                type={q.type}
                className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-xl px-4 py-3.5 text-base text-white
                           focus:outline-none focus:border-[#39ff14] transition-colors duration-150 mb-8
                           placeholder-[#2a4a2a]"
                placeholder={q.placeholder}
                value={answer as string}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                autoFocus
              />
            )}

            {/* Choice Grid */}
            {q.type === 'choice' && (
              <div className="grid grid-cols-2 gap-2 mb-8">
                {q.options!.map(opt => (
                  <motion.button
                    key={opt}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAnswer(opt)}
                    className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer ${answer === opt
                        ? 'border-[#39ff14] bg-[#0a1a0a] text-[#39ff14] font-bold shadow-[0_0_12px_rgba(57,255,20,0.1)]'
                        : 'border-[#1a2a1a] bg-[#080f08] text-[#3a5a3a] hover:border-[#2a4a2a] hover:text-[#4a7a4a]'
                      }`}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Image Upload */}
            {q.type === 'image' && (
              <div className="mb-8">
                {brand?.selectedReferenceUrl && (
                  <div className="mb-4 rounded-lg border border-[#39ff14]/20 bg-[#0a1a0a] p-3">
                    <p className="text-xs text-[#39ff14]">Using selected shop photo as fallback reference.</p>
                  </div>
                )}
                <input type="file" accept="image/*" ref={fileRef} className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) setAnswer(file)
                    setWizard({ productImageFile: file as unknown as File })
                  }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setIsDragOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) {
                      setAnswer(file)
                      setWizard({ productImageFile: file as unknown as File })
                    }
                  }}
                  className={`w-full border-2 border-dashed rounded-2xl p-10
                             flex flex-col items-center gap-2 transition-colors duration-150 bg-[#0d160d] cursor-pointer ${isDragOver ? 'border-[#39ff14] bg-[#0a1a0a]' : 'border-[#1a2a1a] hover:border-[#39ff14]'
                    }`}
                >
                  {answer instanceof File
                    ? <p className="text-[#39ff14] font-medium text-sm">✓ Photo selected: {answer.name}</p>
                    : <>
                      <span className="text-3xl">📷</span>
                      <p className="text-[#2a4a2a] text-sm">Tap to upload product photo</p>
                      <p className="text-[#1a2a1a] text-xs">or drag and drop</p>
                    </>
                  }
                </button>
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[#ff6b6b] text-sm mb-6 bg-[#0a1a0a] p-3 rounded-lg border border-[#2a1a1a]"
              >
                {error}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={handleBack}
              className="px-6 py-3 border border-[#1a2a1a] rounded-lg text-[#3a5a3a] font-medium
                         hover:border-[#39ff14] hover:text-[#39ff14] transition-colors duration-150 cursor-pointer"
            >
              Back
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={(!answer && q.type !== 'image') || loading}
            className="flex-1 bg-[#39ff14] text-black font-bold py-3 rounded-lg
                       hover:opacity-90 disabled:opacity-40 transition-all duration-150 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Generating...
              </span>
            ) : step === QUESTIONS.length - 1 ? 'Generate my creatives →' : 'Next →'}
          </motion.button>
        </div>
      </main>
    </>
  )
}
