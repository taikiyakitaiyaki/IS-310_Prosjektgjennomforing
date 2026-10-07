/* Whether this browser can draw the site's scenes at all. The check makes a
   throwaway context and lets it go again straight away, so it does not count
   against the handful a page may hold. */
export function hasWebGL2() {
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    const supported = Boolean(context)
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return supported
  } catch {
    return false
  }
}
