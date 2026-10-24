import type {RoutePath} from '../engine/contracts/types';

export type ObservatoryTarget = {kind:'route';path:RoutePath} | {kind:'url';href:string};
export interface ObservatoryDestination {
  id:string; title:string; category:string; description:string; target:ObservatoryTarget|null;
}

/** Page-switch extension point. Only explicitly selected cards navigate. */
export const observatoryDestinations:ObservatoryDestination[]=[
  {id:'gallery',title:'视觉与摄影馆',category:'COLLECTION / 01',
    description:'浏览当前街区的图片与作品。',target:{kind:'route',path:'/world/gallery'}},
  {id:'project-01',title:'我的项目',category:'PROJECT / 02',
    description:'为你的独立页面留出的入口。',target:null},
  {id:'project-02',title:'新的探索',category:'PROJECT / 03',
    description:'更多作品与交互体验将在这里相遇。',target:null},
];

/** External pages may be another app on this host, or an explicit HTTP(S) URL. */
export function observatoryHref(target:ObservatoryTarget):string|null {
  if(target.kind==='route')return target.path;
  if(/^\/(?!\/)/.test(target.href))return target.href;
  try {const url=new URL(target.href);return url.protocol==='http:'||url.protocol==='https:'?url.href:null;}
  catch {return null;}
}
