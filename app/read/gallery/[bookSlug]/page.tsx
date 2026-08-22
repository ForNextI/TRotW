import { permanentRedirect } from 'next/navigation'

export default async function LegacyGalleryPage({ params }: { params: Promise<{ bookSlug: string }> }) {
  const { bookSlug } = await params
  permanentRedirect(`/read/pix/${bookSlug}`)
}
