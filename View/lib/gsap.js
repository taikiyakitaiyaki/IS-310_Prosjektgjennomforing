import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'
import { useGSAP } from '@gsap/react'

/* Registered once, here, so every component imports the same configured
   instance and nobody registers a plugin twice. */
gsap.registerPlugin(ScrollTrigger, Flip, CustomEase, useGSAP)

/* Scroll-linked work is measured against the viewport the page actually has -
   inside an embed that is the embed's own, not the top window's - so nothing
   here asks ScrollTrigger to look outside the frame it runs in. */
ScrollTrigger.config({ ignoreMobileResize: true })

/* The two curves base.css moves everything with (--ease-out, --ease-in-out),
   under names of their own, so what the script animates settles exactly the
   way what the stylesheet animates does. */
CustomEase.create('siteOut', '0.16, 1, 0.3, 1')
CustomEase.create('siteInOut', '0.76, 0, 0.24, 1')

/* For things that move because someone pressed something: under way in the
   very first frame, so the press is answered at once, and settling softly.
   An in-out curve spends its first fifth of a second barely moving, which
   reads as the page lagging behind the finger. */
CustomEase.create('answer', '0.22, 1, 0.36, 1')

export { gsap, ScrollTrigger, Flip, useGSAP }
