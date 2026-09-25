import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as T from 'three'
import colorUrl from '../assets/lroc-color-4k.webp'
import heightUrl from '../assets/lola-height-rg.png'
import polarUrl from '../assets/polar/south-psr.png'
import { sample, orbitProgress, smooth } from '../timeline'
import { globalElevation, planetGeometry, point, LANDING, LAT, LON, R, CENTER } from './geography'
import { planetMaterial } from './planetMaterial'
import { flight } from './flight'
import { loadMeasuredPlanet } from './SurfaceJourney'

type Props={progress:RefObject<number>;reduced:boolean;onReady:()=>void;onFailure:()=>void}
type Measured=Awaited<ReturnType<typeof loadMeasuredPlanet>>
function Planet({progress,onReady}:Pick<Props,'progress'|'onReady'>){
 const [color,height,polar]=useLoader(T.TextureLoader,[colorUrl,heightUrl,polarUrl])
 const {gl,size,camera}=useThree()
 const root=useRef<T.Group>(null),light=useRef<T.DirectionalLight>(null)
 const [active,setActive]=useState(false),wanted=useRef(false),loaded=useRef<Measured|null>(null)
 const base=useMemo(()=>globalElevation(height),[height])
 const geometry=useMemo(()=>planetGeometry(base,false),[base])
 const appearance=useMemo(()=>planetMaterial(color,null,polar),[color,polar])
 const planet=useMemo(()=>{const mesh=new T.Mesh(geometry,appearance.material);mesh.name='single-planet-mesh';mesh.receiveShadow=true;mesh.castShadow=true;return mesh},[geometry,appearance])
 const shadowTarget=useMemo(()=>new T.Object3D(),[])
 const ready=useRef(false),heightSafe=useRef(false)
 useEffect(()=>{
  color.colorSpace=T.SRGBColorSpace;color.wrapS=T.RepeatWrapping;color.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());color.needsUpdate=true
  polar.colorSpace=T.NoColorSpace;polar.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());polar.needsUpdate=true
  return()=>{geometry.dispose();appearance.material.dispose()}
 },[color,polar,gl,geometry,appearance])
 useEffect(()=>{
  if(!active)return
  const abort=new AbortController();let disposed=false
  gl.domElement.dataset.surface='loading';delete document.documentElement.dataset.surfaceError
  loadMeasuredPlanet(abort.signal,gl,color,base,size.width<760,polar).then(world=>{
   if(disposed){world.close();return}
   loaded.current=world;root.current?.add(world.group);planet.visible=false
   gl.domElement.dataset.surface='ready';gl.domElement.dataset.surfaceBytes=String(Math.round(world.bytes))
  }).catch(error=>{if(error.name!=='AbortError'){gl.domElement.dataset.surface='unavailable';document.documentElement.dataset.surfaceError='true'}})
  return()=>{disposed=true;abort.abort();const old=loaded.current;if(old){root.current?.remove(old.group);old.close()}loaded.current=null;planet.visible=true;if(light.current?.shadow.map){light.current.shadow.map.dispose();light.current.shadow.map=null}gl.domElement.dataset.surface='unloaded';gl.domElement.dataset.surfaceBytes='0'}
 },[active,base,color,polar,gl,planet,size.width<760])
 useFrame((_,dt)=>{
  const p=progress.current,should=p>.18&&p<.695
  if(should!==wanted.current){wanted.current=should;setActive(should)}
  const world=loaded.current
  // A slow connection holds the physical flight at high orbit, rather than
  // revealing an untextured placeholder at eye height. Once ready it eases on.
  const limit=world?p:Math.min(p,.285)
  const requested=p>.285&&p<.63?limit:p
  const previous=Number(gl.domElement.dataset.flightProgress??p)
  const flightProgress=world&&previous<requested?Math.min(requested,previous+Math.max(.0001,dt)*.3):requested
  const pose=flight(flightProgress,size.width<760,world?.elevation??base)
  camera.position.copy(pose.position);camera.quaternion.copy(pose.quaternion)
  const perspective=camera as T.PerspectiveCamera
  perspective.fov=pose.fov;perspective.near=Math.max(.08,Math.min(500,pose.altitude*.00015));perspective.far=1000000000;perspective.updateProjectionMatrix()
  const position=point(LANDING.x,LANDING.y,(world?.elevation??base)(LANDING.x,LANDING.y))
  shadowTarget.position.copy(position)
  if(light.current){light.current.position.copy(position).addScaledVector(pose.sun,300);light.current.target=shadowTarget;light.current.castShadow=!!world&&pose.altitude<350;light.current.intensity=5.2}
  if(world){world.stones.visible=pose.altitude<1600;world.earth.visible=true}
  const uniforms=world?.uniforms??appearance.uniforms
  uniforms.uScan.value=sample([0,.06,0,1,.15],orbitProgress(p))*(1-smooth((p-.2)/.1)*(1-smooth((p-.63)/.05)))
  uniforms.uStudy.value=smooth((p-.68)/.045)*(1-smooth((p-.755)/.085))
  uniforms.uPolar.value=smooth((p-.63)/.05)*(1-smooth((p-.755)/.075))
  uniforms.uScan.value*=1-smooth((p-.66)/.03)*(1-smooth((p-.77)/.07))
  gl.domElement.dataset.polarLayer='LOLA-PSR-area-over-1km2';gl.domElement.dataset.polarWeight=String(uniforms.uPolar.value)
  gl.domElement.dataset.gpuTextures=String(gl.info.memory.textures)
  gl.domElement.dataset.altitude=pose.altitude.toFixed(3)
  gl.domElement.dataset.flightProgress=String(flightProgress)
  gl.domElement.dataset.cameraPosition=camera.position.toArray().map(n=>n.toFixed(5)).join(',')
  gl.domElement.dataset.cameraQuaternion=camera.quaternion.toArray().map(n=>n.toFixed(8)).join(',')
  gl.domElement.dataset.geographicSite=`${LAT*180/Math.PI},${LON*180/Math.PI}`
  gl.domElement.dataset.planetCount=String(Number(planet.visible)+Number(!!world?.planet.visible));gl.domElement.dataset.sceneCameras='1'
  heightSafe.current=pose.altitude>=2.099
  gl.domElement.dataset.aboveTerrain=String(heightSafe.current)
  if(!ready.current){ready.current=true;onReady()}
 })
 return <group ref={root}>
  <primitive object={planet}/><primitive object={shadowTarget}/>
  <ambientLight intensity={.035} color="#bec6d0"/>
  <directionalLight ref={light} color="#ffffff" intensity={5.2} shadow-mapSize={[2048,2048]} shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-near={1} shadow-camera-far={650} shadow-bias={-.00005} shadow-normalBias={.025}/>
 </group>
}
function Orbits({progress}:Pick<Props,'progress'>){
 const line=useMemo(()=>{
  const geometry=new T.BufferGeometry().setFromPoints(Array.from({length:257},(_,i)=>new T.Vector3(Math.cos(i/256*Math.PI*2)*R*1.36,Math.sin(i/256*Math.PI*2)*R*1.36,0)))
  return new T.LineLoop(geometry,new T.LineBasicMaterial({color:'#a38d66',transparent:true,opacity:0}))
 },[])
 useEffect(()=>()=>{line.geometry.dispose();line.material.dispose()},[line])
 useFrame(()=>{line.position.copy(CENTER);line.rotation.set(1.18,.3,progress.current);line.material.opacity=sample([0,0,0,.3,0],orbitProgress(progress.current))})
 return <primitive object={line}/>
}
export default function LunarScene({progress,reduced,onReady,onFailure}:Props){
 return <Canvas shadows camera={{position:[0,0,8000000],fov:38,near:10,far:1000000000}} dpr={[1,1.5]} gl={{antialias:false,alpha:false,powerPreference:'high-performance',logarithmicDepthBuffer:true}} onCreated={({gl})=>{
  gl.setClearColor('#030508');gl.toneMapping=T.NoToneMapping;gl.shadowMap.type=T.PCFSoftShadowMap
  gl.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();onFailure()},{once:true})
 }} fallback={<span>浏览器不支持画布，月面叙事仍可阅读。</span>}>
  <Suspense fallback={null}><Planet progress={progress} onReady={onReady}/></Suspense>
  <Orbits progress={progress}/>
  <EffectComposer multisampling={4}><Bloom intensity={.12} luminanceThreshold={1.15} luminanceSmoothing={.4} mipmapBlur/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Noise opacity={reduced?0:.009} blendFunction={BlendFunction.SOFT_LIGHT}/><Vignette offset={.25} darkness={.3} eskil={false}/></EffectComposer>
 </Canvas>
}
