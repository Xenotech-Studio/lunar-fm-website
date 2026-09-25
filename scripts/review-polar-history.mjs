// Start an isolated checkout's server yourself, then pass URL, revision, and
// its native scroll fraction. Example: ... http://127.0.0.1:4279 04c35f5 .68
import {chromium} from '@playwright/test'
import fs from 'node:fs/promises'
const [url,revision,fraction]=process.argv.slice(2)
if(!url||!revision||!fraction)throw new Error('Expected URL revision native-scroll-fraction')
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto(url);await page.locator('.universe.is-ready:not(.is-fallback)').waitFor();await page.waitForTimeout(2000)
 await page.mouse.wheel(0,await page.evaluate(p=>(document.documentElement.scrollHeight-innerHeight)*p,Number(fraction)))
 await page.waitForTimeout(8000)
 await fs.mkdir('docs/polar-review/history',{recursive:true})
 await page.screenshot({path:`docs/polar-review/history/${revision}.png`})
 if(errors.length)throw new Error(errors.join('\n'))
}finally{await browser.close()}
