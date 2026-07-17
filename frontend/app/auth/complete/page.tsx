'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, upsertProfile } from '@/lib/supabase'

export default function AuthComplete() {
  const router = useRouter()
  useEffect(() => {
    async function finish() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: existing } = await supabase
        .from('user_profiles').select('id').eq('id', user.id).single()
      if (!existing) {
        router.push('/auth?step=account_type')
      } else {
        router.push('/onboard')
      }
    }
    finish()
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#060a06', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#39ff14', fontSize:'16px' }}>Setting up your account...</div>
    </div>
  )
}
