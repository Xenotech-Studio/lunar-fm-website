import * as T from 'three'
import { REGIONAL, CENTER } from './geography'
export type Appearance = { context:T.Texture; tiles:T.Texture[];regional:T.Texture }
export function planetMaterial(color:T.Texture,appearance:Appearance|null,polar:T.Texture){
 const uniforms={uSurvey:{value:0},uSweep:{value:0},uStudy:{value:0},uPSR:{value:polar},uRegional:{value:appearance?.regional??color},uRegion:{value:REGIONAL},uContext:{value:appearance?.context??color},u00:{value:appearance?.tiles[0]??color},u10:{value:appearance?.tiles[1]??color},u01:{value:appearance?.tiles[2]??color},u11:{value:appearance?.tiles[3]??color},uMeasured:{value:appearance?1:0},uScan:{value:0},uPolar:{value:0}}
 const material=new T.MeshStandardMaterial({map:color,color:'#ffffff',roughness:1,metalness:0})
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms)
  shader.vertexShader='attribute vec2 surfaceCoord; varying vec2 vSurfaceCoord; varying vec3 vSurfacePosition;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceCoord=surfaceCoord;vSurfacePosition=position;')
  shader.fragmentShader=`varying vec2 vSurfaceCoord;varying vec3 vSurfacePosition;
  uniform float uSurvey;uniform float uSweep;uniform float uStudy;uniform sampler2D uPSR;uniform sampler2D uRegional;uniform vec4 uRegion;uniform sampler2D uContext;uniform sampler2D u00;uniform sampler2D u10;uniform sampler2D u01;uniform sampler2D u11;uniform float uMeasured;uniform float uScan;uniform float uPolar;
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
   // Survey annotations use the same map coordinates as the measured terrain.
   vec2 corridor=(vSurfaceCoord-vec2(-.8,770.8))/vec2(2371.,5999.);
   float inside=step(max(abs(corridor.x),abs(corridor.y)),1.);
   vec2 boundary=abs(abs(corridor)-1.)/max(fwidth(corridor),vec2(.00001));
   float outline=(1.-smoothstep(.65,1.6,min(boundary.x,boundary.y)))*step(max(abs(corridor.x),abs(corridor.y)),1.004);
   vec2 km=vSurfaceCoord/1000.;
   vec2 ticks=abs(fract(km+.5)-.5)/max(fwidth(km),vec2(.00001));
   float localGrid=(1.-smoothstep(.3,1.,min(ticks.x,ticks.y)))*inside;
   float sweep=exp(-pow((corridor.y-mix(-1.,1.,uSweep))/.055,2.))*inside;
   float target=abs(length(vSurfaceCoord-vec2(0.,96.))-400.)/max(fwidth(length(vSurfaceCoord-vec2(0.,96.))),1.);
   outgoingLight+=vec3(.19,.12,.048)*uSurvey*(outline*.85+localGrid*.20+sweep*.30+(1.-smoothstep(.4,1.5,target))*.6);
   // South polar stereographic, central meridian 0, standard parallel -90.
   // R contains actual PSR coverage; G only emphasizes the inner boundary.
   float latitude=(vMapUv.y-.5)*3.14159265359;
   float longitude=(vMapUv.x-.5)*6.28318530718;
   float rho=3474800.*tan(.785398163397+latitude*.5);
   vec2 xy=rho*vec2(sin(longitude),cos(longitude));
   vec2 psrUV=xy/620000.+.5;
   float valid=step(latitude,-1.3962634)*step(max(abs(xy.x),abs(xy.y)),310000.);
   vec3 polarData=texture2D(uPSR,psrUV).rgb;
   vec2 psr=polarData.rg*valid;
   // A clearly labelled cartographic hillshade, not another physical light source.
   float study=(1.-smoothstep(240000.,304000.,rho))*step(latitude,0.)*uPolar*uStudy;
   outgoingLight*=1.-.78*uPolar;
   vec3 cartographicRelief=vec3(.085,.090,.095)*(.12+2.*pow(polarData.b,2.));
   outgoingLight=mix(outgoingLight,cartographicRelief,study*.92);
   float cover=psr.r*uPolar;
   outgoingLight=mix(outgoingLight,outgoingLight*.45+vec3(.025,.19,.26),cover*.78);
   outgoingLight+=vec3(.08,.32,.38)*psr.g*uPolar;
   // Thin geographic graticule, not a scientific contour or ice boundary.
   float rings=abs(fract((-latitude*57.2957795)/5.+.5)-.5)/max(fwidth(latitude*57.2957795/5.),.0001);
   float meridians=abs(fract(longitude/0.523598776+.5)-.5)/max(fwidth(longitude/.523598776),.0001);
   float polarArea=1.-smoothstep(-1.3962634,-1.3613568,latitude);
   float grid=(1.-smoothstep(.35,1.,min(rings,meridians)))*polarArea;
   outgoingLight+=vec3(.007,.015,.018)*grid*uPolar;
   #include <opaque_fragment>
  `)
 }
 material.customProgramCacheKey=()=> 'single-geographic-planet-survey-v1'
 return {material,uniforms}
}
