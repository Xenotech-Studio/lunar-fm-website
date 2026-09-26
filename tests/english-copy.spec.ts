import { test, expect } from '@playwright/test'
import { chapters } from '../src/timeline'

test('English-only copy, metadata, accessible names and responsive text bounds',async({page})=>{
 // Typography checks do not need the GPU; live WebGL is covered by journey tests and screenshot review.
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.startsWith('webgl'))return null;return original.apply(this,[type,...args] as Parameters<typeof original>)} as typeof original})
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await expect(page.locator('.universe')).toHaveClass(/is-ready/)
 await expect(page.locator('html')).toHaveAttribute('lang','en')
 await expect(page).toHaveTitle('LUNAR — See it closer')
 for(const key of ['description','og:title','og:description','twitter:title','twitter:description']){
  const value=await page.locator(`meta[name="${key}"],meta[property="${key}"]`).getAttribute('content')
  expect(value).toBeTruthy();expect(value).not.toMatch(/\p{Script=Han}/u)
 }
 for(const viewport of [{width:1200,height:800},{width:1280,height:720},{width:390,height:844},{width:375,height:667}]){
  await page.setViewportSize(viewport)
  for(let i=0;i<chapters.length;i++){
   await page.locator('[data-nav]').nth(i).click()
   await expect(page.locator(`.chapter[data-chapter="${i}"]`)).toHaveAttribute('aria-hidden','false')
   const result=await page.evaluate(i=>{
    const nav=document.querySelector('.chapter-nav')!.getBoundingClientRect()
    const nodes=[...document.querySelectorAll(`.chapter[data-chapter="${i}"] h1,.chapter[data-chapter="${i}"] h2,.chapter[data-chapter="${i}"] .chapter-deck,.chapter[data-chapter="${i}"] .body-copy,.chapter[data-chapter="${i}"] .micro-note,.chapter[data-chapter="${i}"] .final-actions,.chapter[data-chapter="${i}"] .surface-readout,.chapter[data-chapter="${i}"] .surface-caption,.chapter[data-chapter="${i}"] .surface-disclosure`)]
    return nodes.filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,left:r.left,right:r.right,bottom:r.bottom,navTop:nav.top}})
   },i)
   for(const r of result){expect(r.left,r.text??'').toBeGreaterThanOrEqual(0);expect(r.right,r.text??'').toBeLessThanOrEqual(viewport.width);expect(r.bottom,r.text??'').toBeLessThan(r.navTop)}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width)
  }
 }
 await page.getByRole('button',{name:/^Field notes/}).click()
 await expect(page.locator('dialog')).toBeVisible()
 await expect(page.locator('dialog')).toContainText('not model accuracy')
 await expect(page.locator('dialog')).toContainText('not ice detections or model output')
 const allCopy=await page.evaluate(()=>document.body.textContent+' '+[...document.querySelectorAll('[aria-label],[title],[alt]')].map(e=>[e.getAttribute('aria-label'),e.getAttribute('title'),e.getAttribute('alt')].join(' ')).join(' '))
 expect(allCopy).not.toMatch(/\p{Script=Han}/u)
 await page.getByRole('button',{name:'Close field notes'}).click()
})
