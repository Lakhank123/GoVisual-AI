'use client'

import React, { useState, useEffect } from 'react'
import { Camera, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import {
  getInstagramStatus,
  getInstagramConnectUrl,
  disconnectInstagram,
  openInstagramOAuthPopup,
  InstagramStatus,
} from '@/lib/instagramApi'

interface InstagramConnectionCardProps {
  onStatusChange?: (status: InstagramStatus) => void
}

export default function InstagramConnectionCard({ onStatusChange }: InstagramConnectionCardProps) {
  const [status, setStatus] = useState<InstagramStatus>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const refreshStatus = async () => {
    try {
      const current = await getInstagramStatus()
      setStatus(current)
      if (onStatusChange) {
        onStatusChange(current)
      }
    } catch (e) {
      console.error('Failed to load Instagram status:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const authUrl = await getInstagramConnectUrl()
      const res = await openInstagramOAuthPopup(authUrl)
      if (res.success) {
        setSuccessMsg(`Successfully connected to @${res.username || 'Instagram'}!`)
      }
      await refreshStatus()
    } catch (err: any) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect Instagram account.')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Instagram account?')) {
      return
    }

    setDisconnecting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await disconnectInstagram()
      await refreshStatus()
      setSuccessMsg('Instagram disconnected successfully.')
    } catch (err: any) {
      console.error('Disconnect error:', err)
      setError(err.message || 'Failed to disconnect Instagram account.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: '24px 28px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        Checking Instagram connection...
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(255, 77, 79, 0.1)',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            borderRadius: 10,
            color: '#ff7875',
            fontSize: '13px',
            marginBottom: 16,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 10,
            color: '#22c55e',
            fontSize: '13px',
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {status.connected ? (
        /* Connected State */
        <div
          style={{
            background: '#21170F',
            border: '1px solid #3B2B1E',
            borderLeft: '4px solid #22c55e',
            borderRadius: 14,
            padding: '22px 26px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #e1306c, #833ab4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
              }}
            >
              <Camera size={22} />
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#fff',
                  marginBottom: 4,
                }}
              >
                <span>✓ Instagram Connected</span>
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {status.account_type || 'Professional'}
                </span>
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                @{status.username || 'instagram_user'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                if (status.username) {
                  window.open(`https://instagram.com/${status.username}`, '_blank', 'noopener,noreferrer')
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#3B2B1E',
                border: '1px solid #6F452C',
                color: '#F7F3ED',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={14} /> Manage
            </button>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(255, 77, 79, 0.1)',
                border: '1px solid rgba(255, 77, 79, 0.25)',
                color: '#ff7875',
                fontSize: 13,
                fontWeight: 600,
                cursor: disconnecting ? 'not-allowed' : 'pointer',
                opacity: disconnecting ? 0.6 : 1,
              }}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        /* Disconnected State */
        <div
          style={{
            background: '#21170F',
            border: '1px solid #3B2B1E',
            borderRadius: 14,
            padding: '24px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 17,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#fff',
              }}
            >
              <Camera size={20} color="#e1306c" /> Connect Instagram
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              Publish your GoVisual creatives directly to Instagram.
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              Instagram Professional account (Business or Creator) required.
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #e1306c, #833ab4)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: connecting ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 15px rgba(225, 48, 108, 0.35)',
              opacity: connecting ? 0.7 : 1,
            }}
          >
            {connecting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Connecting...
              </>
            ) : (
              'Connect Instagram →'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
