import type React from "react"
import type { Metadata } from "next"
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
  description: "Formula 1 2025 Season Dashboard - Race Calendar, Drivers, Teams, Standings & Statistics",
  icons: {
    icon: "/Onboard.svg",
    shortcut: "/Onboard.svg",
    apple: "/Onboard.svg",
  }
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
