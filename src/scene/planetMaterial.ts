import * as T from 'three'
import { REGIONAL, CENTER } from './geography'
export type Appearance = { context:T.Texture; tiles:T.Texture[];regional:T.Texture }
export function planetMaterial(color:T.Texture,appearance:Appearance|null){
 const uniforms={uRegional:{value:appearance?.regional??color},uRegion:{value:REGIONAL},uContext:{value:appearance?.context??color},u00:{value:appearance?.tiles[0]??color},u10:{value:appearance?.tiles[1]??color},u01:{value:appearance?.tiles[2]??color},u11:{value:appearance?.tiles[3]??color},uMeasured:{value:appearance?1:0},uScan:{value:0},uPolar:{value:0}}
 const material=new T.MeshStandardMaterial({map:color,color:'#ffffff',roughness:1,metalness:0})
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms)
  shader.vertexShader='attribute vec2 surfaceCoord; varying vec2 vSurfaceCoord; varying vec3 vSurfacePosition;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceCoord=surfaceCoord;vSurfacePosition=position;')
  shader.fragmentShader=`varying vec2 vSurfaceCoord;varying vec3 vSurfacePosition;
  uniform sampler2D uRegional;uniform vec4 uRegion;uniform sampler2D uContext;uniform sampler2D u00;uniform sampler2D u10;uniform sampler2D u01;uniform sampler2D u11;uniform float uMeasured;uniform float uScan;uniform float uPolar;
  float regolithHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float regolithNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(regolithHash(i),regolithHash(i+vec3(1,0,0)),f.x),mix(regolithHash(i+vec3(0,1,0)),regolithHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(regolithHash(i+vec3(0,0,1)),regolithHash(i+vec3(1,0,1)),f.x),mix(regolithHash(i+vec3(0,1,1)),regolithHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 globalColor=texture2D(map,vMapUv).rgb;
   float edge=1228.8-max(abs(vSurfaceCoord.x),abs(vSurfaceCoord.y));
   float footprintWeight=smoothstep(0.,280.,edge)*uMeasured;
   vec2 regionUV=vec2(vSurfaceCoord.x/2457.6+.5,.5-vSurfaceCoord.y/2457.6);
   float detail=texture2D(uContext,regionUV).r;
   vec2 tileUV=fract((vSurfaceCoord+614.4)/614.4);
   tileUV=vec2(tileUV.x,1.-tileUV.y)*(1024./1026.)+1./1026.;
   float fine=0.5;
   if(vSurfaceCoord.y<0.){if(vSurfaceCoord.x<0.)fine=texture2D(u00,tileUV).r;else fine=texture2D(u10,tileUV).r;}
   else {if(vSurfaceCoord.x<0.)fine=texture2D(u01,tileUV).r;else fine=texture2D(u11,tileUV).r;}
   float fineEdge=614.4-max(abs(vSurfaceCoord.x),abs(vSurfaceCoord.y));
   detail=mix(detail,fine,smoothstep(0.,12.,fineEdge));
   float range=distance(cameraPosition,vSurfacePosition);
   // Keep bounded high frequencies at eye height; never restore broad baked shadows.
   float photo=mix(.65,1.,smoothstep(10.,120.,range));
   vec2 regionalUV=(vSurfaceCoord-uRegion.xy)/uRegion.zw;
   float regionalEdge=min(min(regionalUV.x,1.-regionalUV.x)*uRegion.z,min(regionalUV.y,1.-regionalUV.y)*uRegion.w);
   float regionalWeight=smoothstep(0.,24000.,regionalEdge)*uMeasured*(1.-smoothstep(50000.,200000.,range));
   float medium=texture2D(uRegional,vec2(regionalUV.x,1.-regionalUV.y)).r;
   float appearanceFactor=1.+(medium-.5)*1.5*regionalWeight*(1.-footprintWeight)+(detail-.5)*2.6*footprintWeight*photo;
   float nearField=(1.-smoothstep(30.,160.,range))*footprintWeight;
   float footprint=max(length(dFdx(vSurfacePosition)),length(dFdy(vSurfacePosition)));
   float sediment=regolithNoise(vSurfacePosition*18.)*.5+regolithNoise(vSurfacePosition*63.)*.3+regolithNoise(vSurfacePosition*180.)*.2;
   sediment=mix(sediment,.5,smoothstep(.02,.15,footprint));
   globalColor=mix(globalColor,vec3(.075),regionalWeight);
   diffuseColor.rgb*=globalColor*appearanceFactor*mix(1.,.86+sediment*.28,nearField);
  `)
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
   #include <normal_fragment_maps>
   float dist=distance(cameraPosition,vSurfacePosition);
   vec3 radialNormal=normalize(mat3(viewMatrix)*(vSurfacePosition-vec3(0.,${CENTER.y.toFixed(5)},0.)));
   normal=normalize(mix(normal,radialNormal,smoothstep(30000.,150000.,dist)));
   float pixel=max(length(dFdx(vSurfacePosition)),length(dFdy(vSurfacePosition)));
   float micro=regolithNoise(vSurfacePosition*28.)*.65+regolithNoise(vSurfacePosition*85.)*.35;
   float band=(1.-smoothstep(.02,.15,pixel))*(1.-smoothstep(30.,140.,dist));
   vec3 dp1=dFdx(vViewPosition),dp2=dFdy(vViewPosition);
   vec3 r1=cross(dp2,normal),r2=cross(normal,dp1);float determinant=dot(dp1,r1);
   vec3 perturb=(r1*dFdx(micro)+r2*dFdy(micro))*sign(determinant)/max(abs(determinant),.000001);
   normal=normalize(normal+perturb*.006*band);
  `)
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec2 cell=vMapUv*vec2(48.,24.);vec2 line=abs(fract(cell-.5)-.5)/max(fwidth(cell),vec2(.0001));
   outgoingLight+=vec3(.12,.07,.025)*(1.-smoothstep(.4,1.2,min(line.x,line.y)))*uScan;
   float cap=smoothstep(.1,.035,vMapUv.y);outgoingLight+=vec3(.012,.065,.10)*cap*uPolar;
   #include <opaque_fragment>
  `)
 }
 material.customProgramCacheKey=()=> 'single-geographic-planet-v2'
 return {material,uniforms}
}
