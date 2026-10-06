import { useEffect, useRef, useState } from 'react'
import { video } from '../../Model/site.js'
import { gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'
import ContourMap from './ContourMap.jsx'

/* ===========================================================================
   Video.

   A single frame, the width of the page, that grows to full size as it is
   scrolled into place and tilts a few degrees toward the pointer once it is
   there - but not while the film plays, so the controls hold still under the
   pointer. Nothing of the film is fetched until it is played; the poster holds
   the frame until then. Without a film the frame stands with the map as its
   ground and says so.
   =========================================================================== */

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

/* AV1 carries the same picture in about half the bytes, but a device that has
   to decode it in software runs hot and drops frames, which is worse than the
   larger file. So it is taken only where the browser says it plays smoothly
   and power-efficiently; everything else gets the last source, H.264, which
   every device decodes in hardware. */
async function pickSource({ sources, width, height, framerate }) {
  const fallback = sources[sources.length - 1]
  if (!navigator.mediaCapabilities) return fallback

  for (const source of sources.slice(0, -1)) {
    try {
      const info = await navigator.mediaCapabilities.decodingInfo({
        type: 'file',
        video: {
          contentType: `video/mp4; codecs="${source.codec}"`,
          width,
          height,
          bitrate: source.bitrate,
          framerate,
        },
      })
      if (info.supported && info.smooth && info.powerEfficient) return source
    } catch {
      /* Some browsers throw on a codec they do not know rather than saying no. */
    }
  }
  return fallback
}

export default function VideoSection() {
  const root = useRef(null)
  const frame = useRef(null)
  const player = useRef(null)
  const [src, setSrc] = useState(null)
  const { still } = useMotion()
  const hasFilm = video.sources.length > 0

  useEffect(() => {
    if (!hasFilm) return undefined
    let live = true
    pickSource(video).then((source) => {
      if (live) setSrc(source.src)
    })
    return () => {
      live = false
    }
  }, [hasFilm])

  /* A film left playing while the page is scrolled on would keep decoding
     under the scenes further down, so it pauses once it is out of sight. */
  useEffect(() => {
    const node = player.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !node.paused) node.pause()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useGSAP(
    () => {
      if (still) return undefined

      gsap.fromTo(
        frame.current,
        { scale: 0.86, yPercent: 8 },
        {
          scale: 1,
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 95%', end: 'top 30%', scrub: 0.5 },
        },
      )

      if (!window.matchMedia(FINE_POINTER).matches) return undefined

      gsap.set(frame.current, { transformPerspective: 1400 })
      const toX = gsap.quickTo(frame.current, 'rotateX', { duration: 0.9, ease: 'power3' })
      const toY = gsap.quickTo(frame.current, 'rotateY', { duration: 0.9, ease: 'power3' })

      const film = player.current
      const move = (event) => {
        if (film && !film.paused) return
        const rect = frame.current.getBoundingClientRect()
        const px = (event.clientX - rect.left) / rect.width - 0.5
        const py = (event.clientY - rect.top) / rect.height - 0.5
        toX(-py * 5)
        toY(px * 6)
      }
      const leave = () => {
        toX(0)
        toY(0)
      }

      const node = frame.current
      node.addEventListener('pointermove', move)
      node.addEventListener('pointerleave', leave)
      film?.addEventListener('play', leave)
      return () => {
        node.removeEventListener('pointermove', move)
        node.removeEventListener('pointerleave', leave)
        film?.removeEventListener('play', leave)
      }
    },
    { dependencies: [still], revertOnUpdate: true, scope: root },
  )

  return (
    <div className="video" ref={root}>
      <div className="video__frame" ref={frame}>
        {hasFilm ? (
          <video
            className="video__player"
            ref={player}
            src={src ?? undefined}
            controls
            preload="none"
            playsInline
            poster={video.poster ?? undefined}
            aria-label={video.title}
          />
        ) : (
          <div className="video__empty">
            <ContourMap className="video__map" draw="static" route={false} />
            <span className="video__pending">{video.pendingLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
