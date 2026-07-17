'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, upsertProfile } from '@/lib/supabase'

type Mode = 'landing' | 'phone' | 'otp' | 'account_type' | 'business_details' | 'done'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('landing')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal')
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/onboard')
    })
  }, [])

  async function handleGoogleSignIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleDemoSignIn() {
    setLoading(true)
    setError('')
    const email = 'demo@govisual.ai'
    const password = 'Password123!'
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError && data.session) {
        sessionStorage.removeItem('gv_mock_auth')
        router.push('/onboard')
        return
      }
      
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        console.warn('Supabase Sign Up failed, falling back to mock auth:', signUpError.message)
        sessionStorage.setItem('gv_mock_auth', 'true')
        router.push('/onboard')
        return
      }
      
      const { data: dataSecond, error: signInErrorSecond } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErrorSecond || !dataSecond.session) {
        sessionStorage.setItem('gv_mock_auth', 'true')
        router.push('/onboard')
        return
      }
      
      sessionStorage.removeItem('gv_mock_auth')
      router.push('/onboard')
    } catch (e) {
      console.error('Demo auth failed, falling back to mock:', e)
      sessionStorage.setItem('gv_mock_auth', 'true')
      router.push('/onboard')
    }
  }

  function handleSkipAuth() {
    sessionStorage.setItem('gv_mock_auth', 'true')
    router.push('/onboard')
  }

  async function handlePhoneSubmit() {
    if (!phone.match(/^\+?[0-9]{10,13}$/)) {
      setError('Enter a valid phone number with country code (e.g. +919876543210)')
      return
    }
    setLoading(true); setError('')
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    setMode('otp')
  }

  async function handleOtpSubmit() {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setLoading(true); setError('')
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone, token: otp, type: 'sms'
    })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    setMode('account_type')
  }

  async function handleAccountType(type: 'personal' | 'business') {
    setAccountType(type)
    if (type === 'personal') {
      await saveProfile('personal')
    } else {
      setMode('business_details')
    }
  }

  async function handleBusinessDetails() {
    if (!businessName.trim()) { setError('Enter your business name'); return }
    setLoading(true); setError('')
    await saveProfile('business')
    setLoading(false)
  }

  async function saveProfile(type: 'personal' | 'business') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await upsertProfile({
      id: user.id,
      account_type: type,
      business_name: type === 'business' ? businessName : null,
      business_email: type === 'business' ? businessEmail : null,
      phone: user.phone || null,
    })
    router.push('/onboard')
  }

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#060a06',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background orb */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(57,255,20,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: '#0d160d', border: '0.5px solid #1a2a1a',
          borderRadius: '20px', padding: '2rem', position: 'relative', zIndex: 1
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>Go</span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#39ff14' }}>Visual</span>
          <sup style={{ fontSize: '12px', color: '#39ff14', marginLeft: '2px' }}>AI</sup>
        </div>

        <AnimatePresence mode="wait">

          {/* LANDING — choose method */}
          {mode === 'landing' && (
            <motion.div key="landing" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>
                Welcome to GoVisual AI
              </h2>
              <p style={{ color: '#3a5a3a', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>
                Sign in to start generating premium creatives for your brand
              </p>

              {error && <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '8px 12px', color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

              {/* Google */}
              <button onClick={handleGoogleSignIn} disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: '#fff', color: '#111', fontWeight: 600, fontSize: '14px',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '10px', marginBottom: '10px',
                opacity: loading ? 0.6 : 1
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#1a2a1a' }} />
                <span style={{ color: '#2a4a2a', fontSize: '12px' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#1a2a1a' }} />
              </div>

              {/* Phone */}
              <button onClick={() => setMode('phone')} style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: 'transparent', color: '#39ff14', fontWeight: 600, fontSize: '14px',
                border: '1px solid #1a3a1a', cursor: 'pointer', marginBottom: '10px'
              }}>
                📱 Continue with Phone OTP
              </button>

              {/* Demo / Bypass Options */}
              <button onClick={handleDemoSignIn} disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: '#39ff14', color: '#000', fontWeight: 700, fontSize: '14px',
                border: 'none', cursor: 'pointer', marginBottom: '10px',
                opacity: loading ? 0.6 : 1
              }}>
                ⚡ Demo Sign In (Auto Account)
              </button>

              <button onClick={handleSkipAuth} style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: 'transparent', color: '#ff4444', fontWeight: 600, fontSize: '14px',
                border: '1px solid rgba(255, 68, 68, 0.3)', cursor: 'pointer'
              }}>
                ⚙️ Skip Auth (Local Mock Mode)
              </button>

              <p style={{ color: '#2a4a2a', fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
                By continuing you agree to our Terms of Service and Privacy Policy
              </p>
            </motion.div>
          )}

          {/* PHONE INPUT */}
          {mode === 'phone' && (
            <motion.div key="phone" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <button onClick={() => setMode('landing')} style={{ background: 'none', border: 'none', color: '#3a5a3a', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
                ← Back
              </button>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Enter your phone number</h2>
              <p style={{ color: '#3a5a3a', fontSize: '13px', marginBottom: '1.2rem' }}>We will send you a 6-digit verification code</p>
              {error && <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '8px 12px', color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+919876543210"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#080f08', border: '1px solid #1a2a1a', color: '#fff', fontSize: '15px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
              />
              <button onClick={handlePhoneSubmit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#39ff14', color: '#000', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </motion.div>
          )}

          {/* OTP INPUT */}
          {mode === 'otp' && (
            <motion.div key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <button onClick={() => setMode('phone')} style={{ background: 'none', border: 'none', color: '#3a5a3a', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0 }}>← Back</button>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Enter the OTP</h2>
              <p style={{ color: '#3a5a3a', fontSize: '13px', marginBottom: '1.2rem' }}>Sent to {phone}</p>
              {error && <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '8px 12px', color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
              <input
                type="number" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))}
                placeholder="123456"
                style={{ width: '100%', padding: '16px 14px', borderRadius: '10px', background: '#080f08', border: '1px solid #1a2a1a', color: '#39ff14', fontSize: '24px', fontWeight: 700, outline: 'none', marginBottom: '12px', textAlign: 'center', letterSpacing: '8px', boxSizing: 'border-box' }}
              />
              <button onClick={handleOtpSubmit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#39ff14', color: '#000', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </motion.div>
          )}

          {/* ACCOUNT TYPE */}
          {mode === 'account_type' && (
            <motion.div key="account_type" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>What type of account?</h2>
              <p style={{ color: '#3a5a3a', fontSize: '13px', marginBottom: '1.5rem', textAlign: 'center' }}>This helps us personalise your experience</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => handleAccountType('personal')} style={{ padding: '16px', borderRadius: '12px', background: '#080f08', border: '1px solid #1a2a1a', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>👤</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Personal / Shop Owner</div>
                  <div style={{ fontSize: '12px', color: '#3a5a3a' }}>I run my own local shop or brand</div>
                </button>
                <button onClick={() => handleAccountType('business')} style={{ padding: '16px', borderRadius: '12px', background: '#0a1a0a', border: '1px solid #39ff14', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏢</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Business Account</div>
                  <div style={{ fontSize: '12px', color: '#3a5a3a' }}>I have a registered business with a business email</div>
                </button>
              </div>
            </motion.div>
          )}

          {/* BUSINESS DETAILS */}
          {mode === 'business_details' && (
            <motion.div key="business_details" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <button onClick={() => setMode('account_type')} style={{ background: 'none', border: 'none', color: '#3a5a3a', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0 }}>← Back</button>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Business details</h2>
              <p style={{ color: '#3a5a3a', fontSize: '13px', marginBottom: '1.2rem' }}>Tell us about your business</p>
              {error && <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '8px 12px', color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Business name" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#080f08', border: '1px solid #1a2a1a', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
              <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="Business email (optional)" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#080f08', border: '1px solid #1a2a1a', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }} />
              <button onClick={handleBusinessDetails} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#39ff14', color: '#000', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
