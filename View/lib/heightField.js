/* ===========================================================================
   The one landscape the site owns, as pure numbers.

   Three sections draw this same ground: the plan section sketches it flat as
   a contour map, the ambition section raises it as a surface, and both read
   the height field from here so they can never drift into being different
   mountains. This file deliberately imports nothing - the map is drawn with
   plain SVG in the entry chunk, and three.js must stay out of that chunk.
   =========================================================================== */

/* Written twice, deliberately: shaders raise geometry with the GLSL version and
   JavaScript places things on the surface with the other. They have to agree
   exactly, so they sit next to each other. */
export const HEIGHT_FIELD = /* glsl */ `
  float ridgeHeight(vec2 p) {
    float peak = exp(-((p.x + 0.9) * (p.x + 0.9) * 0.23 + (p.y - 0.2) * (p.y - 0.2) * 0.55)) * 1.55;
    float shoulder = exp(-((p.x - 2.4) * (p.x - 2.4) * 0.5 + (p.y + 1.2) * (p.y + 1.2) * 0.8)) * 0.82;
    float grain = sin(p.x * 1.35) * 0.14 + cos(p.y * 1.7) * 0.12 + sin((p.x + p.y) * 2.2) * 0.06;
    return peak + shoulder + grain - 0.45;
  }
`

export function ridgeHeight(x, z) {
  const peak = Math.exp(-((x + 0.9) ** 2 * 0.23 + (z - 0.2) ** 2 * 0.55)) * 1.55
  const shoulder = Math.exp(-((x - 2.4) ** 2 * 0.5 + (z + 1.2) ** 2 * 0.8)) * 0.82
  const grain = Math.sin(x * 1.35) * 0.14 + Math.cos(z * 1.7) * 0.12 + Math.sin((x + z) * 2.2) * 0.06
  return peak + shoulder + grain - 0.45
}

/* The sheet the field is drawn on, in field units: the same 18 x 13 the ridge
   scene builds its plane from. */
export const FIELD_WIDTH = 18
export const FIELD_DEPTH = 13

/* The summit of that field, and the route climbing to it from the low ground on
   the right. Field coordinates, not world ones. */
export const SUMMIT = [-0.9, 0.2]

export const ROUTE_CONTROL = [
  [2.95, 2.5],
  [1.95, 1.9],
  [1.0, 0.8],
  [0.2, 1.15],
  [-0.5, 0.5],
  [-0.9, 0.2],
]

/* A centripetal Catmull-Rom through the control points, sampled to a polyline.
   The same spline three.js builds for the ridge's route, written out here so
   the flat map can draw the identical line without loading three. */
export function sampleRoute(samples = 96) {
  const points = ROUTE_CONTROL
  const count = points.length
  const out = []

  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])

  for (let index = 0; index < samples; index += 1) {
    const t = (index / (samples - 1)) * (count - 1)
    const segment = Math.min(Math.floor(t), count - 2)
    const local = t - segment

    const p0 = points[Math.max(segment - 1, 0)]
    const p1 = points[segment]
    const p2 = points[segment + 1]
    const p3 = points[Math.min(segment + 2, count - 1)]

    /* Centripetal parameterisation (alpha = 0.5), as three.js does it. */
    let dt0 = Math.sqrt(distance(p0, p1))
    let dt1 = Math.sqrt(distance(p1, p2))
    let dt2 = Math.sqrt(distance(p2, p3))
    if (dt1 < 1e-4) dt1 = 1
    if (dt0 < 1e-4) dt0 = dt1
    if (dt2 < 1e-4) dt2 = dt1

    const axis = (i) => {
      const t1 = (p1[i] - p0[i]) / dt0 - (p2[i] - p0[i]) / (dt0 + dt1) + (p2[i] - p1[i]) / dt1
      const t2 = (p2[i] - p1[i]) / dt1 - (p3[i] - p1[i]) / (dt1 + dt2) + (p3[i] - p2[i]) / dt2
      const m1 = t1 * dt1
      const m2 = t2 * dt1
      const c0 = p1[i]
      const c1 = m1
      const c2 = -3 * p1[i] + 3 * p2[i] - 2 * m1 - m2
      const c3 = 2 * p1[i] - 2 * p2[i] + m1 + m2
      return c0 + c1 * local + c2 * local * local + c3 * local * local * local
    }

    out.push([axis(0), axis(1)])
  }

  return out
}
