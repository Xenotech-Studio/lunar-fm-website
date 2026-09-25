import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { clamp, mix, smooth } from '../timeline'
import contextUrl from '../assets/surface/context.webp'
import farUrl from '../assets/surface/context-terrain.f32?url'
import terrainUrl from '../assets/surface/terrain.f32?url'
import earthUrl from '../assets/surface/earth-blue-marble.webp'
import tile00 from '../assets/surface/nac-0-0.webp'
import tile10 from '../assets/surface/nac-1-0.webp'
import tile01 from '../assets/surface/nac-0-1.webp'
import tile11 from '../assets/surface/nac-1-1.webp'

const WIDTH = 2457.6, RADIUS = 1737400, GRID = 1025
const curvature=(x:number,z:number)=>Math.sqrt(RADIUS*RADIUS-x*x-z*z)-RADIUS
const vertex = `varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
void main(){vUv=uv;vWorld=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const fragment = `precision highp float;
uniform sampler2D uMap; uniform sampler2D uContext; uniform float uDetail; uniform float uInset; varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 vec3 n=normalize(vNormal); vec3 sun=normalize(vec3(-.7,.38,.6));
 // NAC imagery contains acquisition-time shadows: keep relighting restrained.
 vec3 albedo=texture2D(uMap,vUv*(1.-2.*uInset)+uInset).rgb;
 if(uInset>0.){
   float edge=min(614.4-abs(vWorld.x),614.4-abs(vWorld.z));
   vec3 coarse=texture2D(uContext,vec2(vWorld.x/2457.6+.5,.5-vWorld.z/2457.6)).rgb;
   albedo=mix(coarse,albedo,smoothstep(0.,55.,edge));
 }
 float grain=noise(vWorld*18.)*.5+noise(vWorld*63.)*.3+noise(vWorld*180.)*.2;
 float footprint=max(length(dFdx(vWorld)),length(dFdy(vWorld)));
 grain=mix(grain,.5,smoothstep(.02,.15,footprint));
 float fade=1.-smoothstep(8.,100.,distance(cameraPosition,vWorld));
 float micro=noise(vWorld*28.)*.65+noise(vWorld*85.)*.35;
 vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld),r1=cross(dp2,n),r2=cross(n,dp1);
 float det=dot(dp1,r1);
 vec3 gradient=(r1*dFdx(micro)+r2*dFdy(micro))*sign(det)/max(abs(det),.0000001);
 n=normalize(n-gradient*.007*fade);
 float light=.23+.90*max(dot(n,sun),0.);
 vec3 color=albedo*light*1.28*mix(1.,.90+grain*.2,fade*uDetail);
 color*=vec3(1.015,1.01,1.);
 gl_FragColor=vec4(color,1.);
}`
const quadVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
const quadFragment = `uniform sampler2D uScene;uniform float uOpacity;varying vec2 vUv;
void main(){gl_FragColor=vec4(texture2D(uScene,vUv).rgb,uOpacity);}`

type World = { scene: T.Scene; camera: T.PerspectiveCamera; target: T.WebGLRenderTarget; height: (x:number,z:number)=>number; close:()=>void; bytes:number }

// Explicit ownership: no useLoader global texture cache, no retained ImageBitmaps.
async function createWorld(signal: AbortSignal, gl:T.WebGLRenderer, mobile:boolean):Promise<World> {
 const textures:T.Texture[]=[], geometries:T.BufferGeometry[]=[], materials:T.Material[]=[]
 const scene=new T.Scene();scene.background=new T.Color('#030508')
 const target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,type:T.HalfFloatType})
 const close=()=>{scene.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose()});textures.forEach(t=>{t.dispose();const im=t.image;if(im instanceof ImageBitmap)im.close()});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());target.dispose();scene.clear()}
 let bytes=0
 async function texture(url:string,small=false){
  const response=await fetch(url,{signal});if(!response.ok)throw new Error('Surface asset '+response.status)
  const blob=await response.blob();const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY',...(small?{resizeWidth:512,resizeHeight:512}: {})})
  if(signal.aborted){bitmap.close();throw new DOMException('Cancelled','AbortError')}
  const t=new T.Texture(bitmap);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());t.needsUpdate=true;textures.push(t);bytes+=bitmap.width*bitmap.height*4*4/3;return t
 }
 try {
  const response=await fetch(terrainUrl,{signal});if(!response.ok)throw new Error('Missing terrain')
  const elevations=new Float32Array(await response.arrayBuffer());if(elevations.length!==GRID*GRID)throw new Error('Invalid terrain grid')
  const base=elevations[512*GRID+512]
  const height=(x:number,z:number)=>{
   const u=clamp(x/WIDTH+.5)*1024,v=clamp(z/WIDTH+.5)*1024
   const ix=Math.min(1023,Math.floor(u)),iy=Math.min(1023,Math.floor(v))
   const a=mix(elevations[iy*GRID+ix],elevations[iy*GRID+ix+1],u-ix)
   const b=mix(elevations[(iy+1)*GRID+ix],elevations[(iy+1)*GRID+ix+1],u-ix)
   return mix(a,b,v-iy)-base+curvature(x,z)
  }
  // Sequential ownership means an aborted decode cannot orphan a late texture.
  const context=await texture(contextUrl)
  const maps:T.Texture[]=[]
  for(const url of [tile00,tile10,tile01,tile11])maps.push(await texture(url,mobile))
  const earthMap=await texture(earthUrl)
  function patch(x:number,z:number,width:number,segments:number,map:T.Texture,lift=0){
   const geo=new T.PlaneGeometry(width,width,segments,segments);geo.rotateX(-Math.PI/2)
   const pos=geo.attributes.position
   for(let i=0;i<pos.count;i++){const px=pos.getX(i)+x,pz=pos.getZ(i)+z;pos.setXYZ(i,px,height(px,pz)+lift,pz)}
   if(width===WIDTH){
    const indices=geo.index!;const kept:number[]=[]
    for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);const cx=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3,cz=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3;if(Math.abs(cx)>=614.4||Math.abs(cz)>=614.4)kept.push(a,b,c)}
    geo.setIndex(kept)
   }
   const normals=geo.attributes.normal
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),d=2.4;const n=new T.Vector3(-(height(x+d,z)-height(x-d,z))/(2*d),1,-(height(x,z+d)-height(x,z-d))/(2*d)).normalize();normals.setXYZ(i,n.x,n.y,n.z)}
   geometries.push(geo)
   const mat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uMap:{value:map},uContext:{value:context},uDetail:{value:1},uInset:{value:width===WIDTH?0:1/1026}}});materials.push(mat)
   const mesh=new T.Mesh(geo,mat);scene.add(mesh)
  }
  // Coarse full region + four detailed corridor tiles. Shared samples prevent cracks.
  patch(0,0,WIDTH,mobile?128:256,context)
  maps.forEach((map,i)=>patch((i%2-.5)*614.4,(Math.floor(i/2)-.5)*614.4,614.4,mobile?128:256,map,0))
  // Undocumented terrain outside the measured crop is a smooth reference sphere.
  const farResponse=await fetch(farUrl,{signal});if(!farResponse.ok)throw new Error('Missing context terrain')
  const farData=new Float32Array(await farResponse.arrayBuffer())
  const farGeo=new T.PlaneGeometry(4742,11998,198,500);farGeo.rotateX(-Math.PI/2)
  const fp=farGeo.attributes.position;const keep:number[]=[]
  for(let i=0;i<fp.count;i++){const x=fp.getX(i)-.8,z=fp.getZ(i)+770.8;fp.setXYZ(i,x,farData[i]-base+curvature(x,z)-.3,z)}
  const fi=farGeo.index!
  for(let i=0;i<fi.count;i+=3){const a=fi.getX(i),b=fi.getX(i+1),c=fi.getX(i+2);const x=(fp.getX(a)+fp.getX(b)+fp.getX(c))/3,z=(fp.getZ(a)+fp.getZ(b)+fp.getZ(c))/3;if(Math.abs(x)>WIDTH/2-24||Math.abs(z)>WIDTH/2-24)keep.push(a,b,c)}
  farGeo.setIndex(keep);farGeo.computeVertexNormals();geometries.push(farGeo)
  const farMat=new T.MeshStandardMaterial({color:'#55534e',roughness:1});materials.push(farMat);scene.add(new T.Mesh(farGeo,farMat))
  const skirt=new T.PlaneGeometry(100000,100000,256,256);skirt.rotateX(-Math.PI/2)
  const spos=skirt.attributes.position
  for(let i=0;i<spos.count;i++){const x=spos.getX(i),z=spos.getZ(i);spos.setY(i,-150+curvature(x,z))}
  skirt.computeVertexNormals();geometries.push(skirt)
  const skirtMat=new T.MeshStandardMaterial({color:'#676762',roughness:1});materials.push(skirtMat);scene.add(new T.Mesh(skirt,skirtMat))
  scene.add(new T.HemisphereLight('#9ea8b5','#171513',.45))
  const sun=new T.DirectionalLight('#fff1d8',2.6);sun.position.set(-700,380,600);scene.add(sun)
  // Small rocks are deterministic art direction, not inferred scientific measurements.
  const rockGeo=new T.IcosahedronGeometry(1,1);geometries.push(rockGeo)
  const rockMat=new T.MeshStandardMaterial({color:'#777570',roughness:1,flatShading:true});materials.push(rockMat)
  const rocks=new T.InstancedMesh(rockGeo,rockMat,240);const dummy=new T.Object3D();let seed=17017
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647}
  for(let i=0;i<240;i++){const x=(random()-.5)*110,z=80+(random()-.5)*140,s=.05+Math.pow(random(),4)*1.1;dummy.position.set(x,height(x,z)+s*.22,z);dummy.rotation.set(random(),random()*6,random());dummy.scale.set(s,s*.5,s*.8);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix)}
  scene.add(rocks)
  // Physical angular diameter 1.90 degrees; direction is a disclosed composition.
  const earth=new T.Group();earth.position.set(6500,12000,-22000)
  const earthGeo=new T.SphereGeometry(430,64,48);geometries.push(earthGeo)
  const earthMat=new T.MeshStandardMaterial({map:earthMap,roughness:1,emissiveMap:earthMap,emissive:'#ffffff',emissiveIntensity:.18});materials.push(earthMat)
  const globe=new T.Mesh(earthGeo,earthMat);globe.rotation.set(.18,2.8,-.25);earth.add(globe)
  const glowGeo=new T.SphereGeometry(441,48,32);geometries.push(glowGeo)
  const glowMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.13,.38,.8,f*.55);}`});materials.push(glowMat);earth.add(new T.Mesh(glowGeo,glowMat));scene.add(earth)
  const camera=new T.PerspectiveCamera(48,1,.15,120000)
  return {scene,camera,target,height,close,bytes:bytes+elevations.byteLength}
 } catch(error){close();throw error}
}

