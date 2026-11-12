'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  X,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music,
  Copy,
  Download,
  Sparkles,
  Info,
  Calendar,
  Compass,
} from 'lucide-react'
import {
  publishToInstagram,
  suggestInstagramContent,
  getInstagramStrategy,
  InstagramPublishResult,
  InstagramStrategy,
} from '@/lib/instagramApi'

interface InstagramPublishModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  imageUrl: string
  connectedUsername: string
  initialCaption?: string
  initialHashtags?: string
  productName?: string
  brandName?: string
  category?: string
  mood?: string
}

export default function InstagramPublishModal({
  isOpen,
  onClose,
  candidateId,
  imageUrl,
  connectedUsername,
  initialCaption = '',
  initialHashtags = '',
  productName = '',
  brandName = '',
  category = '',
  mood = '',
}: InstagramPublishModalProps) {
  const [activeTab, setActiveTab] = useState<'publish' | 'manual' | 'strategy'>('publish')
  const [caption, setCaption] = useState(initialCaption)
  const [hashtags, setHashtags] = useState(initialHashtags)
  const [strategy, setStrategy] = useState<InstagramStrategy | null>(null)
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false)
  const [audioVibe, setAudioVibe] = useState<string>('Modern Commercial & Upbeat Acoustic')
  const [audioKeywords, setAudioKeywords] = useState<string[]>([
    'upbeat acoustic',
    'clean commercial pop',
    'positive indie beat',
  ])
  const [audioDisclaimer, setAudioDisclaimer] = useState<string>(
    'Creative recommendation based on visual style. GoVisual AI does not license or automatically attach copyrighted music; choose in Instagram app.'
  )
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [copiedNotice, setCopiedNotice] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<InstagramPublishResult | null>(null)

  // Auto-fetch suggestions if caption is empty or user wants AI suggestions
  useEffect(() => {
    if (!isOpen) return
    if (caption && hashtags) return

    let isMounted = true
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true)
      try {
        const res = await suggestInstagramContent({
          product: productName || 'Product',
          brand_name: brandName || 'GoVisual',
          category: category || 'Commercial',
          mood: mood || 'Modern',
        })
        if (isMounted) {
          if (!caption) setCaption(res.caption)
          if (!hashtags) setHashtags(res.hashtags)
          if (res.audio_recommendation?.vibe) setAudioVibe(res.audio_recommendation.vibe)
          if (res.audio_recommendation?.search_terms) {
            setAudioKeywords(res.audio_recommendation.search_terms)
          }
          if (res.audio_recommendation?.disclaimer) {
            setAudioDisclaimer(res.audio_recommendation.disclaimer)
          }
        }
      } catch (e) {
        // Fallback already sets default state
      } finally {
        if (isMounted) setIsLoadingSuggestions(false)
      }
    }

    fetchSuggestions()

    const fetchStrategyData = async () => {
      setIsLoadingStrategy(true)
      try {
        const strat = await getInstagramStrategy({
          category: category || 'Commercial',
          business_name: brandName || 'GoVisual',
          goal: 'Increase Sales',
        })
        if (isMounted) setStrategy(strat)
      } catch (err) {
        console.warn('Strategy fetch warning:', err)
      } finally {
        if (isMounted) setIsLoadingStrategy(false)
      }
    }
    fetchStrategyData()

    return () => {
      isMounted = false
    }
  }, [isOpen, productName, brandName, category, mood])

  if (!isOpen) return null

  const handlePublish = async () => {
    if (isPublishing) return
    setIsPublishing(true)
    setError(null)

    try {
      const result = await publishToInstagram({
        candidateId,
        imageUrl,
        caption,
        hashtags,
      })
      setPublishResult(result)
    } catch (err: any) {
      console.error('Instagram publish failed:', err)
      setError(err.message || 'Failed to publish to Instagram. Please check your connection and try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCopyAll = async () => {
    const fullText = hashtags ? `${caption}\n\n${hashtags}` : caption
    try {
      await navigator.clipboard.writeText(fullText)
      setCopiedNotice(true)
      setTimeout(() => setCopiedNotice(false), 3000)
    } catch (err) {
      console.error('Clipboard copy failed:', err)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `govisual_${candidateId || 'creative'}.jpg`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          style={{
            background: '#21170F',
            border: '1px solid #3B2B1E',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '720px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(232, 182, 111, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #3B2B1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #e1306c, #833ab4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Camera size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                  Instagram Publishing Studio
                </h3>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>
                  @{connectedUsername || 'account'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isPublishing}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Workflow Mode Tabs (Only when not finished) */}
          {!publishResult && (
            <div
              style={{
                display: 'flex',
                background: '#14100D',
                borderBottom: '1px solid #3B2B1E',
                padding: '0 24px',
              }}
            >
              <button
                onClick={() => setActiveTab('publish')}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'publish' ? '2px solid #E8B66F' : '2px solid transparent',
                  color: activeTab === 'publish' ? '#F7F3ED' : 'rgba(255, 255, 255, 0.5)',
                  fontWeight: activeTab === 'publish' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ⚡ 1-Click Feed Publish
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'manual' ? '2px solid #E8B66F' : '2px solid transparent',
                  color: activeTab === 'manual' ? '#F7F3ED' : 'rgba(255, 255, 255, 0.5)',
                  fontWeight: activeTab === 'manual' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🎵 Audio & Manual Handoff
              </button>
              <button
                onClick={() => setActiveTab('strategy')}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'strategy' ? '2px solid #E8B66F' : '2px solid transparent',
                  color: activeTab === 'strategy' ? '#F7F3ED' : 'rgba(255, 255, 255, 0.5)',
                  fontWeight: activeTab === 'strategy' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Compass size={14} /> Content Strategy
              </button>
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {publishResult ? (
              /* Success State */
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid #22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#22c55e',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  ✓ Posted Successfully
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px' }}>
                  Your creative is now live on <strong>@{connectedUsername}</strong>.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      if (publishResult.permalink) {
                        window.open(publishResult.permalink, '_blank', 'noopener,noreferrer')
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #e1306c, #833ab4)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(225, 48, 108, 0.3)',
                    }}
                  >
                    <ExternalLink size={16} /> View on Instagram
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Edit & Options State */
              <div>
                {error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '14px 16px',
                      background: 'rgba(255, 77, 79, 0.1)',
                      border: '1px solid rgba(255, 77, 79, 0.3)',
                      borderRadius: '10px',
                      color: '#ff7875',
                      fontSize: '13px',
                      marginBottom: '20px',
                    }}
                  >
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>{error}</div>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 260px) 1fr',
                    gap: '24px',
                    alignItems: 'start',
                  }}
                >
                  {/* Left Column: Image Preview + Audio Recommendation */}
                  <div>
                    <div
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid #3B2B1E',
                        aspectRatio: '1/1',
                        background: '#14100D',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt="Creative preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        textAlign: 'center',
                      }}
                    >
                      1:1 Square Creative Preview
                    </div>

                    {/* Creative Audio Recommendations Section */}
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#f97316',
                          marginBottom: '6px',
                        }}
                      >
                        <Music size={14} />
                        <span>Recommended Audio Vibe</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 500, marginBottom: '6px' }}>
                        {audioVibe}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {audioKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(249, 115, 22, 0.1)',
                              border: '1px solid rgba(249, 115, 22, 0.25)',
                              color: '#fb923c',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            🔍 {kw}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.4 }}>
                        {audioDisclaimer}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Content Inputs & Tab Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeTab === 'publish' ? (
                      /* Mode A: Direct API Feed Publish */
                      <>
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '6px',
                            }}
                          >
                            <label
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'rgba(255, 255, 255, 0.6)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              Post Caption
                            </label>
                            {isLoadingSuggestions && (
                              <span style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                Loading suggestions...
                              </span>
                            )}
                          </div>
                          <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Write your post caption..."
                            rows={4}
                            disabled={isPublishing}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '8px',
                              background: '#14100D',
                              border: '1px solid #3B2B1E',
                              color: '#fff',
                              fontSize: '13px',
                              outline: 'none',
                              resize: 'vertical',
                              fontFamily: 'inherit',
                              lineHeight: '1.5',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'rgba(255, 255, 255, 0.6)',
                              marginBottom: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Suggested Hashtags
                          </label>
                          <textarea
                            value={hashtags}
                            onChange={(e) => setHashtags(e.target.value)}
                            placeholder="#brand #product #marketing"
                            rows={2}
                            disabled={isPublishing}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: '#14100D',
                              border: '1px solid #3B2B1E',
                              color: '#E8B66F',
                              fontSize: '13px',
                              outline: 'none',
                              resize: 'none',
                              fontFamily: 'inherit',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div
                          style={{
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.45)',
                          }}
                        >
                          Post will be published directly to <strong>@{connectedUsername}</strong> feed via the official Instagram Graph API.
                        </div>
                      </>
                    ) : activeTab === 'manual' ? (
                      /* Mode B: Manual Instagram Handoff */
                      <>
                        <div
                          style={{
                            padding: '14px',
                            background: 'rgba(249, 115, 22, 0.06)',
                            border: '1px solid rgba(249, 115, 22, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <Info size={18} style={{ color: '#f97316', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                            <strong>Manual Posting Handoff:</strong> When you wish to attach Instagram commercial audio, sticker polls, or reels transitions, download the image and copy your caption below. Then, open Instagram on mobile or desktop to complete posting.
                          </div>
                        </div>

                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'rgba(255, 255, 255, 0.6)',
                              marginBottom: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Caption & Hashtags Preview
                          </label>
                          <div
                            style={{
                              padding: '12px',
                              background: '#14100D',
                              border: '1px solid #3B2B1E',
                              borderRadius: '8px',
                              fontSize: '13px',
                              color: '#fff',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              maxHeight: '140px',
                              overflowY: 'auto',
                            }}
                          >
                            {caption}
                            {hashtags && (
                              <div style={{ color: '#E8B66F', marginTop: '8px' }}>{hashtags}</div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            onClick={handleCopyAll}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '10px',
                              borderRadius: '8px',
                              background: copiedNotice ? 'rgba(232, 182, 111, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              border: copiedNotice ? '1px solid #E8B66F' : '1px solid rgba(255, 255, 255, 0.15)',
                              color: copiedNotice ? '#E8B66F' : '#fff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Copy size={14} />
                            {copiedNotice ? '✓ Copied to Clipboard!' : 'Copy Caption & Tags'}
                          </button>

                          <button
                            onClick={handleDownload}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '10px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={14} />
                            Download Post Image
                          </button>
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.45)',
                            lineHeight: 1.4,
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '8px',
                          }}
                        >
                          📌 <em>Reminder: Opening Instagram will not automatically populate your composer. Paste your copied caption and attach your downloaded creative manually.</em>
                        </div>
                      </>
                    ) : (
                      /* Mode C: Content Strategy Guide */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div
                          style={{
                            padding: '12px 14px',
                            background: 'rgba(232, 182, 111, 0.08)',
                            border: '1px solid rgba(232, 182, 111, 0.25)',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.85)',
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>Weekly Posting Cadence:</strong> {strategy?.posting_cadence.weekly_frequency || '3-4 posts per week'}.
                          <div style={{ marginTop: '4px', color: '#E8B66F', fontSize: '11px' }}>
                            {strategy?.posting_cadence.consistency_rule || 'Post on consistent days to build steady reach.'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                            Recommended Content Pillars
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {strategy?.content_pillars.map((pillar, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: '#14100D',
                                  border: '1px solid #3B2B1E',
                                  borderRadius: '8px',
                                  padding: '10px 12px',
                                  fontSize: '11px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <strong style={{ color: '#fff', fontSize: '12px' }}>{pillar.name}</strong>
                                  <span style={{ color: '#E8B66F', fontWeight: 600 }}>{pillar.weight}</span>
                                </div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>{pillar.purpose}</div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Format: <span style={{ color: '#E8B66F' }}>{pillar.recommended_format}</span></div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                            Small-Business Consistency Checklist
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6 }}>
                            {strategy?.actionable_checklist.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {!publishResult && (
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #1a2a1a',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.01)',
              }}
            >
              <button
                onClick={onClose}
                disabled={isPublishing}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isPublishing ? 'not-allowed' : 'pointer',
                  opacity: isPublishing ? 0.5 : 1,
                }}
              >
                {activeTab === 'manual' ? 'Close' : 'Cancel'}
              </button>

              {activeTab === 'publish' ? (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #e1306c, #833ab4)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isPublishing ? 'not-allowed' : 'pointer',
                    opacity: isPublishing ? 0.7 : 1,
                    boxShadow: '0 4px 15px rgba(225, 48, 108, 0.3)',
                  }}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      Publishing to Instagram...
                    </>
                  ) : (
                    'Publish to Instagram'
                  )}
                </button>
              ) : (
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #e1306c, #833ab4)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={14} /> Open Instagram Web
                </a>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

