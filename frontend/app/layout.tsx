import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title:       'GoVisual AI — Premium marketing creatives for your brand',
  description: 'Turn your shop into a premium brand in 2 minutes. AI-powered marketing images for local businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true} className={`${inter.variable} ${spaceGrotesk.variable}`} style={{ backgroundColor: '#060a06' }}>
      <body suppressHydrationWarning={true} className={`${inter.className} bg-[#060a06]`}>
        <nav style={{ display: 'flex', gap: 24, padding: '14px 32px', 
          background: '#0a0a0f', borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/"           style={{ color: '#39ff14', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>GoVisual AI</a>
          <a href="/brandbook"  style={{ color: '#39ff14', fontWeight: 700, border: '1px solid rgba(57,255,20,0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: 13, textDecoration: 'none' }}>📘 Brand Book</a>
          <a href="/onboard"    style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' }}>🎨 Creatives</a>
          <a href="/photoshoot" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' }}>📷 Photoshoot</a>
          <a href="/video"      style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' }}>🎬 Video</a>
          <a href="/minisite"   style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' }}>🌐 Website</a>
          <a href="/dashboard"  style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' }}>📊 Dashboard</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
