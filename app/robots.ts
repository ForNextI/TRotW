import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/owner',
        '/read/publisher',
        '/read/poll-results',
        '/read/age',
        '/rodney/admin',
        '/api/',
      ],
    },
    sitemap: 'https://thereadingofthewardens.com/sitemap.xml',
  }
}
