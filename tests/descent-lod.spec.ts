import { test, expect } from '@playwright/test'
import { storyToScroll } from '../src/timeline'

// Phase 1 of the LOD engine (docs/lod-engine-plan.md): the orbital mesh's
// existing 768 m nested rings around the point of interest previously
// sampled a 2.7 km/px global elevation texture -- finer vertices than the
// data they read. This spec checks the real native-resolution patch
// (scripts/prepare-descent-relief.py) actually ships intact and is wired in,
// without touching the already-tested NAC corridor or polar layers.
test('下降路径局部高程为真实原生分辨率数据，非退化/损坏', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  const canvas = page.locator('canvas')

  // 271x271 grid, exact match confirms the asset loaded uncorrupted/untruncated.
  await expect(canvas).toHaveAttribute('data-descent-relief-samples', '73441')

  // Real Taurus-Littrow terrain varies by kilometres, not metres -- this
  // fails hard if the shipped patch is ever silently replaced with a flat
  // or procedural fallback. Range and spread are computed once in-app from
  // the actual decoded Float32Array (see LunarScene.tsx), not re-fetched.
  const [min, max, stddev] = (await canvas.getAttribute('data-descent-relief-range'))!.split(',').map(Number)
  expect(stddev).toBeGreaterThan(200)
  expect(min).toBeGreaterThan(-6000)
  expect(min).toBeLessThan(-1000)
  expect(max).toBeLessThan(3000)

  // Sanity across the descent: still a single mesh, single camera, no errors,
  // whether or not the higher-precision NAC data has finished loading yet.
  for (const p of [0, .19, .22, .27, .33, .535]) {
    await page.evaluate(s => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * s), storyToScroll(p))
    await expect.poll(async () => Number(await canvas.getAttribute('data-flight-progress'))).toBeCloseTo(p, 3)
    await expect(canvas).toHaveAttribute('data-planet-count', '1')
    await expect(canvas).toHaveAttribute('data-scene-cameras', '1')
    if (p === .22) await page.screenshot({ path: testInfo.outputPath('descent-transition.png') })
  }
  expect(errors).toEqual([])
})
