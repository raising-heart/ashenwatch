import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Enter fullscreen'}).click();
  await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);
  assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Begin the siege'}).click();
  const x=await page.evaluate(()=>window.__ASHENWATCH__.model.hero.x);
  await page.keyboard.down('d');
  await page.waitForFunction(x=>window.__ASHENWATCH__.model.hero.x>x+30,x);
  await page.keyboard.up('d');
  await page.screenshot({path:'test-results/fullscreen-desktop.png'});
  await page.getByRole('button',{name:'Exit fullscreen'}).click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>window.__ASHENWATCH__.model.phase),'playing');
  // External/browser exits also restore the button state.
  await page.getByRole('button',{name:'Enter fullscreen'}).click();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  // Escape must be reserved for the browser while fullscreen is active.
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>window.__ASHENWATCH__.model.phase),'playing');
  await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
  await page.getByRole('button',{name:'Enter fullscreen'}).waitFor();
  await page.setViewportSize({width:320,height:844});
  await page.waitForFunction(()=>window.__ASHENWATCH__.scene.scale.width===320);
  const brand=await page.locator('.brand').boundingBox(),tools=await page.locator('.tools').boundingBox();
  assert.ok(brand.x+brand.width<tools.x,'Four header buttons fit beside the brand on mobile');
  await page.screenshot({path:'test-results/fullscreen-mobile.png'});
  await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new DOMException('Blocked','NotAllowedError'));});
  await page.getByRole('button',{name:'Enter fullscreen'}).click();
  await page.locator('#message').filter({hasText:'Fullscreen is unavailable here'}).waitFor();
  assert.ok(await page.locator('#fullscreen').isEnabled());
  await page.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{value:false}));
  await page.reload({waitUntil:'networkidle'});
  assert.ok(await page.locator('#fullscreen').isDisabled());
  assert.match(await page.locator('#fullscreen').getAttribute('title'),/unavailable/);
  assert.deepEqual(errors,[]);
  console.log('Fullscreen checks passed: enter/exit, state sync, Escape priority, movement, mobile layout, and unavailable/blocked requests.');
}finally{await browser.close();}
