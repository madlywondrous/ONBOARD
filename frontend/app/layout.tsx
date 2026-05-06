import type React from "react"
import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Tomorrow } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const geistMono = localFont({
  src: [
    {
      path: "../public/Font/Geist_Mono/GeistMono-VariableFont_wght.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
})

const tomorrow = Tomorrow({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-tomorrow",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ONBOARD",
  description: "Formula 1 2025 Season Dashboard - Race Calendar & Live Timing",
  icons: {
    icon: "/Onboard.svg",
    shortcut: "/Onboard.svg",
    apple: "/Onboard.svg",
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/Onboard.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/Onboard.svg" />
      </head>
      <body className={`${tomorrow.variable} ${geistMono.variable} bg-black text-white antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-red-500 text-white px-4 py-2 rounded z-50">Skip to main content</a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
