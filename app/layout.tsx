import type { Metadata } from 'next'
import './globals.css'
import { Ubuntu } from 'next/font/google'

const font = Ubuntu({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STIE25MA2",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={font.className}>
        {children}
      </body>
    </html>
  )
}