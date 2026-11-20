import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Proactively clear any expired or unrefreshable session tokens in the browser
if (typeof window !== 'undefined') {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.expires_at && parsed.expires_at * 1000 < Date.now()) {
              window.localStorage.removeItem(key);
            }
          } catch {
            window.localStorage.removeItem(key);
          }
        }
      }
    }
  } catch {
    // Ignore localStorage access issues
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export async function getSafeSession(timeoutMs = 2500) {
  try {
    const sessionPromise = supabase.auth.getSession().catch((err) => {
      return { data: { session: null }, error: err };
    });
    const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: null }), timeoutMs)
    );
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    const { data, error } = result || {};
    if (error) {
      const msg = error.message || '';
      if (
        msg.includes('Refresh Token') ||
        msg.includes('Failed to fetch') ||
        error.name === 'AuthRetryableFetchError' ||
        (error as any).status === 400
      ) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        if (typeof window !== 'undefined') {
          try {
            for (let i = window.localStorage.length - 1; i >= 0; i--) {
              const k = window.localStorage.key(i);
              if (k && k.startsWith('sb-') && k.includes('-auth-token')) {
                window.localStorage.removeItem(k);
              }
            }
          } catch {}
        }
      }
      return null;
    }
    return data?.session || null;
  } catch {
    return null;
  }
}

export async function getSafeUser(timeoutMs = 3500) {
  try {
    const session = await getSafeSession(timeoutMs);
    if (session?.user) {
      return session.user;
    }

    const userPromise = supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }));
    const timeoutPromise = new Promise<{ data: { user: null }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: null }), timeoutMs)
    );
    const result = await Promise.race([userPromise, timeoutPromise]);
    const { data } = (result as any) || {};
    return data?.user || null;
  } catch (err) {
    console.warn('[Supabase] getSafeUser exception:', err);
    return null;
  }
}

export type AccountType = 'personal' | 'business'

export interface UserProfile {
  id: string
  account_type: AccountType
  business_name: string | null
  business_email: string | null
  phone: string | null
  credits_remaining: number
  plan: string
  instagram_user_id: string | null
  whatsapp_phone: string | null
  whatsapp_verified: boolean
  created_at: string
}

export async function getProfile(userId: string, signal?: AbortSignal): Promise<UserProfile | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }

  try {
    let data: any = null
    try {
      const resp = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single()
      data = resp.data
    } catch {}

    // Fallback: check backend sync API if Supabase cloud is unreachable or returned null
    if (!data || !data.business_name || data.business_name.toLowerCase() === 'my brand' || data.business_name.toLowerCase() === 'your shop') {
      try {
        const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:8000')
        const bRes = await fetch(`${apiBase}/brand/onboard/sync?user_id=${userId}`, { signal: controller.signal })
        if (bRes.ok) {
          const bJson = await bRes.json()
          if (bJson.user) {
            data = {
              id: userId,
              account_type: bJson.user.account_type || 'personal',
              business_name: bJson.user.business_name || bJson.brand?.core?.brand_name || null,
              business_email: bJson.user.email || null,
              phone: null,
              credits_remaining: 10,
              plan: 'free',
              instagram_user_id: null,
              whatsapp_phone: null,
              whatsapp_verified: false,
              created_at: new Date().toISOString(),
            }
          }
        }
      } catch {}
    }

    return data
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[getProfile] Request aborted or timed out for user:', userId)
    } else {
      console.warn('[getProfile] Exception:', err?.message || err)
    }
    return null
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }, signal?: AbortSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }

  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(profile, { onConflict: 'id' })
      .abortSignal(controller.signal)
    return !error
  } catch (err: any) {
    console.warn('[upsertProfile] Error or timeout:', err?.message || err)
    return false
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

export interface BrandCoreIdentity {
  business_id: string
  brand_name: string
  category?: string | null
  sub_category?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  brand_tone?: string | null
  primary_language?: string | null
  brand_brief?: string | null
  logo_url?: string | null
  full_color_palette?: any | null
  tagline?: string | null
  brand_personality_tags?: string[] | null
  instagram_handle?: string | null
  whatsapp_number?: string | null
  website_url?: string | null
  city?: string | null
  address?: string | null
  onboarding_complete?: boolean
  created_at?: string
  updated_at?: string
}

export function normalizeBusinessCategory(cat?: string | null): string | null {
  if (!cat) return null;
  const lower = cat.toLowerCase().trim();
  if (lower.includes('cloth') || lower.includes('fashion') || lower.includes('wear') || lower.includes('apparel')) return 'clothing';
  if (lower.includes('food') || lower.includes('snack') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('bakery') || lower.includes('sweet') || lower.includes('vadapav')) return 'food';
  if (lower.includes('electr') || lower.includes('gadget') || lower.includes('tech') || lower.includes('mobile')) return 'electronics';
  if (lower.includes('jewel') || lower.includes('gold') || lower.includes('silver')) return 'jewellery';
  if (lower.includes('pharm') || lower.includes('medic') || lower.includes('health') || lower.includes('chemist')) return 'pharmacy';
  if (lower.includes('decor') || lower.includes('home') || lower.includes('interior')) return 'home_decor';
  if (lower.includes('salon') || lower.includes('beauty') || lower.includes('spa') || lower.includes('hair')) return 'salon';
  if (lower.includes('furnitur')) return 'furniture';

  const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'jewellery', 'pharmacy', 'home_decor', 'salon', 'furniture'];
  if (VALID_CATEGORIES.includes(lower)) return lower;
  return cat; // Preserve custom categories
}

