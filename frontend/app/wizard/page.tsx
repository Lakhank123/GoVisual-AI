'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { generateCreatives } from '@/lib/api'

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
  const router     = useRouter()
  const { wizard, setWizard, setResults, brand, category } = useStore()
  const [step,     setStep]     = useState(0)
  const [answer,   setAnswer]   = useState<string | File>('')
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
      const allAnswers = {
        format: '1:1',
        imageType: 'Instagram post',
        purpose: 'Sales promotion',
        ...wizard,
        urgency: answer || 'No urgency',
      }
      const imageFile = (wizard.productImageFile as unknown as File) || null
      const referenceImageUrl = brand?.selectedReferenceUrl || ''
      
      if (!imageFile && !referenceImageUrl) throw new Error('Upload product image or select shop photo')
      if (!brand)     throw new Error('Brand profile missing')

      const data = await generateCreatives(
        allAnswers,
        brand.name,
        brand.colors.join(' & '),
        category,
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
    <main className="min-h-screen bg-white max-w-lg mx-auto px-6 py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
               style={{ width: `${progress}%` }} />
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
          value={answer as string}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          autoFocus
        />
      )}

      {q.type === 'choice' && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {q.options!.map(opt => (
            <button key={opt} onClick={() => setAnswer(opt)}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all
                ${answer === opt
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === 'image' && (
        <div className="mb-6">
          {brand?.selectedReferenceUrl && (
            <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3">
              <p className="text-xs text-green-700">Using selected shop photo as fallback reference.</p>
            </div>
          )}
          <input type="file" accept="image/*" ref={fileRef} className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) setAnswer(file)
              setWizard({ productImageFile: file as unknown as File })
            }} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-10
                       flex flex-col items-center gap-2 hover:border-blue-400 transition-colors">
            {answer instanceof File
              ? <p className="text-green-600 font-medium text-sm">Photo selected: {answer.name}</p>
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
        <button onClick={handleNext} disabled={(!answer && q.type !== 'choice') || loading}
          className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-2xl
                     hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {loading ? 'Generating...' : step === QUESTIONS.length - 1 ? 'Generate my creatives →' : 'Next →'}
        </button>
      </div>
    </main>
  )
}
