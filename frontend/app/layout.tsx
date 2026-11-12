import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { DemoSessionProvider } from '@/components/providers/demo-session-provider'
import { GlobalNav } from '@/components/ui/global-nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title:       'GoVisual AI — Premium marketing creatives for your brand',
  description: 'Turn your shop into a premium brand in 2 minutes. AI-powered marketing images for local businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true} className={`${inter.variable} ${spaceGrotesk.variable}`} style={{ backgroundColor: '#0B0907' }}>
      <body suppressHydrationWarning={true} className={`${inter.className} bg-[#0B0907]`}>
        <DemoSessionProvider>
          <GlobalNav />
          {children}
        </DemoSessionProvider>
      </body>
    </html>
  )
}
