import { test, expect } from '@playwright/test'
import { storyToScroll, chapters } from '../src/timeline'

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
    await expect(page.locator('html')).toHaveAttribute('data-navigation', 'idle', {timeout:60000})
    await expect(page.locator('html')).toHaveAttribute('data-chapter', String(index))
    await expect.poll(async () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(chapters[index].position, 2)
    await expect(page.locator(`.chapter[data-chapter="${index}"]`)).toHaveAttribute('aria-hidden', 'false')
    if(index === 2) { await expect(page.locator('canvas')).toHaveAttribute('data-surface','ready'); await page.waitForTimeout(800) }
    await page.screenshot({ path: testInfo.outputPath(`chapter-${name}.png`) })
  }
  // Verify a position between chapter anchors exists instead of snapping.
  await page.evaluate(p => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), storyToScroll(.37))
  await expect.poll(async () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(0.37, 2)
  await page.getByRole('button', { name: 'Field notes' }).click()
  await expect(page.locator('dialog')).toBeVisible()
  await expect(page.locator('dialog a')).toHaveCount(6)
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
  for (const index of [0, 1, 2, 3, 4, 5]) {
    await page.locator('[data-nav]').nth(index).click()
    await expect(page.locator('html')).toHaveAttribute('data-navigation', 'idle', {timeout:60000})
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
  await expect(page.locator('html')).toHaveAttribute('data-navigation', 'idle', {timeout:60000})
  await expect(page.locator('html')).toHaveAttribute('data-chapter', '5')
  await expect(page.getByRole('link', { name: 'Explore the model' })).toBeVisible()
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
  // Orbit already uses PBR; the shared DFG LUT is included in the baseline.
  const warmedBaseline=baseline
  async function scrub(p: number) {
    await page.evaluate(p => scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p),storyToScroll(p))
    await expect.poll(async()=>page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(p,3)
  }
  await scrub(.35)
  await expect(canvas).toHaveAttribute('data-surface','ready')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(20000,-1)
  await page.screenshot({path:testInfo.outputPath('nac-craters-35.png')})
  await scrub(.41)
  await expect(canvas).toHaveAttribute('data-surface','ready')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(1000,0)
  await page.screenshot({path:testInfo.outputPath('nac-craters-39.png')})
  await scrub(.44)
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(110,0)
  await scrub(.535)
  await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(2.1,1)
  await expect(canvas).toHaveAttribute('data-planet-count','1')
  await expect(canvas).toHaveAttribute('data-above-terrain','true')
  await expect(canvas).toHaveAttribute('data-scene-cameras','1')
  await page.screenshot({path:testInfo.outputPath('earth-from-surface-50.png')})
  const firstLoaded=Number(await canvas.getAttribute('data-gpu-textures'))
  expect(firstLoaded).toBeGreaterThan(baseline)
  await scrub(.70)
  await expect(canvas).toHaveAttribute('data-surface','unloaded')
  await expect(canvas).toHaveAttribute('data-surface-bytes','0')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-gpu-textures'))).toBeLessThanOrEqual(warmedBaseline)
  await scrub(.535)
  await expect(canvas).toHaveAttribute('data-surface','ready')
  await page.waitForTimeout(800)
  expect(Number(await canvas.getAttribute('data-gpu-textures'))).toBeLessThanOrEqual(firstLoaded)
  await scrub(.1)
  await expect(canvas).toHaveAttribute('data-surface','unloaded')
  await expect.poll(async()=>Number(await canvas.getAttribute('data-gpu-textures'))).toBeLessThanOrEqual(warmedBaseline)
  expect(errors).toEqual([])
  await testInfo.attach('resource-validation', { body:JSON.stringify({baseline,warmedBaseline,firstLoaded,errors}),contentType:'application/json' })
})


test('极区科学图层随滚动进入退出，仍为单一月面', async ({page},testInfo)=>{
 const errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto('/')
 await expect(page.locator('.universe')).toHaveClass(/is-ready/)
 for(const p of [.68,.705,.725,.755,.80,.84,.725]){
  await page.evaluate(s=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*s),storyToScroll(p))
  await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-flight-progress'))).toBeCloseTo(p,3)
  await expect(page.locator('canvas')).toHaveAttribute('data-planet-count','1')
  await expect(page.locator('canvas')).toHaveAttribute('data-scene-cameras','1')
  await expect(page.locator('canvas')).toHaveAttribute('data-above-terrain','true')
  await expect(page.locator('canvas')).toHaveAttribute('data-polar-layer','LOLA-PSR-area-over-1km2')
  if(p===.725){
   await expect(page.locator('.polar')).toBeVisible()
   await expect(page.locator('.polar')).toContainText('Permanent shadow is not confirmed ice')
   await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-polar-weight'))).toBeGreaterThan(.99)
   await page.screenshot({path:testInfo.outputPath('polar-psr.png')})
  }
  if(p===.84) await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-polar-weight'))).toBeLessThan(.001)
 }
 expect(errors).toEqual([])
})

test('档案悬停可逆，扫描随滚动推进，直达月面不落在下降途中',async({page},testInfo)=>{
 const errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto('/')
 await expect(page.locator('.universe')).toHaveClass(/is-ready/)
 await page.getByRole('button',{name:'Chapter 2: Survey'}).click()
 await expect(page.locator('html')).toHaveAttribute('data-navigation','idle',{timeout:60000})
 const canvas=page.locator('canvas')
 await expect(canvas).toHaveAttribute('data-surface','ready')
 for(const p of [.33,.345,.365,.40,.365,.345,.33]){
  await page.evaluate(s=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*s),storyToScroll(p))
  await expect.poll(async()=>Number(await canvas.getAttribute('data-flight-progress'))).toBeCloseTo(p,3)
  await expect(canvas).toHaveAttribute('data-planet-count','1')
  if(p<=.365){
   await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(20000,0)
   await expect(page.locator('.terrain')).toContainText('The ground keeps a record.')
   await expect.poll(async()=>Number(await canvas.getAttribute('data-survey-weight'))).toBeGreaterThan(.99)
  }
 }
 await page.getByRole('button',{name:'Chapter 3: Surface'}).click()
 await expect(page.locator('html')).toHaveAttribute('data-navigation','idle',{timeout:60000})
 await expect.poll(async()=>Number(await canvas.getAttribute('data-altitude'))).toBeCloseTo(2.1,1)
 await expect(canvas).toHaveAttribute('data-survey-weight','0')
 await page.screenshot({path:testInfo.outputPath('new-surface-anchor.png')})
 expect(errors).toEqual([])
})
