import { test, expect } from '@playwright/test'
import { flight } from '../src/scene/flight'
import { CENTER, R, point, geographic, PX, PY } from '../src/scene/geography'

test('同一地理坐标下，连续轨迹没有位置/视线跳变或穿地', () => {
  const height = () => -2104.279541015625
  const geo = geographic(0, 0)
  expect(geo.lat * 180 / Math.PI).toBeCloseTo(20.3179659, 5)
  expect(geo.lon * 180 / Math.PI).toBeCloseTo(30.3738633, 5)
  expect(point(0, 0, height()).distanceTo(CENTER)).toBeCloseTo(R + height(), 6)
  expect(PX).toBeLessThan(0); expect(PY).toBeGreaterThan(0)
  for (const mobile of [false, true]) {
    let previous = flight(.1999, mobile, height)
    for (let i = 2000; i <= 6801; i++) {
      const pose = flight(i / 10000, mobile, height)
      expect(pose.position.toArray().every(Number.isFinite)).toBe(true)
      expect(pose.position.distanceTo(CENTER)).toBeGreaterThanOrEqual(R + height() + 2.099)
      expect(pose.quaternion.angleTo(previous.quaternion), `orientation at ${i / 10000}, mobile=${mobile}`).toBeLessThan(.04)
      expect(pose.position.distanceTo(previous.position) / Math.max(previous.altitude, 100), `translation at ${i / 10000}, mobile=${mobile}`).toBeLessThan(.12)
      previous = pose
    }
  }
})
