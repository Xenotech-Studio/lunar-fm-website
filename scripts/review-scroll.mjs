import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
const folder=process.argv[2] ?? 'docs/pace-detail-review/forward'
const step=Number(process.argv[3]??1)
const start=Number(process.env.REVIEW_START??20),end=Number(process.env.REVIEW_END??66)
const storyMode=process.env.REVIEW_MODE==='story'
const selected=process.env.REVIEW_POINTS?.split(',').map(Number)
const points=selected??Array.from({length:Math.floor((end-start)/step)+1},(_,i)=>Number((start+i*step).toFixed(2)))
const reverse=process.argv.includes('--reverse')
await fs.mkdir(folder,{recursive:true})
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1200,height:800}})
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto(process.env.LUNAR_REVIEW_URL??'http://127.0.0.1:4276');await page.waitForTimeout(2000)
const frames=[]
for(const n of (reverse?[...points].reverse():points)){
 const target=Number(n.toFixed(2))
 const destination=await page.evaluate(({target,storyMode})=>{
  const extra=(p)=>{const F=(t)=>t*t*t-.5*t*t*t*t;if(p<=.18)return 0;if(p<.22)return .04*F((p-.18)/.04);if(p<=.48)return .02+p-.22;if(p<.52){const t=(p-.48)/.04;return .28+.04*(t-F(t))}return .30}
  return storyMode?(target/100+1.5*extra(target/100))/1.45:target/100
 },{target,storyMode})
 const delta=await page.evaluate(n=>(document.documentElement.scrollHeight-innerHeight)*n-scrollY,destination)
 await page.mouse.wheel(0,delta)
 await page.waitForFunction(n=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--scroll-progress'))-n)<.00025,destination)
 await page.waitForTimeout(120)
 if(destination>.18)await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.surface==='ready')
 await page.waitForFunction(()=>Math.abs(Number(document.querySelector('canvas')?.dataset.flightProgress)-Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))<.0003)
 await page.screenshot({path:`${folder}/${target}.png`})
 frames.push({progress:target,mode:storyMode?'story':'scroll',scrollProgress:destination,...await page.locator('canvas').evaluate(e=>({...e.dataset}))})
}
await fs.writeFile(`${folder}/frames.json`,JSON.stringify({frames,errors},null,2))
console.log(JSON.stringify({frames:frames.length,errors}))
await browser.close()
if(errors.length)process.exitCode=1
