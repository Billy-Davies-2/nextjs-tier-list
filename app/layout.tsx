import './globals.css'

export const metadata = {
  title: 'Next.js TierList',
  description: 'Build your own tier list with Next.js and Pocketbase',
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
