import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

/* Registered once, here, so every component imports the same configured
   instance and nobody registers a plugin twice. */
gsap.registerPlugin(ScrollTrigger, useGSAP)

/* Scroll-linked work is measured against the viewport the page actually has -
   inside an embed that is the embed's own, not the top window's - so nothing
   here asks ScrollTrigger to look outside the frame it runs in. */
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger, useGSAP }
