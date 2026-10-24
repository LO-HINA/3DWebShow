import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {ObservatoryPage} from '../src/pages/ObservatoryPage';
import {observatoryDestinations} from '../src/content/observatoryDestinations';

const render=()=>renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/world/observatory']},createElement(ObservatoryPage)));
const initial=render();
assert.match(initial,/href="\/world\/gallery"/);
assert.match(initial,/id="destinations-title"/);
assert.ok(!initial.includes('href="#"'),'pending slots must not be dead links');
const slot=observatoryDestinations.find(entry=>entry.id==='project-01')!;
const original=slot.target;
try{
  slot.target={kind:'url',href:'/apps/my-project/'};
  const withExternal=render();
  assert.match(withExternal,/href="\/apps\/my-project\/" target="_blank" rel="noopener noreferrer"/);
  slot.target={kind:'url',href:'javascript:alert(1)'};
  assert.ok(!render().includes('javascript:'),'invalid page targets remain disabled');
}finally{slot.target=original;}
const report={status:'passed',evidence:'React server render only; no browser navigation or visual claim',
  existingRouteVisible:true,configuredIndependentPageUsesNewTab:true,emptyAndInvalidSlotsDoNotNavigate:true,
  returnLinkPresent:initial.includes('href="/world"')};
mkdirSync('docs/orrery-review',{recursive:true});writeFileSync('docs/orrery-review/page-checks.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
