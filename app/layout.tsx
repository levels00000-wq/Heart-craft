import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Baloo_2, Nunito } from 'next/font/google'
import './globals.css'

const baloo = Baloo_2({ subsets: ['latin'], variable: '--font-display' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Maze Escape Adventure',
  description:
    'Race through enchanted mazes, dodge traps, collect treasure and find the exit before time runs out. A colorful mobile maze escape game.',
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
  colorScheme: 'dark',
  themeColor: '#160f2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable} bg-background`}>
      <body className="font-body antialiased overscroll-none">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
