import { useEffect, useState } from 'react'
import * as THREE from 'three'

/* ===========================================================================
   Scenes borrow the site's colours instead of restating them, so an edit in
   base.css moves every canvas with it - in both colour schemes.
   =========================================================================== */

const FALLBACK = { surface: '#f4f7fb', text: '#13202c', accent: '#245fa8' }

const SRGB = { r: 0, g: 0, b: 0 }

function cssColor(styles, name, fallback) {
  const color = new THREE.Color()
  const raw = styles.getPropertyValue(name).trim()

  try {
    color.setStyle(raw || fallback, THREE.SRGBColorSpace)
  } catch {
    color.setStyle(fallback, THREE.SRGBColorSpace)
  }

  /* Read the value back as sRGB: it goes straight to the framebuffer from
     shaders of our own, with no colour-space conversion behind us. */
  color.getRGB(SRGB, THREE.SRGBColorSpace)
  return new THREE.Vector3(SRGB.r, SRGB.g, SRGB.b)
}

export function mix(a, b, amount) {
  return a.clone().lerp(b, amount)
}

export const WHITE = new THREE.Vector3(1, 1, 1)

export function readPalette() {
  const styles = getComputedStyle(document.documentElement)

  return {
    surface: cssColor(styles, '--surface', FALLBACK.surface),
    text: cssColor(styles, '--text', FALLBACK.text),
    accent: cssColor(styles, '--accent', FALLBACK.accent),
  }
}

export function usePalette() {
  const [palette, setPalette] = useState(readPalette)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setPalette(readPalette())
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return palette
}
