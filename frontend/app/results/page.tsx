'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const { results, caption, brand } = useStore()
  const [loadStep, setLoadStep] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
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
    } catch (e) {
      await navigator.clipboard.writeText(url)
    }
  }

  if (timedOut && results.length === 0) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060a06' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Generation took too long.</p>
          <p style={{ color: '#3a5a3a', fontSize: '14px', marginBottom: '24px' }}>Check your API keys and try again.</p>
          <button onClick={() => router.push('/wizard')}
            style={{ background: '#39ff14', color: '#000', fontWeight: 700, padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060a06' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '2px solid #39ff14', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Creating your creatives</h2>
          <p style={{ color: '#39ff14', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{LOADING_STEPS[loadStep]}</p>
          <p style={{ color: '#3a5a3a', fontSize: '11px' }}>This takes 15-30 seconds</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#060a06', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>Your creatives are ready!</h2>
          <p style={{ color: '#3a5a3a', fontSize: '13px', marginTop: '4px' }}>3 AI-generated images for {brand?.name}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {results.map((img, i) => (
            <div key={i} style={{ background: '#0d160d', border: i === 1 ? '2px solid #39ff14' : '1px solid #1a2a1a', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <img src={img.url} alt={img.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%230d160d' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%2339ff14' text-anchor='middle' dy='.3em'%3EGoVisual AI%3C/text%3E%3C/svg%3E` }}
                />
                <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#39ff14', color: '#000', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                  {img.label}
                </span>
              </div>
              <div style={{ padding: '8px', display: 'flex', gap: '4px' }}>
                <button onClick={() => handleDownload(img.url, img.label)}
                  style={{ flex: 1, border: '1px solid #1a2a1a', background: 'transparent', color: '#3a5a3a', fontSize: '10px', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                  Download
                </button>
                <button onClick={() => handleShare(img.url)}
                  style={{ flex: 1, background: '#39ff14', color: '#000', fontSize: '10px', fontWeight: 700, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>

        {caption && (
          <div style={{ background: '#0d160d', border: '1px solid #1a2a1a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Caption</span>
              <button onClick={() => navigator.clipboard.writeText(caption)}
                style={{ color: '#39ff14', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}>Copy</button>
            </div>
            <p style={{ color: '#3a5a3a', fontSize: '12px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{caption}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/wizard')}
            style={{ flex: 1, border: '1px solid #1a2a1a', background: 'transparent', color: '#3a5a3a', fontSize: '13px', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>
            Create another
          </button>
          <button onClick={() => alert('Upgrade coming soon!')}
            style={{ flex: 1, background: '#fff', color: '#000', fontSize: '13px', fontWeight: 700, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Remove watermark
          </button>
        </div>
      </div>
    </main>
  )
}

