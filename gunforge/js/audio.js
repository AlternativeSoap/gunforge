// audio.js
// Web Audio API manager for offline-safe SFX and ambient music.
// Uses synthesized tones/noise so the game runs without loading external files.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    this.buffers = {}; // optional loaded buffers
  }

  async init() {
    if (this.unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.2;
    this.sfxGain.gain.value = 0.8;
    this.master.gain.value = 0.9;
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.unlocked = true;
    // try to load optional local buffers; if it fails (file://) we ignore
    this.loadOptionalBuffers();
    this.startAmbient();
  }

  setMasterVolume(v) {
    if (this.master) this.master.gain.value = v;
  }

  // Basic noise generator
  _noise(duration = 0.15, type = 'white') {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      let n = Math.random() * 2 - 1; // white
      if (type === 'brown') {
        n = (data[i - 1] || 0) + (Math.random() * 2 - 1) * 0.02;
      } else if (type === 'pink') {
        // simple pink approximation
        n = ((data[i - 1] || 0) * 0.997) + (Math.random() * 0.003);
      }
      data[i] = n;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  _bip(freq = 440, dur = 0.08, type = 'square') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(this.sfxGain);
    const now = this.ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  playShoot() { if (!this.ctx) return; this._bip(520 + Math.random()*40, 0.06, 'square'); }
  playHit() { if (!this.ctx) return; this._bip(240, 0.04, 'sawtooth'); }
  playExplosion() {
    if (!this.ctx) return;
    const n = this._noise(0.25, 'white');
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1200;
    const g = this.ctx.createGain(); g.gain.value = 0.8;
    n.connect(f); f.connect(g); g.connect(this.sfxGain);
    n.start(); n.stop(this.ctx.currentTime + 0.3);
  }
  playChest() { if (!this.ctx) return; this._bip(760, 0.12, 'triangle'); }
  playLevelUp() { if (!this.ctx) return; this._bip(880, 0.18, 'triangle'); this._bip(660, 0.14, 'square'); }
  playUnlock() { if (!this.ctx) return; this._bip(520, 0.08, 'triangle'); this._bip(690, 0.10, 'triangle'); }

  // Prefer buffers if available
  _play(name, fallback){
    if (!this.ctx) return;
    const buf = this.buffers[name];
    if (buf) {
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.sfxGain); s.start();
    } else fallback();
  }
  shoot(){ this._play('shoot', ()=>this.playShoot()); }
  hit(){ this._play('hit', ()=>this.playHit()); }
  explosion(){ this._play('explosion', ()=>this.playExplosion()); }
  chest(){ this._play('chest', ()=>this.playChest()); }
  level(){ this._play('levelup', ()=>this.playLevelUp()); }
  unlock(){ this._play('unlock', ()=>this.playUnlock()); }

  async loadOptionalBuffers(){
    const files = {
      shoot: 'assets/sfx/shoot.wav',
      hit: 'assets/sfx/hit.wav',
      explosion: 'assets/sfx/explosion.wav',
      chest: 'assets/sfx/chest.wav',
      levelup: 'assets/sfx/levelup.wav',
      unlock: 'assets/sfx/unlock.wav',
      ambient: 'assets/music/ambient.ogg',
      boss_telegraph: 'assets/sfx/boss_telegraph.wav',
      boss_slam: 'assets/sfx/boss_slam.wav'
    };
    const load = async (key, url)=>{
      try{
        const res = await fetch(url);
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(arr);
        this.buffers[key] = buf;
      } catch(e){ /* likely file:// CORS; ignore */ }
    };
    await Promise.all(Object.entries(files).map(([k,u])=>load(k,u)));
    // if ambient loaded, start loop instead of synth
    if (this.buffers.ambient) {
      const s = this.ctx.createBufferSource(); s.buffer = this.buffers.ambient; s.loop = true; s.connect(this.musicGain); s.start();
    }
  }

  // Boss telegraph and slam helpers (use optional buffers when present)
  playBossTelegraph(){
    if (!this.ctx) return;
    this._play('boss_telegraph', ()=>{
      // soft whoosh ascending tone fallback
      this._bip(360, 0.09, 'sine');
      setTimeout(()=> this._bip(540, 0.09, 'sine'), 90);
    });
  }

  playBossSlam(){
    if (!this.ctx) return;
    this._play('boss_slam', ()=>{
      // deep slam fallback: layered noise + low sine
      const n = this._noise(0.28, 'brown');
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
      const g = this.ctx.createGain(); g.gain.value = 0.9; n.connect(f); f.connect(g); g.connect(this.sfxGain);
      n.start(); n.stop(this.ctx.currentTime + 0.28);
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 60; const og=this.ctx.createGain(); og.gain.value=0.5; o.connect(og); og.connect(this.sfxGain); o.start(); o.stop(this.ctx.currentTime + 0.18);
    });
  }

  startAmbient() {
    if (!this.ctx) return;
    // Gritty drone: filtered brown noise + slow sine
    const n = this._noise(2.5, 'brown');
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 140; f.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0.08;
    n.loop = true; n.connect(f); f.connect(g); g.connect(this.musicGain); n.start();

    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 47;
    const og = this.ctx.createGain(); og.gain.value = 0.02; o.connect(og); og.connect(this.musicGain); o.start();
  }
}
