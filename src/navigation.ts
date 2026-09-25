// Perceived travel, not metres: spend more time where the altitude changes by
// orders of magnitude and where the camera approaches / leaves the ground.
// Integrating smooth densities gives a C2 distance map without keyframe stops.
const stations = [0, .18, .20, .27, .30, .33, .365, .385, .41, .44, .47, .52, .56, .59, .62, .65, .68, .755, .84, 1]
const densities = [1, 1, 2, 3, 3, 2, 2, 5, 4, 4, 4, 4, 2, 4, 4, 3, 1, 1.5, 1, 1]
const clamp = (n:number) => Math.max(0, Math.min(1, n))
export function navigationDistance(p:number) {
  p=clamp(p)
  let distance=0
  for(let i=0;i<stations.length-1;i++) {
    const width=stations[i+1]-stations[i]
    const t=clamp((p-stations[i])/width)
    distance+=width*(densities[i]*t+(densities[i+1]-densities[i])*(t*t*t-.5*t*t*t*t))
    if(p<=stations[i+1])break
  }
  return distance
}
export function navigationPosition(distance:number) {
  let lo=0,hi=1
  for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(navigationDistance(mid)<distance)lo=mid;else hi=mid}
  return (lo+hi)/2
}
// Zero velocity and acceleration at both ends; one ease over the entire trip.
export const navigationEase=(t:number)=>{const u=clamp(t);return u*u*u*(10+u*(-15+6*u))}
export function navigationPlan(from:number,to:number) {
  const start=navigationDistance(from),end=navigationDistance(to),distance=Math.abs(end-start)
  return {from,to,start,end,duration:distance<.00001?0:1800+15000*distance}
}
export function navigationSample(plan:ReturnType<typeof navigationPlan>,elapsed:number) {
  if(elapsed<=0)return plan.from
  if(elapsed>=plan.duration)return plan.to
  return navigationPosition(plan.start+(plan.end-plan.start)*navigationEase(elapsed/plan.duration))
}
