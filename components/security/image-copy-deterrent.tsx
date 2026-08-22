'use client'

import { useEffect } from 'react'

function isProtectedImageTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('img, [data-protected-image]'))
}

/**
 * Casual image-copy deterrence only.
 *
 * Published prose intentionally remains selectable/copyable so browser reading
 * tools, assistive workflows, translation, dictionary lookup, and text
 * selection are not obstructed by the site shell.
 */
export function ImageCopyDeterrent() {
  useEffect(() => {
    const preventProtectedContextMenu = (event: MouseEvent) => {
      if (isProtectedImageTarget(event.target)) event.preventDefault()
    }
    const preventProtectedDrag = (event: DragEvent) => {
      if (isProtectedImageTarget(event.target)) event.preventDefault()
    }

    document.addEventListener('contextmenu', preventProtectedContextMenu)
    document.addEventListener('dragstart', preventProtectedDrag)
    return () => {
      document.removeEventListener('contextmenu', preventProtectedContextMenu)
      document.removeEventListener('dragstart', preventProtectedDrag)
    }
  }, [])

  return null
}
