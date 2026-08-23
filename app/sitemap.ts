import type { MetadataRoute } from 'next'
import { getReadBooks, getReleaseCatalog } from '@/lib/read/releases'

const BASE = 'https://thereadingofthewardens.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [releases, books] = await Promise.all([getReleaseCatalog(), getReadBooks()])
  const staticRoutes = [
    '/',
    '/read',
    '/read/about',
    '/read/toril',
    '/rodney',
    '/legal',
    '/accessibility',
  ]

  return [
    ...staticRoutes.map((route) => ({ url: `${BASE}${route}` })),
    ...releases.map((release) => ({
      url: `${BASE}/read/toril/${release.id}`,
      lastModified: release.publishedAt,
    })),
    ...books.map((book) => ({ url: `${BASE}/read/pix/book-${book.book}` })),
  ]
}
