import { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { chapters, goToChapter, useScrollDirector } from './timeline'
import moonTexture from './assets/lroc-color-4k.webp'

const LunarScene = lazy(() => import('./scene/LunarScene'))
const modelUrl = 'https://huggingface.co/collections/nasa-ibm-ai4science/nasa-ibm-lunar-fm-and-downstream-models'

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h16m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.3" /></svg>
}
function Mark() {
  return <svg className="brand-mark" aria-hidden="true" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="10" stroke="currentColor" /><ellipse cx="17" cy="17" rx="17" ry="5" transform="rotate(-40 17 17)" stroke="currentColor" /><circle cx="17" cy="17" r="2" fill="currentColor" /></svg>
}

export default function App() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sources, setSources] = useState(false)
  const progress = useScrollDirector(reduced)
  const handleReady = useCallback(() => setReady(true), [])
  const handleFailure = useCallback(() => { setFailed(true); setReady(true) }, [])
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!sources) return
    const dialog = document.querySelector<HTMLDialogElement>('#sources-dialog')
    dialog?.showModal()
    return () => dialog?.close()
  }, [sources])

  return <>
    <a className="skip-link" href="#journey">Skip to the journey</a>
    <div className={`universe ${ready ? 'is-ready' : ''} ${failed ? 'is-fallback' : ''}`} aria-hidden="true">
      <div className="static-moon" style={{ backgroundImage: `url(${moonTexture})` }} />
      {!failed && <SceneBoundary onFailure={handleFailure}>
        <Suspense fallback={null}><LunarScene progress={progress} reduced={reduced} onReady={handleReady} onFailure={handleFailure} /></Suspense>
      </SceneBoundary>}
    </div>
    <div className="ambient-wash" aria-hidden="true" />
    <header className="header">
      <button className="brand" onClick={() => goToChapter(0, reduced)} aria-label="Lunar, return to the opening"><Mark /><span>LUNAR<span className="brand-dot">.</span></span></button>
      <span className="header-note">NOTES FROM THE MOON</span>
      <button className="source-trigger" onClick={() => setSources(true)}>Field notes <span className="tiny-plus">+</span></button>
    </header>

    <main id="journey" className="journey" tabIndex={-1}>
      <div className="stage">
        <div className="edge-label" aria-hidden="true">ONE MOON / SIX PASSAGES</div>
        <article className="chapter hero" data-chapter="0" aria-labelledby="title-arrival">
          <div className="eyebrow"><span className="status-dot" /> NASA–IBM LUNAR FOUNDATION MODEL</div>
          <h1 id="title-arrival">SEE IT<br /><em>CLOSER.</em></h1>
          <p className="chapter-deck">A distant world. A measured surface.</p>
          <p className="body-copy">From orbital maps to sub-metre imagery.<br />Follow the data down.</p>
          <button className="journey-button" onClick={() => goToChapter(1, reduced)}><span>Move closer</span><span className="circle-arrow"><Arrow /></span></button>
          <div className="hero-index"><span>384,400 <small>KM / MEAN DISTANCE</small></span><span>THE DISTANCE<br />BETWEEN TWO WORLDS.</span></div>
          <div className="moon-label"><span className="crosshair">+</span><div>LUNA / NEAR SIDE<br /><small>LROC / IMAGERY · LOLA / ELEVATION</small></div></div>
        </article>

        <article className="chapter terrain" data-chapter="1" aria-labelledby="title-terrain" aria-hidden="true">
          <div className="eyebrow">02 — THE LUNAR ARCHIVE</div>
          <h2 id="title-terrain">RIDGE BY<br /><em>RIDGE.</em></h2>
          <p className="chapter-deck">The ground keeps a record.</p>
          <p className="body-copy">A rim cuts across an older crater.<br />Closer in, the marks begin to separate.</p>
          <div className="data-pair"><div><strong>20 <small>km</small></strong><span>VIRTUAL ALTITUDE / ABOVE LANDING SITE</span></div><div><strong>4.7 × 12 <small>km</small></strong><span>NAC TERRAIN FOOTPRINT</span></div></div>
          <p className="micro-note">LROC NAC / WAC terrain. Gold frame, kilometre grid and scan band are visual guides, not live telemetry.</p>
          <div className="terrain-marker"><span className="marker-ring" /><span>TAURUS–LITTROW<br /><small>NAC / DEM FOOTPRINT</small></span></div>
        </article>

        <article className="chapter surface-contact" data-chapter="2" aria-labelledby="title-surface" aria-hidden="true">
          <div className="surface-heading"><div className="eyebrow">03 — TAURUS–LITTROW / 2.1 M</div>
          <h2 id="title-surface">EARTH<br /><em>ABOVE.</em></h2>
          <p className="chapter-deck">Measured ground. A familiar light.</p></div>
          <div className="surface-readout"><span className="surface-rule"/><div><strong>0.6 <small>m / px</small></strong><span>NAC ORTHOIMAGE / SOURCE PIXEL SIZE</span></div><div><strong>2 <small>m / post</small></strong><span>NAC TERRAIN / SOURCE POST SPACING</span></div></div>
          <p className="surface-caption">TAURUS–LITTROW / WEST<br/><span>2.1 m ABOVE GROUND / VIRTUAL EYE HEIGHT</span></p>
          <p className="surface-error" role="status">Local data could not load. The orbital view is still available.</p>
          <p className="surface-disclosure">Earth direction: artistic placement. Nearby rocks: procedural.</p>
        </article>

        <article className="chapter polar right-aligned" data-chapter="3" aria-labelledby="title-shadow" aria-hidden="true">
          <div className="eyebrow">04 — THE SOUTH POLE</div>
          <h2 id="title-shadow">SUNLESS<br /><em>GROUND.</em></h2>
          <p className="chapter-deck">Some crater floors never see the Sun.</p>
          <p className="body-copy">The rim holds back the light.<br />The cold may preserve water ice.</p>
          <div className="polar-signal"><span className="signal-line" /><span>MAPPED SHADOW<br /><small>LOLA / PERMANENTLY SHADOWED REGIONS</small></span></div>
          <p className="micro-note">LOLA-derived shadow regions larger than 1 km².<br />Simulated relief; colour and outlines are artistic.<br />Permanent shadow is not confirmed ice. Not a model prediction.</p>
          <div className="polar-coordinate">80–90° S <span>PSR / AREA &gt; 1 km²</span></div>
        </article>

        <article className="chapter intelligence" data-chapter="4" aria-labelledby="title-intelligence" aria-hidden="true">
          <div className="eyebrow">05 — NASA–IBM / LUNAR FM</div>
          <h2 id="title-intelligence">MORE THAN<br /><em>AN IMAGE.</em></h2>
          <p className="chapter-deck">One place. Several kinds of evidence.</p>
          <p className="body-copy">Images, height, heat and gravity.<br />The model learns from them together.</p>
          <div className="model-stat"><strong>1.96<span>M</span></strong><div>PRETRAINING SAMPLES / APPROX.<br /><small>SOMBENCH PRETRAINING CORPUS</small></div></div>
          <div className="modality-tags"><span>OPTICAL</span><span>TERRAIN</span><span>THERMAL</span><span>GRAVITY</span></div>
          <div className="scan-label"><span /> OBSERVATIONS / ALIGNED<br /><small>Conceptual links. No model inference on this site.</small></div>
        </article>

        <article className="chapter finale" data-chapter="5" aria-labelledby="title-horizon" aria-hidden="true">
          <div className="eyebrow">06 — THE HUMAN CHAPTER</div>
          <h2 id="title-horizon">THE NEXT<br /><em>FOOTPRINT.</em></h2>
          <p className="chapter-deck">First, we learn the ground.</p>
          <p className="body-copy">One day, new crews will walk these ridges.</p>
          <div className="final-actions"><a className="solid-link" href={modelUrl} target="_blank" rel="noreferrer">Explore the model <Arrow diagonal /></a><button className="text-link" onClick={() => goToChapter(0, reduced)}>Back to the start <span>↺</span></button></div>
          <p className="final-note">The next marks will be ours.</p>
        </article>
      </div>
    </main>

    <aside className="telemetry" aria-label="Scene status"><span className="telemetry-dot" /><span>{failed ? 'STATIC VIEW' : ready ? 'REAL-TIME RENDER' : 'LOADING LUNAR DATA'}</span><span className="telemetry-coord">TAURUS–LITTROW / STUDY SITE</span></aside>
    <nav className="chapter-nav" aria-label="Chapter navigation">
      <div className="nav-heading"><span>SIX CHAPTERS / LUNAR</span><span data-counter>01 / 06</span></div>
      <div className="nav-items">{chapters.map((chapter, index) => <button key={chapter.id} data-nav data-active={index === 0} onClick={() => goToChapter(index, reduced)} aria-label={`Chapter ${index + 1}: ${chapter.label}`}><span className="nav-number">0{index + 1}</span><span className="nav-label">{chapter.label}</span><span className="nav-track" /></button>)}</div>
    </nav>
    <div className="scroll-hint"><span className="scroll-line" /> SCROLL TO DESCEND</div>
    <footer className="footer"><span>Image credit: NASA <span className="footer-detail">/ Scientific Visualization Studio</span></span><span className="footer-art">PSR: NASA LOLA-derived data / colour and outlines: artistic</span><button onClick={() => setSources(true)}>Sources & credits ↗</button></footer>
    <div className="progress" aria-hidden="true"><div className="progress-fill" /></div>

    {sources && <dialog id="sources-dialog" onCancel={() => setSources(false)} onClick={(event) => { if (event.target === event.currentTarget) setSources(false) }}>
      <div className="dialog-inner"><div className="dialog-heading"><span className="eyebrow">SOURCES / FIELD NOTES</span><button autoFocus className="dialog-close" onClick={() => setSources(false)} aria-label="Close field notes">×</button></div>
        <h2>Sources &amp;<br /><em>field notes.</em></h2>
        <p>An independent lunar study, not an official NASA or IBM website. Terrain and imagery come from public observations. Framing, colour and narrative are artistic. This site loads no model weights and runs no inference.</p>
        <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer"><span>01 / NASA CGI Moon Kit<small>LROC colour imagery and LOLA elevation / locally hosted textures</small></span><Arrow diagonal /></a>
        <a href="https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO17_4" target="_blank" rel="noreferrer"><span>02 / LROC NAC surface data<small>Source: 0.6 m pixels, 2 m elevation posts / cropped, multilevel display</small></span><Arrow diagonal /></a>
        <a href="https://science.nasa.gov/resource/blue-marble-2002/" target="_blank" rel="noreferrer"><span>03 / NASA Blue Marble<small>Earth colour imagery / locally hosted texture</small></span><Arrow diagonal /></a>
        <a href={modelUrl} target="_blank" rel="noreferrer"><span>04 / NASA–IBM Lunar Foundation Model<small>Model weights and downstream tasks / Hugging Face</small></span><Arrow diagonal /></a>
        <a href="https://arxiv.org/abs/2609.13283" target="_blank" rel="noreferrer"><span>05 / Technical report<small>Multimodal-Multiresolution Foundation Model</small></span><Arrow diagonal /></a>
        <p className="polar-source"><a href="https://pgda.gsfc.nasa.gov/products/90" target="_blank" rel="noreferrer">Polar shadow data: NASA PGDA / LOLA · Barker et al. (2023) ↗</a></p>
        <p className="dialog-note">Terrain: global LOLA elevation, regional WAC and local NAC data. Relief is exaggerated in orbit and shown at metre scale near the surface. Pixel sizes and post spacing describe the source data, not model accuracy. Web assets are cropped, resampled and shown at multiple levels of detail; mobile imagery is reduced further.<br /><br />
          Art: Earth spans about 1.9° in the sky, but its direction and lighting are composed, not calculated for this site and date. Nearby rocks and fine surface texture are procedural. Rim glow is a cinematic effect, not a dense lunar atmosphere.<br /><br />
          Polar map: NASA PGDA / LOLA, Barker et al. (2023). Only permanently shadowed regions larger than 1 km² are shown. These are terrain-derived boundaries, not ice detections or model output. The LOLA relief backdrop uses simulated sunlight at 45° elevation and azimuth, not current illumination. Cyan colour, bright outlines and grid lines are artistic.<br /><br />
          Guides: the gold footprint, kilometre grid and scan band are illustrative. Altitudes belong to a virtual camera relative to the landing site, not spacecraft telemetry. Connecting lines are conceptual. The 1.96 M figure describes the pretraining corpus, not data loaded by this site.<br /><br />
          Image credit: NASA / NASA’s Scientific Visualization Studio.</p>
      </div>
    </dialog>}
  </>
}
