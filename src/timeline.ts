import { useEffect, useRef } from 'react'

export const chapters = [
  { id: 'arrival', position: 0, label: '启程', code: '01 / OBSERVE' },
  { id: 'terrain', position: 0.25, label: '月面档案', code: '02 / TOPOGRAPHY' },
  { id: 'shadow', position: 0.5, label: '阴影之下', code: '03 / POLAR FRONTIER' },
  { id: 'intelligence', position: 0.75, label: '连接线索', code: '04 / FOUNDATION MODEL' },
  { id: 'horizon', position: 1, label: '新的地平线', code: '05 / DISCOVER' },
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
      const nearest = Math.round(p * 4)
      panels.forEach((panel, i) => {
        const distance = (p - chapters[i].position) * 4
        const opacity = 1 - smooth((Math.abs(distance) - 0.26) / 0.43)
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
      if (counter) counter.textContent = `0${nearest + 1} / 05`
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
