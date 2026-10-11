import { CAMPS, GATE, KEEP, LANES, SHRINES, TOWERS, WORLD, type JungleArchetype, type SiegeArchetype } from '../game/content';
let seed=7823;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
type C=CanvasRenderingContext2D;
function polygon(c:C,p:number[][],fill:string,stroke?:string){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function ellipse(c:C,x:number,y:number,rx:number,ry:number,color:string){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function line(c:C,p:number[][],color:string,width:number){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.stroke();}
function stone(c:C,x:number,y:number,w:number,h:number){ellipse(c,x+4,y+5,w*.7,h*.35,'#15272366');polygon(c,[[x-w*.5,y],[x-w*.4,y-h*.6],[x,y-h],[x+w*.5,y-h*.7],[x+w*.6,y],[x,y+h*.12]],'#56675a');polygon(c,[[x-w*.4,y-h*.6],[x,y-h],[x+w*.5,y-h*.7],[x,y-h*.3]],'#84917b');}
function tree(c:C,x:number,y:number,s:number){ellipse(c,x+15*s,y+3,26*s,12*s,'#15272265');line(c,[[x,y],[x,y-50*s]],'#4c4d37',5*s);for(let i=0;i<3;i++){const b=y-12*s-i*17*s;polygon(c,[[x-27*s+i*5*s,b],[x,b-45*s],[x+27*s-i*5*s,b],[x,b+9*s]],i===0?'#223e34':i===1?'#2c4b3b':'#365b42');polygon(c,[[x,b-45*s],[x+27*s-i*5*s,b],[x,b+9*s]],i===0?'#1c332d':i===1?'#254136':'#2c4837');}}
function block(c:C,x:number,y:number,w:number,h:number,d:number,color='#78847b'){polygon(c,[[x-w/2,y],[x,y+d/2],[x+w/2,y],[x+w/2,y-h],[x,y-h+d/2],[x-w/2,y-h]],color);polygon(c,[[x-w/2,y-h],[x,y-h-d/2],[x+w/2,y-h],[x,y-h+d/2]],'#a1aa94');polygon(c,[[x,y+d/2],[x+w/2,y],[x+w/2,y-h],[x,y-h+d/2]],'#4c6059');line(c,[[x-w/2,y-h],[x,y-h+d/2],[x+w/2,y-h]],'#c4c7a180',1);}
function turret(c:C,x:number,y:number,s:number,roof=true){ellipse(c,x+9,y+8,23*s,10*s,'#10241c66');block(c,x,y,34*s,55*s,18*s);for(let i=-1;i<=1;i++)block(c,x+i*11*s,y-53*s+(i===0?5:0),8*s,11*s,5*s,'#879083');polygon(c,[[x-4*s,y-20*s],[x+3*s,y-17*s],[x+3*s,y-36*s],[x-4*s,y-39*s]],'#223b39');if(roof){polygon(c,[[x-25*s,y-61*s],[x,y-100*s],[x+25*s,y-61*s],[x,y-47*s]],'#355b59');polygon(c,[[x,y-100*s],[x+25*s,y-61*s],[x,y-47*s]],'#22423f');line(c,[[x,y-97*s],[x-22*s,y-61*s]],'#74a08b',2*s);}}
function banner(c:C,x:number,y:number,scale:number,color:string){line(c,[[x,y],[x,y-76*scale]],'#b3a77b',2*scale);polygon(c,[[x,y-72*scale],[x+27*scale,y-69*scale],[x+25*scale,y-38*scale],[x+12*scale,y-46*scale],[x,y-41*scale]],color);line(c,[[x+13*scale,y-64*scale],[x+13*scale,y-51*scale]],'#d7cca6',2*scale);}
function castle(c:C){const {x,y}=KEEP;ellipse(c,x+5,y+15,145,60,'#142c2766');polygon(c,[[x-125,y+25],[x-90,y-85],[x+60,y-120],[x+130,y-10],[x+70,y+70]],'#59685a');polygon(c,[[x-125,y+25],[x+70,y+70],[x+130,y-10],[x+74,y+45],[x-113,y+8]],'#97a18a');
  block(c,x-10,y-4,130,58,60);block(c,x-10,y-36,70,85,35);polygon(c,[[x-55,y-115],[x-10,y-155],[x+35,y-114],[x-10,y-90]],'#3c6560');polygon(c,[[x-10,y-155],[x+35,y-114],[x-10,y-90]],'#224944');
  turret(c,x-96,y-15,1);turret(c,x+71,y+25,1.08);turret(c,x+63,y-67,.78);turret(c,x-46,y-84,.75);
  polygon(c,[[x-20,y+17],[x+6,y+25],[x+6,y-9],[x-7,y-23],[x-20,y-15]],'#1b3532');line(c,[[x-13,y-7],[x-13,y+17]],'#e8b764',3);
  banner(c,x-8,y-120,.72,'#a37545');banner(c,x+77,y-88,.67,'#a37545');
  for(const [tx,ty]of[[x-72,y+36],[x+40,y+44]]){ellipse(c,tx,ty-23,9,14,'#e2a95322');ellipse(c,tx,ty-23,4,7,'#edbd70');line(c,[[tx,ty],[tx,ty-21]],'#4c4b35',3);}
}
function gate(c:C){
  const {x,y}=GATE,cy=y-77;
  ellipse(c,x,y+15,120,43,'#172021aa');ellipse(c,x,y+10,103,32,'#605d55');ellipse(c,x,y+8,86,24,'#363837');
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;stone(c,x+Math.cos(a)*103,y+Math.sin(a)*30,14+rand()*10,12+rand()*12);}
  const point=(a:number,rx:number,ry:number)=>[x+Math.cos(a)*rx,cy+Math.sin(a)*ry];
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2+.025,b=(i+1)/14*Math.PI*2-.025;if(i===8)continue;
    const p=[point(a,79,101),point(b,79,101),point(b,57,77),point(a,57,77)];
    polygon(c,p,i<7?'#6b665c':'#8c8270','#302f32');line(c,[p[0],p[1]],'#b6a58a',2);
    const mid=(a+b)/2,rx=x+Math.cos(mid)*67,ry=cy+Math.sin(mid)*88;
    line(c,[[rx-3,ry-5],[rx+3,ry],[rx-3,ry+5]],'#e49b68',1.8);
  }
  // Broken keystone, basalt teeth, and braziers anchor the standing rift.
  polygon(c,[[x-71,y+2],[x-88,y-37],[x-79,y-81],[x-68,y-55],[x-53,y+4]],'#4a4744');
  polygon(c,[[x+71,y+2],[x+92,y-39],[x+79,y-94],[x+69,y-57],[x+55,y+5]],'#343938');
  stone(c,x-55,y+23,26,23);stone(c,x+60,y+18,27,19);
  for(const bx of [x-97,x+98]){block(c,bx,y+2,17,25,11,'#5e594d');ellipse(c,bx,y-30,12,17,'#f08c452a');polygon(c,[[bx-7,y-23],[bx-3,y-42],[bx,y-33],[bx+4,y-47],[bx+7,y-23]],'#e88f53');polygon(c,[[bx-3,y-23],[bx,y-38],[bx+3,y-23]],'#ffe0a2');}
  ellipse(c,x,cy,57,77,'#240f1c');
}
function campGround(c:C){for(const camp of CAMPS){const {x,y}=camp;ellipse(c,x,y+10,97,54,'#304538a0');ellipse(c,x,y+8,82,42,camp.id==='quarry'?'#858777':'#677359');
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2;const px=x+Math.cos(a)*89,py=y+Math.sin(a)*46;if(camp.id==='quarry')stone(c,px,py,18+rand()*14,13+rand()*22);else if(i%2===0)tree(c,px,py,.6+rand()*.35);}
  if(camp.id==='briar'){line(c,[[x-48,y-21],[x-27,y-41]],'#726747',11);line(c,[[x-47,y-24],[x-28,y-42]],'#a0986c',3);ellipse(c,x+42,y+28,12,5,'#4a4b36');polygon(c,[[x+33,y+25],[x+42,y+5],[x+47,y+25]],'#dda26a');}
  else if(camp.id==='quarry'){block(c,x-60,y-17,22,54,18,'#7a857c');block(c,x+65,y-21,21,39,17,'#5a7067');polygon(c,[[x-4,y-20],[x,y-39],[x+4,y-20]],'#b6d7c4');}
  else{for(const side of [-1,1])for(let i=0;i<3;i++){const bx=x+side*(38+i*12),by=y-10-i*5;line(c,[[bx,by],[bx-side*7,by-30],[bx-side*22,by-41]],'#beb49a',4);}stone(c,x,y-43,44,35);ellipse(c,x,y-57,12,6,'#354239');}
}}
export function makeWorld():HTMLCanvasElement {
  seed=7823;const cv=document.createElement('canvas');cv.width=WORLD.width;cv.height=WORLD.height;const c=cv.getContext('2d')!;
  const ground=c.createLinearGradient(0,0,1300,1000);ground.addColorStop(0,'#354c40');ground.addColorStop(.5,'#647152');ground.addColorStop(1,'#3b5344');c.fillStyle=ground;c.fillRect(0,0,1600,1050);
  for(let i=0;i<22000;i++){const x=rand()*1600,y=rand()*1050;c.globalAlpha=.04+rand()*.07;ellipse(c,x,y,2+rand()*16,1+rand()*5,rand()>.5?'#e3d4a4':'#102e26');}c.globalAlpha=1;
  // The valley river and terraced riverbanks.
  const river=[[230,-20],[320,130],[285,250],[180,380],[220,490],[160,610],[190,800],[120,1080]];
  line(c,river,'#233e39',123);line(c,river,'#8e947365',102);line(c,river,'#274f50',85);line(c,river,'#4b7972',65);line(c,river,'#76938555',34);
  for(let i=0;i<140;i++){const x=125+rand()*175,y=rand()*1050;line(c,[[x,y],[x+8+rand()*13,y-2]],'#bed3a329',1);}
  for(const lane of LANES){const p=lane.map(v=>[v.x,v.y]);line(c,p,'#30443955',61);line(c,p,'#949475',43);line(c,p,'#afa681',27);line(c,p,'#c7b49142',9);}
  for(const s of SHRINES){line(c,[[s.x,s.y],[s.x-55,s.y+75]],'#a9a17d',20);ellipse(c,s.x,s.y+6,84,38,'#829076');ellipse(c,s.x,s.y+6,66,28,'#657d70');c.strokeStyle='#b7b89a';c.lineWidth=2;c.beginPath();c.ellipse(s.x,s.y+6,65,27,0,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;stone(c,s.x+Math.cos(a)*70,s.y+Math.sin(a)*28,12,9);}block(c,s.x,s.y,36,13,26);polygon(c,[[s.x-12,s.y-30],[s.x,s.y-65],[s.x+12,s.y-30],[s.x,s.y-8]],s.element==='Ember'?'#d5a36c':'#94c1ba');polygon(c,[[s.x,s.y-65],[s.x+12,s.y-30],[s.x,s.y-8]],s.element==='Ember'?'#997146':'#608f8c');}
  campGround(c);
  // Old bridge, tracks, and small settlements.
  polygon(c,[[125,646],[217,600],[251,619],[150,671]],'#818574');line(c,[[129,646],[218,600]],'#b8b69b',8);line(c,[[150,672],[251,619]],'#b8b69b',8);
  for(let i=0;i<9;i++)line(c,[[134+i*10,648-i*5],[153+i*10,664-i*5]],'#4c615457',2);
  for(let i=0;i<420;i++){const x=rand()*1600,y=rand()*1050;if(LANES.some(l=>l.some(p=>Math.hypot(x-p.x,y-p.y)<95))||Math.hypot(x-KEEP.x,y-KEEP.y)<160||SHRINES.some(s=>Math.hypot(x-s.x,y-s.y)<110)||CAMPS.some(s=>Math.hypot(x-s.x,y-s.y)<115))continue;
    if(x<110||x>1420||y<100||y>955||rand()<.34)tree(c,x,y,.5+rand()*.75);else if(rand()<.3)stone(c,x,y,7+rand()*13,7+rand()*10);else {line(c,[[x,y],[x-2,y-7]],'#b4bc805c',1);line(c,[[x+3,y],[x+5,y-5]],'#b4bc805c',1);}}
  for(const [x,y]of[[920,290],[1000,760],[580,835]]){block(c,x,y,38,18,24,'#776f56');polygon(c,[[x-25,y-18],[x,y-52],[x+25,y-18],[x,y-6]],'#625b46');line(c,[[x,y-49],[x-24,y-18]],'#a79d71',2);}
  for(const t of TOWERS){ellipse(c,t.x,t.y+5,43,20,'#354b3b88');block(c,t.x,t.y,42,16,25,'#788273');block(c,t.x-10,t.y-10,13,25,9);block(c,t.x+15,t.y-4,12,16,8);stone(c,t.x-32,t.y+8,16,10);stone(c,t.x+32,t.y+2,12,11);}
  castle(c);gate(c);
  const vignette=c.createRadialGradient(820,535,300,820,535,950);vignette.addColorStop(0,'#071b1600');vignette.addColorStop(.75,'#0b20172b');vignette.addColorStop(1,'#071b17bf');c.fillStyle=vignette;c.fillRect(0,0,1600,1050);
  return cv;
}
export type UnitArtKind='hero'|'enemy'|'ally'|'archer'|'boss'|JungleArchetype|SiegeArchetype;
export type Motion='idle'|'walk'|'attack'|'cast'|'hurt'|'death';
export const MOTION_FRAMES:Record<Motion,{start:number;count:number;duration:number}>={idle:{start:0,count:6,duration:1.2},walk:{start:6,count:8,duration:.64},attack:{start:14,count:6,duration:.36},cast:{start:20,count:6,duration:.55},hurt:{start:26,count:3,duration:.15},death:{start:29,count:6,duration:.5}};
// Each frame shares a foot anchor. Animate limbs and weapons inside the artwork,
// rather than bouncing an unchanged character image around the map.
export function makeUnitSheet(kind:UnitArtKind,searing=false):HTMLCanvasElement {
  const sheet=document.createElement('canvas');sheet.width=128*7;sheet.height=140*5;
  const c=sheet.getContext('2d')!;
  for(const [motion,strip] of Object.entries(MOTION_FRAMES))for(let i=0;i<strip.count;i++){const frame=strip.start+i;c.drawImage(makeUnit(kind,motion as Motion,i/strip.count,searing),128*(frame%7),140*Math.floor(frame/7));}
  return sheet;
}
export function makeUnit(kind:UnitArtKind,motion:Motion='idle',phase=0,searing=false):HTMLCanvasElement {
  const cv=document.createElement('canvas');cv.width=128;cv.height=140;const c=cv.getContext('2d')!;c.translate(64,115);
  const cycle=Math.sin(phase*Math.PI*2),stride=motion==='walk'?cycle:0;
  const swing=motion==='attack'?Math.sin(phase*Math.PI):0,cast=motion==='cast'?Math.sin(phase*Math.PI):0;
  const breathe=motion==='idle'?cycle:0,bob=motion==='walk'?-Math.abs(cycle)*3:-breathe;
  const lean=motion==='attack'?swing*7:motion==='hurt'?-5*(1-phase):0;
  if(motion==='death'){c.globalAlpha=1-phase;c.translate(phase*10,phase*6);c.rotate(phase*.85);c.scale(1,1-phase*.6);}
  if(motion==='hurt')c.rotate(-.09*(1-phase));
  if(kind==='wolf'||kind==='thornmaw'){
    const boss=kind==='thornmaw';if(boss)c.scale(1.35,1.35);
    ellipse(c,0,0,33,10,'#0e241866');line(c,[[-19,-19],[-24-stride*9,-2-Math.max(0,stride)*6]],'#3a4239',6);line(c,[[18,-21],[23+stride*9,-2-Math.max(0,-stride)*6]],'#3a4239',6);line(c,[[-11,-21],[-9+stride*9,-3-Math.max(0,-stride)*6]],'#70786a',5);line(c,[[26,-20],[32-stride*9,-3-Math.max(0,stride)*6]],'#70786a',5);
    c.translate(lean,bob-cast*5);
    polygon(c,[[-28,-19],[-24,-38],[-9,-49],[8,-47],[24,-35],[31,-16],[8,-8],[-12,-12]],boss?'#645b53':'#788370');polygon(c,[[-24,-38],[-9,-49],[8,-47],[24,-35],[4,-25]],boss?'#90806a':'#a4aa8b');
    c.save();c.translate(swing*4,cast*-3);c.rotate(swing*.14);
    polygon(c,[[17,-38],[33,-48],[44,-38],[49,-22],[32,-15],[21,-23]],boss?'#736558':'#919780');polygon(c,[[32,-43],[47,-35],[50,-23],[34,-22]],'#495749');
    polygon(c,[[24,-41],[25,-60],[34,-46]],'#596551');polygon(c,[[36,-44],[43,-57],[43,-37]],'#596551');ellipse(c,38,-36,3,2,boss?'#ffad75':'#e7cb83');line(c,[[41,-24],[49,-25]],'#d0c3a0',2);
    if(swing>0){line(c,[[33,-16],[49,-14+swing*7]],'#495749',6);line(c,[[39,-17],[41,-12+swing*7]],'#e8d7b0',2);}c.restore();
    line(c,[[-24,-28],[-44,-39+cycle*4],[-47,-29+cycle*7]],'#596451',8);
    if(boss){for(let i=0;i<4;i++)polygon(c,[[-19+i*9,-40],[-21+i*9,-65-i%2*8],[-7+i*9,-44]],'#b1a17f');line(c,[[27,-53],[19,-74],[8,-78]],'#baa88b',4);line(c,[[41,-49],[44,-71],[55,-78]],'#baa88b',4);}
    return cv;
  }
  if(kind==='golem'||kind==='stonewarden'){
    const boss=kind==='stonewarden';const scale=boss?1:.7;c.scale(scale,scale);ellipse(c,0,0,40,12,'#10251d70');
    block(c,-15-stride*5,-3-Math.max(0,stride)*6,22,28,15,'#6b796c');block(c,17+stride*5,-3-Math.max(0,-stride)*6,22,28,15,'#5c7068');c.translate(lean,bob);
    polygon(c,[[-30,-32],[-35,-67],[-18,-87],[18,-87],[36,-65],[29,-30],[0,-18]],'#7e9080');polygon(c,[[0,-18],[29,-30],[36,-65],[18,-87],[0,-63]],'#456459');
    c.save();c.translate(-29,-65);c.rotate(cast*2-stride*.16);block(c,-10,31,22,35,16,'#95a08b');c.restore();
    c.save();c.translate(29,-65);c.rotate(-cast*2-swing*1.3+stride*.16);block(c,10,31,22,35,16,'#6b8175');c.restore();
    block(c,0,-76,30,24,22,'#a2af97');line(c,[[-10,-91],[10,-86]],'#304b44',4);
    ellipse(c,-6,-90,3,2,'#c2f0c4');ellipse(c,6,-86,3,2,'#c2f0c4');line(c,[[-8,-63],[0,-53],[-5,-43],[4,-31]],'#bbe6c4',2);line(c,[[17,-59],[10,-50],[15,-43]],'#bbe6c4',2);
    if(boss){for(let side of [-1,1]){polygon(c,[[side*18,-79],[side*33,-107],[side*42,-73]],'#9bb99c');line(c,[[side*30,-86],[side*33,-100]],'#d8e6b6',2);}polygon(c,[[-9,-47],[0,-63],[9,-47],[0,-34]],'#c5e5be');}
    return cv;
  }
  if(kind==='ashhorn'||kind==='brute'||kind==='hollowguard'){
    const fire=kind!=='hollowguard';if(kind!=='ashhorn')c.scale(.82,.82);
    ellipse(c,0,0,35,11,'#10201788');line(c,[[-15,-20],[-17+stride*9,-2-Math.max(0,stride)*6]],'#343237',13);line(c,[[15,-20],[18-stride*9,-2-Math.max(0,-stride)*6]],'#343237',13);c.translate(lean,bob);
    polygon(c,[[-30,-68],[-16,-87],[16,-87],[32,-65],[27,-25],[0,-15],[-26,-25]],fire?'#925a43':'#6c5a85');polygon(c,[[0,-79],[32,-65],[27,-25],[0,-15]],fire?'#593d36':'#3a354d');
    polygon(c,[[-25,-60],[-36,-76],[-41,-45],[-31,-34]],'#bba68b');polygon(c,[[25,-60],[36,-76],[41,-45],[31,-34]],'#bba68b');
    ellipse(c,0,-91,16,16,fire?'#b88664':'#a28bab');line(c,[[-11,-99],[-26,-115],[-18,-85]],'#dbc09a',5);line(c,[[11,-99],[26,-115],[18,-85]],'#dbc09a',5);line(c,[[-8,-90],[8,-90]],fire?'#ffbc77':'#dbb8f0',3);
    c.save();c.translate(24,-58);c.rotate(-cast*1.7-swing*1.4+stride*.15);line(c,[[0,0],[16,25]],'#bc9675',10);line(c,[[16,38],[16,-28]],'#bba783',5);polygon(c,[[16,-29],[40,-15],[17,-1],[3,-15]],fire?'#d2b88c':'#c1b2cb');c.restore();
    line(c,[[-22,-30],[0,-21],[22,-30]],'#d2af79',4);polygon(c,[[-7,-58],[0,-71],[7,-58],[0,-43]],fire?'#f0af65':'#c69ce5');return cv;
  }
  if(kind==='rimewitch'||kind==='hexer'){
    const boss=kind==='rimewitch';if(!boss)c.scale(.73,.73);ellipse(c,0,0,30,10,'#10201788');c.translate(lean,bob-cast*4);
    polygon(c,[[-16,-78],[0,-97],[16,-78],[27+cycle*3,-6],[5,-1],[-29+cycle*3,-7]],'#668a9b');polygon(c,[[0,-97],[16,-78],[27+cycle*3,-6],[0,-9]],'#354d70');polygon(c,[[-14,-80],[0,-106],[14,-80],[9,-58],[-9,-58]],'#a4c8d2');polygon(c,[[-9,-79],[9,-79],[6,-62],[-6,-62]],'#283c54');line(c,[[-5,-73],[5,-73]],'#d8f4eb',3);
    c.save();c.translate(14,-56);c.rotate(-cast*.9+swing*.8);line(c,[[0,0],[23,8]],'#9bbdca',6);line(c,[[25,50],[25,-33]],'#c2d6d4',4);polygon(c,[[15,-33],[25,-51],[35,-33],[25,-18]],'#a3e0eb');ellipse(c,25,-34,7,7,'#d7f7f4');c.restore();
    if(boss)for(const side of [-1,1])line(c,[[side*8,-98],[side*22,-113],[side*24,-96]],'#cee2df',4);return cv;
  }
  if(kind==='boss'||kind==='hollowking'){ellipse(c,0,0,45,16,'#0c171777');c.translate(lean,bob*2-cast*3);polygon(c,[[-35+cycle*3,-15],[-24,-83],[0,-108],[24,-83],[35+cycle*3,-15],[15,-2],[-15,-2]],'#302b3d');polygon(c,[[-24,-83],[0,-108],[0,-9],[-35+cycle*3,-15]],'#534357');line(c,[[-17,-91],[-28,-119],[-9,-102],[0,-118],[9,-102],[28,-119],[17,-91]],'#a59287',4);ellipse(c,-9,-76,4,3,'#f296a9');ellipse(c,9,-76,4,3,'#f296a9');c.save();c.translate(28,-62);c.rotate(swing*1.1-cast*.3);line(c,[[0,0],[21,-24],[24,57]],'#afa198',7);line(c,[[23,-29],[10,-24],[35,-20]],'#c97e90',9);c.restore();polygon(c,[[-12,-45],[0,-64],[12,-45],[0,-29]],'#b46782');return cv;}
  const hero=kind==='hero',ally=kind==='ally'||kind==='archer',frost=kind==='frostling',shade=kind==='shade';const cloak=hero?'#457c84':ally?'#6b8265':frost?'#698fa2':shade?'#796889':'#7e5055',dark=hero?'#244b59':ally?'#405747':frost?'#324c6d':shade?'#3e3456':'#49323d';
  ellipse(c,0,0,19,8,'#0e241866');line(c,[[-6,-15],[-8+stride*9,-1-Math.max(0,stride)*5]],'#29343a',7);line(c,[[7,-15],[9-stride*9,-1-Math.max(0,-stride)*5]],'#29343a',7);c.translate(lean,bob);
  const cloth=cycle*(motion==='walk'?5:2);
  polygon(c,[[-12,-43],[-20+cloth,-15],[-10+cloth,-4],[3,-10],[17+cloth,-5],[13,-43]],cloak);polygon(c,[[3,-43],[17+cloth,-5],[3,-10]],dark);
  polygon(c,[[-14,-43],[-9,-56],[8,-56],[15,-43],[10,-20],[-9,-20]],hero?'#a8b5ab':ally?'#98a594':'#8b7e7a');polygon(c,[[3,-55],[15,-43],[10,-20],[3,-24]],'#5c6c69');line(c,[[-9,-24],[11,-24]],'#c6a467',3);
  ellipse(c,0,-62,10,12,hero?'#bfc8b7':ally?'#a8b29f':'#806570');polygon(c,[[-11,-64],[0,-76],[11,-64],[9,-60],[-9,-60]],hero?'#d5d8be':'#9ea491');line(c,[[-7,-60],[7,-60]],'#334849',3);line(c,[[0,-74],[0,-62]],'#eeebc9',1);
  if(!ally&&!hero){line(c,[[-8,-72],[-18,-83],[-11,-63]],'#b7a28b',3);line(c,[[8,-72],[18,-83],[11,-63]],'#b7a28b',3);line(c,[[-5,-58],[5,-58]],'#ea9a8e',2);}
  c.save();c.translate(-15,-43);c.rotate(stride*.15+cast*.5-swing*.2);polygon(c,[[0,0],[-13,5],[-12,25],[-2,31],[6,20],[5,6]],hero?'#507982':ally?'#718666':'#755259');line(c,[[-4,9],[-4,22]],'#d3bc7d',2);c.restore();
  c.save();c.translate(14,-36);const weaponAngle=motion==='attack'?-1.1+phase*2.6:motion==='cast'?-cast*.95:stride*.25;c.rotate(weaponAngle);
  if(kind==='archer'){line(c,[[0,0],[14,0]],'#9ba79b',6);line(c,[[20,-25],[31,-11],[34,2],[29,17],[17,28]],'#cfb68b',3);line(c,[[20,-25],[17+swing*12,1],[17,28]],'#eee0bc',1);line(c,[[8,1],[39,1]],'#e8dcba',2);}else{line(c,[[0,0],[9,9]],'#9ba79b',6);line(c,[[8,9],[24,-24]],'#d5d8be',4);line(c,[[4,4],[15,10]],'#d5af65',3);
    if(hero&&searing){
      c.save();c.translate(8,9);c.rotate(Math.atan2(-33,16));
      line(c,[[2,0],[38,0]],'#ff8a3540',19);
      const flicker=Math.sin(phase*Math.PI*2);
      polygon(c,[[0,-3],[9,-7],[16,-4],[24,-10-flicker*3],[29,-5],[40,-4],[46+flicker*2,-8],[41,3],[31,8],[24,5],[17,10+flicker*3],[11,5],[2,5]],'#ef7137');
      polygon(c,[[2,-2],[13,-4],[20,-2],[28,-6],[35,-3],[43,0],[33,4],[24,2],[15,6],[9,3]],'#ffd06a');
      line(c,[[3,0],[37,0]],'#fff1bd',3);
      for(let i=0;i<3;i++){const drift=(phase+i/3)%1;ellipse(c,11+i*10+drift*5,-9-drift*9,1.4,1.8,'#ffcb79');}
      c.restore();
    }
  }c.restore();
  if(hero){line(c,[[-7,-70],[-22,-88]],'#c9a562',3);polygon(c,[[-20,-86],[-37+cloth,-87],[-34+cloth,-76],[-18,-74]],'#ba9660');}
  return cv;
}
export function makeTower():HTMLCanvasElement {const cv=document.createElement('canvas');cv.width=140;cv.height=180;const c=cv.getContext('2d')!;turret(c,70,150,1.25);banner(c,78,35,.55,'#c7a45e');return cv;}
