import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Siege, isJungle } from '../src/game/simulation';
import { KEEP } from '../src/game/content';
const idle={x:0,y:0,attack:false};
function tick(m:Siege,seconds:number){for(let i=0;i<seconds*20;i++){if(m.phase==='upgrade')m.pickUpgrade('power');m.update(.05,idle);}}
function quietRun(){const m=new Siege();m.start();m.waveTimer=10000;m.recruitTimer=10000;m.units=m.units.filter(u=>u.kind!=='ally');for(const t of m.towers)t.built=false;return m;}
test('an enemy order chases and attacks without holding attack, and a move order cancels it',()=>{
  const m=quietRun(),enemy=m.units.find(u=>u.kind==='enemy')!;enemy.x=m.hero.x+220;enemy.y=m.hero.y;enemy.speed=0;m.issueAttack(enemy.id);tick(m,.9);
  assert.ok(m.hero.x>550);assert.ok(enemy.hp<enemy.maxHp);assert.equal(m.order?.kind,'attack');
  const x=m.hero.x;m.issueMove({x:300,y:m.hero.y});tick(m,.2);assert.ok(m.hero.x<x);assert.equal(m.order?.kind,'move');
  m.stop();assert.equal(m.order,undefined);m.issueAttack(m.hero.id);assert.equal(m.order,undefined);
});
test('direct movement interrupts a mouse order and attack-move engages targets on its route',()=>{
  const m=quietRun(),enemy=m.units.find(u=>u.kind==='enemy')!;enemy.x=m.hero.x+170;enemy.y=m.hero.y;enemy.speed=0;m.issueMove({x:900,y:700});m.update(.05,{x:-1,y:0,attack:false});assert.equal(m.order,undefined);
  m.issueMove({x:900,y:700},true);tick(m,1);assert.ok(enemy.hp<enemy.maxHp);assert.equal(m.order?.kind,'attackMove');
});
test('jungle creatures do not join lanes or fight passing allied soldiers',()=>{
  const m=quietRun(),camp=m.camps[0],wolves=m.units.filter(u=>u.campId===camp.id);m.spawnAlly(0);const ally=m.units.find(u=>u.kind==='ally')!;ally.x=camp.x;ally.y=camp.y;
  tick(m,2);assert.equal(camp.aggro,false);assert.ok(wolves.every(u=>u.hp===u.maxHp));assert.ok(wolves.every(u=>Math.hypot(u.x-u.home!.x,u.y-u.home!.y)<5));
});
test('an engaged camp leashes, returns home, and heals when the hero retreats',()=>{
  const m=quietRun(),camp=m.camps[0],wolf=m.units.find(u=>u.campId===camp.id)!;m.damage(wolf,30);assert.equal(camp.aggro,true);wolf.x=camp.x+200;Object.assign(m.hero,KEEP);m.update(.05,idle);assert.equal(camp.aggro,false);assert.equal(wolf.returning,true);
  const hp=wolf.hp;m.damage(wolf,999);assert.equal(wolf.hp,hp);tick(m,4);assert.equal(wolf.returning,false);assert.equal(wolf.hp,wolf.maxHp);assert.ok(Math.hypot(wolf.x-wolf.home!.x,wolf.y-wolf.home!.y)<10);
});
test('cleared camps grant rewards once, pause their respawn clock, and respawn their group',()=>{
  const m=quietRun(),camp=m.camps[0],members=m.units.filter(u=>u.campId===camp.id),gold=m.gold;
  for(const u of members)m.damage(u,u.hp);const kills=m.kills;m.damage(members[0],999);assert.equal(m.kills,kills);m.update(.05,idle);
  assert.ok(camp.cleared);assert.equal(m.gold,gold+members.length*12+30);if(m.phase==='upgrade')m.pickUpgrade('power');m.phase='paused';const timer=camp.respawn;tick(m,2);assert.equal(camp.respawn,timer);m.phase='playing';tick(m,46);
  assert.equal(camp.cleared,false);assert.equal(m.units.filter(u=>u.campId===camp.id).length,3);assert.ok(m.units.filter(u=>u.campId===camp.id).every(u=>u.hp===u.maxHp));
});
test('jungle bosses grant a unique artifact, never trigger siege victory, and do not stack it on respawn',()=>{
  const m=quietRun(),camp=m.camps.find(c=>c.id==='quarry')!,maxHp=m.hero.maxHp;
  for(const u of m.units.filter(u=>u.campId===camp.id))m.damage(u,u.hp);m.update(.05,idle);assert.equal(m.hero.maxHp,maxHp+30);assert.deepEqual(m.artifacts,['Stoneheart']);assert.equal(m.bossDead,false);
  tick(m,91);assert.equal(camp.cleared,false);for(const u of m.units.filter(u=>u.campId===camp.id))m.damage(u,u.hp);m.update(.05,idle);assert.equal(m.hero.maxHp,maxHp+30);assert.deepEqual(m.artifacts,['Stoneheart']);
});
test('a boss warns before its area attack, which can be dodged within the camp',()=>{
  const m=quietRun(),boss=m.units.find(u=>u.archetype==='stonewarden')!;for(const u of m.units)if(u.kind==='enemy'||(u.campId===boss.campId&&u.id!==boss.id))u.hp=0;
  m.hero.x=boss.x+60;m.hero.y=boss.y;boss.specialCooldown=0;m.update(.05,idle);assert.equal(m.hazards.length,1);assert.equal(m.hero.hp,m.hero.maxHp);
  m.hero.x=boss.x+210;m.hero.y=boss.y;tick(m,1.2);assert.equal(m.hazards.length,0);assert.equal(m.hero.hp,m.hero.maxHp);
});
test('a boss warning damages a hero who stays inside and cancels when the boss dies',()=>{
  const m=quietRun(),boss=m.units.find(u=>u.archetype==='stonewarden')!;for(const u of m.units)if(u.kind==='enemy'||(u.campId===boss.campId&&u.id!==boss.id))u.hp=0;
  m.hero.x=boss.x+60;m.hero.y=boss.y;boss.specialCooldown=0;m.update(.05,idle);tick(m,1.2);assert.ok(m.hero.hp<m.hero.maxHp);assert.ok(m.hero.slow>0);
  boss.specialCooldown=0;boss.cooldown=10;m.update(.05,idle);assert.equal(m.hazards.length,1);m.damage(boss,boss.hp);m.update(.05,idle);assert.equal(m.hazards.length,0);assert.equal(m.bossDead,false);assert.ok(isJungle(boss));
});