export function SurfaceJourney({progress}:{progress:RefObject<number>}){
 const {gl,size}=useThree();const [active,setActive]=useState(false)
 const world=useRef<World|null>(null),material=useRef<T.ShaderMaterial>(null),wanted=useRef(false)
 const uniforms=useRef({uScene:{value:null as T.Texture|null},uOpacity:{value:0}})
 const loadOpacity=useRef(0)
 useEffect(()=>{
  if(!active)return
  const controller=new AbortController();let disposed=false
  gl.domElement.dataset.surface='loading';delete document.documentElement.dataset.surfaceError
  createWorld(controller.signal,gl,size.width<760).then(w=>{
   if(disposed){w.close();return}world.current=w;gl.domElement.dataset.surface='ready';gl.domElement.dataset.surfaceBytes=String(Math.round(w.bytes))
  }).catch(error=>{if(error.name!=='AbortError'){gl.domElement.dataset.surface='unavailable';document.documentElement.dataset.surfaceError='true'}})
  return()=>{disposed=true;controller.abort();if(material.current){material.current.uniforms.uScene.value=null;material.current.uniforms.uOpacity.value=0}world.current?.close();world.current=null;loadOpacity.current=0;gl.domElement.dataset.surface='unloaded';gl.domElement.dataset.surfaceBytes='0'}
 },[active,gl,size.width<760])
 useFrame((_,dt)=>{
  gl.domElement.dataset.gpuTextures=String(gl.info.memory.textures)
  const p=progress.current;const should=p>.22&&p<.655
  if(should!==wanted.current){wanted.current=should;setActive(should)}
  const w=world.current,mat=material.current
  if(!w||!mat)return
  const fade=smooth((p-.285)/.035)*(1-smooth((p-.605)/.035))
  loadOpacity.current=Math.min(1,loadOpacity.current+dt*2)
  mat.uniforms.uOpacity.value=fade*smooth(loadOpacity.current)
  if(fade===0)return
  const descent=smooth((p-.29)/.18),land=smooth((p-.395)/.08),leave=smooth((p-.565)/.06)
  const times=[.29,.35,.39,.43,.47,.565,.63],alts=[8500,600,65,18,2.1,2.1,6000]
  let altitude=8500
  for(let i=0;i<times.length-1;i++)if(p>=times[i])altitude=Math.exp(mix(Math.log(alts[i]),Math.log(alts[i+1]),smooth((p-times[i])/(times[i+1]-times[i]))))
  const z=mix(-650,85,descent)+smooth((p-.48)/.075)*20,x=mix(180,0,descent)
  w.camera.position.set(x,w.height(x,z)+altitude,z)
  const pitch=mix(-1.40,.32,land)*(1-leave)+leave*(-1.15)
  w.camera.lookAt(x+mix(-60,80,land),w.camera.position.y+Math.sin(pitch)*1000,z-Math.cos(pitch)*1000)
  w.camera.fov=mix(48,55,land);w.camera.aspect=size.width/size.height;w.camera.updateProjectionMatrix()
  const ratio=Math.min(gl.getPixelRatio(),size.width<760?1.15:1.4,Math.sqrt(3000000/(size.width*size.height)))
  const width=Math.round(size.width*ratio),height=Math.round(size.height*ratio)
  if(w.target.width!==width||w.target.height!==height)w.target.setSize(width,height)
  const previous=gl.getRenderTarget();gl.setRenderTarget(w.target);gl.render(w.scene,w.camera);gl.setRenderTarget(previous)
  mat.uniforms.uScene.value=w.target.texture
  gl.domElement.dataset.altitude=altitude.toFixed(2)
  gl.domElement.dataset.surfaceGpuTextures=String(gl.info.memory.textures)
 },-0.5)
 return <mesh renderOrder={1000} frustumCulled={false}>
  <planeGeometry args={[2,2]}/><shaderMaterial ref={material} vertexShader={quadVertex} fragmentShader={quadFragment} uniforms={uniforms.current} transparent depthTest={false} depthWrite={false}/>
 </mesh>
}
