import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'

/* ===========================================================================
   Two things decide how much this site moves: what the device can afford, and
   what the visitor asked for. Both live here so every scene reads one answer
   instead of each component sniffing the browser on its own.
   =========================================================================== */

const MotionContext = createContext(null)

const STILL = { reduced: true, lowPower: true }

function readProfile() {
  /* deviceMemory and hardwareConcurrency are absent on Safari and Firefox.
     Assume a capable machine there rather than punishing it with the fallback. */
  const memory = navigator.deviceMemory || 8
  const cores = navigator.hardwareConcurrency || 8
  return {
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    lowPower: memory < 4 || cores < 4,
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

  const still = profile.reduced || pausedByUser

  /* The one thing CSS alone animates - the fog - reads the same answer from a
     class on the root, since it cannot read this context. */
  useEffect(() => {
    document.documentElement.classList.toggle('is-still', still)
  }, [still])

  const value = useMemo(
    () => ({
      reduced: profile.reduced,
      lowPower: profile.lowPower,
      /* The one flag the scenes actually check. */
      still,
      pausedByUser,
      togglePaused,
    }),
    [profile.reduced, profile.lowPower, still, pausedByUser, togglePaused],
  )

  return <MotionContext value={value}>{children}</MotionContext>
}

export function useMotion() {
  const value = use(MotionContext)
  if (!value) throw new Error('useMotion must be used inside <MotionProvider>')
  return value
}
