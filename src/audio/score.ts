// Original 16-bar D-minor theme: bowed chords, dulcimer, marching drums,
// and an additional warlord ostinato. Stems share a seamless loop boundary.
const SAMPLE_RATE=24000,BEAT=60/78,BARS=16;
export const SCORE_DURATION=BARS*4*BEAT;
const roots=[50,46,53,48,50,46,55,45];
const major=[false,true,true,true,false,true,false,true];
const melody=[[69,-1,65,67],[65,62,60,62],[65,-1,69,72],[67,64,62,60],[62,65,69,-1],[70,69,65,62],[67,-1,65,62],[64,61,64,69]];
const frequency=(midi:number)=>440*2**((midi-69)/12);
export type ScoreStem='theme'|'battle'|'boss';

export async function renderScore(stem:ScoreStem):Promise<AudioBuffer>{
  const frames=Math.ceil(SCORE_DURATION*SAMPLE_RATE),tail=3*SAMPLE_RATE;
  const ctx=new OfflineAudioContext(2,frames+tail,SAMPLE_RATE);
  const bus=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),reverb=ctx.createConvolver();
  dry.gain.value=.85;wet.gain.value=.19;
  bus.connect(dry).connect(ctx.destination);bus.connect(reverb).connect(wet).connect(ctx.destination);
  let seed=4721;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const impulse=ctx.createBuffer(2,SAMPLE_RATE*2,SAMPLE_RATE);
  for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*(1-i/data.length)**3;}
  reverb.buffer=impulse;
  const noise=ctx.createBuffer(1,SAMPLE_RATE,SAMPLE_RATE),noiseData=noise.getChannelData(0);
  for(let i=0;i<noiseData.length;i++)noiseData[i]=random()*2-1;
  function note(midi:number,start:number,length:number,volume:number,type:OscillatorType='triangle',pan=0,attack=.04,detune=0,cutoff=1100){
    const osc=ctx.createOscillator(),envelope=ctx.createGain(),filter=ctx.createBiquadFilter(),stereo=ctx.createStereoPanner();
    osc.type=type;osc.frequency.value=frequency(midi);osc.detune.value=detune;
    filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.4;stereo.pan.value=pan;
    envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(volume,start+attack);
    envelope.gain.exponentialRampToValueAtTime(.0001,start+length);
    osc.connect(filter).connect(envelope).connect(stereo).connect(bus);
    osc.start(start);osc.stop(start+length+.02);
  }
  function drum(start:number,strong:boolean,volume:number){
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(strong?108:155,start);
    osc.frequency.exponentialRampToValueAtTime(strong?43:72,start+.19);
    gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.48);
    osc.connect(gain).connect(bus);osc.start(start);osc.stop(start+.5);
  }
  function brush(start:number,volume:number,length=.16){
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;
    filter.type='bandpass';filter.frequency.value=2600;filter.Q.value=.7;
    gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
    source.connect(filter).connect(gain).connect(bus);source.start(start);source.stop(start+length);
  }
  for(let bar=0;bar<BARS;bar++){
    const root=roots[bar%8],third=major[bar%8]?4:3,start=bar*4*BEAT;
    if(stem==='theme'){
      for(const interval of [0,third,7]){
        note(root+interval,start,4*BEAT+1,.036,'sawtooth',-.35,.55,-5,650);
        note(root+interval,start+.03,4*BEAT+1,.036,'sawtooth',.35,.55,5,650);
      }
      note(root-12,start,4*BEAT,.11,'triangle',0,.16,0,240);
      for(let beat=0;beat<4;beat++){
        const midi=melody[bar%8][beat];if(midi<0)continue;
        const time=start+beat*BEAT;
        note(midi,time,1.7*BEAT,.12,'sine',bar%2?-.2:.2,.008);
        note(midi+12,time,1.2*BEAT,.023,'sine',.3,.008);
        note(midi,time+.75*BEAT,1.3*BEAT,.032,'sine',-.35,.008);
      }
    }else if(stem==='battle'){
      for(let step=0;step<8;step++)note(root+[0,7,12,third+12][step%4],start+step*BEAT/2,.55*BEAT,.055,'triangle',step%2?.3:-.3,.015,0,950);
      drum(start,true,.24);drum(start+2*BEAT,true,.18);
      brush(start+BEAT,.09,.22);brush(start+3*BEAT,.1,.22);
      for(let beat=0;beat<4;beat++)brush(start+(beat+.5)*BEAT,.027,.1);
    }else{
      for(let beat=0;beat<4;beat++){
        drum(start+beat*BEAT,beat%2===0,.25);
        note(root-12,start+beat*BEAT,.65*BEAT,.055,'sawtooth',0,.02,0,380);
        note(root+12+(beat%2?7:0),start+beat*BEAT,.75*BEAT,.07,'triangle',beat%2?.25:-.25,.02,0,1250);
      }
      if(bar%4===3)for(let step=0;step<4;step++)drum(start+(3+step/4)*BEAT,false,.12);
    }
  }
  const rendered=await ctx.startRendering(),loop=new AudioBuffer({numberOfChannels:2,length:frames,sampleRate:SAMPLE_RATE});
  for(let channel=0;channel<2;channel++){
    const source=rendered.getChannelData(channel),target=loop.getChannelData(channel);
    target.set(source.subarray(0,frames));
    // Wrap the final notes and reverb into the beginning instead of cutting tails.
    for(let i=0;i<tail;i++)target[i]+=source[frames+i];
  }
  return loop;
}
