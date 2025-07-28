import './globals.css'

export const metadata = {
  metadataBase: new URL('https://hexpad.app'),
  title: 'HexPad',
  description: 'Create stunning hex maps for D&D, tabletop RPGs, and game masters. Free online hexagonal grid maker with terrain painting, icons, and instant sharing. Perfect for RPG campaigns and worldbuilding.',
  keywords: 'hex map maker, hexagonal grid, D&D maps, RPG maps, tabletop maps, hex grid creator, game master tools, map making, hex mapper, fantasy maps',
  author: 'HexPad',
  robots: 'index, follow',
  
  // Open Graph tags for social sharing
  openGraph: {
    title: 'HexPad - Free Hex Map Maker for D&D & RPGs',
    description: 'Create beautiful hexagonal grid maps for your tabletop adventures. Paint terrain, add icons, and share instantly.',
    url: 'https://hexpad.app', // Update with your actual domain
    siteName: 'HexPad',
    type: 'website',
    images: [
      {
        url: '/logo512.png', // You might want to create a specific OG image
        width: 512,
        height: 512,
        alt: 'HexPad - Hex Map Maker',
      },
    ],
  },
  
  // App-specific metadata
  applicationName: 'HexPad',
  category: 'Productivity',
  
  icons: {
    icon: '/favicon.ico',
    apple: '/logo192.png',
  }
}

// Separate viewport export as recommended by Next.js
export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "HexPad",
              "applicationCategory": "GameApplication",
              "operatingSystem": "All",
              "description": "Free online hex map maker for creating hexagonal grid maps for D&D, tabletop RPGs, and game masters. Paint terrain, add icons, and share maps instantly.",
              "url": "https://hexpad.app",
              "author": {
                 "@type": "Organization",
                 "name": "HexPad"
               },
              "keywords": "hex map maker, hexagonal grid, D&D maps, RPG maps, tabletop maps, game master tools"
            })
          }}
        />
        
        {/* Additional meta tags for better indexing */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://hexpad.app" />
      </head>
      <body>{children}</body>
    </html>
  )
} 