import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
const root='docs/navigation-gaze-review/clicks'
await fs.mkdir(root,{recursive:true})
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1200,height:800}})
// Capture the viewport directly: Playwright's document clip can go stale while
// the native scroll offset changes during a software-rendered frame.
const cdp=await page.context().newCDPSession(page)
const screenshot=async(path)=>{const {data}=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await fs.writeFile(path,Buffer.from(data,'base64'))}
const errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
const results=[]
try{
 await page.goto(process.env.LUNAR_REVIEW_URL??'http://127.0.0.1:4417')
 await page.locator('.universe.is-ready:not(.is-fallback)').waitFor()
 await page.evaluate(()=>document.fonts.ready)
 await page.evaluate(()=>{
  window.__navigationFrames=[]
  const sample=()=>{
   if(window.__recordNavigation){
    const root=document.documentElement,canvas=document.querySelector('canvas')
    window.__navigationFrames.push({time:performance.now(),story:Number(getComputedStyle(root).getPropertyValue('--journey')),navigation:root.dataset.navigation,elapsed:Number(root.dataset.navigationElapsed),...canvas?.dataset})
   }
   requestAnimationFrame(sample)
  };requestAnimationFrame(sample)
 })
 let from=0
 for(const [i,to] of [1,2,3,4,5,4,3,2,1,0,2,0].entries()){
  const name=`${String(i+1).padStart(2,'0')}-${from+1}-to-${to+1}`,folder=`${root}/${name}`
  await fs.mkdir(folder,{recursive:true})
  await page.evaluate(()=>{window.__navigationFrames=[];window.__recordNavigation=true})
  const started=Date.now();await page.locator('[data-nav]').nth(to).click()
  const planned=Number(await page.locator('html').getAttribute('data-navigation-duration'))
  const frames=[];let n=0
  do{
   const file=`${String(n++).padStart(3,'0')}.png`
   await screenshot(`${folder}/${file}`)
   const state=await page.evaluate(()=>({story:Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')),navigation:document.documentElement.dataset.navigation,...document.querySelector('canvas')?.dataset}))
   frames.push({file,wallMs:Date.now()-started,...state})
   if(state.navigation==='idle')break
   if(Date.now()-started>120000)throw Error(`Navigation stalled: ${name}`)
   await page.waitForTimeout(400)
  }while(true)
  await page.waitForFunction(()=>Math.abs(Number(document.querySelector('canvas')?.dataset.flightProgress)-Number(document.documentElement.dataset.navigationTo))<.0004)
  await screenshot(`${folder}/settled.png`)
  const telemetry=await page.evaluate(()=>{window.__recordNavigation=false;return window.__navigationFrames})
  const result={from,to,plannedMs:planned,wallMs:Date.now()-started,frames,telemetry,errors:[...errors]}
  await fs.writeFile(`${folder}/frames.json`,JSON.stringify(result,null,2))
  results.push({name,from,to,plannedMs:planned,wallMs:result.wallMs,screenshots:frames.length+1,telemetryFrames:telemetry.length})
  console.log(JSON.stringify(results.at(-1)))
  from=to
 }
 await fs.writeFile(`${root}/summary.json`,JSON.stringify({results,errors},null,2))
 if(errors.length)throw Error(JSON.stringify(errors))
}finally{await browser.close()}
