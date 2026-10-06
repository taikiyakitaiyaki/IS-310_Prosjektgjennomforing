import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { controls, sections } from './Model/site.js'
import { MotionProvider } from './View/lib/motion.jsx'
import { SmoothScroll } from './View/lib/scroll.jsx'
import { SplitWords } from './View/lib/reveal.jsx'
import Veil from './View/components/Veil.jsx'
import SiteNav from './View/components/SiteNav.jsx'
import ThemeToggle from './View/components/ThemeToggle.jsx'
import Landing from './View/components/Landing.jsx'
import MembersSection from './View/components/MembersSection.jsx'
import VideoSection from './View/components/VideoSection.jsx'
import AmbitionSection from './View/components/AmbitionSection.jsx'
import './View/css/base.css'
import './View/css/site.css'
import './View/css/sections.css'

/* What each section carries under its heading. The order and the ids come
   from the model, so the hero titles, the navigation and the sections can
   never disagree about what the page contains. */
const SECTION_CONTENT = {
  medlemmer: MembersSection,
  video: VideoSection,
  ambisjonsniva: AmbitionSection,
}

function TopicSections() {
  return (
    <div className="topics">
      {sections.map((section) => {
        const Content = SECTION_CONTENT[section.id]

        return (
          <section
            className={`topic topic--${section.id}`}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            key={section.id}
          >
            <SplitWords
              as="h2"
              id={`${section.id}-title`}
              text={section.heading ?? section.title}
              className="topic__title"
            />
            {Content ? <Content /> : null}
          </section>
        )
      })}
    </div>
  )
}

function App() {
  return (
    <MotionProvider>
      <SmoothScroll>
        <a className="skip-link" href="#innhold">
          {controls.skip}
        </a>
        <Veil />
        <div className="fog" aria-hidden="true">
          <span className="fog__bank fog__bank--a" />
          <span className="fog__bank fog__bank--b" />
        </div>
        <SiteNav />
        <main id="innhold">
          <Landing />
          <TopicSections />
        </main>
        <ThemeToggle />
        <div className="grain" aria-hidden="true" />
      </SmoothScroll>
    </MotionProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
