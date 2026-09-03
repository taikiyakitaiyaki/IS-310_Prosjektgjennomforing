import * as THREE from 'three'
import { ROUTE_CONTROL } from './heightField.js'

/* ===========================================================================
   The landscape, for callers that already have three.js loaded.

   The numbers live in heightField.js so the flat map in the plan section can
   read them without paying for three. This module only adds what needs a
   THREE type: the route as a curve the tube geometry can follow.
   =========================================================================== */

export { HEIGHT_FIELD, ridgeHeight, SUMMIT, ROUTE_CONTROL } from './heightField.js'

/* The route with no height to it yet: a path across the field, for callers to
   lift onto the surface or lay flat on a sheet as they need. */
export function flatRoute() {
  return new THREE.CatmullRomCurve3(
    ROUTE_CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  )
}
