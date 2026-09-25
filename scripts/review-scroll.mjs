import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import { storyToScroll } from '../src/timeline.ts'
const folder=process.argv[2] ?? 'docs/pace-detail-review/forward'
const step=Number(process.argv[3]??1)
const start=Number(process.env.REVIEW_START??20),end=Number(process.env.REVIEW_END??66)
const storyMode=process.env.REVIEW_MODE==='story'
const selected=process.env.REVIEW_POINTS?.split(',').map(Number)
const points=selected??Array.from({length:Math.floor((end-start)/step)+1},(_,i)=>Number((start+i*step).toFixed(2)))
const reverse=process.argv.includes('--reverse')
await fs.mkdir(folder,{recursive:true})
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:process.env.REVIEW_MOBILE?{width:390,height:844}:{width:1200,height:800}})
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto(process.env.LUNAR_REVIEW_URL??'http://127.0.0.1:4276');await page.locator('.universe.is-ready:not(.is-fallback)').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2000)
const frames=[]
for(const n of (reverse?[...points].reverse():points)){
 const target=Number(n.toFixed(2))
 const destination=storyMode?storyToScroll(target/100):target/100
 const delta=await page.evaluate(n=>(document.documentElement.scrollHeight-innerHeight)*n-scrollY,destination)
 await page.mouse.wheel(0,delta)
 await page.waitForFunction(n=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--scroll-progress'))-n)<.00025,destination)
 await page.waitForTimeout(120)
 await page.waitForFunction(()=>{const p=Number(getComputedStyle(document.documentElement).getPropertyValue('--journey'));return p<=.18||p>=.695||document.querySelector('canvas')?.dataset.surface==='ready'})
 await page.waitForFunction(()=>Math.abs(Number(document.querySelector('canvas')?.dataset.flightProgress)-Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))<.0003)
 await page.screenshot({path:`${folder}/${target}.png`})
 frames.push({progress:target,mode:storyMode?'story':'scroll',scrollProgress:destination,...await page.locator('canvas').evaluate(e=>({...e.dataset}))})
}
await fs.writeFile(`${folder}/frames.json`,JSON.stringify({frames,errors},null,2))
console.log(JSON.stringify({frames:frames.length,errors}))
await browser.close()
if(errors.length)process.exitCode=1
