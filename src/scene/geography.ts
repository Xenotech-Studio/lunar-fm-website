import * as T from 'three'
import manifest from '../assets/surface/manifest.json' with { type: 'json' }
import regional from '../assets/surface/regional-manifest.json' with { type: 'json' }

export const R = 1737400
export const WIDTH = manifest.widthMeters
export const DATUM = -2104.279541015625
export const PX = manifest.projectedTopLeft[0] + WIDTH / 2
export const PY = manifest.projectedTopLeft[1] - WIDTH / 2
const cos20 = Math.cos(20 * Math.PI / 180)
export const LAT = PY / R
export const LON = Math.PI + PX / (R * cos20)
export const EAST = new T.Vector3(-Math.sin(LON), 0, -Math.cos(LON))
export const UP = new T.Vector3(Math.cos(LAT)*Math.cos(LON), Math.sin(LAT), -Math.cos(LAT)*Math.sin(LON))
export const SOUTH = new T.Vector3(Math.sin(LAT)*Math.cos(LON), -Math.cos(LAT), -Math.sin(LAT)*Math.sin(LON))
export const TO_LOCAL = new T.Matrix4().makeBasis(EAST, UP, SOUTH).transpose()
export const LOCAL_ROTATION = new T.Quaternion().setFromRotationMatrix(TO_LOCAL)
export const CENTER = new T.Vector3(0, -R-DATUM, 0)
export const SUN = new T.Vector3(-.75, .28, .6).normalize()
export const REGIONAL = new T.Vector4((regional.topLeftPixelCenter[0]-LON*R)*cos20,PY-regional.topLeftPixelCenter[1],153500*cos20,153500)
export const LANDING = new T.Vector2(0, 96)
const clamp = (n:number,a=0,b=1)=>Math.max(a,Math.min(b,n))
const fade = (n:number)=>{const x=clamp(n);return x*x*(3-2*x)}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
export function geographic(x:number,z:number){return {lat:(PY-z)/R,lon:Math.PI+(PX+x)/(R*cos20)}}
export function mapUV(x:number,z:number){const {lat,lon}=geographic(x,z);return [(lon+Math.PI)/(2*Math.PI),.5+lat/Math.PI]}
export function point(x:number,z:number,h:number,out=new T.Vector3()){
 const {lat,lon}=geographic(x,z),r=R+h
 out.set(r*Math.cos(lat)*Math.cos(lon),r*Math.sin(lat),-r*Math.cos(lat)*Math.sin(lon))
 return out.applyMatrix4(TO_LOCAL).add(CENTER)
}
function bilinear(a:Float32Array|Int16Array,w:number,h:number,u:number,v:number){
 const x=clamp(u)*(w-1),y=clamp(v)*(h-1),i=Math.min(w-2,Math.floor(x)),j=Math.min(h-2,Math.floor(y))
 return lerp(lerp(a[j*w+i],a[j*w+i+1],x-i),lerp(a[(j+1)*w+i],a[(j+1)*w+i+1],x-i),y-j)
}
export type Elevation = (x:number,z:number)=>number
export function globalElevation(texture:T.Texture):Elevation {
 const im=texture.image as HTMLImageElement
 const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height
 const ctx=canvas.getContext('2d')!;ctx.drawImage(im,0,0)
 const rgba=ctx.getImageData(0,0,im.width,im.height).data
 const a=new Float32Array(im.width*im.height)
 for(let i=0;i<a.length;i++)a[i]=(rgba[i*4]*256+rgba[i*4+1])*.5-10000
 const poles=[0,0];for(let i=0;i<im.width;i++){poles[0]+=a[i]/im.width;poles[1]+=a[(im.height-1)*im.width+i]/im.width}
 return (x,z)=>{const [u,v]=mapUV(x,z);const h=bilinear(a,im.width,im.height,((u%1)+1)%1,1-v);return lerp(h,poles[v>.5?0:1],fade((Math.abs(v-.5)-.49)/.01))}
}
export function measuredElevation(base:Elevation,fine:Float32Array,far:Float32Array,regional:Int16Array):Elevation{
 return(x,z)=>{
  let h=base(x,z)
  const ru=(x-REGIONAL.x)/REGIONAL.z,rv=(z-REGIONAL.y)/REGIONAL.w
  const regionEdge=Math.min(ru*REGIONAL.z,(1-ru)*REGIONAL.z,rv*REGIONAL.w,(1-rv)*REGIONAL.w)
  if(regionEdge>0)h=lerp(h,bilinear(regional,1536,1536,ru,rv),fade(regionEdge/16000))
  const u=(x+2371.8)/4742,v=(z+5228.2)/11998
  const edge=Math.min(x+2371.8,2370.2-x,z+5228.2,6769.8-z)
  if(edge>0)h=lerp(h,bilinear(far,199,501,u,v),fade(edge/700))
  const fineEdge=WIDTH/2-Math.max(Math.abs(x),Math.abs(z))
  if(fineEdge>0)h=lerp(h,bilinear(fine,1025,1025,x/WIDTH+.5,z/WIDTH+.5),fade(fineEdge/240))
  return h
 }
}

