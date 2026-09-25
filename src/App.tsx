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
      <span className="header-note">NOTES FROM THE MOON</span>
      <button className="source-trigger" onClick={() => setSources(true)}>观测档案 <span className="tiny-plus">+</span></button>
    </header>

    <main id="journey" className="journey" tabIndex={-1}>
      <div className="stage">
        <div className="edge-label" aria-hidden="true">ONE MOON / SIX PASSAGES</div>
        <article className="chapter hero" data-chapter="0" aria-labelledby="title-arrival">
          <div className="eyebrow"><span className="status-dot" /> NASA–IBM LUNAR FOUNDATION MODEL</div>
          <h1 id="title-arrival">STILL<br /><em>WITH US.</em></h1>
          <p className="chinese-title">月光落在很老的山上。</p>
          <p className="body-copy">远处，只是一弯白。<br />近处，山脊投下长长的影子。</p>
          <button className="journey-button" onClick={() => goToChapter(1, reduced)}><span>靠近月球</span><span className="circle-arrow"><Arrow /></span></button>
          <div className="hero-index"><span>384,400 <small>KM / MEAN DISTANCE</small></span><span>THE DISTANCE<br />BETWEEN TWO WORLDS.</span></div>
          <div className="moon-label"><span className="crosshair">+</span><div>LUNA / NEAR SIDE<br /><small>LROC / IMAGERY · LOLA / ELEVATION</small></div></div>
        </article>

        <article className="chapter terrain" data-chapter="1" aria-labelledby="title-terrain" aria-hidden="true">
          <div className="eyebrow">02 — THE LUNAR ARCHIVE</div>
          <h2 id="title-terrain">THE LONG<br /><em>RECORD.</em></h2>
          <p className="chinese-title">一道坑缘，叠着另一道。</p>
          <p className="body-copy">新痕落在旧痕上。<br />漫长的年月，留在起伏之间。</p>
          <div className="data-pair"><div><strong>20 <small>km</small></strong><span>设计悬停高度 · 相对落点</span></div><div><strong>4.7 × 12 <small>km</small></strong><span>NAC 高程覆盖范围</span></div></div>
          <p className="micro-note">地形据 LROC NAC / WAC 数据。金色范围框、公里网格与扫描为辅助示意，非实时遥测。</p>
          <div className="terrain-marker"><span className="marker-ring" /><span>TAURUS–LITTROW<br /><small>NAC / DEM FOOTPRINT</small></span></div>
        </article>

        <article className="chapter surface-contact" data-chapter="2" aria-labelledby="title-surface" aria-hidden="true">
          <div className="surface-heading"><div className="eyebrow">03 — TAURUS–LITTROW / 2.1 M</div>
          <h2 id="title-surface">A SMALL<br /><em>BLUE LIGHT.</em></h2>
          <p className="chinese-title">地平线那边，地球只有这么大。</p></div>
          <div className="surface-readout"><span className="surface-rule"/><div><strong>0.6 <small>m / px</small></strong><span>NAC 正射影像 · 源分辨率</span></div><div><strong>2 <small>m / post</small></strong><span>NAC 立体高程 · 源采样间距</span></div></div>
          <p className="surface-caption">TAURUS–LITTROW / WEST<br/><span>月面以上 2.1 米 · 设计眼高</span></p>
          <p className="surface-error" role="status">局部数据未载入。轨道视图仍可浏览。</p>
          <p className="surface-disclosure">地球方位为艺术构图 · 近景碎石为程序生成</p>
        </article>

        <article className="chapter polar right-aligned" data-chapter="3" aria-labelledby="title-shadow" aria-hidden="true">
          <div className="eyebrow">04 — THE SOUTH POLE</div>
          <h2 id="title-shadow">SUNLESS<br /><em>GROUND.</em></h2>
          <p className="chinese-title">坑底，日光长久缺席。</p>
          <p className="body-copy">低斜的太阳，越不过坑壁。<br />有些寒冷，或能留住水冰。</p>
          <div className="polar-signal"><span className="signal-line" /><span>MAPPED SHADOW<br /><small>LOLA / 永久阴影区</small></span></div>
          <p className="micro-note">边界据 NASA LOLA 推导，仅含面积大于 1 km² 的永久阴影区。<br />底图为模拟晕渲；青蓝配色与边界强调为艺术处理。<br />永久阴影不等于实测水冰；此图非模型预测。</p>
          <div className="polar-coordinate">80–90° S <span>PSR / AREA &gt; 1 km²</span></div>
        </article>

        <article className="chapter intelligence" data-chapter="4" aria-labelledby="title-intelligence" aria-hidden="true">
          <div className="eyebrow">05 — NASA–IBM / LUNAR FM</div>
          <h2 id="title-intelligence">IN THE<br /><em>SAME FRAME.</em></h2>
          <p className="chinese-title">同一处月面，留下不同的读数。</p>
          <p className="body-copy">影像、高程、温度与重力。<br />不同任务的记录，汇入同一个模型。</p>
          <div className="model-stat"><strong>1.96<span>M</span></strong><div>预训练切片包（约）<br /><small>SOMBENCH PRETRAINING CORPUS</small></div></div>
          <div className="modality-tags"><span>影像 / OPTICAL</span><span>高程 / TERRAIN</span><span>热红外 / THERMAL</span><span>重力 / GRAVITY</span></div>
          <div className="scan-label"><span /> OBSERVATIONS / ALIGNED<br /><small>连线为概念示意 · 本站未运行模型</small></div>
        </article>

        <article className="chapter finale" data-chapter="5" aria-labelledby="title-horizon" aria-hidden="true">
          <div className="eyebrow">06 — BACK TO THE NIGHT</div>
          <h2 id="title-horizon">UNDER<br /><em>THIS MOON.</em></h2>
          <p className="chinese-title">再抬头时，记得那些山谷。</p>
          <p className="body-copy">它们仍在今晚的月光里。</p>
          <div className="final-actions"><a className="solid-link" href={modelUrl} target="_blank" rel="noreferrer">查看模型档案 <Arrow diagonal /></a><button className="text-link" onClick={() => goToChapter(0, reduced)}>回到开场 <span>↺</span></button></div>
          <p className="final-note">观测来自远方，数据留在这里。</p>
        </article>
      </div>
    </main>

    <aside className="telemetry" aria-label="场景状态"><span className="telemetry-dot" /><span>{failed ? '静态视图 / STATIC' : ready ? '月面 / 实时渲染' : '月面数据载入中'}</span><span className="telemetry-coord">TAURUS–LITTROW / STUDY SITE</span></aside>
    <nav className="chapter-nav" aria-label="章节导航">
      <div className="nav-heading"><span>六幕 / LUNAR</span><span data-counter>01 / 06</span></div>
      <div className="nav-items">{chapters.map((chapter, index) => <button key={chapter.id} data-nav data-active={index === 0} onClick={() => goToChapter(index, reduced)} aria-label={`第${index + 1}幕：${chapter.label}`}><span className="nav-number">0{index + 1}</span><span className="nav-label">{chapter.label}</span><span className="nav-track" /></button>)}</div>
    </nav>
    <div className="scroll-hint"><span className="scroll-line" /> 向下滚动 / SCROLL</div>
    <footer className="footer"><span>Image credit: NASA <span className="footer-detail">/ Scientific Visualization Studio</span></span><span className="footer-art">PSR：NASA LOLA 推导 · 配色与边界强调：艺术处理</span><button onClick={() => setSources(true)}>来源与标注 ↗</button></footer>
    <div className="progress" aria-hidden="true"><div className="progress-fill" /></div>

    {sources && <dialog id="sources-dialog" onCancel={() => setSources(false)} onClick={(event) => { if (event.target === event.currentTarget) setSources(false) }}>
      <div className="dialog-inner"><div className="dialog-heading"><span className="eyebrow">SOURCES / FIELD NOTES</span><button autoFocus className="dialog-close" onClick={() => setSources(false)} aria-label="关闭观测档案">×</button></div>
        <h2>来源与<br /><em>画面注记。</em></h2>
        <p>独立月球影像作品，非 NASA 或 IBM 官方网站。地形与影像取自公开观测；构图、配色与叙事为艺术处理。本站未加载模型权重，未运行推理。</p>
        <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer"><span>01 / NASA CGI Moon Kit<small>LROC 彩色影像与 LOLA 高程 · 本地纹理</small></span><Arrow diagonal /></a>
        <a href="https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO17_4" target="_blank" rel="noreferrer"><span>02 / LROC NAC 地表数据<small>源数据：0.6 米 / 像素影像、2 米高程采样 · 裁切分级显示</small></span><Arrow diagonal /></a>
        <a href="https://science.nasa.gov/resource/blue-marble-2002/" target="_blank" rel="noreferrer"><span>03 / NASA Blue Marble<small>地球彩色影像 · 本地纹理</small></span><Arrow diagonal /></a>
        <a href={modelUrl} target="_blank" rel="noreferrer"><span>04 / NASA–IBM Lunar Foundation Model<small>模型权重与下游任务 · Hugging Face</small></span><Arrow diagonal /></a>
        <a href="https://arxiv.org/abs/2609.13283" target="_blank" rel="noreferrer"><span>05 / 技术报告<small>Multimodal-Multiresolution Foundation Model</small></span><Arrow diagonal /></a>
        <p className="polar-source"><a href="https://pgda.gsfc.nasa.gov/products/90" target="_blank" rel="noreferrer">极区 PSR 数据：NASA PGDA / LOLA · Barker et al. (2023) ↗</a></p>
        <p className="dialog-note">全球高程据 LOLA，局部据 WAC / NAC；轨道段起伏适度夸张，贴地段按米制呈现。标注分辨率属于源数据，网页使用裁切、降采样与分级纹理。地球视直径约 1.9°，方位经过艺术调整，并非该地点星历。近处碎石与微表面为程序化补充。边缘辉光为电影化光学效果，不代表月球拥有浓密大气。极区边界来自 NASA PGDA / LOLA（Barker et al., 2023），仅显示面积大于 1 km² 的永久阴影区，不是水冰探测或模型输出；底图为同源 LOLA 模拟晕渲（太阳高度 / 方位各 45°），不是此刻的真实光照；青蓝配色、边界强调、扫描线与经纬网为艺术处理。金色范围框、公里网格与扫描为辅助示意；高度为虚拟镜头相对落点的读数，非航天器遥测。1.96 M 指预训练语料规模，非本站加载量。Image credit: NASA / NASA’s Scientific Visualization Studio.</p>
      </div>
    </dialog>}
  </>
}
