import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'STIE APP — Sistem Kelas Digital',
  description: 'Sistem Kelas Digital Mahasiswa',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}