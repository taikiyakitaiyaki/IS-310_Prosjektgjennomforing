import { Suspense, useEffect, useRef, useState } from 'react'

/* Every scene costs a WebGL context and a share of the three.js chunk, so none
   of them is fetched until the visitor is within a screen of it. The element is
   always in the document, though - it is what the observer watches, and what
   holds the space so nothing jumps when the scene arrives. */
export default function SceneSlot({ children, className, ...attributes }) {
  const host = useRef(null)
  const [wanted, setWanted] = useState(false)

  useEffect(() => {
    const node = host.current
    if (!node || wanted) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setWanted(true)
      },
      { rootMargin: '100% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [wanted])

  return (
    <div className={className} ref={host} {...attributes}>
      {wanted ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  )
}
