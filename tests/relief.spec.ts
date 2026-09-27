import { test, expect } from '@playwright/test'
import { storyToScroll } from '../src/timeline'

// Global-scale shading used to flatten to a mathematically perfect sphere
// normal beyond 150 km camera distance (see planetMaterial.ts history), so
// orbital and polar-approach views lost all ridge/crater relief. This spec
// checks the real LOLA-derived relief normal map (scripts/prepare-global-relief.py)
// is the one actually loaded and bound, and that it does not disturb the
// single-mesh/no-second-scene invariant or the local measured surface.
test('全局起伏来自真实高程，远景不再退化为纯球面', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  const canvas = page.locator('canvas')
  // Confirms the real 8192x4096 relief asset loaded, not a missing/fallback texture.
  await expect(canvas).toHaveAttribute('data-relief-resolution', '8192x4096')
  await expect.poll(async () => Number(await canvas.getAttribute('data-gpu-textures'))).toBeGreaterThanOrEqual(20)

  // A basic photometric smoke test at the arrival orbital view: the lit
  // crescent must show real brightness range and local contrast, not a
  // uniform/blank render (catches a broken uniform or a failed texture load
  // producing a flat-black or flat-grey disc).
  await page.waitForTimeout(1000)
  const buf = await canvas.screenshot()
  const stats = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const img = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const off = document.createElement('canvas'); off.width = img.width; off.height = img.height
    const ctx = off.getContext('2d')!; ctx.drawImage(img, 0, 0)
    const w = img.width, h = img.height
    const data = ctx.getImageData(Math.floor(w * 0.40), Math.floor(h * 0.34), Math.floor(w * 0.40), 1).data
    const lum: number[] = []
    for (let i = 0; i < data.length; i += 4) lum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    let roughness = 0
    for (let i = 1; i < lum.length; i++) roughness += Math.abs(lum[i] - lum[i - 1])
    return { range: Math.max(...lum) - Math.min(...lum), roughness: roughness / lum.length }
  }, buf.toString('base64'))
  expect(stats.range).toBeGreaterThan(100)
  expect(stats.roughness).toBeGreaterThan(1)
  await page.screenshot({ path: testInfo.outputPath('orbital-relief.png') })

  // Walk through the full journey (orbit, local descent, south pole, model,
  // horizon) and confirm the relief change didn't introduce a second mesh,
  // a second camera, or console errors anywhere along the way.
  for (const p of [0, .1, .18, .345, .535, .68, .725, .84, 1]) {
    await page.evaluate(s => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * s), storyToScroll(p))
    await expect.poll(async () => Number(await canvas.getAttribute('data-flight-progress'))).toBeCloseTo(p, 3)
    await expect(canvas).toHaveAttribute('data-planet-count', '1')
    await expect(canvas).toHaveAttribute('data-scene-cameras', '1')
  }
  expect(errors).toEqual([])
})
