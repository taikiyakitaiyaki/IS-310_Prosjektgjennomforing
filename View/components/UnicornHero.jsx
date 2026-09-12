import mountainHero from '../../Assets/Images/mountain-hero.svg'

/* ===========================================================================
   The landing scene: Lightweight, high-performance mountain atmosphere.
   Zero WebGL overhead, loaded from Assets/Images/mountain-hero.svg.
   =========================================================================== */
export default function UnicornHero() {
  return (
    <div className="landing__scene is-loaded" aria-hidden="true">
      <div className="landing__mountain-backdrop">
        {/* Atmospheric ambient glow */}
        <div className="landing__mountain-glow" />

        {/* Mountain ridge image from Assets folder */}
        <img
          className="landing__mountain-svg"
          src={mountainHero}
          alt=""
          width="1600"
          height="900"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  )
}
