import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap.js'
import { getContours, MAP_VIEWBOX } from '../lib/contours.js'
import { useMotion } from '../lib/motion.jsx'
import { cx } from '../lib/cx.js'

/* ===========================================================================
   The ridge as a map.

   The contour lines draw themselves as the map scrolls into view, lowest
   ground first and the summit last, and the route follows once the ground is
   there for it to cross. Each line carries its own start and span, and the
   whole drawing is steered by one custom property on the svg - so scrolling
   costs one style write per frame, whatever the number of lines.

   `draw="static"` skips the drawing and shows the finished map, for places
   that use it as texture rather than as an event.
   =========================================================================== */

export default function ContourMap({ className, draw = 'scroll', route = true, ...rest }) {
  const svg = useRef(null)
  const { still } = useMotion()
  const { levels, route: routePath, summit } = getContours()

  useGSAP(
    () => {
      const node = svg.current
      if (!node || draw !== 'scroll' || still) return

      gsap.fromTo(
        node,
        { '--draw': 0 },
        {
          '--draw': 1,
          ease: 'none',
          scrollTrigger: { trigger: node, start: 'top 92%', end: 'center 42%', scrub: 0.6 },
        },
      )
    },
    { dependencies: [draw, still], revertOnUpdate: true, scope: svg },
  )

  return (
    <svg
      ref={svg}
      className={cx('contours', className)}
      viewBox={MAP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <g className="contours__ground">
        {levels.map((level) => (
          <path
            key={level.band}
            d={level.d}
            pathLength="1"
            className={cx('contours__line', level.major && 'is-major')}
            style={{ '--from': (level.index / level.count) * 0.6, '--span': 0.4 }}
          />
        ))}
      </g>
      {route ? (
        <>
          <path
            className="contours__route"
            d={routePath}
            pathLength="1"
            style={{ '--from': 0.5, '--span': 0.5 }}
          />
          <circle className="contours__summit" cx={summit[0]} cy={summit[1]} r="7" />
        </>
      ) : null}
    </svg>
  )
}
