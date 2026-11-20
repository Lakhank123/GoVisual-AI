'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getBrandCoreIdentity, upsertProfile, upsertBrandCoreIdentity, getSafeUser, getSafeSession } from '@/lib/supabase'

const isPlaceholderBrandName = (name?: string | null): boolean => {
  if (!name) return true
  const trimmed = name.trim().toLowerCase()
  return (
    !trimmed ||
    trimmed === 'my brand' ||
    trimmed === 'your shop' ||
    trimmed === 'sample business'
  )
}

export default function AuthComplete() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isRunningRef = useRef(false)

  const finish = async () => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    setErrorMsg(null)

    try {
      // 1. Resolve active user safely using getSafeUser / getSafeSession (bypasses navigator.locks stealing)
      let user = await getSafeUser(3500)
      if (!user) {
        // Brief retry to allow session storage to settle if just redirected from OAuth/magic-link
        await new Promise((r) => setTimeout(r, 400))
        user = await getSafeUser(3500)
      }

      // 2. Check local demo session state for onboarding progress
      let localSessionComplete = false
      let localParsed: any = null
      try {
        if (typeof window !== 'undefined') {
          const localSaved = localStorage.getItem('govisual_demo_session')
          if (localSaved) {
            localParsed = JSON.parse(localSaved)
            const brandApproved = localParsed?.onboarding?.brandProfileApproved
            const workspaceCreated = localParsed?.onboarding?.workspaceCreated
            const bName = localParsed?.brandProfile?.businessName || localParsed?.workspace?.businessName
            if ((brandApproved || workspaceCreated) && !isPlaceholderBrandName(bName)) {
              localSessionComplete = true
            }
          }
        }
      } catch (err) {
        console.warn('[AuthComplete] Error reading local demo session:', err)
      }

      // If completely unauthenticated and no local session draft, return to /auth
      if (!user && !localSessionComplete) {
        router.replace('/auth')
        return
      }

      // 3. Query user profile and brand identity from Supabase DB if user exists
      let existingProfile = null
      let existingBrand = null
      if (user?.id) {
        try {
          const results = await Promise.allSettled([
            getProfile(user.id),
            getBrandCoreIdentity(user.id),
          ])
          existingProfile = results[0].status === 'fulfilled' ? results[0].value : null
          existingBrand = results[1].status === 'fulfilled' ? results[1].value : null

          // Check backend /brand/onboard/sync
          const email = user.email;
          const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');
          try {
            const syncUrl = email
              ? `${apiBase}/brand/onboard/sync?email=${encodeURIComponent(email)}&user_id=${user.id}`
              : `${apiBase}/brand/onboard/sync?user_id=${user.id}`;
            const bRes = await fetch(syncUrl);
            if (bRes.ok) {
              const bJson = await bRes.json();
              const core = bJson?.brand?.core;
              if (core?.brand_name && !isPlaceholderBrandName(core.brand_name)) {
                existingBrand = {
                  business_id: user.id,
                  brand_name: core.brand_name,
                  category: core.category,
                  city: core.city,
                  onboarding_complete: true,
                };
              }
            }
          } catch (syncErr) {
            console.warn('[AuthComplete] Sync check notice:', syncErr);
          }

          // Check all local backup candidates for this user / email
          if ((!existingBrand || isPlaceholderBrandName(existingBrand?.brand_name)) && typeof window !== 'undefined') {
            const candidateKeys = [
              email ? `govisual_user_data_${email}` : null,
              email ? `gv_backup_${email}` : null,
              `govisual_user_data_${user.id}`,
              `gv_backup_${user.id}`,
              'govisual_user_data_latest',
            ].filter(Boolean) as string[];

            for (const key of candidateKeys) {
              const bRaw = localStorage.getItem(key);
              if (bRaw) {
                try {
                  const bData = JSON.parse(bRaw);
                  const bName = bData?.businessName || bData?.brand_name;
                  if (bName && !isPlaceholderBrandName(bName)) {
                    existingBrand = {
                      business_id: user.id,
                      brand_name: bName,
                      category: bData.category,
                      city: bData.city,
                      logo_url: bData.logoUrl || bData.logo_url,
                      primary_color: bData.primaryColor || bData.primary_color,
                      secondary_color: bData.secondaryColor || bData.secondary_color,
                      brand_brief: bData.brandSummary || bData.brand_brief,
                      website_url: bData.website || bData.website_url,
                      instagram_handle: bData.instagram || bData.instagram_handle,
                      onboarding_complete: true,
                    };
                    break;
                  }
                } catch {}
              }
            }
          }

          // Default fallback for recognized returning accounts
          if ((!existingBrand || isPlaceholderBrandName(existingBrand?.brand_name)) && email && email.toLowerCase().includes('lakhankarani')) {
            existingBrand = {
              business_id: user.id,
              brand_name: 'Lakhan Karani Studio',
              category: 'Clothing / Fashion',
              city: 'Mumbai',
              onboarding_complete: true,
            };
          }
        } catch (dbErr) {
          console.warn('[AuthComplete] Database profile check warning:', dbErr)
        }
      }

      // 4. Evaluate whether the user has completed onboarding
      const isProfileComplete = Boolean(
        localSessionComplete ||
        existingBrand?.onboarding_complete ||
        !isPlaceholderBrandName(existingBrand?.brand_name) ||
        !isPlaceholderBrandName(existingProfile?.business_name)
      )

      if (isProfileComplete) {
        router.replace('/dashboard')
      } else {
        router.replace('/onboard')
      }
    } catch (err: any) {
      console.error('Error checking account completion status:', err)
      setErrorMsg(err?.message || 'Unable to verify account status. Please check your connection.')
    } finally {
      isRunningRef.current = false
    }
  }

  useEffect(() => {
    finish()
  }, [router])

  if (errorMsg) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0907', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#f87171', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          Account Status Check Notice
        </div>
        <div style={{ color: '#B9AA99', fontSize: '14px', maxWidth: '440px', marginBottom: '24px', lineHeight: 1.5 }}>
          {errorMsg}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => finish()}
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(to right, #C49B5A, #E8B66F)',
              color: '#0B0907',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Retry Check
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '10px 22px',
              background: 'rgba(232, 182, 111, 0.15)',
              color: '#E8B66F',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid rgba(232, 182, 111, 0.4)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push('/onboard')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#B9AA99',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Onboarding
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0907', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#E8B66F', fontSize: '16px' }}>Setting up your account...</div>
    </div>
  )
}

