import { test, expect } from '@playwright/test'
import { PerspectiveCamera, Vector3 } from 'three'
import { navigationDistance, navigationPosition, navigationPlan, navigationSample, navigationEase } from '../src/navigation'
import { flight, descentGaze } from '../src/scene/flight'
import { CENTER } from '../src/scene/geography'

test('点击行程单调可逆、长途更慢、端点速度与加速度归零',()=>{
 for(let i=0;i<=1000;i++) expect(navigationPosition(navigationDistance(i/1000))).toBeCloseTo(i/1000,8)
 expect(navigationEase(0)).toBe(0);expect(navigationEase(1)).toBe(1)
 expect(navigationEase(.001)/.001).toBeLessThan(.0001)
 expect((1-navigationEase(.999))/.001).toBeLessThan(.0001)
 const long=navigationPlan(0,.535),back=navigationPlan(.535,0),short=navigationPlan(.345,.535)
 expect(long.duration).toBeGreaterThan(20000);expect(long.duration).toBeGreaterThan(short.duration)
 expect(back.duration).toBe(long.duration)
 for(let i=1;i<=1000;i++){
  const t=long.duration*i/1000
  expect(navigationSample(long,t)).toBeGreaterThan(navigationSample(long,t-long.duration/1000))
  expect(navigationSample(back,long.duration-t)).toBeCloseTo(navigationSample(long,t),8)
 }
 expect(navigationSample(long,long.duration)).toBe(.535)
})

test('悬停后提前抬升视线，千米高度地球入画，最后几十米姿态稳定',()=>{
 const height=()=>-2104.28
 for(const mobile of [false,true]){
  const earth=new Vector3(6500,8500,-22000).normalize().multiplyScalar(384400000)
  const rows=[]
  for(const p of [.365,.38,.39,.40,.41,.42,.44,.455,.47,.52,.535]){
   const pose=flight(p,mobile,height)
   const camera=new PerspectiveCamera(pose.fov,mobile?390/844:1200/800,.08,1e9)
   camera.position.copy(pose.position);camera.quaternion.copy(pose.quaternion);camera.updateMatrixWorld()
   const earthNdc=earth.clone().project(camera)
   const forward=new Vector3(0,0,-1).applyQuaternion(pose.quaternion)
   const pitch=Math.asin(forward.dot(pose.position.clone().sub(CENTER).normalize()))*180/Math.PI
   rows.push({p,altitude:pose.altitude,pitch,earthY:earthNdc.y})
   if(p===.41){expect(pose.altitude).toBeGreaterThan(900);expect(Math.abs(earthNdc.y)).toBeLessThan(.95);expect(Math.abs(earthNdc.x)).toBeLessThan(.95)}
   if(p===.40)expect(pitch+pose.fov/2).toBeGreaterThan(0)
   if(p>=.455)expect(pose.quaternion.angleTo(flight(.535,mobile,height).quaternion)).toBeLessThan(.0001)
  }
  console.log(JSON.stringify({mobile,rows}))
 }
 expect(descentGaze(.365)).toBe(0);expect(descentGaze(.455)).toBe(1)
 expect(descentGaze(.36501)/.00001).toBeLessThan(.05)
 expect((1-descentGaze(.45499))/.00001).toBeLessThan(.01)
})

test('点击途中可滚轮接管、连续改选、减少动态效果直达',async({page})=>{
 await page.goto('/')
 await expect(page.locator('.universe')).toHaveClass(/is-ready/)
 await page.locator('[data-nav]').nth(2).click()
 await expect(page.locator('html')).toHaveAttribute('data-navigation','running')
 await page.waitForTimeout(2000)
 const before=await page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))
 expect(before).toBeGreaterThan(0);expect(before).toBeLessThan(.2)
 await page.locator('[data-nav]').nth(3).click()
 expect(Number(await page.locator('html').getAttribute('data-navigation-from'))).toBeCloseTo(before,2)
 await page.mouse.wheel(0,160)
 await expect(page.locator('html')).toHaveAttribute('data-navigation','idle')
 const stopped=await page.evaluate(()=>scrollY)
 await page.waitForTimeout(800)
 expect(await page.evaluate(()=>scrollY)).toBe(stopped)
 await page.locator('[data-nav]').nth(5).click()
 await expect(page.locator('html')).toHaveAttribute('data-navigation','running')
 await page.keyboard.press('Escape')
 await expect(page.locator('html')).toHaveAttribute('data-navigation','idle')
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.locator('[data-nav]').nth(2).click()
 await expect(page.locator('html')).toHaveAttribute('data-navigation','idle')
 await expect.poll(async()=>page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(.535,3)
})
