import './globals.css'

export const metadata = {
  title: 'Athletic OS',
  description: 'Your personal health & performance tool',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F8F7F4',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Athletic OS" />
      </head>
      <body>{children}</body>
    </html>
  )
}
