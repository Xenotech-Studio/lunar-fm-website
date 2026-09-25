import * as T from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { measuredElevation, planetGeometry, point, LANDING, R } from './geography'
import type { Elevation } from './geography'
import { planetMaterial } from './planetMaterial'
import regionalUrl from '../assets/surface/wac-regional-detail.webp'
import regionalHeightUrl from '../assets/surface/wac-regional.i16?url'
import terrainUrl from '../assets/surface/terrain.f32?url'
import farUrl from '../assets/surface/context-terrain.f32?url'
import contextUrl from '../assets/surface/context-detail.webp'
import tile00 from '../assets/surface/nac-0-0-detail.webp'
import tile10 from '../assets/surface/nac-1-0-detail.webp'
import tile01 from '../assets/surface/nac-0-1-detail.webp'
import tile11 from '../assets/surface/nac-1-1-detail.webp'
import earthUrl from '../assets/surface/earth-blue-marble.webp'

export async function loadMeasuredPlanet(signal:AbortSignal,gl:T.WebGLRenderer,color:T.Texture,base:Elevation,mobile:boolean,polar:T.Texture){
 const textures:T.Texture[]=[],geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],instances:T.InstancedMesh[]=[]
 const group=new T.Group();group.name='georegistered-lunar-surface'
 let bytes=0
 const close=()=>{instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();(t.image as ImageBitmap).close()});group.clear()}
 async function raster(url:string,srgb=false,small=false){
  const response=await fetch(url,{signal});if(!response.ok)throw new Error('Missing surface texture')
  const image=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',colorSpaceConversion:'none',...(small?{resizeWidth:512,resizeHeight:512}: {})})
  if(signal.aborted){image.close();throw new DOMException('Cancelled','AbortError')}
  const texture=new T.Texture(image);texture.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());texture.needsUpdate=true
  textures.push(texture);bytes+=image.width*image.height*4*4/3;return texture
 }
 async function floats(url:string,length:number){const response=await fetch(url,{signal});if(!response.ok)throw new Error('Missing elevation');const data=new Float32Array(await response.arrayBuffer());if(data.length!==length)throw new Error('Invalid elevation');bytes+=data.byteLength;return data}
 try{
  const fine=await floats(terrainUrl,1025*1025),far=await floats(farUrl,199*501)
  const regionalResponse=await fetch(regionalHeightUrl,{signal});if(!regionalResponse.ok)throw new Error('Missing regional elevation')
  const regionalHeights=new Int16Array(await regionalResponse.arrayBuffer());if(regionalHeights.length!==1536*1536)throw new Error('Invalid regional elevation')
  bytes+=regionalHeights.byteLength
  const regional=await raster(regionalUrl)
  const context=await raster(contextUrl),tiles:T.Texture[]=[]
  for(const url of [tile00,tile10,tile01,tile11])tiles.push(await raster(url,false,mobile))
  const earthMap=await raster(earthUrl,true)
  const elevation=measuredElevation(base,fine,far,regionalHeights)
  const geometry=planetGeometry(elevation,true);geometries.push(geometry)
  const appearance=planetMaterial(color,{context,tiles,regional},polar);materials.push(appearance.material)
  const planet=new T.Mesh(geometry,appearance.material);planet.name='single-planet-mesh';planet.receiveShadow=true;planet.castShadow=true;group.add(planet)
  const stones=new T.Group();group.add(stones)
  let seed=371731
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647}
  const pose=new T.Object3D()
  for(let variant=0;variant<4;variant++){
   const geometry=mergeVertices(new T.IcosahedronGeometry(1,3))
   const pos=geometry.attributes.position
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i)
    const distortion=1+.16*Math.sin(x*5+variant*2)*Math.cos(z*7+y*3)
    pos.setXYZ(i,x*distortion,Math.max(-.5,y*.66)*distortion,z*(.75+variant*.1)*distortion)
   }
   geometry.computeVertexNormals();geometries.push(geometry)
   const material=new T.MeshStandardMaterial({color:new T.Color(.15+variant*.01,.148+variant*.01,.144+variant*.01),roughness:1});materials.push(material)
   const mesh=new T.InstancedMesh(geometry,material,mobile?180:400);instances.push(mesh);mesh.castShadow=true;mesh.receiveShadow=true
   for(let i=0;i<mesh.count;i++){
    let x=LANDING.x+(random()-.5)*55,z=LANDING.y+(random()-.5)*65
    // The eye stays over a cleared 3 m radius; nothing intersects the camera.
    if(Math.hypot(x-LANDING.x,z-LANDING.y)<3)x+=5
    const size=.012+Math.pow(random(),6)*.24
    const position=point(x,z,elevation(x,z));pose.position.copy(position);pose.position.y+=size*.14
    pose.rotation.set(random()*.3,random()*6.28,random()*.25);pose.scale.setScalar(size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix)
   }
   stones.add(mesh)
  }
  // Earth shares the world, lighting and depth buffer. The composition direction
  // is disclosed; distance/radius preserve a 1.9-degree apparent diameter.
  const earth=new T.Group();earth.position.copy(new T.Vector3(6500,8500,-22000).normalize().multiplyScalar(384400000))
  const earthGeometry=new T.SphereGeometry(6371000,64,48);geometries.push(earthGeometry)
  const earthMaterial=new T.MeshStandardMaterial({map:earthMap,roughness:1});materials.push(earthMaterial)
  const globe=new T.Mesh(earthGeometry,earthMaterial);globe.rotation.set(.18,2.8,-.25);earth.add(globe)
  const glowGeometry=new T.SphereGeometry(6450000,48,32);geometries.push(glowGeometry)
  const glowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,vertexShader:`varying vec3 n;varying vec3 v;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;
  #include <logdepthbuf_vertex>
  }`,fragmentShader:`varying vec3 n;varying vec3 v;
  #include <logdepthbuf_pars_fragment>
  void main(){
  #include <logdepthbuf_fragment>
  float f=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.05,.19,.45,f*.4);}`});materials.push(glowMaterial);earth.add(new T.Mesh(glowGeometry,glowMaterial));group.add(earth)
  // Keep bounding-box diagnostics explicit; no full-screen overlay or second camera.
  return {group,planet,stones,earth,elevation,uniforms:appearance.uniforms,close,bytes,datumRadius:R}
 }catch(error){close();throw error}
}
