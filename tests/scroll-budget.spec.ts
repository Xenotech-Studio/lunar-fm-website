import { test, expect } from '@playwright/test'
import { storyToScroll, scrollToStory, SCROLL_SCALE, chapters, surveyWeight } from '../src/timeline'
import { flight } from '../src/scene/flight'

test('下降增加滚动距离；其他幕原有像素预算不变；正反映射可逆',()=>{
 for(let i=0;i<=1000;i++){const p=i/1000;expect(scrollToStory(storyToScroll(p))).toBeCloseTo(p,8)}
 for(const [a,b] of [[0,.18],[.52,.68],[.68,.84],[.84,1]]){
  expect((storyToScroll(b)-storyToScroll(a))*SCROLL_SCALE).toBeCloseTo(b-a,9)
 }
 expect((storyToScroll(.28)-storyToScroll(.22))*SCROLL_SCALE/(.28-.22)).toBeCloseTo(2.5,9)
})
test('触地前缓冲单调减速且无停顿反冲',()=>{
 const height=()=>-2104.28
 const stations=[.47,.485,.50,.52]
 const h=stations.map(p=>flight(p,false,height).altitude)
 expect(h[0]).toBeCloseTo(9,6);expect(h[1]).toBeCloseTo(4.2,6);expect(h[2]).toBeCloseTo(2.5,6);expect(h[3]).toBeCloseTo(2.1,6)
 const speeds=stations.slice(1).map((p,i)=>(h[i]-h[i+1])/(storyToScroll(p)-storyToScroll(stations[i])))
 expect(speeds[0]).toBeGreaterThan(speeds[1]);expect(speeds[1]).toBeGreaterThan(speeds[2])
 const lastSpeed=(flight(.5199,false,height).altitude-2.1)/.0001
 expect(lastSpeed).toBeLessThan(1)
})

test('六幕保持顺序，档案锚点悬停，立于月面锚点已触地',()=>{
 const height=()=>-2104.28
 expect(chapters).toHaveLength(6)
 for(let i=1;i<chapters.length;i++)expect(chapters[i].position).toBeGreaterThan(chapters[i-1].position)
 for(let p=.33;p<=.365;p+=.001){expect(flight(p,false,height).altitude).toBeCloseTo(20000,5);expect(surveyWeight(p)).toBe(1)}
 expect(flight(chapters[1].position,false,height).altitude).toBeCloseTo(20000,5)
 expect(flight(chapters[2].position,false,height).altitude).toBeCloseTo(2.1,5)
 expect(surveyWeight(chapters[2].position)).toBe(0)
 expect((storyToScroll(.365)-storyToScroll(.33))*SCROLL_SCALE*800).toBeCloseTo(126,5)
 for(let p=.366;p<=.52;p+=.001)expect(flight(p,false,height).altitude).toBeLessThan(flight(p-.001,false,height).altitude)
})
