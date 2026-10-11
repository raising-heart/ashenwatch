import Phaser from 'phaser';
import { WORLD, KEEP, GATE, SHRINES, CAMPS, SIEGE_STATS, CITADEL_HEALING, type Point, type SiegeArchetype } from '../game/content';
import { Siege, isHostile, isJungle, type Unit } from '../game/simulation';
import { makeWorld, makeUnitSheet, makeTower, MOTION_FRAMES, type Motion } from './art';
export class BattleScene extends Phaser.Scene {
  model:Siege; onTick:()=>void; onSound:(name:string)=>void;
  private actors=new Map<number,Phaser.GameObjects.Sprite>();
  private poses=new Map<number,{x:number;y:number;walk:number}>();
  private deaths=new Map<number,number>();
  private healingGround!:Phaser.GameObjects.Graphics;private healingMotes!:Phaser.GameObjects.Graphics;
  private towerViews:Phaser.GameObjects.Image[]=[]; private effects!:Phaser.GameObjects.Graphics; private bars!:Phaser.GameObjects.Graphics;private portal!:Phaser.GameObjects.Graphics;
  private towerLabels:Phaser.GameObjects.Text[]=[];
  private labels:Phaser.GameObjects.Text[]=[];private keys!:Record<string,Phaser.Input.Keyboard.Key>;private aim?:Point;private attackMoveArmed=false;private followHero=false;private combatZoom?:number;private cameraWasInMenu=true;private cameraFocus:Point={x:820,y:525}; private cursor!:Phaser.GameObjects.Graphics;
  constructor(model:Siege,onTick:()=>void,onSound:(name:string)=>void){super('Battle');this.model=model;this.onTick=onTick;this.onSound=onSound;}
  create(){
    this.textures.addCanvas('world',makeWorld());for(const k of ['hero','enemy','ally','archer','boss','wolf','golem','stonewarden','thornmaw',...Object.keys(SIEGE_STATS) as SiegeArchetype[]] as const){const texture=this.textures.addCanvas(k,makeUnitSheet(k))!;for(let i=0;i<35;i++)texture.add(i,0,i%7*128,Math.floor(i/7)*140,128,140);}this.textures.addCanvas('tower',makeTower());
    const searing=this.textures.addCanvas('hero-searing',makeUnitSheet('hero',true))!;for(let i=0;i<35;i++)searing.add(i,0,i%7*128,Math.floor(i/7)*140,128,140);
    this.add.image(0,0,'world').setOrigin(0).setDepth(-1000);
    this.healingGround=this.add.graphics().setDepth(-900);
    this.healingMotes=this.add.graphics().setDepth(2000).setData('effect','citadel-healing');
    this.portal=this.add.graphics().setDepth(GATE.y-20);this.effects=this.add.graphics().setDepth(2000);this.bars=this.add.graphics().setDepth(2100);this.cursor=this.add.graphics().setDepth(2001);
    this.model.towers.forEach(t=>this.towerViews.push(this.add.image(t.x,t.y+12,'tower').setOrigin(.5,.85).setScale(.78).setDepth(t.y).setVisible(false)));
    this.model.towers.forEach(t=>{const label=this.add.text(t.x,t.y+40,t.name.toUpperCase(),{fontFamily:'sans-serif',fontSize:'10px',color:'#d9d9b4',letterSpacing:1,stroke:'#233e35',strokeThickness:3}).setOrigin(.5).setDepth(1900);this.towerLabels.push(label);this.labels.push(label);});
    for(const p of [{...KEEP,name:'ASHENWATCH',sub:'THE LAST CITADEL',dy:91},{...GATE,name:'THE HOLLOW GATE',sub:'DEMON SPAWN PORTAL',dy:40},...SHRINES.map(s=>({...s,name:s.name.toUpperCase(),sub:'ANCIENT SANCTUARY',dy:58})),...CAMPS.map(c=>({...c,name:c.id==='quarry'?'THE STONEWARDEN':c.name.toUpperCase(),sub:c.id==='briar'?'NEUTRAL CAMP':'JUNGLE BOSS',dy:85}))]){
      this.labels.push(this.add.text(p.x,p.y+p.dy,p.name,{fontFamily:'Georgia',fontSize:'15px',color:'#e7e6c9',letterSpacing:2,stroke:'#233e35',strokeThickness:4}).setOrigin(.5).setDepth(1900));
      this.labels.push(this.add.text(p.x,p.y+p.dy+20,p.sub,{fontFamily:'sans-serif',fontSize:'9px',color:'#c1c6a8',letterSpacing:2,stroke:'#233e35',strokeThickness:3}).setOrigin(.5).setDepth(1900));
    }
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,SHIFT,ESC,F,X,C') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-Q',()=>this.model.ability('nova'));this.input.keyboard!.on('keydown-SHIFT',()=>this.model.ability('dash',this.aim));this.input.keyboard!.on('keydown-E',()=>this.model.interact());
    this.input.keyboard!.on('keydown-ESC',()=>{if(document.fullscreenElement)return;if(this.model.phase==='playing')this.model.phase='paused';else if(this.model.phase==='paused')this.model.phase='playing';this.onTick();});
    this.input.keyboard!.on('keydown-F',()=>{if(this.model.phase==='playing'){this.attackMoveArmed=true;this.model.say('Attack-move ready. Click a destination.');}});
    this.input.keyboard!.on('keydown-X',()=>this.clearTarget());this.input.keyboard!.on('keydown-C',()=>{if(this.model.phase==='playing'){this.followHero=!this.followHero;this.resizeCamera();this.model.say(this.followHero?'Camera follows the warden. C for tactical overview.':'Tactical overview. C to follow the warden.');}});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.model.phase!=='playing')return;this.aim=this.point(p);const enemy=this.pickHostile(this.aim);if(enemy)this.model.issueAttack(enemy.id);else this.model.issueMove(this.aim,this.attackMoveArmed);this.attackMoveArmed=false;});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{this.aim=this.point(p);this.game.canvas.style.cursor=this.pickHostile(this.aim)?'crosshair':'default';});
    this.input.on('wheel',(_p:Phaser.Input.Pointer,_objects:unknown[],_dx:number,dy:number)=>{if(this.model.phase==='playing'){const camera=this.cameras.main,overview=Math.min(this.scale.width/1460,this.scale.height/950);this.combatZoom=Phaser.Math.Clamp(camera.zoom-dy*.001,overview,2.6);this.followHero=this.combatZoom>overview+.01;this.resizeCamera();}});
    this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.scale.on('resize',()=>this.resizeCamera());this.resizeCamera();
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.model.phase==='playing'){this.model.phase='paused';this.onTick();}});
  }
  private point(p:Phaser.Input.Pointer){return this.cameras.main.getWorldPoint(p.x,p.y);}
  resizeCamera(){
    const w=this.scale.width,h=this.scale.height,camera=this.cameras.main;
    camera.setBounds(0,0,WORLD.width,WORLD.height);
    if(this.model.phase==='menu'||!this.followHero){
      const portrait=w<700;
      camera.setZoom(portrait?Math.max(.7,h/WORLD.height):Math.min(w/1460,h/950));
      camera.centerOn(portrait?this.model.hero.x:820,portrait?this.model.hero.y-40:525);
    }else{
      this.cameraFocus={x:this.model.hero.x,y:this.model.hero.y-40};
      camera.setZoom(this.combatZoom??(w<700?1.35:1.75)).centerOn(this.cameraFocus.x,this.cameraFocus.y);
    }
    for(const label of this.labels)label.setScale(this.model.phase==='menu'?1:1/camera.zoom).setAlpha(1);
  }
  private updateCamera(delta:number){
    const inMenu=this.model.phase==='menu';
    if(inMenu!==this.cameraWasInMenu){this.cameraWasInMenu=inMenu;this.resizeCamera();}
    if(inMenu||!this.followHero)return;
    const blend=1-Math.exp(-Math.min(delta,100)/1000*10);
    this.cameraFocus.x+=(this.model.hero.x-this.cameraFocus.x)*blend;
    this.cameraFocus.y+=(this.model.hero.y-40-this.cameraFocus.y)*blend;
    this.cameras.main.centerOn(this.cameraFocus.x,this.cameraFocus.y);
    const camera=this.cameras.main;
    for(const label of this.labels){const x=(label.x-camera.worldView.x)*camera.zoom,y=(label.y-camera.worldView.y)*camera.zoom;label.setAlpha(x>90&&x<this.scale.width-90&&y>(this.scale.width<700?330:160)&&y<this.scale.height-170?1:0);}
  }
  private pickHostile(p:Point){return this.model.units.filter(u=>isHostile(u)&&!u.returning&&Math.abs(u.x-p.x)<(u.kind==='boss'||u.kind==='jungleBoss'?38:25)&&p.y<u.y+12&&p.y>u.y-(u.kind==='boss'||u.kind==='jungleBoss'?100:58)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-28-p.y)-Math.hypot(b.x-p.x,b.y-28-p.y))[0];}
  setModel(model:Siege){this.model=model;this.followHero=false;this.combatZoom=undefined;this.cameraWasInMenu=model.phase==='menu';this.clearTarget();for(const actor of this.actors.values())actor.destroy();this.actors.clear();this.poses.clear();this.deaths.clear();this.resizeCamera();}
  clearTarget(){this.model.stop();this.attackMoveArmed=false;this.cursor?.clear();}
  suspendInput(){this.attackMoveArmed=false;this.cursor?.clear();}
  update(_time:number,delta:number){if(!this.keys)return;const m=this.model,dt=delta/1000;
    const x=Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),y=Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown);
    m.update(dt,{x,y,attack:this.keys.SPACE.isDown});
    this.updateCamera(delta);
    const entities=[m.hero,...m.units],ids=new Set(entities.map(u=>u.id));for(const[id,actor]of this.actors)if(!ids.has(id)){
      if(!this.deaths.has(id))this.deaths.set(id,m.time);
      const strip=MOTION_FRAMES.death,elapsed=m.time-this.deaths.get(id)!;
      if(elapsed>=strip.duration){actor.destroy();this.actors.delete(id);this.poses.delete(id);this.deaths.delete(id);}
      else actor.setFrame(strip.start+Math.min(strip.count-1,Math.floor(elapsed/strip.duration*strip.count))).setTint(0xc6c5b0);
    }
    for(const u of entities)this.drawActor(u);
    this.bars.clear();this.effects.clear();this.cursor.clear();this.drawPortal(_time);this.drawCitadelHealing();
    this.effects.lineStyle(2,0xb8d8c2,.65).strokeEllipse(m.hero.x,m.hero.y+3,40,20);
    if(m.order?.kind==='move'||m.order?.kind==='attackMove'){const p=m.order.point;this.cursor.lineStyle(1.5,m.order.kind==='attackMove'?0xe5a66b:0xddcf93,.85).strokeEllipse(p.x,p.y,25,13);this.cursor.lineBetween(p.x-6,p.y,p.x+6,p.y).lineBetween(p.x,p.y-4,p.x,p.y+4);}
    const target=m.attackTarget;if(target)this.effects.lineStyle(2.5,isJungle(target)?0xe6b771:0xe58d76,.85).strokeEllipse(target.x,target.y+4,target.kind==='boss'||target.kind==='jungleBoss'?65:39,22);
    if(m.hero.hp<m.hero.maxHp)this.healthBar(m.hero,0xa9d1b6);
    for(const u of m.units)if(u.hp<u.maxHp||u.kind==='boss'||u.kind==='jungleBoss'||u.id===target?.id)this.healthBar(u,u.returning?0x85988a:isJungle(u)?0xd8b579:u.kind==='ally'?0xa2c59b:0xe49a87);
    for(const c of m.camps){if(!c.cleared)this.effects.lineStyle(1,c.aggro?0xe7a76d:0xc7bd91,c.aggro?.55:.17).strokeEllipse(c.x,c.y,175,82);}
    for(const h of m.hazards){const progress=1-h.remaining/h.duration,color=h.color??0xef9c68;this.effects.fillStyle(color,.1+progress*.2).fillCircle(h.x,h.y,h.radius);this.effects.lineStyle(2,color,.8).strokeCircle(h.x,h.y,h.radius);this.effects.lineStyle(3,0xffdc9d,.95).beginPath().arc(h.x,h.y,h.radius*.55,-Math.PI/2,-Math.PI/2+progress*Math.PI*2,false).strokePath();}
    m.towers.forEach((t,i)=>{this.towerLabels[i].setText(`${t.name.toUpperCase()}${t.built?'': ' · BUILD'}`);this.towerViews[i].setVisible(t.built).setScale(t.level===2?.9:.82).setTint(t.level===2?0xffecc5:0xffffff);if(t.built){this.bars.fillStyle(0x192b28,.9).fillRoundedRect(t.x-26,t.y-108,52,7,2);this.bars.fillStyle(0xbad79d).fillRect(t.x-24,t.y-106,48*t.hp/t.maxHp,3);this.effects.lineStyle(1,0xc9d795,.35).strokeEllipse(t.x,t.y+7,76,35);if(Math.hypot(m.hero.x-t.x,m.hero.y-t.y)<120)this.effects.lineStyle(1,0xcddca6,.18).strokeCircle(t.x,t.y,280);}else{this.effects.lineStyle(2,0xd5c69b,.65).strokeEllipse(t.x,t.y+5,68,32);this.effects.lineStyle(2,0xddcd9b,.9).strokeRect(t.x-5,t.y-23,10,10);}});
    if(m.packOath>0||m.artifacts.length)for(const u of [m.hero,...m.defenders]){this.effects.lineStyle(1.5,m.predator?0xe4b374:m.stoneheart?0xb4d4bc:0xaacc87,.3+.15*Math.sin(m.time*3+u.id)).strokeEllipse(u.x,u.y+3,u.kind==='hero'?44:29,14);}
    for(const s of m.shrines){this.effects.lineStyle(2,s.captured?0xb9ddad:s.element==='Ember'?0xf2b979:0x9ed6dd,s.captured?.8:.4).strokeEllipse(s.x,s.y,105,48);if(s.progress>0&&!s.captured){this.effects.lineStyle(5,0xeee0aa,1).beginPath().arc(s.x,s.y,56,-Math.PI/2,-Math.PI/2+s.progress*Math.PI*2,false).strokePath();}if(s.captured){this.effects.fillStyle(0xb5db9b,.25).fillEllipse(s.x,s.y,100,44);}}
    for(const e of m.effects){const p=1-e.life/e.maxLife,a=1-p,col=e.color??(e.kind==='hit'?0xffe3ad:0xe3d5a6);if(e.kind==='bolt'||e.kind==='dash'){this.effects.lineStyle(e.kind==='dash'?15*a:2,col,a).lineBetween(e.x,e.y-20,e.to?.x??e.x,e.to?.y??e.y);}
      else if(e.kind==='nova'||e.kind==='capture'||e.kind==='spawn'){this.effects.lineStyle(4*a,col,a).strokeEllipse(e.x,e.y,e.radius*2*p,e.radius*p);this.effects.fillStyle(col,a*.14).fillEllipse(e.x,e.y,e.radius*2*p,e.radius*p);for(let n=0;n<12;n++){const angle=n/12*Math.PI*2;this.effects.fillStyle(col,a).fillCircle(e.x+Math.cos(angle)*e.radius*p,e.y+Math.sin(angle)*e.radius*p*.6,2+2*a);}}
      else if(e.kind==='slash'){
        const fire=m.searingSteel&&e.sourceId===m.hero.id,facing=fire?(e.facing??1):1,r=e.radius*.7;
        const start=facing<0?Math.PI+2.7-p:-2.7+p,end=facing<0?Math.PI-.3-p:.3+p;
        if(fire)this.effects.lineStyle(16*a,0xf06b2c,a*.22).beginPath().arc(e.x,e.y-20,r,start,end,facing<0).strokePath();
        this.effects.lineStyle(fire?7*a:6*a,fire?0xffa64d:col,a).beginPath().arc(e.x,e.y-20,r,start,end,facing<0).strokePath();
        if(fire){
          this.effects.lineStyle(2.5*a,0xffedb4,a).beginPath().arc(e.x,e.y-20,r,start,end,facing<0).strokePath();
          for(let i=0;i<10;i++){const angle=-2.7+p+i*.3,distance=r+p*(8+i%3*5);this.effects.fillStyle(i%2?0xffce78:0xff8743,a*.8).fillCircle(e.x+facing*Math.cos(angle)*distance,e.y-20+Math.sin(angle)*distance-p*10,1.5+2*a);}
        }
      }
      else if(e.kind==='hit'){this.effects.fillStyle(col,a).fillCircle(e.x,e.y-30,4*a);for(let n=0;n<7;n++){const angle=n/7*Math.PI*2,inner=5+p*14,outer=inner+7*a;this.effects.lineStyle(2*a,col,a).lineBetween(e.x+Math.cos(angle)*inner,e.y-30+Math.sin(angle)*inner*.7,e.x+Math.cos(angle)*outer,e.y-30+Math.sin(angle)*outer*.7);}}
      else {this.effects.fillStyle(col,a).fillCircle(e.x,e.y-30,4*a);}}
    // Atmospheric embers drift above the valley, without covering combat silhouettes.
    for(let i=0;i<26;i++){const t=_time*.00004+i*1.7;this.effects.fillStyle(i%3?0xe7d296:0xd0dccc,.12+Math.sin(t)*.1).fillCircle((i*173+Math.sin(t)*35)%1550,150+(i*79-_time*.009)%800,1.5);}
    for(const sound of m.soundEvents.splice(0))this.onSound(sound);this.onTick();
  }
  private drawCitadelHealing(){
    const m=this.model,ground=this.healingGround,motes=this.healingMotes;
    ground.clear();motes.clear();motes.setVisible(m.citadelHealing);
    if(!m.nearCitadel||m.phase==='menu'||m.phase==='won'||m.phase==='lost')return;
    ground.fillStyle(0x80d9b5,.04).fillCircle(KEEP.x,KEEP.y,CITADEL_HEALING.radius);
    ground.lineStyle(1.5,0xa1e4c5,.24).strokeCircle(KEEP.x,KEEP.y,CITADEL_HEALING.radius);
    if(!m.citadelHealing)return;
    const pulse=Math.sin(m.time*3),hero=m.hero;
    ground.fillStyle(0x83edbc,.17).fillEllipse(hero.x,hero.y+4,80+pulse*8,34+pulse*4);
    ground.lineStyle(2,0xb0ffda,.65+pulse*.12).strokeEllipse(hero.x,hero.y+4,59+pulse*6,25+pulse*3);
    for(let i=0;i<6;i++){
      const progress=(m.time*.7+i/6)%1,x=hero.x+Math.sin(i*2.4+m.time*.7)*25,y=hero.y-8-progress*66,alpha=Math.sin(progress*Math.PI)*.85;
      motes.lineStyle(2,0xb4ffda,alpha).lineBetween(x-3,y,x+3,y).lineBetween(x,y-3,x,y+3);
      motes.fillStyle(0x83edbc,alpha*.55).fillCircle(x,y,5);
    }
  }
  private drawPortal(time:number){const g=this.portal,x=GATE.x,y=GATE.y-77,pulse=this.model.portalPulse*.2+(this.model.waveTimer<3&&this.model.phase==='playing'?.12:0),t=time*.001;g.clear();g.fillStyle(0x250b17,.96).fillEllipse(x,y,112,150);g.fillStyle(0xac343d,.16+pulse).fillEllipse(x,y,107,144);g.lineStyle(2,0xff8966,.4+pulse).strokeEllipse(x,y,110,148);
    for(let band=0;band<5;band++){g.lineStyle(1.4,band%2?0xf1a576:0xcd4d5b,.28+pulse);g.beginPath();for(let n=0;n<40;n++){const r=.2+n/52,angle=t*(band%2?-1:1)+band*1.26+n*.13;const px=x+Math.cos(angle)*48*r,py=y+Math.sin(angle)*68*r;if(n===0)g.moveTo(px,py);else g.lineTo(px,py);}g.strokePath();}
    g.fillStyle(0x0d1116,.9).fillEllipse(x,y,26,45);for(let n=0;n<10;n++){const angle=n/10*Math.PI*2+t*.25;g.fillStyle(0xffbf83,.35+pulse).fillCircle(x+Math.cos(angle)*57,y+Math.sin(angle)*77,1.6);}g.fillStyle(0xd7654b,.09+pulse*.2).fillEllipse(x,GATE.y+6,130,37);
  }
  private drawActor(u:Unit){
    const texture=u.kind==='hero'&&this.model.searingSteel?'hero-searing':u.archetype??(u.role==='archer'?'archer':u.kind);
    let actor=this.actors.get(u.id);if(!actor){actor=this.add.sprite(u.x,u.y,texture,0).setOrigin(.5,115/140).setData('unitId',u.id);this.actors.set(u.id,actor);}
    if(actor.texture.key!==texture)actor.setTexture(texture);
    const pose=this.poses.get(u.id)??{x:u.x,y:u.y,walk:0},distance=Math.hypot(u.x-pose.x,u.y-pose.y);
    const moving=distance>.05&&this.model.phase==='playing';pose.walk+=Math.min(distance,12)/48;pose.x=u.x;pose.y=u.y;this.poses.set(u.id,pose);
    let motion:Motion=moving?'walk':'idle',progress=moving?pose.walk%1:(this.model.time/1.2+u.id*.17)%1;
    const elapsed=this.model.time-(u.actionStarted??-100),action=u.action==='attack'?'attack':'cast';
    if(u.action&&elapsed<MOTION_FRAMES[action].duration){motion=action;progress=elapsed/MOTION_FRAMES[action].duration;}
    const hazard=this.model.hazards.find(h=>h.sourceId===u.id);
    if(hazard){motion='cast';progress=Math.min(.8,(1-hazard.remaining/hazard.duration)*.8);}
    if(u.flash>0){motion='hurt';progress=1-u.flash/.15;}
    if(u.hp<=0){if(!this.deaths.has(u.id))this.deaths.set(u.id,this.model.time);motion='death';progress=Math.min(.99,(this.model.time-this.deaths.get(u.id)!)/.5);}
    const strip=MOTION_FRAMES[motion],frame=strip.start+Math.min(strip.count-1,Math.max(0,Math.floor(progress*strip.count)));
    const scale=u.kind==='boss'?.83:u.kind==='jungleBoss'?.86:u.kind==='hero'?.72:u.archetype==='wolf'?.68:.57;
    actor.setFrame(frame).setData('motion',motion).setPosition(u.x,u.y).setScale(scale*u.facing,scale).setDepth(u.y+15).setTint(u.flash>0?0xffc8a1:u.returning?0x93a997:0xffffff).setAlpha(u.returning?.65:1);
  }
  private healthBar(u:Unit,color:number){const boss=u.kind==='boss'||u.kind==='jungleBoss',w=boss?65:32,y=u.y-(boss?100:u.archetype==='wolf'?37:58);this.bars.fillStyle(0x192b28,.9).fillRoundedRect(u.x-w/2-2,y-2,w+4,7,2);this.bars.fillStyle(color).fillRect(u.x-w/2,y,w*Math.max(0,u.hp/u.maxHp),3);}
}
