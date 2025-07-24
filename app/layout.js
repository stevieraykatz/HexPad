import './globals.css'

export const metadata = {
  title: 'HexPad',
  description: 'Interactive hexagonal grid painting application with WebGL',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 