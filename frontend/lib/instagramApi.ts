/**
 * GoVisual AI — Instagram API Client
 * Type-safe helpers for Instagram connection, status inspection, disconnection,
 * and creative publishing.
 */

import { supabase, getSafeSession } from './supabase'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export interface InstagramStatus {
  connected: boolean
  username?: string
  instagram_user_id?: string
  account_type?: string
  connected_at?: string
  status?: string
  message?: string
}

export interface InstagramPublishResult {
  success: boolean
  media_id: string
  permalink: string
  username: string
}

export interface InstagramSuggestedContent {
  caption: string
  hashtags: string
  audio_recommendation: {
    vibe: string
    search_terms: string[]
    disclaimer: string
  }
}

export interface InstagramContentPillar {
  name: string
  weight: string
  purpose: string
  recommended_format: string
  tip: string
}

export interface InstagramPostingCadence {
  weekly_frequency: string
  best_times: string[]
  recommended_mix: string
  consistency_rule: string
}

export interface InstagramStrategy {
  business_name: string
  category: string
  primary_goal: string
  content_pillars: InstagramContentPillar[]
  posting_cadence: InstagramPostingCadence
  actionable_checklist: string[]
}

export interface SuggestContentPayload {
  product: string
  brand_name: string
  category?: string
  mood?: string
  purpose?: string
  offer?: string
  language?: string
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSafeSession()
  const token = session?.access_token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Fetches the current Instagram connection status for the authenticated user.
 */
export async function getInstagramStatus(): Promise<InstagramStatus> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${BASE_URL}/api/instagram/status`, {
      method: 'GET',
      headers,
    })
    if (!res.ok) {
      if (res.status === 401) {
        return { connected: false, status: 'unauthorized' }
      }
      return { connected: false, status: 'error' }
    }
    return await res.json()
  } catch (err) {
    console.error('Error fetching Instagram status:', err)
    return { connected: false, status: 'error' }
  }
}

/**
 * Retrieves the Meta/Instagram OAuth authorization URL.
 */
export async function getInstagramConnectUrl(): Promise<string> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE_URL}/api/instagram/connect`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(errText || 'Failed to initiate Instagram connection.')
  }
  const data = await res.json()
  return data.auth_url
}

/**
 * Disconnects the user's Instagram connection.
 */
export async function disconnectInstagram(): Promise<boolean> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE_URL}/api/instagram/disconnect`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) {
    throw new Error('Failed to disconnect Instagram.')
  }
  const data = await res.json()
  return !!data.success
}

/**
 * Publishes a creative candidate to Instagram.
 */
export async function publishToInstagram(payload: {
  candidateId: string
  imageUrl: string
  caption: string
  hashtags?: string
}): Promise<InstagramPublishResult> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE_URL}/api/instagram/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      candidate_id: payload.candidateId,
      image_url: payload.imageUrl,
      caption: payload.caption,
      hashtags: payload.hashtags,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || 'Instagram publishing failed. Please try again.')
  }

  return data as InstagramPublishResult
}

/**
 * Generates tailored caption, hashtags, and creative audio recommendations
 * based on brand, product, and visual mood context.
 */
export async function suggestInstagramContent(
  payload: SuggestContentPayload
): Promise<InstagramSuggestedContent> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE_URL}/api/instagram/suggest-content`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to generate Instagram post suggestions.')
  }

  const json = await res.json()
  return json.data as InstagramSuggestedContent
}

/**
 * Fetches tailored Instagram content strategy guide for small businesses.
 */
export async function getInstagramStrategy(params?: {
  category?: string
  business_name?: string
  goal?: string
}): Promise<InstagramStrategy> {
  const headers = await getAuthHeaders()
  const q = new URLSearchParams()
  if (params?.category) q.set('category', params.category)
  if (params?.business_name) q.set('business_name', params.business_name)
  if (params?.goal) q.set('goal', params.goal)

  const res = await fetch(`${BASE_URL}/api/instagram/strategy?${q.toString()}`, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to fetch Instagram strategy.')
  }

  const json = await res.json()
  return json.data as InstagramStrategy
}

/**
 * Opens a centered popup window for Meta OAuth and resolves when authentication
 * completes or is closed/cancelled.
 */
export function openInstagramOAuthPopup(authUrl: string): Promise<{ success: boolean; username?: string }> {
  return new Promise((resolve, reject) => {
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2.5

    const popup = window.open(
      authUrl,
      'InstagramConnectPopup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    )

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for GoVisual AI to connect Instagram.'))
      return
    }

    let resolved = false

    const messageHandler = (event: MessageEvent) => {
      // Handle postMessage from callback popup
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
          resolved = true
          window.removeEventListener('message', messageHandler)
          clearInterval(checkClosed)
          resolve({ success: true, username: event.data.username })
        } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
          resolved = true
          window.removeEventListener('message', messageHandler)
          clearInterval(checkClosed)
          reject(new Error(event.data.error || 'Instagram connection failed.'))
        }
      }
    }

    window.addEventListener('message', messageHandler)

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', messageHandler)
        if (!resolved) {
          // If popup closed without message, resolve with check so caller can re-verify status
          resolve({ success: false })
        }
      }
    }, 600)
  })
}
