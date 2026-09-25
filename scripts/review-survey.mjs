// Review all chapter entrances/exits, with denser samples around the new hold.
import {spawnSync} from 'node:child_process'
const points=new Set(Array.from({length:51},(_,i)=>i*2))
for(let p=29;p<=41;p+=.5)points.add(p)
for(let p=43;p<=56;p++)points.add(p)
for(let p=66;p<=84;p++)points.add(p)
for(const p of [34.5,53.5,72.5,75.5])points.add(p)
const sorted=[...points].sort((a,b)=>a-b)
for(const direction of ['forward','reverse']){
 const result=spawnSync(process.execPath,['scripts/review-scroll.mjs',`docs/survey-review/${direction}`,'1',...(direction==='reverse'?['--reverse']:[])],{stdio:'inherit',env:{...process.env,REVIEW_MODE:'story',REVIEW_POINTS:sorted.join(',')}})
 if(result.status!==0)process.exit(result.status??1)
}
