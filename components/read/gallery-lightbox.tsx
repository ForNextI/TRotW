'use client'

import { Maximize2, X } from 'lucide-react'
import Image from 'next/image'
import { MouseEvent, useRef, useState } from 'react'
import { useAccessibleDialog } from '@/components/accessibility/use-accessible-dialog'

interface GalleryLightboxProps {
  src: string
  alt: string
  title: string
  width: number
  height: number
}

export function GalleryLightbox({ src, alt, title, width, height }: GalleryLightboxProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useAccessibleDialog<HTMLDivElement>({ open, onClose: () => setOpen(false), initialFocusRef: closeButtonRef })

  function close() {
    setOpen(false)
  }

  function closeOnTrueBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.currentTarget !== event.target) return
    const clickedScrollbar = event.clientX >= event.currentTarget.clientWidth
    if (!clickedScrollbar) close()
  }



  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring" aria-label={`Open ${title} at screen width`}>
        <Image src={src} alt={alt} width={width} height={height} className="h-auto w-full rounded-2xl object-contain" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white opacity-90 shadow-lg transition group-hover:bg-black"><Maximize2 className="size-3.5" aria-hidden="true" />Open full width</span>
      </button>
      {open && (
        <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[120] overflow-x-hidden overflow-y-auto bg-black/94 px-4 pb-16 pt-16 outline-none backdrop-blur-sm sm:px-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={closeOnTrueBackdrop}>
          <button ref={closeButtonRef} type="button" onClick={close} className="fixed right-4 top-4 z-[130] flex size-12 items-center justify-center rounded-full border border-white/30 bg-black/75 text-white shadow-2xl transition hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white" aria-label="Close full-screen image"><X className="size-6" aria-hidden="true" /></button>
          <div className="mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]">
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              className="block h-auto w-full max-w-full object-contain"
              draggable={false}
            />
            <p className="sticky bottom-0 mx-auto w-fit max-w-full rounded-t-2xl bg-black/80 px-5 py-3 text-center font-display text-lg font-bold text-white sm:text-xl">{title}</p>
          </div>
        </div>
      )}
    </>
  )
}
