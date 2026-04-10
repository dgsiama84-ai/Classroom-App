import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  manifest: "/manifest.json",
  themeColor: "#0f1117",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STIE25MA2",
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