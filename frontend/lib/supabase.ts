import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Proactively clear any expired or unrefreshable session tokens in the browser
// to avoid infinite GoTrue retry loops and console errors when a Supabase project is unreachable/paused.
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

// Custom in-process lock queue to prevent Web Locks API ("navigator.locks")
// stealing collisions across concurrent React 19 mounts, auth callbacks, and session queries.
let authLockQueue: Promise<void> = Promise.resolve();

const safeAuthLock = async <R>(
  _name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  const previousLock = authLockQueue;
  let release: () => void = () => {};
  authLockQueue = new Promise<void>((resolve) => {
    release = () => resolve();
  });

  const timeoutMs = acquireTimeout > 0 ? acquireTimeout : 10000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<void>((resolve) => {
    timer = setTimeout(() => resolve(), timeoutMs);
  });

  try {
    await Promise.race([previousLock.catch(() => {}), timeoutPromise]);
    return await fn();
  } finally {
    if (timer) clearTimeout(timer);
    release();
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: safeAuthLock,
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

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }) {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(profile, { onConflict: 'id' })
    return !error
  } catch {
    return false
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

export async function getBrandCoreIdentity(businessId: string): Promise<BrandCoreIdentity | null> {
  try {
    const { data, error } = await supabase
      .from('brand_core_identity')
      .select('*')
      .eq('business_id', businessId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function upsertBrandCoreIdentity(identity: Partial<BrandCoreIdentity> & { business_id: string }) {
  try {
    const { error } = await supabase
      .from('brand_core_identity')
      .upsert(identity, { onConflict: 'business_id' })
    return !error
  } catch {
    return false
  }
}
