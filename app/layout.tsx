import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ThemeToggle from '@/components/theme-toggle.client'
import { TRPCProvider } from '@/lib/trpc'
import { ToastProvider } from '@/components/toast.client'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js TierList',
  description: 'Build your own tier list with Next.js and Pocketbase',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <TRPCProvider>
          <ToastProvider>
            <ThemeToggle />
            {children}
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
