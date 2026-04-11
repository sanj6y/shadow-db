import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shadow-DB Dashboard',
  description: 'Deterministic Simulation API for AI Agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
