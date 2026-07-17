'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, upsertProfile } from '@/lib/supabase'

export default function ConnectPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [waPhone, setWaPhone] = useState('')
  const [waStep, setWaStep] = useState<'idle' | 'entered' | 'verified'>('idle')
  const [igConnected, setIgConnected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setUserId('mock-user-id')
  }, [])

  async function saveWhatsApp() {
    if (!userId || !waPhone) return
    setSaving(true)
    await upsertProfile({ id: userId, whatsapp_phone: waPhone, whatsapp_verified: true })
    setSaving(false)
    setWaStep('verified')
  }

  function connectInstagram() {
    // For demo: opens Instagram business connection via Meta OAuth
    // In production replace CLIENT_ID with your Meta App ID
    const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || 'YOUR_META_APP_ID'
    const redirectUri = encodeURIComponent(`${window.location.origin}/connect/instagram/callback`)
    const scope = encodeURIComponent('instagram_basic,instagram_content_publish,pages_read_engagement')
    window.open(
      `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`,
      '_blank', 'width=600,height=600'
    )
    // For demo purposes, mark as connected after 3 seconds
    setTimeout(() => setIgConnected(true), 3000)
  }

  async function saveAndContinue() {
    router.push('/onboard')
  }

  const cardStyle = {
    background: '#0d160d', border: '0.5px solid #1a2a1a',
    borderRadius: '16px', padding: '20px', marginBottom: '14px'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060a06', padding: '2rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '460px', width: '100%' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '13px', color: '#3a5a3a', marginBottom: '6px' }}>Optional — skip anytime</div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Connect your channels</h1>
          <p style={{ color: '#3a5a3a', fontSize: '14px' }}>Enable direct posting to Instagram and WhatsApp broadcasts from GoVisual AI</p>
        </motion.div>

        {/* WhatsApp */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#075E54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💬</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>WhatsApp Broadcast</div>
              <div style={{ color: '#3a5a3a', fontSize: '12px' }}>Send creatives directly to your contacts</div>
            </div>
            {waStep === 'verified' && <div style={{ marginLeft: 'auto', background: '#0a3a0a', border: '1px solid #39ff14', borderRadius: '6px', padding: '3px 10px', color: '#39ff14', fontSize: '11px', fontWeight: 600 }}>Connected ✓</div>}
          </div>
          {waStep === 'idle' && (
            <>
              <input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="WhatsApp Business number (+91...)" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#080f08', border: '1px solid #1a2a1a', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
              <button onClick={saveWhatsApp} disabled={saving || !waPhone} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#39ff14', color: '#000', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', opacity: (!waPhone || saving) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Connect WhatsApp'}
              </button>
            </>
          )}
          {waStep === 'verified' && (
            <div style={{ background: '#0a2a0a', borderRadius: '8px', padding: '10px 12px', color: '#39ff14', fontSize: '13px' }}>
              ✓ {waPhone} connected. You can now send creatives as WhatsApp broadcasts.
            </div>
          )}
        </motion.div>

        {/* Instagram */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ ...cardStyle, border: igConnected ? '1px solid #39ff14' : '0.5px solid #1a2a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📸</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>Instagram Direct Post</div>
              <div style={{ color: '#3a5a3a', fontSize: '12px' }}>Post creatives directly to your business feed</div>
            </div>
            {igConnected && <div style={{ marginLeft: 'auto', background: '#0a3a0a', border: '1px solid #39ff14', borderRadius: '6px', padding: '3px 10px', color: '#39ff14', fontSize: '11px', fontWeight: 600 }}>Connected ✓</div>}
          </div>
          <div style={{ background: '#080f08', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
            <div style={{ color: '#3a5a3a', fontSize: '12px', marginBottom: '4px' }}>Requires:</div>
            <div style={{ color: '#fff', fontSize: '12px' }}>✓ Instagram Business or Creator account</div>
            <div style={{ color: '#fff', fontSize: '12px' }}>✓ Connected to a Facebook Page</div>
          </div>
          {!igConnected ? (
            <button onClick={connectInstagram} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
              Connect Instagram Business Account
            </button>
          ) : (
            <div style={{ background: '#0a2a0a', borderRadius: '8px', padding: '10px 12px', color: '#39ff14', fontSize: '13px' }}>
              ✓ Instagram connected. Your creatives can now be posted directly to your feed.
            </div>
          )}
        </motion.div>

        {/* Continue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <button onClick={saveAndContinue} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: '#39ff14', color: '#000', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
            Continue to GoVisual AI →
          </button>
          <button onClick={() => router.push('/onboard')} style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'transparent', color: '#2a4a2a', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
            Skip for now
          </button>
        </motion.div>
      </div>
    </div>
  )
}
