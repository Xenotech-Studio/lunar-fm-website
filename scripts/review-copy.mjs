// Real wheel input; record every frame in both directions, including copy bounds.
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import { storyToScroll } from '../src/timeline.ts'
const mobile=process.argv.includes('--mobile')
const root=`docs/copy-review/${mobile?'mobile':'desktop'}`
const points=process.env.REVIEW_POINTS?process.env.REVIEW_POINTS.split(',').map(Number):mobile?[0,4,28,30,32,34.5,38,40,48,52,53.5,56,60,66,68,72.5,74,76,80,84,88,92,96,100]:[...new Set([...Array.from({length:51},(_,i)=>i*2),30,31,33,34.5,35,37,39,41,53.5,67,69,71,72.5,73,75,77,83,85,97,99])].sort((a,b)=>a-b)
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1200,height:800}})
const errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
try {
await page.goto(process.env.LUNAR_REVIEW_URL??'http://127.0.0.1:4397')
await page.locator('.universe.is-ready:not(.is-fallback)').waitFor()
await page.evaluate(()=>document.fonts.ready)
for(const direction of (process.env.REVIEW_DIRECTION?[process.env.REVIEW_DIRECTION]:['forward','reverse'])){
 const folder=`${root}/${direction}`;await fs.mkdir(folder,{recursive:true});const frames=[]
 for(const n of direction==='reverse'?[...points].reverse():points){
  const destination=storyToScroll(n/100)
  await page.mouse.wheel(0,await page.evaluate(p=>(document.documentElement.scrollHeight-innerHeight)*p-scrollY,destination))
  await page.waitForFunction(p=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--journey'))-p)<.0003,n/100)
  await page.waitForFunction(()=>{const p=Number(getComputedStyle(document.documentElement).getPropertyValue('--journey'));return p<=.18||p>=.695||document.querySelector('canvas')?.dataset.surface==='ready'})
  await page.waitForFunction(()=>Math.abs(Number(document.querySelector('canvas')?.dataset.flightProgress)-Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))<.0003)
  await page.screenshot({path:`${folder}/${n}.png`})
  const state=await page.evaluate(()=>({
   ...document.querySelector('canvas').dataset,
   horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
   navigationTop:document.querySelector('.nav-heading').getBoundingClientRect().top,
   text:[...document.querySelectorAll('.chapter')].filter(e=>Number(getComputedStyle(e).opacity)>.5).flatMap(chapter=>[...chapter.querySelectorAll('h1,h2,p,.eyebrow,.data-pair,.surface-readout,.model-stat,.modality-tags,.final-actions')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height},outside:r.left<0||r.right>innerWidth||r.bottom>innerHeight}}))
  }))
  frames.push({storyProgress:n,scrollProgress:destination,...state})
  console.log(`${mobile?'mobile':'desktop'} ${direction} ${n}`)
 }
 const previous=process.env.REVIEW_POINTS?JSON.parse(await fs.readFile(`${folder}/frames.json`,'utf8').catch(()=>'{"frames":[],"errors":[]}')):{frames:[],errors:[]}
 const merged=[...new Map([...previous.frames,...frames].map(f=>[f.storyProgress,f])).values()].sort((a,b)=>direction==='forward'?a.storyProgress-b.storyProgress:b.storyProgress-a.storyProgress)
 await fs.writeFile(`${folder}/frames.json`,JSON.stringify({frames:merged,errors:[...previous.errors,...errors]},null,2))
}
await page.getByRole('button',{name:'观测档案',exact:false}).click()
await page.screenshot({path:`${root}/sources.png`})
await page.locator('dialog').evaluate(e=>e.scrollTop=e.scrollHeight)
await page.screenshot({path:`${root}/sources-bottom.png`})
if(errors.length)throw Error(JSON.stringify(errors))
} finally {await browser.close()}
