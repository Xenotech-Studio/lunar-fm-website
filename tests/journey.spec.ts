import { test, expect } from '@playwright/test'

test('WebGL、连续滚动、六幕导航与档案弹窗', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  await expect(page.locator('.universe')).not.toHaveClass(/is-fallback/)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1400)
  await page.screenshot({ path: testInfo.outputPath('01-observe.png') })
  for (const [index, name] of ['arrival', 'terrain', 'surface', 'shadow', 'intelligence', 'horizon'].entries()) {
    await page.locator('[data-nav]').nth(index).click()
    await expect(page.locator('html')).toHaveAttribute('data-chapter', String(index))
    await expect.poll(async () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo([0, .18, .5, .68, .84, 1][index], 2)
    await expect(page.locator(`.chapter[data-chapter="${index}"]`)).toHaveAttribute('aria-hidden', 'false')
    if(index === 2) { await expect(page.locator('canvas')).toHaveAttribute('data-surface','ready'); await page.waitForTimeout(800) }
    await page.screenshot({ path: testInfo.outputPath(`chapter-${name}.png`) })
  }
  // Verify a position between chapter anchors exists instead of snapping.
  await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.37))
  await expect.poll(async () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(0.37, 2)
  await page.getByRole('button', { name: '任务档案' }).click()
  await expect(page.locator('dialog')).toBeVisible()
  await expect(page.locator('dialog a')).toHaveCount(5)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('footer')).toContainText('Image credit: NASA')
  expect(errors).toEqual([])
})

test('手机构图与减少动态效果', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  await page.evaluate(() => document.fonts.ready)
  for (const index of [0, 2, 3, 4, 5]) {
    await page.locator('[data-nav]').nth(index).click()
    await expect(page.locator('html')).toHaveAttribute('data-chapter', `${index}`)
    if(index === 2) { await expect(page.locator('canvas')).toHaveAttribute('data-surface','ready'); await page.waitForTimeout(800) }
    await page.screenshot({ path: testInfo.outputPath(`mobile-${index}.png`) })
    const bounds = await page.locator(`.chapter[data-chapter="${index}"] h1, .chapter[data-chapter="${index}"] h2`).boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('WebGL不可用时仍能阅读和导航', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args] as Parameters<typeof original>)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-fallback/)
  await page.locator('[data-nav]').nth(5).click()
  await expect(page.locator('html')).toHaveAttribute('data-chapter', '5')
  await expect(page.getByRole('link', { name: '探索开放模型' })).toBeVisible()
})


test('地表按需加载、连续高度、释放与重访', async ({ page }, testInfo) => {
  const errors: string[] = [], requests: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if(m.type() === 'error') errors.push(m.text()) })
  page.on('request', r => requests.push(r.url()))
  await page.goto('/')
  const canvas = page.locator('canvas')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  await page.waitForTimeout(1000)
  expect(requests.some(u => /nac-0-0|terrain-.*f32|blue-marble/.test(u))).toBe(false)
  const baseline=Number(await canvas.getAttribute('data-gpu-textures'))
  // Three r186 lazily creates a shared 16x16 RG16F DFG LUT on first PBR render.
  // It is renderer-owned (1024 bytes), not a surface texture.
  const warmedBaseline=baseline+1
  async function scrub(p: number) {
    await page.evaluate(p => scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p),p)
    await expect.poll(async()=>page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(p,3)
  }
  await scrub(.35)
  await expect(canvas).toHaveAttribute('data-surface','ready')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(600,0)
  await page.screenshot({path:testInfo.outputPath('nac-craters-35.png')})
  await scrub(.39)
  await expect(canvas).toHaveAttribute('data-surface','ready')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(65,0)
  await page.screenshot({path:testInfo.outputPath('nac-craters-39.png')})
  await scrub(.43)
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(18,0)
  await scrub(.50)
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(2.1,1)
  await page.screenshot({path:testInfo.outputPath('earth-from-surface-50.png')})
  const firstLoaded=Number(await canvas.getAttribute('data-gpu-textures'))
  expect(firstLoaded).toBeGreaterThan(baseline)
  await scrub(.70)
  await expect(canvas).toHaveAttribute('data-surface','unloaded')
  await expect(canvas).toHaveAttribute('data-surface-bytes','0')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-gpu-textures'))).toBeLessThanOrEqual(warmedBaseline)
  await scrub(.50)
  await expect(canvas).toHaveAttribute('data-surface','ready')
  await page.waitForTimeout(800)
  expect(Number(await canvas.getAttribute('data-gpu-textures'))).toBeLessThanOrEqual(firstLoaded)
  await scrub(.1)
  await expect(canvas).toHaveAttribute('data-surface','unloaded')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-gpu-textures'))).toBeLessThanOrEqual(warmedBaseline)
  expect(errors).toEqual([])
  await testInfo.attach('resource-validation', { body:JSON.stringify({baseline,warmedBaseline,firstLoaded,errors}),contentType:'application/json' })
})
