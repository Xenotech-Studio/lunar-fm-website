import * as T from 'three'
import { sample, orbitProgress, smooth, mix } from '../timeline'
import { R, CENTER, LOCAL_ROTATION, SUN, LANDING, point } from './geography'
import type { Elevation } from './geography'
const scale=R/1.62
function orbit(progress:number,mobile:boolean){
 const p=orbitProgress(progress)
 const location=new T.Vector3(sample(mobile?[.1,.35,-.2,.15,0]:[1.3,1.75,-1.5,1.55,0],p),sample(mobile?[2.7,2.8,2.8,2.8,.5]:[-.12,-.3,-.08,0,.05],p),0)
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(sample([.1,.25,-.95,.3,.05],p),sample([-1.55,-.8,-.2,.75,1.8],p),sample([-.18,-.3,.35,-.12,-.2],p))).invert()
 const camera=new T.PerspectiveCamera()
 camera.position.set(sample([0,.3,-.25,.15,0],p),sample([.1,.35,-.2,.25,.15],p),sample(mobile?[15.5,13.5,14.5,15.8,18]:[7.2,5.5,6.6,7.4,19.2],p))
 camera.lookAt(0,mobile?.25:0,0)
 const q=LOCAL_ROTATION.clone().multiply(rotation)
 const position=camera.position.clone().sub(location).multiplyScalar(scale).applyQuaternion(q).add(CENTER)
 const quaternion=q.clone().multiply(camera.quaternion)
 const sun=new T.Vector3(sample([-4,-4,1.4,-2,-3],p),sample([1.8,1,1,2.3,1],p),sample([1.9,1.2,.1,3,2],p)).normalize().applyQuaternion(q)
 return {position,quaternion,sun,fov:38,altitude:position.distanceTo(CENTER)-R}
}
// Monotone Hermite interpolation in log altitude. No overshoot below the terrain,
// and no repeated stop/start at every keyframe as with independent smoothsteps.
function curve(xs:number[],ys:number[],p:number){
 let i=0;while(i<xs.length-2&&p>xs[i+1])i++
 const slopes=xs.slice(1).map((x,j)=>(ys[j+1]-ys[j])/(x-xs[j]))
 const tangent=(j:number)=>j===0?slopes[0]:j===ys.length-1?slopes.at(-1)!:slopes[j-1]*slopes[j]<=0?0:2/(1/slopes[j-1]+1/slopes[j])
 const h=xs[i+1]-xs[i],t=Math.max(0,Math.min(1,(p-xs[i])/h)),t2=t*t,t3=t2*t
 return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*tangent(i)+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*tangent(i+1)
}
export function flight(progress:number,mobile:boolean,height:Elevation){
 if(progress<=.20||progress>=.68)return orbit(progress,mobile)
 const start=orbit(.20,mobile),end=orbit(.68,mobile)
 const x=LANDING.x,z=LANDING.y,h=height(x,z)
 const landing=point(x,z,h),radial=landing.clone().sub(CENTER).normalize()
 const from=start.position.clone().sub(CENTER).normalize(),to=end.position.clone().sub(CENTER).normalize()
 const qIn=new T.Quaternion().setFromUnitVectors(from,radial)
 const direction=from.clone().applyQuaternion(new T.Quaternion().slerp(qIn,smooth((progress-.20)/.10)))
 if(progress>.63)direction.copy(radial).applyQuaternion(new T.Quaternion().slerp(new T.Quaternion().setFromUnitVectors(radial,to),smooth((progress-.63)/.05)))
 const times=[.20,.27,.31,.35,.39,.43,.46,.475,.485,.50,.56,.59,.62,.65,.68]
 const heights=[start.altitude-h,600000,80000,9000,1000,110,9,4.2,2.5,2.1,2.1,110,9000,600000,end.altitude-h]
 const altitude=Math.exp(curve(times,heights.map(Math.log),progress))
 const position=direction.multiplyScalar(R+h+altitude).add(CENTER)
 const view=new T.PerspectiveCamera();view.position.copy(position);view.up.set(0,0,-1)
 // Looking just north of nadir removes the singularity of a vertical lookAt.
 view.lookAt(landing.clone().add(new T.Vector3(.2,0,-1).multiplyScalar(.1)))
 const down=view.quaternion.clone()
 view.up.set(0,1,0);view.lookAt(position.clone().add(new T.Vector3(.20,.18,-1).normalize()))
 const onGround=smooth((progress-.395)/.105)*(1-smooth((progress-.56)/.045))
 const quaternion=down.clone().slerp(view.quaternion,onGround)
 if(progress<.285)quaternion.copy(start.quaternion).slerp(down,smooth((progress-.20)/.085))
 if(progress>.635)quaternion.slerp(end.quaternion,smooth((progress-.635)/.045))
 const sun=SUN.clone()
 if(progress<.28)sun.copy(start.sun).lerp(SUN,smooth((progress-.20)/.08)).normalize()
 if(progress>.63)sun.lerp(end.sun,smooth((progress-.63)/.05)).normalize()
 return {position,quaternion,sun,fov:mix(38,52,onGround),altitude}
}
