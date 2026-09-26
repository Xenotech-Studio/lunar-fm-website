import { useEffect, useRef } from 'react'
import { navigationPlan, navigationSample } from './navigation.ts'

export const chapters = [
  { id: 'arrival', position: 0, label: 'Orbit', code: '01 / OBSERVE' },
  { id: 'terrain', position: 0.345, label: 'Survey', code: '02 / TOPOGRAPHY' },
  { id: 'surface', position: 0.535, label: 'Surface', code: '03 / SURFACE CONTACT' },
  { id: 'shadow', position: 0.68, label: 'Shadow', code: '04 / POLAR FRONTIER' },
  { id: 'intelligence', position: 0.84, label: 'Model', code: '05 / FOUNDATION MODEL' },
  { id: 'horizon', position: 1, label: 'Future', code: '06 / DISCOVER' },
] as const

export const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t) }
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
export function sample(values: number[], p: number) {
  const t = clamp(p) * (values.length - 1)
  const i = Math.min(Math.floor(t), values.length - 2)
  return mix(values[i], values[i + 1], smooth(t - i))
}
// Integral of a smooth window: ramps at 18–22% and 48–52% story progress.
// Outside that window physical travel per story unit stays exactly as before.
export const SCROLL_SCALE = 1.65
function extraTravel(p:number) {
 const F=(t:number)=>t*t*t-.5*t*t*t*t
 if(p<=.18)return 0
 if(p<.22)return .04*F((p-.18)/.04)
 if(p<=.48)return .02+p-.22
 if(p<.52){const t=(p-.48)/.04;return .28+.04*(t-F(t))}
 return .30
}
// Add 160 svh around the survey; all other physical scroll budgets stay intact.
function surveyTravel(p:number){
 const F=(t:number)=>t*t*t-.5*t*t*t*t
 if(p<=.29)return 0
 if(p<.31)return .02*F((p-.29)/.02)
 if(p<=.39)return .01+p-.31
 if(p<.41){const t=(p-.39)/.02;return .09+.02*(t-F(t))}
 return .10
}
export const surveyWeight=(p:number)=>smooth((p-.30)/.03)*(1-smooth((p-.37)/.035))
export const storyToScroll=(p:number)=>(clamp(p)+1.5*extraTravel(clamp(p))+2*surveyTravel(clamp(p)))/SCROLL_SCALE
export function scrollToStory(p:number) {
 let lo=0,hi=1
 for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(storyToScroll(mid)<p)lo=mid;else hi=mid}
 return (lo+hi)/2
}
export function goToChapter(index: number, reduced: boolean) {
  if (!chapters[index]) return
  window.dispatchEvent(new CustomEvent('lunar:navigate', { detail: { index, reduced } }))
}

// Native page scrolling stays accessible. Only the visual playhead is damped.
// One clock drives both DOM and WebGL so narrative and camera never drift apart.
export function useScrollDirector(reduced: boolean) {
  const progress = useRef(0)
  useEffect(() => {
    let target = 0, frame = 0, previous = performance.now()
    let navigation: { plan: ReturnType<typeof navigationPlan>; elapsed: number } | null = null
    const root = document.documentElement
    root.dataset.navigation = 'idle'
    const place = (p:number) => window.scrollTo({top: storyToScroll(p) * Math.max(1, root.scrollHeight-innerHeight), behavior:'instant'})
    const cancelNavigation = () => {
      if (!navigation) return
      navigation = null
      target = progress.current
      place(target)
      root.dataset.navigation = 'idle'
    }
    const navigate = (event:Event) => {
      const {index, reduced: instant} = (event as CustomEvent<{index:number;reduced:boolean}>).detail
      if (!chapters[index]) return
      const plan = navigationPlan(progress.current, chapters[index].position)
      navigation = null
      root.dataset.navigationDuration = String(plan.duration)
      root.dataset.navigationFrom = String(plan.from)
      root.dataset.navigationTo = String(plan.to)
      root.dataset.navigationElapsed = '0'
      if (instant || reduced || !plan.duration) {
        target = plan.to; progress.current = target; place(target)
        root.dataset.navigation = 'idle'
      } else {
        // Start at the visible playhead, including when another click retargets.
        target = plan.from; place(target)
        navigation = {plan, elapsed:0}
        previous = performance.now()
        root.dataset.navigation = 'running'
      }
    }
    const keyControl = (event:KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Escape'].includes(event.key)) cancelNavigation()
    }
    const resize = () => { cancelNavigation(); read() }
    const visibility = () => { previous = performance.now() }
    const read = () => {
      target = scrollToStory(clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)))
    }
    read()
    progress.current = target
    const panels = [...document.querySelectorAll<HTMLElement>('.chapter[data-chapter]')]
    const tabs = [...document.querySelectorAll<HTMLElement>('[data-nav]')]
    const bar = document.querySelector<HTMLElement>('.progress-fill')
    const counter = document.querySelector<HTMLElement>('[data-counter]')
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - previous)
      const dt = Math.min(elapsed / 1000, 0.05)
      previous = now
      if (navigation) {
        // Never skip seconds of flight after a hidden tab or a long main-thread stall.
        navigation.elapsed += Math.min(elapsed, 250)
        target = navigationSample(navigation.plan, navigation.elapsed)
        place(target)
        root.dataset.navigationElapsed = String(Math.min(navigation.elapsed, navigation.plan.duration))
        if (navigation.elapsed >= navigation.plan.duration) {
          navigation = null
          root.dataset.navigation = 'idle'
        }
      }
      progress.current += (target - progress.current) * (reduced ? 1 : 1 - Math.exp(-dt * 6.5))
      const p = progress.current
      const nearest = chapters.reduce((best, chapter, i) => Math.abs(p - chapter.position) < Math.abs(p - chapters[best].position) ? i : best, 0)
      panels.forEach((panel, i) => {
        const span = p < chapters[i].position ? chapters[i].position - (chapters[i - 1]?.position ?? -0.18) : (chapters[i + 1]?.position ?? 1.18) - chapters[i].position
        const distance = (p - chapters[i].position) / span
        const opacity = i===1 ? smooth((p-.295)/.035)*(1-smooth((p-.375)/.035)) : i===3 && p>=.68 ? 1-smooth((p-.725)/.035) : 1 - smooth((Math.abs(distance) - 0.20) / 0.29)
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
      document.documentElement.style.setProperty('--scroll-progress', `${storyToScroll(p)}`)
      document.documentElement.dataset.chapter = `${nearest}`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    addEventListener('scroll', read, { passive: true })
    addEventListener('resize', resize)
    addEventListener('lunar:navigate', navigate)
    addEventListener('wheel', cancelNavigation, {passive:true})
    addEventListener('touchstart', cancelNavigation, {passive:true})
    addEventListener('pointerdown', cancelNavigation, {passive:true})
    addEventListener('keydown', keyControl)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', read); removeEventListener('resize', resize)
      removeEventListener('lunar:navigate', navigate)
      removeEventListener('wheel', cancelNavigation); removeEventListener('touchstart', cancelNavigation)
      removeEventListener('pointerdown', cancelNavigation); removeEventListener('keydown', keyControl)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [reduced])
  return progress
}

// Preserve the five original orbital poses around the inserted surface excursion.
export function orbitProgress(p:number) {
 const anchors=[0,.18,.68,.84,1]
 for(let i=0;i<4;i++)if(p<=anchors[i+1])return (i+(p-anchors[i])/(anchors[i+1]-anchors[i]))/4
 return 1
}
