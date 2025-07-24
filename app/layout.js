import './globals.css'

export const metadata = {
  title: 'HexPad',
  description: 'Free, Open Source Hexagon Map Editor',
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