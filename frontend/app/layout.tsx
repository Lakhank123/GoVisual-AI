import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'GoVisual AI — Premium marketing creatives for your brand',
  description: 'Turn your shop into a premium brand in 2 minutes. AI-powered marketing images for local businesses.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
