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
    <a className="skip-link" href="#journey">跳至月球叙事</a>
    <div className={`universe ${ready ? 'is-ready' : ''} ${failed ? 'is-fallback' : ''}`} aria-hidden="true">
      <div className="static-moon" style={{ backgroundImage: `url(${moonTexture})` }} />
      {!failed && <SceneBoundary onFailure={handleFailure}>
        <Suspense fallback={null}><LunarScene progress={progress} reduced={reduced} onReady={handleReady} onFailure={handleFailure} /></Suspense>
      </SceneBoundary>}
    </div>
    <div className="ambient-wash" aria-hidden="true" />
    <header className="header">
      <button className="brand" onClick={() => goToChapter(0, reduced)} aria-label="Lunar，返回开场"><Mark /><span>LUNAR<span className="brand-dot">.</span></span></button>
      <span className="header-note">AN EXPLORATION OF THE UNSEEN</span>
      <button className="source-trigger" onClick={() => setSources(true)}>任务档案 <span className="tiny-plus">+</span></button>
    </header>

    <main id="journey" className="journey" tabIndex={-1}>
      <div className="stage">
        <div className="edge-label" aria-hidden="true">EARTH’S ONLY NATURAL SATELLITE</div>
        <article className="chapter hero" data-chapter="0" aria-labelledby="title-arrival">
          <div className="eyebrow"><span className="status-dot" /> NASA–IBM LUNAR FOUNDATION MODEL</div>
          <h1 id="title-arrival">BEYOND<br />THE <em>VISIBLE.</em></h1>
          <p className="chinese-title">从观测，走向发现。</p>
          <p className="body-copy">我们仰望了数千年的月球，<br />仍有未被读懂的另一面。</p>
          <button className="journey-button" onClick={() => goToChapter(1, reduced)}><span>开启月球之旅</span><span className="circle-arrow"><Arrow /></span></button>
          <div className="hero-index"><span>384,400 <small>KM FROM HOME</small></span><span>ONE MOON.<br />COUNTLESS POSSIBILITIES.</span></div>
          <div className="moon-label"><span className="crosshair">+</span><div>LUNA / 001<br /><small>LROC × LOLA · SURFACE OBSERVATION</small></div></div>
        </article>

        <article className="chapter terrain" data-chapter="1" aria-labelledby="title-terrain" aria-hidden="true">
          <div className="eyebrow">02 — THE LUNAR ARCHIVE</div>
          <h2 id="title-terrain">EVERY SCAR.<br /><em>A STORY.</em></h2>
          <p className="chinese-title">每一道痕迹，都是时间。</p>
          <p className="body-copy">没有风雨抹平过去。陨石坑、山脊与月海，<br className="desktop-break" />把数十亿年的历史留在表面。<br />让光掠过月面，地形开始显影。</p>
          <div className="data-pair"><div><strong>1 <small>m/px</small></strong><span>NAC 米级观测</span></div><div><strong>100 <small>m/px</small></strong><span>WAC 区域视野</span></div></div>
          <p className="micro-note">模型训练的两种光学尺度 · 本场景使用全球 LRO 贴图</p>
          <div className="terrain-marker"><span className="marker-ring" /><span>TOPOGRAPHIC MEMORY<br /><small>LOLA / ELEVATION FIELD</small></span></div>
        </article>

        <article className="chapter polar right-aligned" data-chapter="2" aria-labelledby="title-shadow" aria-hidden="true">
          <div className="eyebrow">03 — THE POLAR FRONTIER</div>
          <h2 id="title-shadow">INTO<br /><em>THE SHADOW.</em></h2>
          <p className="chinese-title">光照不到的地方，线索仍在。</p>
          <p className="body-copy">在月球极区，长久的阴影可能保存水冰。<br />把温度、坡度与地形放在一起，<br />寻找值得进一步探索的地方。</p>
          <div className="polar-signal"><span className="signal-line" /><span>POLAR PROSPECTIVITY<br /><small>从环境线索，推测潜力</small></span></div>
          <p className="micro-note">蓝色区域为艺术示意，并非冰分布或模型预测。<br />冰潜力评估不等同于实测冰含量。</p>
          <div className="polar-coordinate">90° S <span>THE UNSEEN FRONTIER</span></div>
        </article>

        <article className="chapter intelligence" data-chapter="3" aria-labelledby="title-intelligence" aria-hidden="true">
          <div className="eyebrow">04 — A SHARED REPRESENTATION</div>
          <h2 id="title-intelligence">MANY SIGNALS.<br /><em>ONE MOON.</em></h2>
          <p className="chinese-title">让分散的观测，彼此理解。</p>
          <p className="body-copy">NASA–IBM Lunar Foundation Model<br />将多任务、多尺度的月球观测连接起来，<br />为陨石坑、火山地貌与极区研究提供共同起点。</p>
          <div className="model-stat"><strong>1.96<span>M</span></strong><div>多模态切片包<br /><small>SOMBENCH PRETRAINING CORPUS</small></div></div>
          <div className="modality-tags"><span>OPTICAL</span><span>TERRAIN</span><span>THERMAL</span><span>GRAVITY</span></div>
          <div className="scan-label"><span /> CROSS-MODAL CORRELATION<br /><small>概念可视化 / 非实时推理</small></div>
        </article>

        <article className="chapter finale" data-chapter="4" aria-labelledby="title-horizon" aria-hidden="true">
          <div className="eyebrow">05 — THE NEXT HORIZON</div>
          <h2 id="title-horizon">A FAMILIAR MOON.<br /><em>A NEW PERSPECTIVE.</em></h2>
          <p className="chinese-title">同一轮月亮，新的看见。</p>
          <p className="body-copy">探索始于好奇，也始于开放。</p>
          <div className="final-actions"><a className="solid-link" href={modelUrl} target="_blank" rel="noreferrer">探索开放模型 <Arrow diagonal /></a><button className="text-link" onClick={() => goToChapter(0, reduced)}>重新启程 <span>↺</span></button></div>
          <p className="final-note">以 NASA 的真实观测为底色，向下一次发现致意。</p>
        </article>
      </div>
    </main>

    <aside className="telemetry" aria-label="场景状态"><span className="telemetry-dot" /><span>{failed ? 'STATIC EXPLORATION' : ready ? 'LRO SURFACE / LIVE RENDER' : 'LOADING LUNAR DATA'}</span><span className="telemetry-coord">23.4° N &nbsp; 45.0° E</span></aside>
    <nav className="chapter-nav" aria-label="章节导航">
      <div className="nav-heading"><span>THE JOURNEY</span><span data-counter>01 / 05</span></div>
      <div className="nav-items">{chapters.map((chapter, index) => <button key={chapter.id} data-nav data-active={index === 0} onClick={() => goToChapter(index, reduced)} aria-label={`第${index + 1}幕：${chapter.label}`}><span className="nav-number">0{index + 1}</span><span className="nav-label">{chapter.label}</span><span className="nav-track" /></button>)}</div>
    </nav>
    <div className="scroll-hint"><span className="scroll-line" /> SCROLL TO EXPLORE</div>
    <footer className="footer"><span>Image credit: NASA <span className="footer-detail">/ Scientific Visualization Studio</span></span><span className="footer-art">独立艺术项目 · 辉光为光学艺术效果</span><button onClick={() => setSources(true)}>数据与说明 ↗</button></footer>
    <div className="progress" aria-hidden="true"><div className="progress-fill" /></div>

    {sources && <dialog id="sources-dialog" onCancel={() => setSources(false)} onClick={(event) => { if (event.target === event.currentTarget) setSources(false) }}>
      <div className="dialog-inner"><div className="dialog-heading"><span className="eyebrow">MISSION ARCHIVE / 2026</span><button autoFocus className="dialog-close" onClick={() => setSources(false)} aria-label="关闭任务档案">×</button></div>
        <h2>真实的数据。<br /><em>开放的视野。</em></h2>
        <p>本作品是围绕月球遥感与基础模型的独立艺术展示，非 NASA 或 IBM 官方网站。没有下载机器学习权重，也没有运行模型推理。</p>
        <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer"><span>01 / NASA CGI Moon Kit<small>LROC 彩色影像与 LOLA 高程 · 本地纹理</small></span><Arrow diagonal /></a>
        <a href={modelUrl} target="_blank" rel="noreferrer"><span>02 / NASA–IBM Lunar Foundation Model<small>开放模型与下游任务集合</small></span><Arrow diagonal /></a>
        <a href="https://arxiv.org/abs/2609.13283" target="_blank" rel="noreferrer"><span>03 / 技术报告<small>Multimodal-Multiresolution Foundation Model</small></span><Arrow diagonal /></a>
        <p className="dialog-note">月面高程适度夸张以呈现地貌；边缘辉光为电影化光学效果，不代表月球拥有浓密大气。极区色彩、扫描线与经纬网为示意。画面坐标为设计标识，不是实时定位。Image credit: NASA / NASA’s Scientific Visualization Studio.</p>
      </div>
    </dialog>}
  </>
}
