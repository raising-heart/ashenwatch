import { CAMPS, JUNGLE_STATS, SIEGE_STATS, SIEGE_PHASES, SIEGE_PACING, CITADEL_HEALING, GATE, KEEP, LANES, SHRINES, TOWERS, type Element, type Point, type JungleArchetype, type SiegeArchetype } from './content';
export type Unit = Point & {id:number;kind:'hero'|'enemy'|'ally'|'boss'|'neutral'|'jungleBoss';hp:number;maxHp:number;speed:number;damage:number;range:number;cooldown:number;lane:number;node:number;slow:number;flash:number;facing:number;campId?:string;home?:Point;archetype?:JungleArchetype|SiegeArchetype;role?:'guard'|'archer';returning?:boolean;specialCooldown?:number;summonCooldown?:number;summoned?:boolean;action?:'attack'|'cast'|'dash';actionStarted?:number};
export type Tower=Point&{id:number;name:string;active:boolean;built:boolean;level:number;cooldown:number;hp:number;maxHp:number};
export type Effect = Point & {kind:'slash'|'nova'|'dash'|'bolt'|'heal'|'capture'|'hit'|'spawn';life:number;maxLife:number;radius:number;to?:Point;color?:number;sourceId?:number;facing?:number};
export type Input = {x:number;y:number;target?:Point;attack:boolean};
export type Order = {kind:'move'|'attackMove';point:Point}|{kind:'attack';targetId:number};
export type Hazard = Point & {radius:number;remaining:number;duration:number;damage:number;sourceId:number;archetype:JungleArchetype|SiegeArchetype;army?:boolean;color?:number;slow?:number};
export const isJungle=(u:Unit)=>u.kind==='neutral'||u.kind==='jungleBoss';
export const isHostile=(u:Unit)=>u.kind!=='hero'&&u.kind!=='ally'&&u.hp>0;
export const unitName=(u:Unit)=>u.archetype?(u.archetype in JUNGLE_STATS?JUNGLE_STATS[u.archetype as JungleArchetype].name:SIEGE_STATS[u.archetype as SiegeArchetype].name):u.kind==='boss'?'The Hollow King':u.kind==='ally'?u.role==='archer'?'Oathbound archer':'Oathbound guard':'Hollow raider';
const dist = (a:Point,b:Point) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export class Siege {
  phase:'menu'|'playing'|'paused'|'upgrade'|'won'|'lost' = 'menu';
  hero:Unit;
  units:Unit[]=[];
  effects:Effect[]=[];
  shrines=SHRINES.map(s=>({...s,progress:0,captured:false,guards:3}));
  towers:Tower[]=TOWERS.map((t,i)=>({...t,id:-100-i,built:t.active,level:t.active?1:0,cooldown:0,hp:t.active?480:0,maxHp:480}));
  camps=CAMPS.map(c=>({...c,cleared:false,respawn:0,aggro:false,artifactClaimed:false}));
  hazards:Hazard[]=[]; artifacts:string[]=[]; order?:Order; portalPulse=0;
  keepHp=1000; keepMax=1000; gold=140; kills=0; wave=0; time=0; waveTimer=SIEGE_PACING.initialPreparation;
  stage=0;stageWave=0;stageState:'prepare'|'waves'|'boss'|'clearing'|'complete'='prepare';defeatedBosses:string[]=[];
  readonly armyCap=36;armyVitality=0;packOath=0;
  essence:Element='Ember'; level=1; xp=0; nextXp=8; upgrades:string[]=[];
  cooldowns={slash:0,nova:0,dash:0}; power=1; haste=1; army=1;
  bossSpawned=false; bossDead=false; recruitTimer=12; incomeTimer=0; chosenUpgrades:string[]=[];
  message='The last light of the valley is yours to defend.'; messageTime=6;
  soundEvents:string[]=[]; private nextId=1; private pending: {lane:number;delay:number;archetype:SiegeArchetype}[]=[];
  get nearCitadel(){return dist(this.hero,KEEP)<CITADEL_HEALING.radius;}
  get citadelHealing(){return this.phase==='playing'&&this.keepHp>0&&this.hero.hp>0&&this.hero.hp<this.hero.maxHp&&this.nearCitadel;}
  get siegePhase(){return SIEGE_PHASES[this.stage];}
  get defenders(){return this.units.filter(u=>u.kind==='ally'&&u.hp>0);}
  get searingSteel(){return this.upgrades.includes('power');}
  get stoneheart(){return this.artifacts.includes('Stoneheart');}
  get predator(){return this.artifacts.includes('Predator sigil');}
  constructor(public age=1) { this.hero=this.unit('hero', {x:490,y:660},-1); }
  private unit(kind:Unit['kind'],p:Point,lane:number):Unit {
    const maxHp=kind==='hero'?140:kind==='boss'?4100+this.age*240:kind==='ally'?85:55+this.age*6;
    return {...p,id:this.nextId++,kind,hp:maxHp,maxHp,speed:kind==='hero'?185:kind==='boss'?29:kind==='ally'?64:45+this.age*2,
      damage:kind==='hero'?27:kind==='boss'?32:kind==='ally'?12:9+this.age,range:kind==='boss'?95:kind==='hero'?100:42,cooldown:0,lane,node:kind==='ally'?LANES[lane].length-2:1,slow:0,flash:0,facing:1};
  }
  start() {if(this.phase==='menu') {this.phase='playing';for(const s of this.shrines)for(let i=0;i<3;i++){const u=this.unit('enemy',{x:s.x+Math.cos(i*2.1)*65,y:s.y+Math.sin(i*2.1)*55},-1);u.speed=38;this.units.push(u);}for(const camp of this.camps)this.spawnCamp(camp.id);this.deploySquad(4);this.say('12 defenders and two watchtowers stand ready. Hunt the jungle while your army holds the lanes.');}}
  issueMove(point:Point,attackMove=false){if(this.phase==='playing')this.order={kind:attackMove?'attackMove':'move',point:{x:clamp(point.x,100,1500),y:clamp(point.y,140,950)}};}
  issueAttack(targetId:number){if(this.phase==='playing'&&this.units.some(u=>u.id===targetId&&isHostile(u)))this.order={kind:'attack',targetId};}
  stop(){this.order=undefined;}
  get attackTarget(){const order=this.order;return order?.kind==='attack'?this.units.find(u=>u.id===order.targetId&&isHostile(u)):undefined;}
  spawnCamp(id:string){const camp=this.camps.find(c=>c.id===id);if(!camp)return;camp.cleared=false;camp.respawn=0;camp.aggro=false;camp.members.forEach((archetype,i)=>{const stats=JUNGLE_STATS[archetype],angle=i/camp.members.length*Math.PI*2,home={x:camp.x+Math.cos(angle)*37,y:camp.y+Math.sin(angle)*29};const u=this.unit(stats.boss?'jungleBoss':'neutral',home,-1);u.hp=u.maxHp=Math.round(stats.hp*(1+(this.age-1)*.12));u.damage=stats.damage+this.age-1;u.speed=stats.speed;u.range=stats.range;u.campId=id;u.home=home;u.archetype=archetype;u.specialCooldown=stats.boss?4:undefined;this.units.push(u);});}
  say(message:string) {this.message=message;this.messageTime=5;}
  effect(kind:Effect['kind'],p:Point&{id?:number;facing?:number},radius=50,color?:number,to?:Point) {this.effects.push({...p,kind,life:kind==='bolt'?.22:.55,maxLife:kind==='bolt'?.22:.55,radius,color,to,sourceId:p.id,facing:p.facing});}
  damage(u:Unit,amount:number) {if(u.hp<=0||u.returning)return;u.hp-=amount;u.flash=.15;this.effect('hit',u,12);if(u.campId)this.camps.find(c=>c.id===u.campId)!.aggro=true;if(u.hp<=0&&u.kind!=='hero'&&u.kind!=='ally'){this.gold+=u.kind==='boss'?150:u.kind==='jungleBoss'?75:u.kind==='neutral'?12:9;this.kills++;this.xp+=u.kind==='jungleBoss'?6:u.kind==='neutral'?2:1;if(u.kind==='boss'){this.stageState='clearing';this.defeatedBosses.push(unitName(u));this.say(`${unitName(u)} defeated. Clear the remaining raiders to finish this phase.`);}}}
  damageTower(t:Tower,amount:number){if(!t.built||t.hp<=0)return;t.hp=Math.max(0,t.hp-amount*(this.stoneheart?.8:1));this.effect('hit',{x:t.x,y:t.y-40},15);if(t.hp===0){t.built=false;t.level=0;this.say(`${t.name} has fallen. Rebuild it for 55 gold.`);}}
  private animate(u:Unit,action:NonNullable<Unit['action']>){u.action=action;u.actionStarted=this.time;}
  private basicAttack(target:Unit){if(this.cooldowns.slash>0||!isHostile(target)||target.returning)return;this.cooldowns.slash=.48*this.haste;this.animate(this.hero,'attack');this.hero.facing=Math.sign(target.x-this.hero.x)||this.hero.facing;this.effect('slash',this.hero,85,this.searingSteel?0xffb55a:undefined);this.soundEvents.push('slash');this.damage(target,27*this.power);}
  attack() {
    if(this.phase!=='playing'||this.cooldowns.slash>0)return;
    this.cooldowns.slash=.48*this.haste;this.hero.facing=this.hero.facing||1;
    this.animate(this.hero,'attack');
    this.effect('slash',this.hero,110,this.searingSteel?0xffb55a:undefined);this.soundEvents.push('slash');
    for(const u of this.units)if(isHostile(u)&&!u.returning&&dist(this.hero,u)<115)this.damage(u,27*this.power);
  }
  ability(which:'nova'|'dash',aim?:Point) {
    if(this.phase!=='playing'||this.cooldowns[which]>0)return;
    this.animate(this.hero,which==='nova'?'cast':'dash');
    if(which==='nova') {
      this.cooldowns.nova=7*this.haste;const color=this.essence==='Ember'?0xf9a052:this.essence==='Frost'?0x9ed9eb:0xc6b1ff;
      this.effect('nova',this.hero,185,color);this.soundEvents.push('nova');
      for(const u of this.units)if(isHostile(u)&&!u.returning&&dist(this.hero,u)<185){this.damage(u,(this.essence==='Ember'?78:57)*this.power);if(this.essence==='Frost')u.slow=3;}
      if(this.essence==='Storm') {let nearest=this.units.filter(u=>isHostile(u)&&!u.returning&&dist(this.hero,u)<360).sort((a,b)=>dist(this.hero,a)-dist(this.hero,b)).slice(0,5);for(const u of nearest){this.damage(u,35*this.power);this.effect('bolt',this.hero,5,color,u);}}
    } else {
      this.cooldowns.dash=4*this.haste;const old={x:this.hero.x,y:this.hero.y};
      const dx=aim?aim.x-this.hero.x:this.hero.facing,dy=aim?aim.y-this.hero.y:0,len=Math.hypot(dx,dy)||1;
      this.hero.x=clamp(this.hero.x+dx/len*175,100,1500);this.hero.y=clamp(this.hero.y+dy/len*175,140,950);
      this.effect('dash',old,30,0xa3dec7,this.hero);this.soundEvents.push('dash');
    }
  }
  interact() {
    if(this.phase!=='playing')return;
    const t=this.towers.find(t=>dist(this.hero,t)<120);
    if(t){const repair=t.built&&t.level>=2&&t.hp<t.maxHp,cost=!t.built?55:repair?35:80;if(t.level>=2&&!repair){this.say(`${t.name} is at full strength.`);return;}if(this.gold<cost){this.say(`Need ${cost} gold to ${repair?'repair':t.built?'reinforce':'rebuild'} ${t.name}.`);return;}
      this.gold-=cost;if(!repair){t.level=t.built?t.level+1:1;t.maxHp=t.level===2?680:480;}t.built=true;t.hp=t.maxHp;this.effect('capture',t,85,0xe4c57a);this.say(`${t.name} ${repair?'repaired':t.level===1?'rebuilt':'reinforced'}.`);this.soundEvents.push('build');return;}
    if(dist(this.hero,KEEP)<165) {if(this.gold<45){this.say('Need 45 gold to repair the citadel.');return;}if(this.keepHp===this.keepMax){this.say('The citadel is already at full strength.');return;}this.gold-=45;this.keepHp=Math.min(this.keepMax,this.keepHp+200);this.say('The citadel has been repaired.');this.effect('heal',KEEP,100);return;}
    this.say('Stand near a ruined watchtower to rebuild it, or the citadel to repair it.');
  }
  recruit() {if(this.phase!=='playing')return;if(this.defenders.length>=this.armyCap){this.say('All 36 army slots are occupied.');return;}if(this.gold<40){this.say('Need 40 gold to call reinforcements.');return;}this.gold-=40;const before=this.defenders.length;this.deploySquad(3);this.say(`${this.defenders.length-before} oathbound reinforcements join the defense.`);}
  spawnAlly(lane:number,role:'guard'|'archer'='guard',slot=0) {if(this.defenders.length>=this.armyCap)return;const u=this.unit('ally',{x:KEEP.x+45+lane*18+slot*14,y:KEEP.y-45+lane*18-slot*12},lane);u.role=role;u.range=role==='archer'?195:48;this.applyArmyStats(u);u.hp=u.maxHp;this.units.push(u);}
  private deploySquad(perLane:number){for(let slot=0;slot<perLane;slot++)for(let lane=0;lane<3;lane++)this.spawnAlly(lane,slot%2===1?'archer':'guard',slot);}
  private applyArmyStats(u:Unit){const base=u.role==='archer'?{hp:90,damage:14,speed:69}:{hp:120,damage:17,speed:74};const old=u.maxHp;u.maxHp=base.hp+this.armyVitality+(this.stoneheart?30:0);u.hp=Math.min(u.maxHp,u.hp+u.maxHp-old);u.damage=base.damage*this.army*(this.predator?1.2:1);u.speed=base.speed*(this.predator?1.1:1);}
  private refreshArmy(){for(const u of this.defenders)this.applyArmyStats(u);}
  pickUpgrade(id:string) {
    if(this.phase!=='upgrade')return;
    this.upgrades.push(id);if(id==='power')this.power*=1.3;if(id==='vitality'){this.hero.maxHp+=40;this.hero.hp=this.hero.maxHp;}
    if(id==='haste'){this.haste*=.75;this.hero.speed*=1.12;}if(id==='army'){this.army*=1.35;this.armyVitality+=30;this.refreshArmy();}
    this.phase='playing';this.say('A forgotten power awakens.');
  }
  context() {const t=this.towers.find(t=>dist(this.hero,t)<120);if(t)return t.level>=2?t.hp<t.maxHp?`E · Repair ${t.name} · 35 gold`:`${t.name} · Fully reinforced`:`E · ${t.built?'Reinforce':'Rebuild'} ${t.name} · ${t.built?80:55} gold`;if(dist(this.hero,KEEP)<165)return 'E · Repair citadel · 45 gold';const s=this.shrines.find(s=>!s.captured&&dist(this.hero,s)<100);if(s)return this.units.some(u=>u.kind==='enemy'&&u.hp>0&&dist(u,s)<140)?'Defeat the sanctuary guardians':'Remain in the circle to reclaim';return '';}
  update(dt:number,input:Input) {
    if(this.phase!=='playing')return;
    if(this.hero.hp<=0||this.keepHp<=0){this.phase='lost';this.hero.hp=Math.max(0,this.hero.hp);this.keepHp=Math.max(0,this.keepHp);return;}
    dt=Math.min(dt,.05);this.time+=dt;this.messageTime-=dt;if(this.stageState==='prepare'||this.stageState==='waves')this.waveTimer-=dt;this.incomeTimer+=dt;this.portalPulse=Math.max(0,this.portalPulse-dt);this.hero.slow=Math.max(0,this.hero.slow-dt);
    this.packOath=Math.max(0,this.packOath-dt);if(this.packOath>0){this.hero.hp=Math.min(this.hero.maxHp,this.hero.hp+3*dt);for(const u of this.defenders)u.hp=Math.min(u.maxHp,u.hp+3*dt);}
    if(this.incomeTimer>=2){this.incomeTimer=0;this.gold+=4+this.shrines.filter(s=>s.captured).length*2;}
    for(const k of ['slash','nova','dash'] as const)this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);
    this.hero.cooldown=Math.max(0,this.hero.cooldown-dt);this.hero.flash=Math.max(0,this.hero.flash-dt);
    let dx=input.x,dy=input.y;let movePoint=input.target;let attackTarget:Unit|undefined;
    if(dx||dy)this.stop();
    else if(!input.target){
      if(this.order?.kind==='attack'){attackTarget=this.attackTarget;if(!attackTarget||attackTarget.returning)this.stop();}
      if(this.order?.kind==='move'||this.order?.kind==='attackMove'){
        movePoint=this.order.point;
        if(this.order.kind==='attackMove')attackTarget=this.units.filter(u=>isHostile(u)&&!u.returning&&dist(this.hero,u)<250).sort((a,b)=>dist(this.hero,a)-dist(this.hero,b))[0];
        if(!attackTarget&&dist(this.hero,movePoint)<8){this.stop();movePoint=undefined;}
      }
      if(!this.order&&!attackTarget)attackTarget=this.units.find(u=>isHostile(u)&&!u.returning&&dist(this.hero,u)<100&&(!isJungle(u)||this.camps.find(c=>c.id===u.campId)!.aggro));
    }
    if(attackTarget){if(dist(this.hero,attackTarget)>this.hero.range)movePoint=attackTarget;else{movePoint=undefined;this.basicAttack(attackTarget);}}
    if(!dx&&!dy&&movePoint){const d=dist(this.hero,movePoint);if(d>8){dx=(movePoint.x-this.hero.x)/d;dy=(movePoint.y-this.hero.y)/d;}}
    const length=Math.hypot(dx,dy),speed=this.hero.speed*(this.hero.slow>0?.55:1);if(length>0){this.hero.x=clamp(this.hero.x+dx/Math.max(1,length)*speed*dt,100,1500);this.hero.y=clamp(this.hero.y+dy/Math.max(1,length)*speed*dt,140,950);if(dx)this.hero.facing=Math.sign(dx);}
    if(input.attack)this.attack();
    if(this.nearCitadel)this.hero.hp=Math.min(this.hero.maxHp,this.hero.hp+CITADEL_HEALING.perSecond*dt);
    if(this.waveTimer<=0&&(this.stageState==='prepare'||this.stageState==='waves'))this.launchWave();
    this.pending=this.pending.filter(p=>{p.delay-=dt;if(p.delay<=0){const spawn={x:GATE.x+(p.lane-1)*16,y:GATE.y-25+p.lane*12};this.spawnRaider(p.archetype,spawn,p.lane);this.effect('spawn',spawn,45,this.siegePhase.color);this.portalPulse=Math.max(this.portalPulse,.65);return false;}return true;});
    this.recruitTimer-=dt;if(this.recruitTimer<=0){this.recruitTimer=12;this.deploySquad(2);}
    this.hazards=this.hazards.filter(h=>{const source=this.units.find(u=>u.id===h.sourceId);if(!source||source.hp<=0||source.returning)return false;h.remaining-=dt;if(h.remaining>0)return true;this.animate(source,'attack');for(const target of h.army?[this.hero,...this.defenders]:[this.hero])if(dist(target,h)<h.radius){this.damage(target,h.damage);target.slow=h.slow??(h.archetype==='stonewarden'?1.8:0);}if(h.army)for(const t of this.towers)if(t.built&&dist(t,h)<h.radius)this.damageTower(t,h.damage);this.effect('nova',h,h.radius,h.color??(h.archetype==='stonewarden'?0xb2d6bf:0xf0a46f));this.soundEvents.push('nova');return false;});
    for(const u of this.units) {
      if(u.hp<=0)continue;u.cooldown=Math.max(0,u.cooldown-dt);u.slow=Math.max(0,u.slow-dt);u.flash=Math.max(0,u.flash-dt);
      if(isJungle(u)){this.updateJungle(u,dt);continue;}
      const targets:(Unit|Tower)[]=u.kind==='ally'?this.units.filter(v=>v.hp>0&&v.kind!=='ally'&&!isJungle(v)): [this.hero,...this.defenders,...this.towers.filter(t=>t.built)];
      const target=targets.filter(v=>dist(u,v)<Math.max(u.kind==='boss'?300:190,u.range+60)).sort((a,b)=>dist(u,a)-dist(u,b))[0];
      if(u.kind==='boss'&&this.updateSiegeBoss(u,dt,target))continue;
      if(target) {const d=dist(u,target);if(d>u.range)this.move(u,target,dt);else if(u.cooldown<=0){this.animate(u,'attack');u.facing=Math.sign(target.x-u.x)||u.facing;if('built' in target)this.damageTower(target,u.damage);else this.damage(target,u.damage);u.cooldown=u.kind==='boss'?1.4:u.range>100?1.2:1;this.effect(u.range>100?'bolt':'slash',u,u.kind==='boss'?100:40,u.kind==='ally'?0xa5cdad:this.siegePhase.color,target);}}
      else if(u.lane>=0) {const path=LANES[u.lane],p=path[u.node];if(u.kind==='ally'&&u.node<2&&this.stageState!=='boss'&&this.stageState!=='clearing')continue;if(p){if(dist(u,p)<18)u.node+=u.kind==='ally'?-1:1;else this.move(u,p,dt);}else if(u.kind==='ally'){if(this.stageState==='boss'||this.stageState==='clearing')this.move(u,GATE,dt);}
        else {if(u.cooldown<=0){this.animate(u,'attack');this.keepHp-=u.damage;u.cooldown=1;}this.move(u,KEEP,dt);}}
      else if(u.kind==='boss'){this.move(u,KEEP,dt);if(dist(u,KEEP)<130&&u.cooldown<=0){this.animate(u,'attack');this.keepHp-=30;u.cooldown=1;}}
    }
    for(const t of this.towers){if(!t.built)continue;t.cooldown-=dt;const target=this.units.filter(u=>isHostile(u)&&!isJungle(u)&&dist(t,u)<280).sort((a,b)=>dist(t,a)-dist(t,b))[0];if(target&&t.cooldown<=0){t.cooldown=t.level===2?.65:.9;this.damage(target,32*t.level);this.effect('bolt',{x:t.x,y:t.y-75},1,0xf3cb7b,target);}}
    for(const s of this.shrines)if(!s.captured){const contested=this.units.some(u=>u.hp>0&&u.kind==='enemy'&&dist(u,s)<140);if(!contested&&dist(this.hero,s)<95){s.progress=Math.min(1,s.progress+dt/4);if(s.progress>=1){s.captured=true;this.gold+=70;this.xp+=5;this.essence=s.element;this.effect('capture',s,140,0xb4e2c6);this.say(`${s.name} reclaimed. ${s.element} essence attuned.`);this.soundEvents.push('capture');}}}
    for(const camp of this.camps){
      if(camp.cleared){camp.respawn-=dt;if(camp.respawn<=0)this.spawnCamp(camp.id);}
      else if(!this.units.some(u=>u.campId===camp.id&&u.hp>0)){camp.cleared=true;camp.aggro=false;camp.respawn=camp.respawnSeconds;this.gold+=30;this.xp+=3;
        if(camp.id==='briar'){this.packOath=60;this.say('Pack oath renewed: you and your army regenerate 3 HP/s for 60 seconds.');}
        else if(!camp.artifactClaimed){camp.artifactClaimed=true;if(camp.id==='quarry'){this.artifacts.push('Stoneheart');this.hero.maxHp+=30;this.hero.hp=Math.min(this.hero.maxHp,this.hero.hp+60);}else{this.artifacts.push('Predator sigil');this.power*=1.2;this.hero.speed*=1.1;}this.refreshArmy();this.say(`${camp.name} cleared. ${camp.reward}.`);}else this.say(`${camp.name} cleared. +30 gold and bonus experience.`);this.soundEvents.push('capture');}
    }
    this.units=this.units.filter(u=>u.hp>0);this.effects=this.effects.filter(e=>{e.life-=dt;return e.life>0;});
    if(this.hero.hp>0&&this.keepHp>0&&this.stageState==='clearing'&&!this.pending.length&&!this.units.some(u=>(u.kind==='enemy'&&u.lane>=0)||u.kind==='boss'))this.completeStage();
    if(this.hero.hp<=0||this.keepHp<=0){this.phase='lost';this.hero.hp=Math.max(0,this.hero.hp);this.keepHp=Math.max(0,this.keepHp);}
    else if(this.bossDead){this.phase='won';}
    else if(this.xp>=this.nextXp){this.xp-=this.nextXp;this.nextXp+=5;this.level++;this.phase='upgrade';this.chosenUpgrades=['power','vitality',this.level%2===0?'haste':'army'];}
  }
  private launchWave(){
    this.wave++;this.stageWave++;this.waveTimer=SIEGE_PACING.waveInterval;this.stageState=this.stageWave===3?'boss':'waves';this.portalPulse=1.8;const phase=this.siegePhase;
    const count=phase.count+this.stageWave-1,escorts=this.stageWave===3?2:1;
    for(let lane=0;lane<3;lane++)for(let n=0;n<count;n++)this.pending.push({lane,delay:n*.65+lane*.2,archetype:n>=count-escorts?phase.escort:phase.mob});
    if(this.stageWave===3){const boss=this.spawnRaider(phase.boss,{x:GATE.x,y:GATE.y+15},1,true);boss.specialCooldown=3;boss.summonCooldown=6;this.bossSpawned=true;this.say(`Phase ${this.stage+1}: ${unitName(boss)} arrives with its retinue!`);}
    else this.say(`Phase ${this.stage+1} · ${phase.name} · Wave ${this.stageWave} / 3.`);
    this.soundEvents.push('wave');
  }
  private spawnRaider(archetype:SiegeArchetype,p:Point,lane:number,boss=false){const stats=SIEGE_STATS[archetype],u=this.unit(boss?'boss':'enemy',p,lane);Object.assign(u,stats);u.hp=u.maxHp=Math.round(stats.hp*(1+(this.age-1)*.15)*(boss?1-this.shrines.filter(s=>s.captured).length*.1:1));u.damage=stats.damage+this.age-1;u.archetype=archetype;this.units.push(u);return u;}
  private updateSiegeBoss(u:Unit,dt:number,target?:Unit|Tower){
    u.specialCooldown=Math.max(0,(u.specialCooldown??3)-dt);u.summonCooldown=Math.max(0,(u.summonCooldown??6)-dt);
    if(u.summonCooldown<=0){u.summonCooldown=u.archetype==='rimewitch'?8:10;const summoned=this.units.filter(v=>v.summoned&&v.hp>0).length;if(summoned<9){for(let i=0;i<3;i++){const minion=this.spawnRaider(i===2?this.siegePhase.escort:this.siegePhase.mob,{x:u.x+(i-1)*28,y:u.y+26},u.lane);minion.node=u.node;minion.summoned=true;this.effect('spawn',minion,30,this.siegePhase.color);}}}
    if(this.hazards.some(h=>h.sourceId===u.id))return true;
    if(u.specialCooldown<=0&&target){const ice=u.archetype==='rimewitch',hollow=u.archetype==='hollowking',center=ice?target:u;const duration=ice?1.3:hollow?1.45:1.1;this.hazards.push({x:center.x,y:center.y,radius:hollow?155:120,remaining:duration,duration,damage:hollow?46:ice?34:38,sourceId:u.id,archetype:u.archetype!,army:true,color:this.siegePhase.color,slow:ice?3:0});u.specialCooldown=ice?6:7;return true;}
    return false;
  }
  private completeStage(){
    if(this.stage===SIEGE_PHASES.length-1){this.stageState='complete';this.bossDead=true;return;}
    this.stage++;this.stageWave=0;this.stageState='prepare';this.bossSpawned=false;this.waveTimer=SIEGE_PACING.phasePreparation;this.gold+=120;this.keepHp=Math.min(this.keepMax,this.keepHp+120);this.hero.hp=Math.min(this.hero.maxHp,this.hero.hp+this.hero.maxHp*.4);
    for(const u of this.defenders){u.hp=Math.min(u.maxHp,u.hp+50);u.node=2;}this.deploySquad(2);
    this.say(`Phase ${this.stage+1} · ${this.siegePhase.name}. +120 gold, healing, and reinforcements. Prepare for ${SIEGE_PACING.phasePreparation} seconds.`);this.soundEvents.push('capture');
  }
  private updateJungle(u:Unit,dt:number){
    const camp=this.camps.find(c=>c.id===u.campId)!,home=u.home!;
    if(camp.aggro&&(dist(this.hero,camp)>265||dist(u,camp)>240)){camp.aggro=false;for(const member of this.units.filter(v=>v.campId===camp.id&&v.hp>0)){member.returning=true;member.specialCooldown=4;}}
    if(u.returning){this.move(u,home,dt);u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.4*dt);if(dist(u,home)<10){u.returning=false;u.hp=u.maxHp;}return;}
    if(!camp.aggro&&dist(this.hero,camp)<110)camp.aggro=true;
    if(!camp.aggro){if(dist(u,home)>5)this.move(u,home,dt);return;}
    if(u.kind==='jungleBoss'){
      u.specialCooldown=Math.max(0,(u.specialCooldown??4)-dt);
      if(this.hazards.some(h=>h.sourceId===u.id))return;
      if(u.specialCooldown<=0&&dist(this.hero,u)<170){const stone=u.archetype==='stonewarden';const center=stone?u:this.hero;this.hazards.push({x:center.x,y:center.y,radius:stone?115:130,remaining:1.15,duration:1.15,damage:stone?38:44,sourceId:u.id,archetype:u.archetype!});u.specialCooldown=stone?7:6;return;}
    }
    if(dist(u,this.hero)>u.range)this.move(u,this.hero,dt);else if(u.cooldown<=0){this.animate(u,'attack');this.damage(this.hero,u.damage);u.cooldown=u.kind==='jungleBoss'?1.4:1.2;this.effect('slash',u,50,0xe2ae75);}
  }
  private move(u:Unit,p:Point,dt:number){const d=dist(u,p)||1,s=u.speed*(u.slow>0?.42:1)*dt;u.x+=(p.x-u.x)/d*Math.min(d,s);u.y+=(p.y-u.y)/d*Math.min(d,s);if(Math.abs(p.x-u.x)>1)u.facing=Math.sign(p.x-u.x);}
}