// One non-overlapping planet surface. The georeferenced square chart has nested
// rings; odd outer-edge vertices sit on their parent's edge, eliminating T-junction cracks.
export function planetGeometry(height:Elevation,detail:boolean){
 const positions:number[]=[],normals:number[]=[],uv:number[]=[],coords:number[]=[],indices:number[]=[]
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),d=new T.Vector3(),n=new T.Vector3()
 function vertex(x:number,z:number,edgeMid?:[number,number,number,number]){
  point(x,z,height(x,z),a)
  if(edgeMid){point(edgeMid[0],edgeMid[1],height(edgeMid[0],edgeMid[1]),b);point(edgeMid[2],edgeMid[3],height(edgeMid[2],edgeMid[3]),c);a.copy(b).lerp(c,.5)}
  const step=Math.max(2.4,Math.hypot(x-LANDING.x,z-LANDING.y)/128)
  point(x+step,z,height(x+step,z),b);point(x-step,z,height(x-step,z),c);b.sub(c)
  point(x,z+step,height(x,z+step),c);point(x,z-step,height(x,z-step),d);c.sub(d)
  n.crossVectors(c,b).normalize()
  const polar=fade((Math.abs(geographic(x,z).lat)*180/Math.PI-84)/5)
  if(polar>0)n.lerp(a.clone().sub(CENTER).normalize(),polar).normalize()
  positions.push(a.x,a.y,a.z);normals.push(n.x,n.y,n.z);uv.push(...mapUV(x,z));coords.push(x,z)
 }
 function grid(xs:number[],zs:number[],hole:number,snap=false){
  const start=positions.length/3,w=xs.length,h=zs.length
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
   let mid:[number,number,number,number]|undefined
   if(snap&&((j===0||j===h-1)&&i%2===1))mid=[xs[i-1],zs[j],xs[i+1],zs[j]]
   if(snap&&((i===0||i===w-1)&&j%2===1))mid=[xs[i],zs[j-1],xs[i],zs[j+1]]
   vertex(xs[i],zs[j],mid)
  }
  for(let j=0;j<h-1;j++)for(let i=0;i<w-1;i++){
   const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2
   if(hole>0&&Math.abs(x-LANDING.x)<hole&&Math.abs(z-LANDING.y)<hole)continue
   const k=start+j*w+i;indices.push(k,k+w,k+1,k+1,k+w,k+w+1)
  }
 }
 const extent=49152,segments=128
 const xs:number[]=[],zs:number[]=[]
 for(let i=0;i<=360;i++)xs.push((i/360*2*Math.PI-Math.PI-LON)*R*cos20)
 for(let i=0;i<=180;i++)zs.push(PY-((.5-i/180)*Math.PI)*R)
 for(let i=0;i<=segments;i++){xs.push(LANDING.x-extent+i/segments*extent*2);zs.push(LANDING.y-extent+i/segments*extent*2)}
 const sorted=(a:number[])=>[...new Set(a)].sort((a,b)=>a-b)
 // Keep the ring boundary's sampling identical to the exterior globe edge.
 grid(sorted(xs.filter(x=>Math.abs(x-LANDING.x)>=extent||Math.abs((x-LANDING.x)/768-Math.round((x-LANDING.x)/768))<1e-8)),sorted(zs.filter(z=>Math.abs(z-LANDING.y)>=extent||Math.abs((z-LANDING.y)/768-Math.round((z-LANDING.y)/768))<1e-8)),extent)
 let half=extent,level=0
 const minimum=detail?96:768
 while(half>=minimum){
  const axis=Array.from({length:129},(_,i)=>-half+i*half/64)
  grid(axis.map(x=>x+LANDING.x),axis.map(z=>z+LANDING.y),half===minimum?0:half/2,level>0)
  half/=2;level++
 }
 const geometry=new T.BufferGeometry()
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3))
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('surfaceCoord',new T.Float32BufferAttribute(coords,2));geometry.setIndex(indices)
 geometry.computeBoundingSphere();return geometry
}