export function normalizeBrandTone(tone?: string | null): string | null {
  if (!tone) return null;
  const lower = tone.toLowerCase().trim();
  if (lower.includes('formal') || lower.includes('professional')) return 'formal';
  if (lower.includes('casual') || lower.includes('friendly')) return 'casual';
  if (lower.includes('energetic') || lower.includes('bold')) return 'energetic';
  if (lower.includes('warm') || lower.includes('approachable')) return 'warm';
  if (lower.includes('festive') || lower.includes('celebrat')) return 'festive';

  const VALID_TONES = ['formal', 'casual', 'energetic', 'warm', 'festive'];
  if (VALID_TONES.includes(lower)) return lower;
  return tone;
}

export async function getBrandCoreIdentity(businessId: string, signal?: AbortSignal): Promise<BrandCoreIdentity | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }

  try {
    let data: any = null
    try {
      const resp = await supabase
        .from('brand_core_identity')
        .select('*')
        .eq('business_id', businessId)
        .abortSignal(controller.signal)
        .single()
      data = resp.data
    } catch {}

    // Fallback: check backend sync API if Supabase cloud is unreachable or placeholder
    if (!data || !data.brand_name || data.brand_name.toLowerCase() === 'my brand' || data.brand_name.toLowerCase() === 'your shop') {
      try {
        const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:8000')
        const bRes = await fetch(`${apiBase}/brand/onboard/sync?user_id=${businessId}`, { signal: controller.signal })
        if (bRes.ok) {
          const bJson = await bRes.json()
          const core = bJson?.brand?.core
          if (core?.brand_name && core.brand_name.toLowerCase() !== 'my brand') {
            data = {
              business_id: businessId,
              brand_name: core.brand_name,
              category: core.category,
              city: core.city,
              tagline: core.tagline,
              brand_tone: core.brand_tone,
              brand_brief: core.brand_brief,
              website_url: core.website_url,
              instagram_handle: core.instagram_handle,
              logo_url: core.logo_url,
              primary_color: bJson.brand?.visual_dna?.primary_color,
              secondary_color: bJson.brand?.visual_dna?.secondary_color,
              brand_personality_tags: bJson.brand?.audience?.brand_personality_tags || [],
              onboarding_complete: true,
            }
          }
        }
      } catch {}
    }

    if (data && data.brand_brief) {
      try {
        const parsed = JSON.parse(data.brand_brief)
        if (parsed && typeof parsed === 'object') {
          if (parsed.city && !data.city) data.city = parsed.city
          if (parsed.logo_url && !data.logo_url) data.logo_url = parsed.logo_url
          if (parsed.website_url && !data.website_url) data.website_url = parsed.website_url
          if (parsed.instagram_handle && !data.instagram_handle) data.instagram_handle = parsed.instagram_handle
          if (parsed.tagline && !data.tagline) data.tagline = parsed.tagline
          if (parsed.personality_tags && !data.brand_personality_tags) data.brand_personality_tags = parsed.personality_tags
          if (parsed.onboarding_complete !== undefined) data.onboarding_complete = parsed.onboarding_complete
          if (parsed.summary !== undefined) data.brand_brief = parsed.summary
        }
      } catch {}
    }

    return data
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[getBrandCoreIdentity] Request aborted or timed out for business:', businessId)
    } else {
      console.warn('[getBrandCoreIdentity] Exception:', err?.message || err)
    }
    return null
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

