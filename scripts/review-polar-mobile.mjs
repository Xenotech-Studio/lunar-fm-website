import {chromium} from '@playwright/test'
import fs from 'node:fs/promises'
const b=await chromium.launch({channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
try{
 const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[]
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await p.goto(process.env.LUNAR_REVIEW_URL??'http://127.0.0.1:4278');await p.locator('.universe.is-ready:not(.is-fallback)').waitFor()
 await p.mouse.wheel(0,await p.evaluate(()=>(document.documentElement.scrollHeight-innerHeight)*.81));await p.waitForTimeout(3000)
 await fs.mkdir('docs/polar-review/mobile',{recursive:true});await p.screenshot({path:'docs/polar-review/mobile/81.png'})
 await fs.writeFile('docs/polar-review/mobile/errors.json',JSON.stringify(errors));if(errors.length)process.exitCode=1
}finally{await b.close()}
