import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Siege } from '../src/game/simulation';
import { KEEP, SIEGE_PHASES, SIEGE_STATS } from '../src/game/content';
test('unattended defenses cannot clear the expedition without hero support',()=>{
  const m=new Siege();m.start();m.hero.x=250;m.hero.y=940;
  for(let step=0;step<20*360&&m.phase!=='won'&&m.phase!=='lost';step++){
    if(m.phase==='upgrade')m.pickUpgrade('vitality');
    m.update(.05,{x:0,y:0,attack:false});
  }
  assert.equal(m.phase,'lost');assert.equal(m.keepHp,0);
  assert.equal(m.defenders.length,0);assert.ok(m.towers.every(t=>!t.built));
});

test('an expedition is winnable with ordinary movement, combat, healing, and upgrade choices',()=>{
  const m=new Siege();m.start();let recovering=false;
  for(let step=0;step<20*600&&m.phase!=='won'&&m.phase!=='lost';step++){
    if(m.phase==='upgrade'){m.pickUpgrade(m.chosenUpgrades.includes('power')&&m.power<3?'power':'vitality');continue;}
    if(m.hero.hp<48)recovering=true;if(m.hero.hp>m.hero.maxHp*.9)recovering=false;
    const shrine=m.shrines.find(s=>!s.captured),boss=m.units.find(u=>u.kind==='boss');
    const target=recovering?KEEP:shrine??boss??KEEP;
    const nearby=m.units.filter(u=>u.kind!=='ally'&&Math.hypot(u.x-m.hero.x,u.y-m.hero.y)<170);
    if(nearby.length)m.ability('nova');
    if(Math.hypot(m.hero.x-KEEP.x,m.hero.y-KEEP.y)<165&&m.keepHp<500&&m.gold>=45)m.interact();
    const tower=m.towers.find(t=>t.level<2&&Math.hypot(t.x-m.hero.x,t.y-m.hero.y)<110);
    if(tower&&m.gold>120)m.interact();
    m.update(.05,{x:0,y:0,target,attack:true});
  }
  console.log(`Expedition: ${m.phase}, ${Math.round(m.time)}s, wave ${m.wave}, ${m.kills} kills, citadel ${Math.round(m.keepHp)} HP.`);
  assert.equal(m.phase,'won');assert.ok(m.shrines.every(s=>s.captured));assert.ok(m.bossDead);
  assert.equal(m.wave,9);assert.deepEqual(m.defeatedBosses,SIEGE_PHASES.map(p=>SIEGE_STATS[p.boss].name));
});
