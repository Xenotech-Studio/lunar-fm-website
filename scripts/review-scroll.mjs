import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
const folder=process.argv[2] ?? 'docs/transition-review/after'
const step=Number(process.argv[3]??1)
const reverse=process.argv.includes('--reverse')
await fs.mkdir(folder,{recursive:true})
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1200,height:800}})
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:4173');await page.waitForTimeout(2000)
const frames=[]
for(let n=reverse?66:20;reverse?n>=20-.001:n<=66+.001;n+=reverse?-step:step){
 const target=Number(n.toFixed(2))
 const delta=await page.evaluate(n=>(document.documentElement.scrollHeight-innerHeight)*n/100-scrollY,target)
 await page.mouse.wheel(0,delta)
 await page.waitForFunction(n=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--journey'))-n/100)<.00025,target)
 await page.waitForTimeout(120)
 if(target>25)await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.surface==='ready')
 await page.waitForFunction(n=>Math.abs(Number(document.querySelector('canvas')?.dataset.flightProgress)-n/100)<.0003,target)
 await page.screenshot({path:`${folder}/${target}.png`})
 frames.push({progress:target,...await page.locator('canvas').evaluate(e=>({...e.dataset}))})
}
await fs.writeFile(`${folder}/frames.json`,JSON.stringify({frames,errors},null,2))
console.log(JSON.stringify({frames:frames.length,errors}))
await browser.close()
if(errors.length)process.exitCode=1
