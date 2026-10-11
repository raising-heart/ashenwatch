import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const url = process.env.PLAY_URL || 'https://raising-heart.github.io/ashenwatch/';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], failedAssets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).origin === new URL(url).origin && response.status() >= 400)
      failedAssets.push(`${response.status()} ${response.url()}`);
  });
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, 'Public game responds successfully');
  await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: 'Begin the siege' }).click();
  assert.equal(await page.evaluate(() => typeof window.__ASHENWATCH__), 'undefined', 'Production omits debug access');
  const before = await page.locator('#map-hero').getAttribute('cx');
  await page.keyboard.down('d');
  await page.waitForFunction(x => document.querySelector('#map-hero').getAttribute('cx') !== x, before);
  await page.keyboard.up('d');
  await page.keyboard.press('q');
  await page.waitForFunction(() => Number(document.querySelector('#cd-nova').textContent) > 0);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.locator('#music-volume').waitFor();
  const pausedTimer = await page.locator('#timer').textContent();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#timer').textContent(), pausedTimer, 'Pause freezes countdown');
  await page.getByRole('button', { name: 'Return to the valley' }).click();
  await page.waitForFunction(() => document.querySelector('#wave').textContent.includes('1 / 3'), null, { timeout: 20000 });
  await page.screenshot({ path: 'test-results/pages-desktop.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Begin the siege' }).click();
  await page.locator('#nova').click();
  await page.waitForFunction(() => Number(document.querySelector('#cd-nova').textContent) > 0);
  await page.screenshot({ path: 'test-results/pages-mobile.png' });
  assert.deepEqual(errors, [], 'No browser exceptions');
  assert.deepEqual(failedAssets, [], 'No failed game assets');
  console.log(`Production playtest passed: ${url} — boot, movement, nova, pause, audio settings, waves, and mobile controls.`);
} finally {
  await browser.close();
}
