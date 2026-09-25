import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import colorUrl from '../assets/lroc-color-4k.webp'
import heightUrl from '../assets/lola-height-rg.png'
import { sample } from '../timeline'
import { haloFragment, haloVertex, moonFragment, moonVertex } from './shaders'

type Props = { progress: RefObject<number>; reduced: boolean; onReady: () => void; onFailure: () => void }

function Moon({ progress, onReady }: Pick<Props, 'progress' | 'onReady'>) {
  const [color, height] = useLoader(THREE.TextureLoader, [colorUrl, heightUrl])
  const group = useRef<THREE.Group>(null)
  const surface = useRef<THREE.ShaderMaterial>(null)
  const { gl, size } = useThree()
  const sun = useMemo(() => new THREE.Vector3(-3, 2, 4).normalize(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const uniforms = useMemo(() => ({
    uColor: { value: color }, uHeight: { value: height },
    uSun: { value: sun }, uRelief: { value: 2.5 },
    uScan: { value: 0 }, uPolar: { value: 0 }, uProgress: { value: 0 },
  }), [color, height, sun])

  useEffect(() => {
    color.colorSpace = THREE.SRGBColorSpace
    height.colorSpace = THREE.NoColorSpace
    for (const texture of [color, height]) {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      texture.needsUpdate = true
    }
    // Packed 16-bit elevation must not be gamma-decoded.
    height.minFilter = THREE.LinearFilter
    height.magFilter = THREE.LinearFilter
    height.generateMipmaps = false
  }, [color, height, gl])

  const readySent = useRef(false)
  useFrame(({ camera }) => {
    const p = progress.current
    const mobile = size.width < 760
    if (!group.current) return
    // All camera/light/overlay states are interpolated from the same playhead.
    group.current.position.set(sample(mobile ? [0.1, 0.35, -0.2, 0.15, 0] : [1.3, 1.75, -1.5, 1.55, 0], p), sample(mobile ? [2.7, 2.8, 2.8, 2.8, 0.5] : [-0.12, -0.3, -0.08, 0, 0.05], p), 0)
    group.current.rotation.set(sample([0.1, 0.25, -0.95, 0.3, 0.05], p), sample([-1.55, -0.8, -0.2, 0.75, 1.8], p), sample([-0.18, -0.3, 0.35, -0.12, -0.2], p))
    camera.position.set(sample([0, 0.3, -0.25, 0.15, 0], p), sample([0.1, 0.35, -0.2, 0.25, 0.15], p), sample(mobile ? [15.5, 13.5, 14.5, 15.8, 18] : [7.2, 5.5, 6.6, 7.4, 19.2], p))
    look.set(0, mobile ? 0.25 : 0, 0)
    camera.lookAt(look)
    sun.set(sample([-4, -4, 1.4, -2, -3], p), sample([1.8, 1, 1, 2.3, 1], p), sample([1.9, 1.2, 0.1, 3, 2], p)).normalize()
    // Mutate the material's live uniforms; React's reconciler may copy the
    // original uniforms prop when the loading boundary settles.
    if (surface.current) {
      surface.current.uniforms.uRelief.value = sample([2.1, 3.4, 2.8, 2, 2.1], p)
      surface.current.uniforms.uScan.value = sample([0, 0.06, 0, 1, 0.15], p)
      surface.current.uniforms.uPolar.value = sample([0, 0, 1, 0, 0], p)
      surface.current.uniforms.uProgress.value = p
      surface.current.uniforms.uSun.value.copy(sun)
    }
    if (!readySent.current) { readySent.current = true; onReady() }
  })

  return <group ref={group}>
    <mesh>
      <sphereGeometry args={[1.62, size.width < 760 ? 256 : 384, size.width < 760 ? 128 : 192]} />
      <shaderMaterial ref={surface} vertexShader={moonVertex} fragmentShader={moonFragment} uniforms={uniforms} />
    </mesh>
    <mesh>
      <sphereGeometry args={[1.72, 96, 64]} />
      <shaderMaterial vertexShader={haloVertex} fragmentShader={haloFragment} uniforms={uniforms} side={THREE.BackSide} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  </group>
}

function Starfield({ progress }: Pick<Props, 'progress'>) {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    let seed = 4720
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const data = new Float32Array(850 * 3)
    for (let i = 0; i < 850; i++) {
      data[i * 3] = (rand() - 0.5) * 65
      data[i * 3 + 1] = (rand() - 0.5) * 40
      data[i * 3 + 2] = -14 - rand() * 30
    }
    return data
  }, [])
  useFrame(() => { if (points.current) points.current.rotation.z = progress.current * -0.04 })
  return <points ref={points}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial size={0.024} color="#b7c1c9" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
  </points>
}

function Orbits({ progress }: Pick<Props, 'progress'>) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.LineBasicMaterial>(null)
  const geometry = useMemo(() => {
    const pts = Array.from({ length: 257 }, (_, i) => new THREE.Vector3(Math.cos(i / 256 * Math.PI * 2) * 2.22, Math.sin(i / 256 * Math.PI * 2) * 2.22, 0))
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#a38d66', transparent: true, opacity: 0 }), [])
  const line = useMemo(() => new THREE.LineLoop(geometry, lineMaterial), [geometry, lineMaterial])
  useEffect(() => { material.current = lineMaterial; return () => { geometry.dispose(); lineMaterial.dispose() } }, [geometry, lineMaterial])
  useFrame(({ size }) => {
    const p = progress.current
    if (group.current) {
      group.current.position.set(size.width < 760 ? 0.15 : 1.55, size.width < 760 ? 2.8 : 0, 0)
      group.current.rotation.set(1.18, 0.3, p * 1.1)
    }
    lineMaterial.opacity = sample([0, 0, 0, 0.42, 0], p)
  })
  return <group ref={group}><primitive object={line} /></group>
}

export default function LunarScene({ progress, reduced, onReady, onFailure }: Props) {
  return <Canvas camera={{ position: [0, 0.1, 7.2], fov: 38, near: 0.1, far: 100 }} dpr={[1, 1.6]} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
    gl.setClearColor('#080a0c')
    gl.toneMapping = THREE.NoToneMapping
    gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onFailure() }, { once: true })
  }} fallback={<span>浏览器不支持画布，月面叙事仍可阅读。</span>}>
    <Suspense fallback={null}><Moon progress={progress} onReady={onReady} /></Suspense>
    <Starfield progress={progress} />
    <Orbits progress={progress} />
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.42} luminanceThreshold={0.88} luminanceSmoothing={0.5} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Noise opacity={reduced ? 0 : 0.027} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette offset={0.25} darkness={0.55} eskil={false} />
    </EffectComposer>
  </Canvas>
}
