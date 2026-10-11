import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Siege} from '../src/game/simulation';
import {SIEGE_PHASES,SIEGE_STATS,SIEGE_PACING,KEEP} from '../src/game/content';
const idle={x:0,y:0,attack:false};
function tick(m:Siege,seconds:number){for(let i=0;i<seconds*20;i++){if(m.phase==='upgrade')m.pickUpgrade('vitality');m.update(.05,idle);}}
function clearCamp(m:Siege,id:string){for(const u of m.units.filter(u=>u.campId===id))m.damage(u,u.hp);m.update(.05,idle);if(m.phase==='upgrade')m.pickUpgrade('power');}
test('natural wave cadence overlaps assaults and brings the first warlord before forty seconds',()=>{
  const m=new Siege();m.start();m.nextXp=10000;
  tick(m,9);assert.equal(m.wave,0);
  tick(m,2);assert.equal(m.wave,1);
  tick(m,14);assert.equal(m.wave,2);
  assert.ok(m.units.some(u=>u.kind==='enemy'&&u.lane>=0));
  tick(m,14);assert.equal(m.wave,3);assert.equal(m.stageState,'boss');
  assert.ok(m.units.some(u=>u.archetype==='ashhorn'));
  assert.ok(m.time<40);
});

test('defenders start with mixed squads, arrive in sixes, and respect the army cap without wasting gold',()=>{
  const m=new Siege();m.start();assert.equal(m.defenders.length,12);assert.equal(m.defenders.filter(u=>u.role==='archer').length,6);assert.equal(m.towers.filter(t=>t.built).length,2);
  tick(m,12.1);assert.equal(m.defenders.length,18);const gold=m.gold;m.recruit();assert.equal(m.defenders.length,27);assert.equal(m.gold,gold-40);m.recruit();assert.equal(m.defenders.length,36);const capped=m.gold;m.recruit();assert.equal(m.gold,capped);tick(m,12.1);assert.ok(m.defenders.length<=36);
});
test('all three phases have distinct bosses and escort families; killing a boss alone does not skip its retinue',()=>{
  const m=new Siege();m.start();m.recruitTimer=10000;m.nextXp=10000;m.units=m.units.filter(u=>u.kind!=='ally');for(const t of m.towers)t.built=false;
  for(let stage=0;stage<3;stage++){
    assert.equal(m.stage,stage);for(let wave=1;wave<=3;wave++){m.waveTimer=0;m.update(.05,idle);assert.equal(m.stageWave,wave);if(wave<3)assert.equal(m.units.filter(u=>u.kind==='boss').length,0);}
    const boss=m.units.find(u=>u.kind==='boss')!;assert.equal(boss.archetype,SIEGE_PHASES[stage].boss);assert.equal(m.stageState,'boss');m.damage(boss,boss.hp);m.update(.05,idle);assert.equal(m.stage,stage);assert.equal(m.bossDead,false);assert.equal(m.stageState,'clearing');
    tick(m,5);assert.ok(m.units.some(u=>u.archetype===SIEGE_PHASES[stage].escort));for(const u of m.units)if(u.kind==='enemy'&&u.lane>=0)m.damage(u,u.hp);m.update(.05,idle);
    if(stage<2){assert.equal(m.stage,stage+1);assert.equal(m.stageWave,0);assert.equal(m.stageState,'prepare');assert.equal(m.waveTimer,SIEGE_PACING.phasePreparation);assert.equal(m.phase,'playing');m.units=m.units.filter(u=>u.kind!=='ally');}else{assert.equal(m.stageState,'complete');assert.equal(m.phase,'won');}
  }
  assert.equal(m.wave,9);assert.deepEqual(m.defeatedBosses,SIEGE_PHASES.map(p=>SIEGE_STATS[p.boss].name));
});
test('boss telegraphs hit hero, soldiers, and towers; icefall slows and death cancels hazards',()=>{
  const m=new Siege();m.start();m.stage=1;m.stageWave=2;m.waveTimer=0;m.nextXp=10000;m.update(.05,idle);const boss=m.units.find(u=>u.kind==='boss')!,tower=m.towers[0],ally=m.defenders[0];
  m.units=m.units.filter(u=>u.id===boss.id||u.id===ally.id||u.campId);m.recruitTimer=10000;m.hero.x=tower.x;m.hero.y=tower.y;ally.x=tower.x+5;ally.y=tower.y;boss.x=tower.x+40;boss.y=tower.y;boss.damage=0;boss.specialCooldown=0;ally.damage=0;tower.cooldown=100;const hp=ally.hp,thp=tower.hp;
  m.update(.05,idle);assert.equal(m.hazards[0].archetype,'rimewitch');assert.equal(m.hazards[0].army,true);assert.equal(m.hazards[0].x,ally.x);tick(m,1.4);assert.ok(ally.hp<hp);assert.ok(tower.hp<thp);assert.ok(ally.slow>0);assert.ok(m.hero.slow>0);
  boss.specialCooldown=0;m.update(.05,idle);assert.equal(m.hazards.length,1);m.damage(boss,boss.hp);m.update(.05,idle);assert.equal(m.hazards.length,0);
});
test('boss summons are bounded and use the active phase family',()=>{
  const m=new Siege();m.start();m.stage=2;m.stageWave=2;m.waveTimer=0;m.update(.05,idle);const boss=m.units.find(u=>u.kind==='boss')!;m.recruitTimer=10000;m.nextXp=10000;m.units=[boss];for(const t of m.towers)t.built=false;
  for(let i=0;i<5;i++){boss.summonCooldown=0;m.update(.05,idle);}const summons=m.units.filter(u=>u.summoned);assert.equal(summons.length,9);assert.ok(summons.every(u=>u.archetype==='shade'||u.archetype==='hollowguard'));assert.ok(summons.every(u=>u.lane===boss.lane));
});
test('jungle artifacts buff existing and future soldiers once and stack correctly with army upgrades',()=>{
  const m=new Siege();m.start();m.waveTimer=10000;m.recruitTimer=10000;const guard=m.defenders.find(u=>u.role==='guard')!,baseHp=guard.maxHp,baseDamage=guard.damage,baseSpeed=guard.speed;
  clearCamp(m,'quarry');assert.equal(guard.maxHp,baseHp+30);assert.equal(m.stoneheart,true);m.spawnAlly(0);assert.equal(m.defenders.at(-1)!.maxHp,baseHp+30);
  clearCamp(m,'den');assert.equal(guard.damage,baseDamage*1.2);assert.equal(guard.speed,baseSpeed*1.1);m.spawnAlly(0);assert.equal(m.defenders.at(-1)!.damage,guard.damage);
  m.phase='upgrade';m.pickUpgrade('army');assert.equal(guard.maxHp,baseHp+60);assert.ok(Math.abs(guard.damage-baseDamage*1.35*1.2)<.001);m.spawnAlly(0);assert.equal(m.defenders.at(-1)!.maxHp,guard.maxHp);assert.equal(m.defenders.at(-1)!.damage,guard.damage);
  m.spawnCamp('quarry');clearCamp(m,'quarry');m.spawnCamp('den');clearCamp(m,'den');assert.equal(guard.maxHp,baseHp+60);assert.deepEqual(m.artifacts,['Stoneheart','Predator sigil']);
});
test('pack oath heals the army, freezes while paused, expires, and refreshes without stacking',()=>{
  const m=new Siege();m.start();m.waveTimer=10000;m.recruitTimer=10000;m.nextXp=10000;const ally=m.defenders[0];clearCamp(m,'briar');assert.equal(m.packOath,60);ally.hp=20;m.hero.x=600;m.hero.y=900;m.hero.hp=60;const heroHp=m.hero.hp;tick(m,1);assert.ok(Math.abs(ally.hp-23)<.001);assert.ok(Math.abs(m.hero.hp-heroHp-3)<.001);
  m.phase='paused';const left=m.packOath;tick(m,5);assert.equal(m.packOath,left);m.phase='playing';m.spawnCamp('briar');clearCamp(m,'briar');assert.equal(m.packOath,60);ally.hp=20;tick(m,1);assert.ok(Math.abs(ally.hp-23)<.001);m.packOath=.05;tick(m,.1);assert.equal(m.packOath,0);
});
test('watchtowers automatically shoot, can be destroyed, rebuilt, reinforced, and repaired with stoneheart armor',()=>{
  const m=new Siege();m.start();m.waveTimer=10000;m.recruitTimer=10000;const t=m.towers[0],enemy=m.units.find(u=>u.kind==='enemy')!;m.units=m.units.filter(u=>u.id===enemy.id||u.campId);enemy.x=t.x+100;enemy.y=t.y;enemy.hp=enemy.maxHp=500;enemy.speed=0;const hp=enemy.hp;m.update(.05,idle);assert.ok(enemy.hp<hp);assert.ok(m.effects.some(e=>e.kind==='bolt'));
  const old=t.hp;m.damageTower(t,100);assert.equal(t.hp,old-100);m.artifacts.push('Stoneheart');m.damageTower(t,100);assert.equal(t.hp,old-180);m.damageTower(t,10000);assert.equal(t.built,false);
  m.hero.x=t.x;m.hero.y=t.y;m.gold=200;m.interact();assert.equal(t.level,1);assert.equal(t.hp,480);assert.equal(m.gold,145);m.interact();assert.equal(t.level,2);assert.equal(m.gold,65);m.damageTower(t,100);m.interact();assert.equal(t.hp,680);assert.equal(m.gold,30);
});
test('phase completion never resurrects a fallen hero or repairs an already lost citadel',()=>{
  const m=new Siege();m.start();m.stageState='clearing';m.hero.hp=0;m.update(.05,idle);assert.equal(m.phase,'lost');assert.equal(m.stage,0);assert.equal(m.hero.hp,0);
});
