export type Point = { x: number; y: number };
export const WORLD = { width: 1600, height: 1050 };
export const KEEP: Point = { x: 390, y: 740 };
export const CITADEL_HEALING={radius:170,perSecond:13};
export const GATE: Point = { x: 1275, y: 235 };
export const LANES: Point[][] = [
  [GATE, {x:1050,y:190}, {x:790,y:270}, {x:625,y:470}, KEEP],
  [GATE, {x:1100,y:410}, {x:850,y:500}, {x:655,y:610}, KEEP],
  [GATE, {x:1330,y:490}, {x:1130,y:700}, {x:820,y:825}, KEEP],
];
export const SHRINES = [
  {x:750,y:335,name:'Ember sanctuary',element:'Ember' as const},
  {x:1110,y:655,name:'Winter sanctuary',element:'Frost' as const},
];
export const TOWERS = [{x:600,y:555,name:'Westwatch',active:true},{x:665,y:735,name:'Southwatch',active:true},{x:870,y:435,name:'Crownwatch',active:false}];
export type SiegeArchetype='cinderling'|'brute'|'frostling'|'hexer'|'shade'|'hollowguard'|'ashhorn'|'rimewitch'|'hollowking';
export const SIEGE_PACING={initialPreparation:10,waveInterval:14,phasePreparation:8};
export const SIEGE_STATS:Record<SiegeArchetype,{name:string;hp:number;damage:number;speed:number;range:number}>={
  cinderling:{name:'Cinder raider',hp:80,damage:13,speed:64,range:42},
  brute:{name:'Ashen brute',hp:263,damage:23,speed:44,range:58},
  frostling:{name:'Frost revenant',hp:115,damage:17,speed:57,range:45},
  hexer:{name:'Icebinder',hp:125,damage:17,speed:48,range:190},
  shade:{name:'Hollow shade',hp:140,damage:20,speed:81,range:42},
  hollowguard:{name:'Eclipse guard',hp:313,damage:28,speed:43,range:58},
  ashhorn:{name:'Ashhorn, the Breachmaker',hp:1430,damage:34,speed:40,range:75},
  rimewitch:{name:'The Rime Oracle',hp:2145,damage:30,speed:37,range:175},
  hollowking:{name:'The Hollow King',hp:3120,damage:43,speed:35,range:90},
};
export const SIEGE_PHASES: {name:string;boss:SiegeArchetype;mob:SiegeArchetype;escort:SiegeArchetype;count:number;color:number;ability:string}[]=[
  {name:'The Cinder Vanguard',boss:'ashhorn',mob:'cinderling',escort:'brute',count:4,color:0xf2a267,ability:'Cinder stomp'},
  {name:'The Frostbound Host',boss:'rimewitch',mob:'frostling',escort:'hexer',count:5,color:0x9ed9eb,ability:'Icefall'},
  {name:'The Hollow Eclipse',boss:'hollowking',mob:'shade',escort:'hollowguard',count:6,color:0xc8a0ec,ability:'Eclipse pulse'},
];
export type JungleArchetype = 'wolf' | 'golem' | 'stonewarden' | 'thornmaw';
export const JUNGLE_STATS: Record<JungleArchetype, {name:string;hp:number;damage:number;speed:number;range:number;boss:boolean}> = {
  wolf: {name:'Briar wolf',hp:85,damage:10,speed:76,range:36,boss:false},
  golem: {name:'Quarry sentinel',hp:150,damage:14,speed:42,range:45,boss:false},
  stonewarden: {name:'The Stonewarden',hp:650,damage:22,speed:38,range:58,boss:true},
  thornmaw: {name:'Thornmaw',hp:950,damage:25,speed:60,range:58,boss:true},
};
export const CAMPS: (Point & {id:string;name:string;members:JungleArchetype[];respawnSeconds:number;reward:string})[] = [
  {id:'briar',x:535,y:350,name:'Briarwolf camp',members:['wolf','wolf','wolf'],respawnSeconds:45,reward:'Pack oath · hero + army regenerate 3 HP/s for 60s'},
  {id:'quarry',x:935,y:650,name:'The forgotten quarry',members:['golem','golem','stonewarden'],respawnSeconds:90,reward:'Stoneheart · hero + army gain 30 health; towers take 20% less damage'},
  {id:'den',x:1130,y:865,name:'Thornmaw’s den',members:['wolf','wolf','thornmaw'],respawnSeconds:120,reward:'Predator sigil · hero + army gain 20% damage and 10% speed'},
];
export type Element = 'Ember' | 'Frost' | 'Storm';
export type Upgrade = { id: string; name: string; subtitle: string; description: string; icon: string };
export const UPGRADES: Upgrade[] = [
  {id:'power',name:'Searing steel',subtitle:'WARGEAR',description:'Ignite your sword. Blade and elemental attacks deal 30% more damage.',icon:'sword'},
  {id:'vitality',name:'Heart of the citadel',subtitle:'SURVIVAL',description:'Gain 40 maximum health and fully heal your warden.',icon:'heart'},
  {id:'haste',name:'Echo of thunder',subtitle:'ESSENCE',description:'Abilities recharge 25% faster. Move 12% faster.',icon:'bolt'},
  {id:'army',name:'An unbroken oath',subtitle:'COMMAND',description:'Allied soldiers gain 35% damage and 30 maximum health.',icon:'banner'},
];
