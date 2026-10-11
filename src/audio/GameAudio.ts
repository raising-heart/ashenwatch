import type {Siege} from '../game/simulation';
import {renderScore,type ScoreStem} from './score';
export class GameAudio {
  enabled=true;musicEnabled=true;musicVolume=.45;
  private ctx?:AudioContext;private master?:GainNode;private musicBus?:GainNode;private analyser?:AnalyserNode;
  private stems:Partial<Record<ScoreStem,GainNode>>={};private preparation?:Promise<void>;private sources:AudioBufferSourceNode[]=[];
  private lastMix='';private latest?:Siege;
  constructor(){
    try{const saved=JSON.parse(localStorage.getItem('ashenwatch-audio')??'null');if(saved){this.enabled=saved.enabled!==false;this.musicEnabled=saved.musicEnabled!==false;if(typeof saved.musicVolume==='number'&&Number.isFinite(saved.musicVolume))this.musicVolume=Math.max(0,Math.min(1,saved.musicVolume));}}catch{/* Defaults also work when storage is unavailable. */}
    document.addEventListener('visibilitychange',()=>{
      if(!this.ctx)return;
      if(document.hidden)void this.ctx.suspend().catch(()=>{});
      else void this.ctx.resume().catch(()=>{});
    });
  }
  unlock(){
    if(!this.ctx){
      this.ctx=new AudioContext();this.master=this.ctx.createGain();this.musicBus=this.ctx.createGain();this.analyser=this.ctx.createAnalyser();
      this.analyser.fftSize=1024;this.master.gain.value=this.enabled?1:0;this.musicBus.gain.value=this.musicEnabled?this.musicVolume:0;
      this.musicBus.connect(this.master);this.master.connect(this.analyser).connect(this.ctx.destination);
    }
    void this.ctx.resume().catch(()=>{});
    this.preparation??=this.prepareMusic().catch(()=>{this.preparation=undefined;});
  }
  private async prepareMusic(){
    const names:ScoreStem[]=['theme','battle','boss'],buffers=await Promise.all(names.map(renderScore));
    const ctx=this.ctx!,start=ctx.currentTime+.06;
    names.forEach((name,i)=>{
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffers[i];source.loop=true;
      gain.gain.value=0;source.connect(gain).connect(this.musicBus!);this.stems[name]=gain;this.sources.push(source);source.start(start);
    });
    this.lastMix='';if(this.latest)this.update(this.latest);
  }
  toggle(){this.enabled=!this.enabled;if(this.enabled)this.unlock();this.applyVolume();this.save();}
  toggleMusic(){this.musicEnabled=!this.musicEnabled;if(this.musicEnabled)this.unlock();this.applyVolume();this.save();}
  setMusicVolume(value:number){this.musicVolume=Math.max(0,Math.min(1,value));this.applyVolume();this.save();}
  private applyVolume(){if(!this.ctx)return;this.master!.gain.setTargetAtTime(this.enabled?1:0,this.ctx.currentTime,.08);this.musicBus!.gain.setTargetAtTime(this.musicEnabled?this.musicVolume:0,this.ctx.currentTime,.12);}
  private save(){try{localStorage.setItem('ashenwatch-audio',JSON.stringify({enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume}));}catch{/* Audio stays usable without persistence. */}}
  update(model:Siege){
    this.latest=model;const key=`${model.phase}:${model.stageState}`;if(key===this.lastMix||!this.ctx||!this.sources.length)return;this.lastMix=key;
    const paused=model.phase==='paused'||model.phase==='upgrade',playing=model.phase==='playing',boss=playing&&model.stageState==='boss';
    const duck=paused?.3:model.phase==='lost'?.5:1,t=this.ctx.currentTime;
    this.stems.theme!.gain.setTargetAtTime(.85*duck,t,.6);
    this.stems.battle!.gain.setTargetAtTime(playing&&model.stageState!=='prepare'?(boss?.9:.6):0,t,.7);
    this.stems.boss!.gain.setTargetAtTime(boss?.65:0,t,.8);
  }
  sound(name:string){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const ctx=this.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=name==='slash'?'triangle':'sine';
    const tones:Record<string,number[]>={slash:[165,65],nova:[360,90],dash:[100,300],build:[330,660],capture:[440,880],wave:[100,65]};
    const notes=tones[name]??[220,440],duration=name==='capture'?.6:.18;
    osc.frequency.setValueAtTime(notes[0],ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(notes[1],ctx.currentTime+duration);
    gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
    osc.connect(gain).connect(this.master!);osc.start();osc.stop(ctx.currentTime+duration);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  get diagnostics(){
    const samples=new Float32Array(1024);this.analyser?.getFloatTimeDomainData(samples);
    const rms=Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
    return {state:this.ctx?.state??'locked',ready:this.sources.length===3,loops:this.sources.length,rms,mix:Object.fromEntries(Object.entries(this.stems).map(([name,gain])=>[name,gain!.gain.value]))};
  }
}
