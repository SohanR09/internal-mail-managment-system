import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import './globals.css'

export const metadata: Metadata = {
  title: 'Northstar Mail',
  description: 'Internal company email system',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()
  let theme = 'dark'
  let density = 'comfortable'

  if (session) {
    const settings = await db.getUserDashboardSettings(session.user.id)
    if (settings) {
      theme = settings.theme
      density = settings.density
    }
  }

  return (
    <html lang="en" data-theme={theme} data-density={density}>
      <body className={`antialiased ${theme === 'dark' || (theme === 'system' && true) ? 'dark' : ''}`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
