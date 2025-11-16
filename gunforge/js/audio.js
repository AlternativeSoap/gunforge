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

  setMusicVolume(v) {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSFXVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setMuted(muted) {
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
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

  // Weapon-specific shooting sounds - IMPROVED
  playPistolShoot() {
    if (!this.ctx) return;
    // Crisp gunshot: short burst + snap
    const now = this.ctx.currentTime;
    const n = this._noise(0.05, 'white');
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    n.connect(f); f.connect(g); g.connect(this.sfxGain);
    n.start(now); n.stop(now + 0.05);
    // Add bass punch
    const bass = this.ctx.createOscillator(); bass.type = 'sine'; bass.frequency.value = 120;
    const bg = this.ctx.createGain(); bg.gain.setValueAtTime(0.3, now); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    bass.connect(bg); bg.connect(this.sfxGain); bass.start(now); bass.stop(now + 0.04);
  }

  playLaserShoot() {
    if (!this.ctx) return;
    // Sci-fi beam: clean sweep
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(1200, now);
    o.frequency.exponentialRampToValueAtTime(2200, now + 0.06);
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    o.start(now); o.stop(now + 0.07);
  }

  playShotgunShoot() {
    if (!this.ctx) return;
    // Heavy blast: big boom
    const now = this.ctx.currentTime;
    const n = this._noise(0.12, 'white');
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.7, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    n.connect(f); f.connect(g); g.connect(this.sfxGain);
    n.start(now); n.stop(now + 0.12);
    // Deep boom
    const bass = this.ctx.createOscillator(); bass.type = 'sine'; bass.frequency.value = 80;
    const bg = this.ctx.createGain(); bg.gain.setValueAtTime(0.5, now); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    bass.connect(bg); bg.connect(this.sfxGain); bass.start(now); bass.stop(now + 0.08);
  }

  playFlamethrowerShoot() {
    if (!this.ctx) return;
    // Fire whoosh: continuous roar
    const now = this.ctx.currentTime;
    const n = this._noise(0.1, 'pink');
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 800;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.3, now); g.gain.linearRampToValueAtTime(0, now + 0.1);
    n.connect(f); f.connect(g); g.connect(this.sfxGain);
    n.start(now); n.stop(now + 0.1);
  }

  playRocketShoot() {
    if (!this.ctx) return;
    // Rocket launch: whoosh with rumble
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(500, now);
    o.frequency.exponentialRampToValueAtTime(180, now + 0.15);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.start(now); o.stop(now + 0.16);
  }

  playEnergyShoot() {
    if (!this.ctx) return;
    // Energy blast: electric pulse
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'square';
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.sfxGain);
    o.frequency.setValueAtTime(1400, now);
    o.frequency.exponentialRampToValueAtTime(2800, now + 0.03);
    o.frequency.exponentialRampToValueAtTime(900, now + 0.07);
    g.gain.setValueAtTime(0.38, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    o.start(now); o.stop(now + 0.08);
  }

  playShoot() { this.playPistolShoot(); } // default fallback
  
  playHit() {
    if (!this.ctx) return;
    // Flesh impact: dull thud with noise
    const n = this._noise(0.06, 'brown');
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g = this.ctx.createGain(); g.gain.value = 0.5;
    n.connect(f); f.connect(g); g.connect(this.sfxGain);
    n.start(); n.stop(this.ctx.currentTime + 0.06);
    this._bip(220, 0.03, 'sine');
  }
  
  playExplosion() {
    if (!this.ctx) return;
    // Big boom: layered noise + rumble
    const n = this._noise(0.35, 'white');
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    const g = this.ctx.createGain(); g.gain.value = 0.8;
    n.connect(f); f.connect(g); g.connect(this.sfxGain);
    n.start(); n.stop(this.ctx.currentTime + 0.35);
    this._bip(80, 0.15, 'sine'); // deep rumble
  }
  
  playChest() {
    if (!this.ctx) return;
    // Pleasant chime: arpeggio
    this._bip(760, 0.12, 'triangle');
    setTimeout(() => this._bip(960, 0.12, 'triangle'), 60);
  }
  
  playLevelUp() {
    if (!this.ctx) return;
    // Victory fanfare: ascending tones
    this._bip(660, 0.14, 'triangle');
    setTimeout(() => this._bip(880, 0.16, 'triangle'), 80);
    setTimeout(() => this._bip(1100, 0.18, 'triangle'), 160);
  }
  
  playUnlock() {
    if (!this.ctx) return;
    // Click-unlock: quick chirp
    this._bip(520, 0.08, 'triangle');
    setTimeout(() => this._bip(690, 0.10, 'triangle'), 50);
  }

  playPickup() {
    if (!this.ctx) return;
    // Item pickup: quick ascending tones
    this._bip(700, 0.08, 'sine');
    setTimeout(() => this._bip(900, 0.08, 'sine'), 50);
  }

  // Alias for compatibility
  pickup() {
    this.playPickup();
  }

  // Prefer buffers if available
  _play(name, fallback){
    if (!this.ctx) return;
    const buf = this.buffers[name];
    if (buf) {
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.sfxGain); s.start();
    } else fallback();
  }
  
  // Weapon-specific shoot methods
  shoot(weaponType = 'pistol') {
    const typeMap = {
      'pistol': () => this.playPistolShoot(),
      'laser': () => this.playLaserShoot(),
      'shotgun': () => this.playShotgunShoot(),
      'flamethrower': () => this.playFlamethrowerShoot(),
      'rocket': () => this.playRocketShoot(),
      'energy': () => this.playEnergyShoot(),
    };
    const fallback = typeMap[weaponType.toLowerCase()] || (() => this.playPistolShoot());
    this._play('shoot_' + weaponType, fallback);
  }
  
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
