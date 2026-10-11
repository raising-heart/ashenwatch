import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'});
await page.getByRole('button',{name:'Begin the siege'}).click();
const hero=await page.evaluate(()=>window.__ASHENWATCH__.model.hero.id);
async function pose(id=hero){return page.evaluate(id=>{const a=window.__ASHENWATCH__.scene.children.list.find(a=>a.type==='Sprite'&&a.getData('unitId')===id);return a?{frame:Number(a.frame.name),motion:a.getData('motion')}:undefined;},id);}
async function advance(seconds){const time=await page.evaluate(()=>window.__ASHENWATCH__.model.time);await page.waitForFunction(t=>window.__ASHENWATCH__.model.time>=t,time+seconds);}
await page.waitForFunction(id=>window.__ASHENWATCH__.scene.children.list.some(a=>a.type==='Sprite'&&a.getData('unitId')===id),hero);
const idleFrames=new Set();for(let i=0;i<6;i++){idleFrames.add((await pose()).frame);await advance(.18);}
assert.ok(idleFrames.size>2,'Idle breathing changes sprite frames');
await page.keyboard.down('d');
await page.waitForFunction(id=>window.__ASHENWATCH__.scene.children.list.some(a=>a.getData?.('unitId')===id&&a.getData('motion')==='walk'),hero);
const walkFrames=new Set();for(let i=0;i<5;i++){walkFrames.add((await pose()).frame);await advance(.06);}await page.keyboard.up('d');
assert.ok(walkFrames.size>2,'Walking changes leg and cloak frames');
const arrowY=await page.evaluate(()=>window.__ASHENWATCH__.model.hero.y);await page.keyboard.down('ArrowDown');await page.waitForFunction(y=>window.__ASHENWATCH__.model.hero.y>y+10,arrowY);await page.keyboard.up('ArrowDown');
await page.keyboard.press('x');await page.keyboard.down('Space');
await page.waitForFunction(id=>window.__ASHENWATCH__.scene.children.list.some(a=>a.getData?.('unitId')===id&&a.getData('motion')==='attack'),hero);
const attackFrames=new Set();for(let i=0;i<3;i++){attackFrames.add((await pose()).frame);await advance(.06);}
await page.keyboard.up('Space');assert.ok(attackFrames.size>1,'Weapon swing advances through attack poses');
await page.keyboard.press('q');await page.waitForFunction(id=>window.__ASHENWATCH__.scene.children.list.some(a=>a.getData?.('unitId')===id&&a.getData('motion')==='cast'),hero);
await page.getByRole('button',{name:'Pause game'}).click();await page.waitForTimeout(80);const paused=await pose();await page.waitForTimeout(300);assert.deepEqual(await pose(),paused,'Paused animation stays on its frame');
await page.getByRole('button',{name:'Return to the valley'}).click();
const encounter=await page.evaluate(()=>{const m=window.__ASHENWATCH__.model,b=m.units.find(u=>u.archetype==='stonewarden');m.waveTimer=10000;m.recruitTimer=10000;for(const u of m.units)if(u.id!==b.id)u.hp=0;m.hero.x=b.x+80;m.hero.y=b.y;m.hero.hp=m.hero.maxHp;m.stop();m.cooldowns.slash=10;b.specialCooldown=0;return b.id;});
await page.waitForFunction(id=>window.__ASHENWATCH__.model.hazards.some(h=>h.sourceId===id),encounter);
assert.equal((await pose(encounter)).motion,'cast','Boss raises arms for slam telegraph');
await page.screenshot({path:'test-results/animated-boss-wide.png'});
// Capture several animation phases on one contact sheet for visual inspection.
await page.evaluate(()=>{const s=window.__ASHENWATCH__.scene,cv=document.createElement('canvas');cv.id='pose-preview';cv.width=1152;cv.height=420;cv.style.cssText='position:fixed;top:0;left:0;z-index:10000;background:#294137';const c=cv.getContext('2d');c.fillStyle='#294137';c.fillRect(0,0,cv.width,cv.height);const frames=[0,2,6,8,10,12,14,16,18,20,22,24];for(const [row,key] of ['hero','wolf','stonewarden'].entries()){const source=s.textures.get(key).getSourceImage();for(let i=0;i<frames.length;i++)c.drawImage(source,frames[i]%7*128,Math.floor(frames[i]/7)*140,128,140,i*96,row*140,96,105);c.fillStyle='#e7e6c9';c.font='14px sans-serif';c.fillText(key+' · idle / walk / attack / cast',12,row*140+127);}document.body.append(cv);});
await page.locator('#pose-preview').screenshot({path:'test-results/character-animation-poses.png'});await page.locator('#pose-preview').evaluate(e=>e.remove());
await page.evaluate(id=>{const m=window.__ASHENWATCH__.model;m.damage(m.units.find(u=>u.id===id),1);},encounter);
await page.waitForFunction(id=>window.__ASHENWATCH__.scene.children.list.some(a=>a.getData?.('unitId')===id&&a.getData('motion')==='hurt'),encounter);
await page.evaluate(id=>{const m=window.__ASHENWATCH__.model;m.hero.hp=m.hero.maxHp;m.damage(m.units.find(u=>u.id===id),9999);},encounter);
await page.waitForFunction(id=>!window.__ASHENWATCH__.model.units.some(u=>u.id===id),encounter);
assert.ok(await pose(encounter),'Dead creature remains visible for its death animation');
// Reward upgrades pause simulation; resume so the death fade can finish.
if(await page.locator('[data-upgrade="power"]').isVisible())await page.locator('[data-upgrade="power"]').click();
await page.waitForFunction(id=>!window.__ASHENWATCH__.scene.children.list.some(a=>a.getData?.('unitId')===id),encounter);
assert.deepEqual(errors,[],'No browser exceptions');
console.log('Animation checks passed: idle, walking, weapon swings, casting, pause, boss wind-up, hit reaction, and death fade.');
await browser.close();