export async function upsertBrandCoreIdentity(identity: Partial<BrandCoreIdentity> & { business_id: string }, signal?: AbortSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }

  // 1. Immediately persist to backend sync endpoint & localStorage
  try {
    const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:8000');
    fetch(`${apiBase}/brand/onboard/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: identity.business_id,
        brandProfile: identity,
        workspace: {
          businessName: identity.brand_name,
          category: identity.category,
          city: identity.city,
        }
      }),
    }).catch(() => {});

    if (typeof window !== 'undefined' && identity.business_id) {
      const backupStr = JSON.stringify({
        business_id: identity.business_id,
        businessName: identity.brand_name,
        category: identity.category,
        city: identity.city,
        logoUrl: identity.logo_url,
        primaryColor: identity.primary_color,
        secondaryColor: identity.secondary_color,
        brandSummary: identity.brand_brief,
        website: identity.website_url,
        instagram: identity.instagram_handle,
        onboardingComplete: true,
      });
      // Store strictly under user's isolated business_id key (prevents cross-user leakage)
      localStorage.setItem(`govisual_user_data_${identity.business_id}`, backupStr);
    }
  } catch {}

  try {
    const briefEnvelope = JSON.stringify({
      summary: identity.brand_brief || '',
      city: identity.city || '',
      logo_url: identity.logo_url || '',
      website_url: identity.website_url || '',
      instagram_handle: identity.instagram_handle || '',
      tagline: identity.tagline || '',
      personality_tags: identity.brand_personality_tags || [],
      onboarding_complete: true,
    })

    // Try full payload first
    const fullPayload: any = {
      ...identity,
      category: normalizeBusinessCategory(identity.category),
      brand_tone: normalizeBrandTone(identity.brand_tone),
      onboarding_complete: true,
    }
    const { error: fullError } = await supabase
      .from('brand_core_identity')
      .upsert(fullPayload, { onConflict: 'business_id' })
      .abortSignal(controller.signal)

    if (!fullError) {
      if (identity.brand_name) {
        try {
          await supabase.from('user_profiles').upsert({ id: identity.business_id, business_name: identity.brand_name }, { onConflict: 'id' })
        } catch {}
      }
      return true
    }

    // Fallback: Strip extended columns that may not exist in table schema and preserve them inside brand_brief
    const corePayload: any = {
      business_id: identity.business_id,
      brand_name: identity.brand_name,
      category: normalizeBusinessCategory(identity.category),
      primary_color: identity.primary_color || null,
      secondary_color: identity.secondary_color || null,
      accent_color: identity.accent_color || null,
      brand_tone: normalizeBrandTone(identity.brand_tone),
      brand_brief: briefEnvelope,
    }

    const { error: coreError } = await supabase
      .from('brand_core_identity')
      .upsert(corePayload, { onConflict: 'business_id' })
      .abortSignal(controller.signal)

    if (!coreError) {
      if (identity.brand_name) {
        try {
          await supabase.from('user_profiles').upsert({ id: identity.business_id, business_name: identity.brand_name }, { onConflict: 'id' })
        } catch {}
      }
      return true
    }

    return true
  } catch (err: any) {
    console.warn('[upsertBrandCoreIdentity] Supabase notice:', err?.message || err)
    return true
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}
