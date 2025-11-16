// room.js
// Procedural room graph (grid), room contents and door linking.

import { ROOM_TYPES, ROOM_SIZES, pick, rand, randInt } from './data.js';

export class Room {
  constructor(x, y, type = 'combat', shape = 'rect') {
    this.x = x; this.y = y; this.type = type; this.shape = shape;
    this.doors = { n: false, s: false, e: false, w: false };
    this.spawned = false; // contents spawned?
    this.cleared = false; // enemies cleared
    this.discovered = false; // has player entered this room at least once?
    this.doorPulse = 0; // door ping animation timer (seconds)
    this.locked = false; // doors blocked until cleared (for combat/trap/boss)
    this.contents = { enemies: [], loot: [], traps: [], props: [], colliders: [] };
    // Set room dimensions based on shape
    const size = ROOM_SIZES[shape] || ROOM_SIZES.rect;
    this.w = size.w;
    this.h = size.h;
  }
}

export class Dungeon {
  constructor(seed = Math.floor(Math.random()*1e9)) {
    this.seed = seed; this.rooms = new Map();
    this.start = '0,0'; this.current = this.start;
  }

  key(x, y) { return `${x},${y}`; }

  ensureRoom(x, y, type = null) {
    const k = this.key(x, y);
    if (!this.rooms.get(k)) {
      const t = type || sampleType(x, y);
      const s = t==='start' ? 'rect' : sampleShape();
      this.rooms.set(k, new Room(x, y, t, s));
    }
    return this.rooms.get(k);
  }

  generate(radius = 5) {
    // Simple drunkard's walk to create a connected set of rooms around (0,0)
    let x = 0, y = 0; this.ensureRoom(0,0,'start');
    for (let i = 0; i < radius * radius * 2; i++) {
      const dir = randInt(0,3);
      if (dir === 0) y -= 1; else if (dir === 1) y += 1; else if (dir === 2) x += 1; else x -= 1;
      x = Math.max(-radius, Math.min(radius, x));
      y = Math.max(-radius, Math.min(radius, y));
      const r = this.ensureRoom(x, y);
      // door linking
      const prev = this.rooms.get(this.key(x + (dir===3?1:dir===2?-1:0), y + (dir===0?1:dir===1?-1:0)));
      if (prev) linkRooms(prev, r);
    }
    // place special rooms
    const keys = [...this.rooms.keys()].filter(k => k !== this.start);
    if (keys.length) {
      // boss at farthest
      const far = keys.map(k => ({k, d: distM(k)})).sort((a,b)=>b.d-a.d)[0].k;
      this.rooms.get(far).type = 'boss';
      // trader and chest somewhere else
      const others = keys.filter(k => k !== far);
      if (others.length) this.rooms.get(pick(others)).type = 'trader';
      if (others.length>1) this.rooms.get(pick(others)).type = 'chest';
      // sprinkle traps
      for (let i = 0; i < Math.min(3, others.length); i++) this.rooms.get(pick(others)).type = 'trap';
    }
    return this;
  }

