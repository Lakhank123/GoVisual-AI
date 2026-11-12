'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings as SettingsIcon, Shield, User, Store } from 'lucide-react'
import { useDemoSession } from '@/components/providers/demo-session-provider'
import InstagramConnectionCard from '@/components/instagram/InstagramConnectionCard'

export default function SettingsPage() {
  const { session } = useDemoSession()
  const businessName = session.workspace?.businessName || 'Your Shop'
  const userEmail = session.user?.email || 'user@example.com'

  return (
    <div style={{ minHeight: '100vh', background: '#0B0907', color: '#F7F3ED', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Nav */}
      <div
        style={{
          borderBottom: '1px solid #3B2B1E',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/dashboard"
            style={{
              color: '#B9AA99',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <span style={{ color: '#3B2B1E' }}>|</span>
          <span style={{ color: '#E8B66F', fontWeight: 700, fontSize: 16 }}>Settings</span>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={26} color="#E8B66F" /> Account & Integrations
          </h1>
          <p style={{ color: '#B9AA99', fontSize: 14 }}>
            Manage your connected social channels, workspace profile, and publishing preferences.
          </p>
        </div>

        {/* Section 1: Social Connections (Primary) */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F7F3ED', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#e1306c" /> Social Media Publishing
          </h2>
          <InstagramConnectionCard />
        </div>

        {/* Section 2: Workspace Details */}
        <div
          style={{
            background: '#21170F',
            border: '1px solid #3B2B1E',
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F7F3ED', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={18} color="#E8B66F" /> Business Information
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: '#B9AA99', marginBottom: 4 }}>Business Name</div>
              <div style={{ fontSize: 14, color: '#F7F3ED', fontWeight: 500 }}>{businessName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#B9AA99', marginBottom: 4 }}>Category</div>
              <div style={{ fontSize: 14, color: '#F7F3ED', fontWeight: 500 }}>{session.workspace?.category || 'Retail'}</div>
            </div>
          </div>
        </div>

        {/* Section 3: User Details */}
        <div
          style={{
            background: '#21170F',
            border: '1px solid #3B2B1E',
            borderRadius: 14,
            padding: '24px 28px',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F7F3ED', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="#E8B66F" /> User Profile
          </h2>

          <div>
            <div style={{ fontSize: 12, color: '#B9AA99', marginBottom: 4 }}>Email Address</div>
            <div style={{ fontSize: 14, color: '#F7F3ED', fontWeight: 500 }}>{userEmail}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
