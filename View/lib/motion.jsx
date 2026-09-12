import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'

/* ===========================================================================
   Two things decide how much this site moves: what the device can afford, and
   what the visitor asked for. Both live here so every scene reads one answer
   instead of each component sniffing the browser on its own.
   =========================================================================== */

const MotionContext = createContext(null)

const STILL = { reduced: true, lowPower: true }

function readProfile() {
  if (typeof window === 'undefined') return STILL

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const memory = navigator.deviceMemory
  const cores = navigator.hardwareConcurrency || 4
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  const isSmallScreen = window.innerWidth < 1024

  /* Activate lowPower on:
     - Mobile, tablet, or touch devices
     - Screens with width under 1024px
     - Systems with 4 or fewer cores
     - Systems with known memory < 8GB
     - Safari/Firefox without memory API where cores < 8 */
  const lowPower =
    reduced ||
    isTouch ||
    isSmallScreen ||
    cores <= 4 ||
    (typeof memory === 'number' ? memory < 8 : cores < 8)

  return {
    reduced,
    lowPower,
  }
}

export function MotionProvider({ children }) {
  /* Read the real profile during the first render rather than correcting it in
     an effect. Both scenes take their resolution and frame rate from these
     values, and a post-mount change tears down and re-initialises a WebGL
     context that was already running. */
  const [profile, setProfile] = useState(() => (typeof window === 'undefined' ? STILL : readProfile()))

  /* The site opens still and waits to be asked. Everything that moves here -
     two WebGL scenes, the eased scroll, the scrubbed timelines - costs a
     machine something, and the visitor is the one who knows whether theirs can
     afford it. Nothing is hidden by starting this way: the landing scene still
     renders and freezes on a frame, the map shows itself finished, and the
     photographs simply do not cycle. */
  const [pausedByUser, setPausedByUser] = useState(true)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setProfile(readProfile())
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const togglePaused = useCallback(() => setPausedByUser((value) => !value), [])

  /* Two questions that look alike and are not:

     still      the system asked for reduced motion, so nothing on the page
                should move. Every scene reads this one.
     heroStill  that, or the visitor pressed pause. The switch reaches only the
                landing scene - it is the expensive thing here, a whole WebGL
                context running a published 3D scene, and it is what someone
                pausing this page is trying to switch off. The ridge, the
                crossfades, the scrubbed timelines and the eased scroll are
                cheap by comparison and keep going either way. */
  const still = profile.reduced
  const heroStill = profile.reduced || pausedByUser

  /* The root classes reflect both the still and lowPower states so CSS
     animations like fog can pause or soften. */
  useEffect(() => {
    document.documentElement.classList.toggle('is-still', still)
    document.documentElement.classList.toggle('is-low-power', profile.lowPower)
  }, [still, profile.lowPower])

  const value = useMemo(
    () => ({
      reduced: profile.reduced,
      lowPower: profile.lowPower,
      /* The flag every scene but one checks. */
      still,
      /* And the one the landing scene checks instead. */
      heroStill,
      pausedByUser,
      togglePaused,
    }),
    [profile.reduced, profile.lowPower, still, heroStill, pausedByUser, togglePaused],
  )

  return <MotionContext value={value}>{children}</MotionContext>
}

export function useMotion() {
  const value = use(MotionContext)
  if (!value) throw new Error('useMotion must be used inside <MotionProvider>')
  return value
}