  // Generate a connected dungeon with scaling room count based on depth
  generateCount(minRooms = 10, maxRooms = 18, depth = 1) {
    // Scale room count with depth: larger dungeons for exploration
    const scaledMin = minRooms + (depth - 1) * 6;
    const scaledMax = maxRooms + (depth - 1) * 8;
    const target = Math.max(scaledMin, Math.min(scaledMax, Math.floor(scaledMin + Math.random()*(scaledMax-scaledMin+1))));
    
    console.log(`[Dungeon] Generating depth ${depth} with ${target} rooms (${scaledMin}-${scaledMax})`);
    
    this.rooms.clear(); this.ensureRoom(0,0,'start');
    let frontier = [[0,0]]; const seen = new Set([this.key(0,0)]);
    while (this.rooms.size < target) {
      // pick a frontier room and expand in a random direction
      const [cx, cy] = frontier[Math.floor(Math.random()*frontier.length)];
      const dir = randInt(0,3);
      let nx = cx + (dir===2?1:dir===3?-1:0);
      let ny = cy + (dir===1?1:dir===0?-1:0);
      const nk = this.key(nx, ny);
      if (seen.has(nk)) { continue; }
      const nr = this.ensureRoom(nx, ny);
      const cr = this.rooms.get(this.key(cx,cy));
      linkRooms(cr, nr); seen.add(nk); frontier.push([nx,ny]);
    }
    // classify one boss room at farthest manhattan from start
    const keys = [...this.rooms.keys()].filter(k=>k!==this.start);
    if (keys.length) {
      const far = keys.map(k=>({k,d:distM(k)})).sort((a,b)=>b.d-a.d)[0].k;
      this.rooms.get(far).type = 'boss';
      const others = keys.filter(k=>k!==far);
      
      // Distribute special rooms based on dungeon size
      const numSpecial = Math.floor(others.length * 0.7); // 70% special rooms
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      
      // Calculate max treasure rooms based on total room count
      const totalRooms = this.rooms.size;
      const maxTreasureRooms = totalRooms <= 10 ? 1 : totalRooms <= 20 ? 2 : 3;
      let treasureCount = 0;
      
      let idx = 0;
      // Always have at least one of each type (except treasure - controlled)
      if (shuffled[idx]) this.rooms.get(shuffled[idx++]).type = 'chest';
      if (shuffled[idx] && treasureCount < maxTreasureRooms) {
        this.rooms.get(shuffled[idx++]).type = 'treasure';
        treasureCount++;
      }
      if (shuffled[idx]) this.rooms.get(shuffled[idx++]).type = 'weapon_room';
      if (shuffled[idx]) this.rooms.get(shuffled[idx++]).type = 'mystery';
      
      // Add more based on dungeon size, but limit treasure rooms
      const remaining = shuffled.slice(idx, numSpecial);
      for (const key of remaining) {
        const roll = Math.random();
        if (roll < 0.30) this.rooms.get(key).type = 'chest';
        else if (roll < 0.45 && treasureCount < maxTreasureRooms) {
          this.rooms.get(key).type = 'treasure';
          treasureCount++;
        } else if (roll < 0.60) this.rooms.get(key).type = 'weapon_room';
        else if (roll < 0.75) this.rooms.get(key).type = 'mystery';
        else this.rooms.get(key).type = 'trap';
      }
    }
    return this;
  }
}

function sampleShape(){
  const r = Math.random();
  if (r < 0.15) return 'rect';
  if (r < 0.27) return 'long';
  if (r < 0.37) return 'circle';
  if (r < 0.47) return 'hall';
  if (r < 0.55) return 'compact';
  if (r < 0.62) return 'tiny';
  if (r < 0.69) return 'large';
  if (r < 0.75) return 'huge';
  if (r < 0.80) return 'narrow';
  if (r < 0.85) return 'wide';
  if (r < 0.90) return 'cavern';
  if (r < 0.94) return 'chamber';
  if (r < 0.97) return 'vault';
  return 'arena';
}

function sampleType(x, y) {
  const r = Math.random();
  if (r < 0.60) return 'combat';
  if (r < 0.68) return 'chest';
  if (r < 0.75) return 'trader';
  if (r < 0.82) return 'trap';
  // Themed rooms (18% chance)
  if (r < 0.86) return 'dark';
  if (r < 0.90) return 'explosive';
  if (r < 0.94) return 'toxic';
  if (r < 0.98) return 'frozen';
  return 'combat';
}

function distM(k) { const [x,y]=k.split(',').map(Number); return Math.abs(x)+Math.abs(y); }

function linkRooms(a, b) {
  if (a.x === b.x) {
    if (a.y < b.y) { a.doors.s = true; b.doors.n = true; }
    else if (a.y > b.y) { a.doors.n = true; b.doors.s = true; }
  } else if (a.y === b.y) {
    if (a.x < b.x) { a.doors.e = true; b.doors.w = true; }
    else if (a.x > b.x) { a.doors.w = true; b.doors.e = true; }
  }
}
