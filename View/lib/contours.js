import { ridgeHeight, sampleRoute, SUMMIT } from './heightField.js'

/* ===========================================================================
   The landscape drawn flat: the contour map of the ridge, as SVG paths.

   Marching squares over the same height field the 3D scene raises, at the
   same band spacing its shader draws, so the lines on the plan's map are the
   lines the visitor later sees standing up in Ambisjonsnivå. Computed once,
   the first time something asks for it - a few milliseconds of arithmetic.
   =========================================================================== */

/* The window of the field the map shows, in field units, and its scale to
   viewBox units. The whole 18 x 13 sheet is mostly plain; this frames the
   ridge and the route with a margin of low ground around them. */
export const MAP = { x0: -6, x1: 6, z0: -4.5, z1: 4.5, scale: 100 }
export const MAP_WIDTH = (MAP.x1 - MAP.x0) * MAP.scale
export const MAP_HEIGHT = (MAP.z1 - MAP.z0) * MAP.scale
export const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`

/* Contours every eighth of a unit, a heavier one every fifth line: the exact
   spacing and cadence of the shader in RidgeCanvas. */
const BANDS = 8
const MAJOR_EVERY = 5

/* Field (x, z) to map (x, y). +z faces the camera in the 3D scene, so on the
   map it runs down the page: the route starts low right and climbs up left,
   as it does in relief. */
export function toMap([x, z]) {
  return [(x - MAP.x0) * MAP.scale, (z - MAP.z0) * MAP.scale]
}

function pointKey(point) {
  return `${Math.round(point[0] * 8)},${Math.round(point[1] * 8)}`
}

/* Marching squares for one level: the crossing segments of every cell, then
   joined end to end into as few polylines as they make. */
function isolines(grid, cols, rows, iso, cellWidth, cellHeight) {
  const at = (row, col) => grid[row * (cols + 1) + col]
  const segments = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tl = at(row, col)
      const tr = at(row, col + 1)
      const br = at(row + 1, col + 1)
      const bl = at(row + 1, col)

      let index = 0
      if (tl >= iso) index |= 8
      if (tr >= iso) index |= 4
      if (br >= iso) index |= 2
      if (bl >= iso) index |= 1
      if (index === 0 || index === 15) continue

      const x = col * cellWidth
      const y = row * cellHeight
      const along = (a, b) => (iso - a) / (b - a)

      const top = [x + along(tl, tr) * cellWidth, y]
      const right = [x + cellWidth, y + along(tr, br) * cellHeight]
      const bottom = [x + along(bl, br) * cellWidth, y + cellHeight]
      const left = [x, y + along(tl, bl) * cellHeight]

      switch (index) {
        case 1:
        case 14:
          segments.push([left, bottom])
          break
        case 2:
        case 13:
          segments.push([bottom, right])
          break
        case 3:
        case 12:
          segments.push([left, right])
          break
        case 4:
        case 11:
          segments.push([top, right])
          break
        case 6:
        case 9:
          segments.push([top, bottom])
          break
        case 7:
        case 8:
          segments.push([left, top])
          break
        default: {
          /* The two saddle cases: decide which corners join by the height at
             the cell's centre. */
          const high = (tl + tr + br + bl) / 4 >= iso
          if ((index === 5) === high) {
            segments.push([left, top], [bottom, right])
          } else {
            segments.push([left, bottom], [top, right])
          }
        }
      }
    }
  }

  return link(segments)
}

function link(segments) {
  const used = new Uint8Array(segments.length)
  const byEnd = new Map()

  segments.forEach((segment, index) => {
    for (const point of segment) {
      const key = pointKey(point)
      const list = byEnd.get(key)
      if (list) list.push(index)
      else byEnd.set(key, [index])
    }
  })

  const nextFrom = (point) => {
    const list = byEnd.get(pointKey(point))
    if (!list) return -1
    for (const index of list) if (!used[index]) return index
    return -1
  }

  const extend = (start) => {
    const out = []
    let point = start
    for (;;) {
      const index = nextFrom(point)
      if (index < 0) break
      used[index] = 1
      const [a, b] = segments[index]
      point = pointKey(a) === pointKey(point) ? b : a
      out.push(point)
    }
    return out
  }

  const lines = []
  for (let index = 0; index < segments.length; index += 1) {
    if (used[index]) continue
    used[index] = 1
    const [a, b] = segments[index]
    const forward = extend(b)
    const backward = extend(a)
    lines.push([...backward.reverse(), a, b, ...forward])
  }
  return lines
}

/* Ramer-Douglas-Peucker: drop the points that lie within `tolerance` of the
   line through their neighbours. Marching squares puts a vertex on every grid
   edge it crosses, and most of those are on straight runs. */
function simplify(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]

  while (stack.length) {
    const [start, end] = stack.pop()
    const [ax, ay] = points[start]
    const [bx, by] = points[end]
    const dx = bx - ax
    const dy = by - ay
    const length = dx * dx + dy * dy
    let farthest = 0
    let at = -1

    for (let index = start + 1; index < end; index += 1) {
      const [px, py] = points[index]
      let distance
      if (length === 0) {
        distance = Math.hypot(px - ax, py - ay)
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length))
        distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      }
      if (distance > farthest) {
        farthest = distance
        at = index
      }
    }

    if (farthest > tolerance && at > 0) {
      keep[at] = 1
      stack.push([start, at], [at, end])
    }
  }

  return points.filter((_, index) => keep[index])
}

function toPath(points, closeIfLoop = true) {
  const closed = closeIfLoop && points.length > 2 && pointKey(points[0]) === pointKey(points[points.length - 1])
  const run = closed ? points.slice(0, -1) : points
  const d = run.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')
  return closed ? `${d}Z` : d
}

let cache = null

export function getContours() {
  if (cache) return cache

  const cols = 120
  const rows = 90
  const grid = new Float32Array((rows + 1) * (cols + 1))
  let lowest = Infinity
  let highest = -Infinity

  for (let row = 0; row <= rows; row += 1) {
    const z = MAP.z0 + (row / rows) * (MAP.z1 - MAP.z0)
    for (let col = 0; col <= cols; col += 1) {
      const x = MAP.x0 + (col / cols) * (MAP.x1 - MAP.x0)
      const height = ridgeHeight(x, z)
      grid[row * (cols + 1) + col] = height
      if (height < lowest) lowest = height
      if (height > highest) highest = height
    }
  }

  const cellWidth = MAP_WIDTH / cols
  const cellHeight = MAP_HEIGHT / rows
  const first = Math.ceil(lowest * BANDS + 0.5)
  const last = Math.floor(highest * BANDS + 0.5)

  const levels = []
  for (let band = first; band <= last; band += 1) {
    const value = (band - 0.5) / BANDS
    const lines = isolines(grid, cols, rows, value, cellWidth, cellHeight)
    const d = lines
      .map((line) => simplify(line, 0.9))
      .filter((line) => line.length > 1)
      .map((line) => toPath(line))
      .join('')
    if (!d) continue
    levels.push({
      band,
      value,
      major: ((band % MAJOR_EVERY) + MAJOR_EVERY) % MAJOR_EVERY === 0,
      d,
    })
  }

  levels.forEach((level, index) => {
    level.index = index
    level.count = levels.length
  })

  const route = toPath(sampleRoute(96).map(toMap), false)
  const summit = toMap(SUMMIT)

  cache = { levels, route, summit }
  return cache
}
