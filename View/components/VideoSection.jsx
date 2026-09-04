import { useRef } from 'react'
import { video } from '../../Model/site.js'
import { gsap, useGSAP } from '../lib/gsap.js'
import { useMotion } from '../lib/motion.jsx'
import ContourMap from './ContourMap.jsx'

/* ===========================================================================
   Video.

   A single frame, the width of the page, that grows to full size as it is
   scrolled into place and tilts a few degrees toward the pointer once it is
   there. When there is a film it plays in this frame; until then the frame
   stands with the map as its ground and says so.
   =========================================================================== */

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

export default function VideoSection() {
  const root = useRef(null)
  const frame = useRef(null)
  const { still } = useMotion()

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

      const move = (event) => {
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
      return () => {
        node.removeEventListener('pointermove', move)
        node.removeEventListener('pointerleave', leave)
      }
    },
    { dependencies: [still], revertOnUpdate: true, scope: root },
  )

  return (
    <div className="video" ref={root}>
      <div className="video__frame" ref={frame}>
        {video.src ? (
          <video
            className="video__player"
            controls
            preload="metadata"
            playsInline
            poster={video.poster ?? undefined}
          >
            <source src={video.src} />
          </video>
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
