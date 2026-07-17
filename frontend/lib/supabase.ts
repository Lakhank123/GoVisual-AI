import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }) {
  const { error } = await supabase
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })
  return !error
}
