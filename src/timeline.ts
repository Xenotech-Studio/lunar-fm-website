import { useEffect, useRef } from 'react'

export const chapters = [
  { id: 'arrival', position: 0, label: '启程', code: '01 / OBSERVE' },
  { id: 'terrain', position: 0.18, label: '月面档案', code: '02 / TOPOGRAPHY' },
  { id: 'surface', position: 0.50, label: '立于月面', code: '03 / SURFACE CONTACT' },
  { id: 'shadow', position: 0.68, label: '阴影之下', code: '04 / POLAR FRONTIER' },
  { id: 'intelligence', position: 0.84, label: '连接线索', code: '05 / FOUNDATION MODEL' },
  { id: 'horizon', position: 1, label: '新的地平线', code: '06 / DISCOVER' },
] as const

export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t) }
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
export function sample(values: number[], p: number) {
  const t = clamp(p) * (values.length - 1)
  const i = Math.min(Math.floor(t), values.length - 2)
  return mix(values[i], values[i + 1], smooth(t - i))
}
export function goToChapter(index: number, reduced: boolean) {
  const range = document.documentElement.scrollHeight - innerHeight
  window.scrollTo({ top: range * chapters[index].position, behavior: reduced ? 'instant' : 'smooth' })
}

// Native page scrolling stays accessible. Only the visual playhead is damped.
// One clock drives both DOM and WebGL so narrative and camera never drift apart.
export function useScrollDirector(reduced: boolean) {
  const progress = useRef(0)
  useEffect(() => {
    let target = 0, frame = 0, previous = performance.now()
    const read = () => {
      target = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))
    }
    read()
    progress.current = target
    const panels = [...document.querySelectorAll<HTMLElement>('.chapter[data-chapter]')]
    const tabs = [...document.querySelectorAll<HTMLElement>('[data-nav]')]
    const bar = document.querySelector<HTMLElement>('.progress-fill')
    const counter = document.querySelector<HTMLElement>('[data-counter]')
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05)
      previous = now
      progress.current += (target - progress.current) * (reduced ? 1 : 1 - Math.exp(-dt * 6.5))
      const p = progress.current
      const nearest = chapters.reduce((best, chapter, i) => Math.abs(p - chapter.position) < Math.abs(p - chapters[best].position) ? i : best, 0)
      panels.forEach((panel, i) => {
        const span = p < chapters[i].position ? chapters[i].position - (chapters[i - 1]?.position ?? -0.18) : (chapters[i + 1]?.position ?? 1.18) - chapters[i].position
        const distance = (p - chapters[i].position) / span
        const opacity = 1 - smooth((Math.abs(distance) - 0.20) / 0.29)
        panel.style.opacity = `${opacity}`
        panel.style.transform = `translate3d(0, ${reduced ? 0 : -distance * 46}px, 0)`
        panel.style.visibility = opacity < 0.001 ? 'hidden' : 'visible'
        panel.inert = i !== nearest
        panel.setAttribute('aria-hidden', `${i !== nearest}`)
      })
      tabs.forEach((tab, i) => {
        tab.dataset.active = `${i === nearest}`
        if (i === nearest) tab.setAttribute('aria-current', 'step')
        else tab.removeAttribute('aria-current')
      })
      if (bar) bar.style.transform = `scaleX(${p})`
      if (counter) counter.textContent = `0${nearest + 1} / 06`
      document.documentElement.style.setProperty('--journey', `${p}`)
      document.documentElement.dataset.chapter = `${nearest}`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    addEventListener('scroll', read, { passive: true })
    addEventListener('resize', read)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', read); removeEventListener('resize', read) }
  }, [reduced])
  return progress
}

// Preserve the five original orbital poses around the inserted surface excursion.
export function orbitProgress(p:number) {
 const anchors=[0,.18,.68,.84,1]
 for(let i=0;i<4;i++)if(p<=anchors[i+1])return (i+(p-anchors[i])/(anchors[i+1]-anchors[i]))/4
 return 1
}
