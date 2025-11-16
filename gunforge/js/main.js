// main.js
// Core loop, camera, rendering, room transitions, collisions, inputs, and particles.

import { GAME, PALETTES, INPUT_KEYS, WEAPONS, DIFFICULTY, RARITY, ITEMS, circleIntersect, clamp, dist2, pick, BOSS_VARIANTS, THEMED_ROOMS } from './data.js';
import { AudioManager } from './audio.js';
import { Player } from './player.js';
import { Enemy, Boss } from './enemy.js';
import { Dungeon } from './room.js';
import { Coin, Chest, CoinChest, HiddenChest, ItemPickup, traderInventory, levelUpChoices, applyLevelUp } from './loot.js';
import { SpikeField, AcidPool, Mine } from './traps.js';
import { Prop } from './props.js';
import { drawHUD, drawShop } from './ui.js';
import { SKILL_TREE, SkillTreeManager } from './skilltree.js';

console.log('Main.js: Imports loaded successfully');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

if (!canvas) {
  console.error('Canvas element not found!');
  alert('ERROR: Canvas element not found. Check your HTML.');
  throw new Error('Canvas element with id "game" not found');
}
if (!ctx) {
  console.error('Could not get 2d context!');
  throw new Error('Could not get 2d rendering context');
}

// Prefer crisp rendering (slightly cheaper)
ctx.imageSmoothingEnabled = false;
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

console.log('Main.js: Elements found:', { canvas: !!canvas, overlay: !!overlay, startBtn: !!startBtn });

// If user clicked Start before module finished loading, honor that intent now
if (window.__REQUEST_START__) {
  console.log('Main.js: Start was requested before load, starting now.');
}

// Map floor pattern (subtle grid)
const MAP_TILE = new Image();
MAP_TILE.src = 'assets/img/map/grid.svg';
let MAP_PATTERN = null;
// Vignette overlay cache
let VIGNETTE_CANVAS = null;
// Door images
const DOOR_CLOSED_V = new Image();
DOOR_CLOSED_V.src = 'assets/img/doors/door_closed_vertical.svg';
const DOOR_OPEN_V = new Image();
DOOR_OPEN_V.src = 'assets/img/doors/door_open_vertical.svg';
const DOOR_CLOSED_H = new Image();
DOOR_CLOSED_H.src = 'assets/img/doors/door_closed_horizontal.svg';
const DOOR_OPEN_H = new Image();
DOOR_OPEN_H.src = 'assets/img/doors/door_open_horizontal.svg';
// Portal image cache
const PORTAL_IMG = new Image();
PORTAL_IMG.src = 'assets/img/icons/portal.svg';

// Weapon images cache
const WEAPON_IMAGES = {};

// Interact lock to prevent multiple E triggers
let interactLock = false;
function getWeaponImage(weaponId) {
  if (!WEAPON_IMAGES[weaponId]) {
    WEAPON_IMAGES[weaponId] = new Image();
    WEAPON_IMAGES[weaponId].src = `assets/img/weapons/${weaponId}.svg`;
  }
  return WEAPON_IMAGES[weaponId];
}

// Canvas size and DPR
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.width = innerWidth; game.height = innerHeight;
  buildVignette();
}
window.addEventListener('resize', resize);

// Game state container
const game = {
  width: innerWidth, height: innerHeight,
  audio: new AudioManager(),
  player: new Player(GAME.roomSize.w/2, GAME.roomSize.h/2),
  enemies: [],
  projectiles: [], enemyProjectiles: [], particles: [],
  coins: 0, prompt: '', promptTimer: 0,
  rooms: new Map(), currentRoomKey: '0,0', dungeon: null,
  levelUpChoices: null,
  skillTreeOpen: false,
  skillTreeManager: null,
  roomBounds: { w: GAME.roomSize.w, h: GAME.roomSize.h },
  theme: pick(Object.keys(PALETTES)),
  camera: { x: 0, y: 0, shake: 0 },
  input: { up:false,down:false,left:false,right:false,dash:false,shoot:false,interact:false },
  mouse: { x:0, y:0, worldX:0, worldY:0, down:false },
  promptTimed(text, t=2){ this.prompt=text; this.promptTimer=t; },
  hitPause: 0,
  bloodScreen: 0, // blood effect timer
  started: false,
  paused: false,
  lowFx: false,
  shopOpen: null,
  doorCd: 0,
  dead: false,
  depth: 1,
  perfFPS: 60,
  fxScale: 1,
  trapdoorCooldown: 0,
  hintText: '',
  getCurrentRoom() {
    return this.rooms.get(this.currentRoomKey);
  }
};

// Input
const downSet = new Set();
window.addEventListener('keydown', (e)=>{
  const k = e.key.toLowerCase(); downSet.add(k);
  if (k==='1'||k==='2'||k==='3') {
    if (game.levelUpChoices) handleLevelChoice(Number(k)-1);
    else if (game.shopOpen) handleShopChoice(Number(k)-1);
  }
  // prevent page scroll on gameplay keys
  if ([' ', 'arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
  // instant dash on keydown for better responsiveness
  if ((k==='shift' || k===' ') && game.started && !game.levelUpChoices) {
    const moveX = (game.input.right ? 1 : 0) - (game.input.left ? 1 : 0);
    const moveY = (game.input.down ? 1 : 0) - (game.input.up ? 1 : 0);
    game.player.dash(moveX, moveY);
  }
  // swap weapon on keydown and show prompt
  if (INPUT_KEYS.swap.includes(k) && game.started && !game.levelUpChoices) {
    game.player.swapWeapon(1);
    game.promptTimed(`Switched to ${game.player.currentWeapon.name}`, 1.2);
  }
  // pause toggle
  if (k==='escape' && game.started) {
    if (game.shopOpen) { game.shopOpen = null; }
    else if (game.skillTreeOpen) { 
      // ESC closes skill tree or goes back to branch selection (does not affect pause state)
      if (game.skillTreeManager?.selectedBranch && game.skillTreeManager?.unlockedSkills.size === 0) {
        game.skillTreeManager.selectedBranch = null; // Go back to branch selection
      } else {
        game.skillTreeOpen = false;
      }
    }
    else if (game.fullMapOpen) { game.fullMapOpen = false; }
    else { game.paused = !game.paused; }
  }
  // full map toggle
  if (k==='m' && game.started && !game.levelUpChoices && !game.shopOpen && !game.skillTreeOpen) {
    game.fullMapOpen = !game.fullMapOpen;
    if (game.fullMapOpen) game.paused = true;
    else game.paused = false;
  }
  // skill tree toggle (does NOT pause - risky to open during combat!)
  if (k==='t' && game.started && !game.levelUpChoices && !game.shopOpen && !game.fullMapOpen && !game.paused) {
    game.skillTreeOpen = !game.skillTreeOpen;
  }
  if (k==='b' && game.skillTreeOpen && game.skillTreeManager) {
    if (game.skillTreeManager.selectedBranch && game.skillTreeManager.unlockedSkills.size === 0) {
      // Go back to branch selection if no skills unlocked
      game.skillTreeManager.selectedBranch = null;
      console.log('Returned to branch selection');
    } else if (!game.skillTreeManager.selectedBranch) {
      // Close skill tree if no branch selected
      game.skillTreeOpen = false;
    }
  }
  if (k==='q' && game.started && game.player && !game.paused && !game.levelUpChoices && !game.shopOpen) {
    game.player.activateUltimate(game);
  }
  if (k==='n' && game.started) { newRun(); }
  // volume
  if ((k==='=' || k==='+') && game.started) { const g = Math.min(1, (game.audio.master?.gain.value ?? 0.9) + 0.05); game.audio.setMasterVolume(g); game.promptTimed(`Volume ${(g*100)|0}%`, 0.8); }
  if ((k==='-' || k==='_') && game.started) { const g = Math.max(0, (game.audio.master?.gain.value ?? 0.9) - 0.05); game.audio.setMasterVolume(g); game.promptTimed(`Volume ${(g*100)|0}%`, 0.8); }
  updateInput();
});
window.addEventListener('keyup', (e)=>{
  const k = e.key.toLowerCase();
  downSet.delete(k);
  updateInput();
  if (INPUT_KEYS.interact.includes(k)) {
    interactLock = false;
  }
});

canvas.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  game.mouse.x = e.clientX - rect.left;
  game.mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', ()=>{ 
  game.mouse.down = true; 
  game.mouse.wasDownBeforeLevelUp = true; // Track if mouse was held when level-up opens
});
canvas.addEventListener('mouseup', ()=>{ 
  game.mouse.down = false; 
  game.mouse.wasDownBeforeLevelUp = false; // Reset on mouse up
});
window.addEventListener('mouseup', ()=>{ 
  game.mouse.down = false; 
  game.mouse.wasDownBeforeLevelUp = false;
}); // Fix: always reset shooting if mouse released outside canvas
canvas.addEventListener('mouseleave', ()=>{
  // Optionally hide crosshair or set a flag if needed
  game.mouse.inside = false;
});
canvas.addEventListener('mouseenter', (e)=>{
  // Optionally update crosshair to current mouse position
  const rect = canvas.getBoundingClientRect();
  game.mouse.x = e.clientX - rect.left;
  game.mouse.y = e.clientY - rect.top;
  game.mouse.inside = true;
});
window.addEventListener('wheel', (e)=>{ game.player.swapWeapon(e.deltaY>0?1:-1); });

// Click to select a level-up card when overlay is open
let levelUpOpenTime = 0;
canvas.addEventListener('click', ()=>{
  const cw = 260, ch = 110, gap = 24; const startX = game.width/2 - (cw*1.5 + gap); const y = game.height/2 - ch/2;
  if (game.levelUpChoices){
    // Prevent accidental clicks right when menu opens
    if (Date.now() - levelUpOpenTime < 300) return;
    // Prevent clicks if mouse was held down when level-up opened (was shooting)
    if (game.mouse.wasDownBeforeLevelUp) return;
    for (let i=0;i<3;i++){ const x = startX + i*(cw + gap); if (game.mouse.x >= x && game.mouse.x <= x+cw && game.mouse.y >= y && game.mouse.y <= y+ch) { handleLevelChoice(i); break; } }
  } else if (game.shopOpen){
    for (let i=0;i<3;i++){ const x = startX + i*(cw + gap); if (game.mouse.x >= x && game.mouse.x <= x+cw && game.mouse.y >= y && game.mouse.y <= y+ch) { handleShopChoice(i); break; } }
  } else if (game.skillTreeOpen) {
    handleSkillTreeClick();
  } else if (game.paused) {
    // pause menu buttons: Resume and New Run
    const panelW = 600, panelH = 420;
    const panelX = game.width/2 - panelW/2, panelY = game.height/2 - panelH/2;
    const buttonY = panelY + panelH - 90;
    const buttonH = 54;
    const gap = 20;
    const buttonW = (panelW - 120 - gap) / 2;
    const resumeX = panelX + 60;
    const newRunX = resumeX + buttonW + gap;
    
    // Resume button (left)
    if (game.mouse.x >= resumeX && game.mouse.x <= resumeX+buttonW && 
        game.mouse.y >= buttonY && game.mouse.y <= buttonY+buttonH) {
      game.paused = false;
    }
    
    // New Run button (right)
    if (game.mouse.x >= newRunX && game.mouse.x <= newRunX+buttonW && 
        game.mouse.y >= buttonY && game.mouse.y <= buttonY+buttonH) {
      newRun();
    }
  } else if (game.dead) {
    // death overlay: New Run button
    const panelW = 500, panelH = 380;
    const panelX = game.width/2 - panelW/2, panelY = game.height/2 - panelH/2;
    const bx = game.width/2 - 120, by = panelY + panelH - 70, bw = 240, bh = 52;
    if (game.mouse.x >= bx && game.mouse.x <= bx+bw && game.mouse.y >= by && game.mouse.y <= by+bh) {
      newRun();
    }
  }
});

function updateInput(){
  const k = (s)=>[...downSet].some(d=>INPUT_KEYS[s].includes(d));
  game.input.up = k('up'); game.input.down = k('down');
  game.input.left = k('left'); game.input.right = k('right');
  game.input.dash = k('dash'); game.input.interact = k('interact');
}

// Start game flow: robust multi-trigger starter that doesn't block on audio
function startGame(source='unknown'){
  try {
    if (game.started) { console.log('[startGame] Already started (source:', source, ')'); return; }
    console.log('[startGame] Invoked by', source);
    
    // Apply selected difficulty from overlay
    if (window.__GAME_DIFFICULTY__) {
      GAME.difficulty = window.__GAME_DIFFICULTY__;
      console.log('[startGame] Difficulty set to:', GAME.difficulty);
    }
    
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.style.pointerEvents = 'none';
      overlay.style.cursor = 'default';
    }
    // Start gameplay immediately; init audio in background to avoid blocking
    game.started = true;
    game.paused = false;
    
    // Initialize skill tree manager
    game.skillTreeManager = new SkillTreeManager(game.player);
    console.log('[startGame] Skill tree manager initialized');
    
    // Attempt audio init without await so it can't block start
    Promise.resolve().then(()=> game.audio.init()).then(()=>{
      console.log('[startGame] Audio initialized');
    }).catch(err=>{
      console.warn('[startGame] Audio init failed (non-fatal):', err);
    });
  } catch (err) {
    console.error('[startGame] Unexpected error:', err);
  }
}

// Bind multiple user-gesture triggers
console.log('Main.js: Wiring start triggers...');
startBtn?.addEventListener('click', (e)=> startGame('startBtn'));
overlay?.addEventListener('click', (e)=>{ if (e.target === overlay) startGame('overlay-bg'); });
window.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') startGame('keydown:'+e.key); });
canvas.addEventListener('click', ()=>{ if (!game.started) startGame('canvas'); });
console.log('Main.js: Start triggers ready');

// Expose for debugging in console if needed
window.startGame = startGame;
// If start was requested pre-load, start now
if (window.__REQUEST_START__) startGame('preload-intent');

// Dungeon & rooms (depth starts at 1)
game.dungeon = new Dungeon().generateCount(6, 10, game.depth);
game.rooms = game.dungeon.rooms; game.currentRoomKey = game.dungeon.start;

// helper: circle vs rect intersection (for spawn nudge and collisions utils)
function circleRect(cx, cy, cr, r){
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx, dy = cy - ny; return dx*dx + dy*dy <= cr*cr;
}

// sample a walkable position inside the room: avoids colliders and door gaps
function sampleWalkable(room, radius=16, tries=40){
  const W = room.w, H = room.h;
  const cols = room.contents.colliders || []; const gaps = room.contents.doorGaps || [];
  for (let i=0;i<tries;i++){
    const x = 60 + Math.random()*(W-120);
    const y = 60 + Math.random()*(H-120);
    const hit = cols.some(c=> circleRect(x, y, radius, c));
    const inGap = gaps.some(g=> circleRect(x, y, radius, g));
    if (!hit && !inGap) return {x,y};
  }
  // fallback: center-ish
  return { x: W/2, y: H/2 };
}

// Build an offscreen cached render for a room's static floor and walls
function buildRoomCache(room){
  const W = room.w, H = room.h;
  const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H;
  const cctx = cvs.getContext('2d');
  
  // Varied floor/wall colors based on room type/theme with detailed textures
  let floorColor = '#111';
  let floorAccent1 = '#1a1a1a';
  let floorAccent2 = '#0a0a0a';
  let wallBaseColor = '#37474f';
  let wallDetailColor = '#455a64';
  let floorType = 'stone'; // stone, grass, sand, obsidian, magma, dirt
  
  if (room.type === 'boss') {
    floorColor = '#1a0d0d'; // Dark red
    floorAccent1 = '#250808';
    floorAccent2 = '#0f0505';
    wallBaseColor = '#4a1414';
    wallDetailColor = '#5a1a1a';
    floorType = 'obsidian';
  } else if (room.type === 'treasure' || room.type === 'chest') {
    floorColor = '#1a1508'; // Gold tint
    floorAccent1 = '#252010';
    floorAccent2 = '#0f0a03';
    wallBaseColor = '#4a3a14';
    wallDetailColor = '#5a4518';
    floorType = 'sand';
  } else if (room.type === 'trader') {
    floorColor = '#0d1a1a'; // Cyan tint
    floorAccent1 = '#082525';
    floorAccent2 = '#030f0f';
    wallBaseColor = '#144a4a';
    wallDetailColor = '#185a5a';
    floorType = 'stone';
  } else if (room.theme === 'dark_chamber') {
    floorColor = '#0a0a0a';
    floorAccent1 = '#151515';
    floorAccent2 = '#050505';
    wallBaseColor = '#1a1a1a';
    wallDetailColor = '#2a2a2a';
    floorType = 'dirt';
  } else if (room.theme === 'bright_hall') {
    floorColor = '#1a1a16';
    floorAccent1 = '#25251f';
    floorAccent2 = '#0f0f0c';
    wallBaseColor = '#4a4a3a';
    wallDetailColor = '#5a5a45';
    floorType = 'stone';
  } else if (room.theme === 'garden') {
    floorColor = '#1a2410';
    floorAccent1 = '#253218';
    floorAccent2 = '#0f1608';
    wallBaseColor = '#2d4a1a';
    wallDetailColor = '#385a20';
    floorType = 'grass';
  } else {
    // Random floor type for variety
    const types = ['stone', 'dirt', 'sand', 'obsidian'];
    floorType = types[Math.floor(Math.random() * types.length)];
    if (floorType === 'dirt') {
      floorColor = '#3a2f1e';
      floorAccent1 = '#4a3f2e';
      floorAccent2 = '#2a1f0e';
    } else if (floorType === 'sand') {
      floorColor = '#4a3f2a';
      floorAccent1 = '#5a4f3a';
      floorAccent2 = '#3a2f1a';
    } else if (floorType === 'obsidian') {
      floorColor = '#1a1522';
      floorAccent1 = '#252030';
      floorAccent2 = '#0f0a12';
    }
  }
  room.floorType = floorType;
  
  // floor base with detailed texture
  cctx.fillStyle = floorColor; 
  cctx.fillRect(0,0,W,H);
  
  // Add detailed floor texture based on type
  cctx.save();
  const tileSize = 64;
  
  if (floorType === 'grass') {
    // Grass texture with blades
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        cctx.fillStyle = Math.random() < 0.5 ? floorAccent1 : floorAccent2;
        cctx.fillRect(x, y, tileSize, tileSize);
        // Grass details
        for (let i = 0; i < 8; i++) {
          const gx = x + Math.random() * tileSize;
          const gy = y + Math.random() * tileSize;
          cctx.strokeStyle = 'rgba(100,150,50,0.3)';
          cctx.lineWidth = 1;
          cctx.beginPath();
          cctx.moveTo(gx, gy);
          cctx.lineTo(gx + Math.random() * 4 - 2, gy - 6);
          cctx.stroke();
        }
      }
    }
  } else if (floorType === 'sand') {
    // Sandy texture with grain
    for (let x = 0; x < W; x += tileSize/2) {
      for (let y = 0; y < H; y += tileSize/2) {
        cctx.fillStyle = Math.random() < 0.4 ? floorAccent1 : (Math.random() < 0.5 ? floorAccent2 : floorColor);
        const size = 8 + Math.random() * 16;
        cctx.fillRect(x + Math.random() * 20, y + Math.random() * 20, size, size);
        // Sand grain dots
        for (let i = 0; i < 3; i++) {
          cctx.fillStyle = 'rgba(200,180,140,0.1)';
          cctx.fillRect(x + Math.random() * tileSize, y + Math.random() * tileSize, 2, 2);
        }
      }
    }
  } else if (floorType === 'obsidian') {
    // Obsidian with cracks and shine
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        cctx.fillStyle = Math.random() < 0.3 ? floorAccent1 : floorColor;
        cctx.fillRect(x, y, tileSize, tileSize);
        // Shiny highlights
        if (Math.random() < 0.2) {
          cctx.fillStyle = 'rgba(150,120,200,0.15)';
          cctx.fillRect(x + tileSize/4, y + tileSize/4, tileSize/2, tileSize/2);
        }
        // Cracks
        if (Math.random() < 0.4) {
          cctx.strokeStyle = floorAccent2;
          cctx.lineWidth = 2;
          cctx.beginPath();
          cctx.moveTo(x + Math.random() * tileSize, y);
          cctx.lineTo(x + Math.random() * tileSize, y + tileSize);
          cctx.stroke();
        }
      }
    }
  } else if (floorType === 'magma') {
    // Magma floor with glowing cracks
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        cctx.fillStyle = '#2a1510';
        cctx.fillRect(x, y, tileSize, tileSize);
        // Glowing cracks
        if (Math.random() < 0.3) {
          cctx.strokeStyle = '#ff4400';
          cctx.lineWidth = 2;
          cctx.shadowBlur = 10;
          cctx.shadowColor = '#ff6600';
          cctx.beginPath();
          cctx.moveTo(x, y + Math.random() * tileSize);
          cctx.lineTo(x + tileSize, y + Math.random() * tileSize);
          cctx.stroke();
          cctx.shadowBlur = 0;
        }
      }
    }
  } else if (floorType === 'dirt') {
    // Dirt texture with patches
    for (let x = 0; x < W; x += tileSize/2) {
      for (let y = 0; y < H; y += tileSize/2) {
        cctx.fillStyle = Math.random() < 0.5 ? floorAccent1 : floorAccent2;
        const size = 16 + Math.random() * 24;
        cctx.fillRect(x + Math.random() * 10, y + Math.random() * 10, size, size);
      }
    }
  } else {
    // Stone tiles (default)
    cctx.strokeStyle = 'rgba(255,255,255,0.03)';
    cctx.lineWidth = 1;
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        cctx.fillStyle = Math.random() < 0.3 ? floorAccent1 : floorColor;
        cctx.fillRect(x, y, tileSize, tileSize);
        // Random tile cracks
        if (Math.random() < 0.3) {
          cctx.fillStyle = floorAccent2;
          cctx.fillRect(x + tileSize/4, y + tileSize/4, tileSize/2, tileSize/2);
        }
        cctx.strokeRect(x, y, tileSize, tileSize);
      }
    }
  }
  cctx.restore();
  
  // Store wall colors for later use
  room.wallBaseColor = wallBaseColor;
  room.wallDetailColor = wallDetailColor;
  
  // decorative border
  cctx.strokeStyle = '#222'; cctx.lineWidth = 1; cctx.strokeRect(20,20,W-40,H-40);
  // pattern overlay if ready
  if (!MAP_PATTERN && MAP_TILE.complete) { MAP_PATTERN = cctx.createPattern(MAP_TILE, 'repeat'); }
  if (MAP_PATTERN) { cctx.globalAlpha = 0.85; cctx.fillStyle = MAP_PATTERN; cctx.fillRect(0,0,W,H); cctx.globalAlpha = 1; }
  // punch holes for colliders (but not walls - they stay solid)
  // Note: Don't punch holes in door gap areas - floor should remain there
  if (room?.contents?.colliders?.length){
    cctx.save(); cctx.globalCompositeOperation = 'destination-out';
    for (const col of room.contents.colliders) {
      if (!col.wall) {
        // Check if this collider overlaps with any door gap
        const gaps = room.contents.doorGaps || [];
        const overlapsGap = gaps.some(g => 
          col.x < g.x + g.w && col.x + col.w > g.x &&
          col.y < g.y + g.h && col.y + col.h > g.y
        );
        // Only punch hole if not in a door gap area
        if (!overlapsGap) {
          cctx.fillRect(col.x, col.y, col.w, col.h);
        }
      }
    }
    cctx.restore();
    // Draw internal walls with a distinct, HIGHLY VISIBLE style
    const wallBase = room.wallBaseColor || '#37474f';
    const wallDetail = room.wallDetailColor || '#455a64';
    cctx.fillStyle = wallBase;
    for (const col of room.contents.colliders) {
      if (col.wall) {
        // Main wall body
        cctx.fillRect(col.x, col.y, col.w, col.h);
        
        // Add texture/detail to walls
        cctx.fillStyle = wallDetail;
        cctx.fillRect(col.x + 4, col.y + 4, col.w - 8, col.h - 8);
        
        // Strong dark border
        cctx.strokeStyle = '#000000';
        cctx.lineWidth = 4;
        cctx.strokeRect(col.x, col.y, col.w, col.h);
        
        // Bright highlight on top edge for depth
        cctx.strokeStyle = 'rgba(255,255,255,0.3)';
        cctx.lineWidth = 2;
        cctx.beginPath();
        cctx.moveTo(col.x, col.y);
        cctx.lineTo(col.x + col.w, col.y);
        cctx.stroke();
        
        // Add brick/stone texture pattern
        const brickW = 32;
        const brickH = 16;
        cctx.strokeStyle = 'rgba(0,0,0,0.4)';
        cctx.lineWidth = 1;
        for (let bx = col.x; bx < col.x + col.w; bx += brickW) {
          for (let by = col.y; by < col.y + col.h; by += brickH) {
            const offset = Math.floor(by / brickH) % 2 === 0 ? brickW / 2 : 0;
            cctx.strokeRect(bx + offset, by, brickW, brickH);
          }
        }
        
        cctx.fillStyle = wallBase; // reset for next wall
      }
    }
    // Draw shape colliders (non-walls) with visible rocky/debris appearance
    for (const col of room.contents.colliders) {
      if (!col.wall) {
        // Fill with rocky texture
        cctx.fillStyle = '#3a3a3a';
        cctx.fillRect(col.x, col.y, col.w, col.h);
        
        // Add debris details
        cctx.fillStyle = '#4a4a4a';
        for (let i = 0; i < 5; i++) {
          const px = col.x + Math.random() * col.w;
          const py = col.y + Math.random() * col.h;
          const size = 10 + Math.random() * 20;
          cctx.fillRect(px, py, size, size);
        }
        
        // Strong visible border
        cctx.strokeStyle = '#000000';
        cctx.lineWidth = 3;
        cctx.strokeRect(col.x, col.y, col.w, col.h);
        
        // Highlight edge
        cctx.strokeStyle = 'rgba(255,255,255,0.2)';
        cctx.lineWidth = 2;
        cctx.strokeRect(col.x + 2, col.y + 2, col.w - 4, col.h - 4);
      }
    }
    
    // Additional outlines for all shape colliders
    cctx.strokeStyle = 'rgba(255,255,255,0.15)'; cctx.lineWidth = 2;
    for (const col of room.contents.colliders) {
      if (!col.wall) cctx.strokeRect(col.x+0.5, col.y+0.5, col.w-1, col.h-1);
    }
  }
  room.renderCache = cvs;
}

function buildVignette(){
  const W = game.width, H = game.height;
  const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H;
  const cctx = cvs.getContext('2d');
  const vg = cctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)');
  cctx.fillStyle = vg; cctx.fillRect(0,0,W,H);
  VIGNETTE_CANVAS = cvs;
}

async function enterRoom(key, fromDir=null) {
  game.currentRoomKey = key; const room = game.rooms.get(key);
  room.discovered = true;
  // Update room bounds based on this room's actual size
  game.roomBounds.w = room.w;
  game.roomBounds.h = room.h;
  await spawnRoomContents(room);
  // place player near the OPPOSITE doorway they came from
  // fromDir is the direction we came FROM in the previous room
  // so we should appear at the opposite side in the new room
  const margin = 64;
  if (fromDir==='w') { game.player.x = margin; game.player.y = room.h/2; } // came from west door, appear at east (right)
  else if (fromDir==='e') { game.player.x = room.w - margin; game.player.y = room.h/2; } // came from east door, appear at west (left)
  else if (fromDir==='n') { game.player.x = room.w/2; game.player.y = margin; } // came from north door, appear at south (bottom)
  else if (fromDir==='s') { game.player.x = room.w/2; game.player.y = room.h - margin; } // came from south door, appear at north (top)
  else { game.player.x = room.w/2; game.player.y = room.h/2; }
  game.camera.shake = 6; // transition feedback
  room.doorPulse = 1.5; // ping doors when entering
  game.doorCd = 0.6; // prevent instant re-entry through an adjacent door
  
  // Show themed room entrance message
  if (['dark','explosive','toxic','frozen'].includes(room.type)) {
    const themeNames = {
      dark: '🌑 Dark Chamber',
      explosive: '💥 Explosive Armory',
      toxic: '☠️ Toxic Waste',
      frozen: '❄️ Frozen Tundra'
    };
    game.promptTimed(themeNames[room.type], 2000);
  }
  
  // lock logic: combat/trap/boss rooms lock until cleared
  if ((room.type==='combat' || room.type==='trap' || room.type==='boss') && !room.cleared) room.locked = true;
  else room.locked = false;
  // bind current room enemies and clear stray projectiles when switching rooms
  game.enemies = room.contents.enemies;
  game.projectiles.length = 0; game.enemyProjectiles.length = 0;
  // ensure player is not spawned overlapping a collider: nudge inward
  const cols = room.contents.colliders || [];
  let tries = 0;
  while (tries++ < 16 && cols.some(c=> circleRect(game.player.x, game.player.y, game.player.r, c))){
    const cx = room.w/2, cy = room.h/2;
    const dx = cx - game.player.x, dy = cy - game.player.y; const len = Math.hypot(dx,dy)||1;
    game.player.x += (dx/len)*12; game.player.y += (dy/len)*12;
  }
  // ensure room has a render cache ready
  if (!room.renderCache) buildRoomCache(room);
}
(async()=>{ await enterRoom('0,0'); })();

async function spawnRoomContents(room){
  if (room.spawned) return;
  room.spawned = true; room.contents.enemies.length = 0; room.contents.loot.length = 0; room.contents.traps.length = 0; room.contents.props.length = 0; room.contents.doorGaps = [];
  // Use the room's actual dimensions
  const W = room.w, H = room.h;
  const randPos = ()=>({ x: 80 + Math.random()*(W-160), y: 80 + Math.random()*(H-160) });
  // create simple colliders to vary room shapes (do this first so spawns can sample walkable)
  room.contents.colliders.length = 0;
  
  // Add perimeter walls for all rooms with gaps for doors
  const wallThickness = 40;
  const doorGapSize = 160;
  
  // Handle walls differently when both N and S doors exist
  if (room.doors.n && room.doors.s) {
    // Both doors: create walls that leave a shared center gap
    const leftWallW = W/2 - doorGapSize/2;
    const rightWallW = W/2 - doorGapSize/2;
    
    // North wall segments
    if (leftWallW > 0) room.contents.colliders.push({x: 0, y: 0, w: leftWallW, h: wallThickness, wall: true});
    if (rightWallW > 0) room.contents.colliders.push({x: W/2 + doorGapSize/2, y: 0, w: rightWallW, h: wallThickness, wall: true});
    
    // South wall segments (mirrored)
    if (leftWallW > 0) room.contents.colliders.push({x: 0, y: H - wallThickness, w: leftWallW, h: wallThickness, wall: true});
    if (rightWallW > 0) room.contents.colliders.push({x: W/2 + doorGapSize/2, y: H - wallThickness, w: rightWallW, h: wallThickness, wall: true});
  } else {
    // Normal wall creation for single or no doors
    // North wall (split if there's a north door)
    if (room.doors.n) {
      const leftWallW = W/2 - doorGapSize/2;
      const rightWallW = W/2 - doorGapSize/2;
      if (leftWallW > 0) room.contents.colliders.push({x: 0, y: 0, w: leftWallW, h: wallThickness, wall: true});
      if (rightWallW > 0) room.contents.colliders.push({x: W/2 + doorGapSize/2, y: 0, w: rightWallW, h: wallThickness, wall: true});
    } else {
      room.contents.colliders.push({x: 0, y: 0, w: W, h: wallThickness, wall: true});
    }

    // South wall (split if there's a south door)
    if (room.doors.s) {
      const leftWallW = W/2 - doorGapSize/2;
      const rightWallW = W/2 - doorGapSize/2;
      if (leftWallW > 0) room.contents.colliders.push({x: 0, y: H - wallThickness, w: leftWallW, h: wallThickness, wall: true});
      if (rightWallW > 0) room.contents.colliders.push({x: W/2 + doorGapSize/2, y: H - wallThickness, w: rightWallW, h: wallThickness, wall: true});
    } else {
      room.contents.colliders.push({x: 0, y: H - wallThickness, w: W, h: wallThickness, wall: true});
    }
  }
  
  // West wall (split if there's a west door)
  if (room.doors.w) {
    const topWallH = H/2 - doorGapSize/2;
    const bottomWallH = H/2 - doorGapSize/2;
    if (topWallH > 0) room.contents.colliders.push({x: 0, y: 0, w: wallThickness, h: topWallH, wall: true});
    if (bottomWallH > 0) room.contents.colliders.push({x: 0, y: H/2 + doorGapSize/2, w: wallThickness, h: bottomWallH, wall: true});
  } else {
    room.contents.colliders.push({x: 0, y: 0, w: wallThickness, h: H, wall: true});
  }
  
  // East wall (split if there's an east door)
  if (room.doors.e) {
    const topWallH = H/2 - doorGapSize/2;
    const bottomWallH = H/2 - doorGapSize/2;
    if (topWallH > 0) room.contents.colliders.push({x: W - wallThickness, y: 0, w: wallThickness, h: topWallH, wall: true});
    if (bottomWallH > 0) room.contents.colliders.push({x: W - wallThickness, y: H/2 + doorGapSize/2, w: wallThickness, h: bottomWallH, wall: true});
  } else {
    room.contents.colliders.push({x: W - wallThickness, y: 0, w: wallThickness, h: H, wall: true});
  }
  
  // Add shape-specific internal colliders
  if (room.shape === 'long') {
    // Create horizontal barriers that respect door positions
    const barrierH = 180;
    
    // Top barrier (respect north door if it exists)
    if (room.doors.n) {
      // Split barrier to leave gap for north door
      const leftBarrierW = W/2 - doorGapSize/2;
      const rightBarrierW = W/2 - doorGapSize/2;
      if (leftBarrierW > 0) room.contents.colliders.push({x:0, y:wallThickness, w:leftBarrierW, h:barrierH});
      if (rightBarrierW > 0) room.contents.colliders.push({x:W/2 + doorGapSize/2, y:wallThickness, w:rightBarrierW, h:barrierH});
    } else {
      // No north door, full barrier
      room.contents.colliders.push({x:0, y:wallThickness, w:W, h:barrierH});
    }
    
    // Bottom barrier (respect south door if it exists)
    if (room.doors.s) {
      // Split barrier to leave gap for south door
      const leftBarrierW = W/2 - doorGapSize/2;
      const rightBarrierW = W/2 - doorGapSize/2;
      if (leftBarrierW > 0) room.contents.colliders.push({x:0, y:H-barrierH-wallThickness, w:leftBarrierW, h:barrierH});
      if (rightBarrierW > 0) room.contents.colliders.push({x:W/2 + doorGapSize/2, y:H-barrierH-wallThickness, w:rightBarrierW, h:barrierH});
    } else {
      // No south door, full barrier
      room.contents.colliders.push({x:0, y:H-barrierH-wallThickness, w:W, h:barrierH});
    }
  } else if (room.shape === 'circle') {
    // Corner blocks - these shouldn't interfere with doors as they're in corners
    const b=200; 
    room.contents.colliders.push({x:wallThickness,y:wallThickness,w:b,h:b}); 
    room.contents.colliders.push({x:W-b-wallThickness,y:wallThickness,w:b,h:b});
    room.contents.colliders.push({x:wallThickness,y:H-b-wallThickness,w:b,h:b}); 
    room.contents.colliders.push({x:W-b-wallThickness,y:H-b-wallThickness,w:b,h:b});
  } else if (room.shape === 'hall') {
    // Left-side vertical barriers (respect west door if it exists)
    const barrierW = W*0.4-120;
    const topBarrierH = H*0.35;
    const bottomBarrierH = H*0.35;
    
    if (room.doors.w) {
      // Split barriers to leave gap for west door
      const topBarrierMaxH = H/2 - doorGapSize/2 - wallThickness;
      const bottomBarrierY = H/2 + doorGapSize/2;
      const bottomBarrierMaxH = H - bottomBarrierY - wallThickness;
      
      // Only add if they don't interfere with door
      if (topBarrierH <= topBarrierMaxH) {
        room.contents.colliders.push({x:wallThickness, y:wallThickness, w:barrierW, h:topBarrierH});
      }
      if (bottomBarrierH <= bottomBarrierMaxH && bottomBarrierY < H - wallThickness) {
        room.contents.colliders.push({x:wallThickness, y:Math.max(bottomBarrierY, H*0.65), w:barrierW, h:Math.min(bottomBarrierH, bottomBarrierMaxH)});
      }
    } else {
      // No west door, add full barriers
      room.contents.colliders.push({x:wallThickness, y:wallThickness, w:barrierW, h:topBarrierH});
      room.contents.colliders.push({x:wallThickness, y:H*0.65, w:barrierW, h:bottomBarrierH});
    }
  }
  
  // Add internal walls for variety (not in start or boss rooms)
  // Ensure walls stay within playfield bounds
  if (room.type !== 'start' && room.type !== 'boss' && Math.random() < 0.6) {
    const wallType = Math.random();
    const margin = 120; // Safe margin from edges
    if (wallType < 0.33) {
      // Horizontal wall (wide)
      const wallW = 200 + Math.random() * 300;
      const wallH = 40;
      const wallX = margin + Math.random() * Math.max(0, W - wallW - margin * 2);
      const wallY = H * 0.3 + Math.random() * (H * 0.4);
      if (wallX + wallW < W - margin) {
        room.contents.colliders.push({x: wallX, y: wallY, w: wallW, h: wallH, wall: true});
      }
    } else if (wallType < 0.66) {
      // Vertical wall (long)
      const wallW = 40;
      const wallH = 200 + Math.random() * 300;
      const wallX = W * 0.3 + Math.random() * (W * 0.4);
      const wallY = margin + Math.random() * Math.max(0, H - wallH - margin * 2);
      if (wallY + wallH < H - margin) {
        room.contents.colliders.push({x: wallX, y: wallY, w: wallW, h: wallH, wall: true});
      }
    } else {
      // L-shaped corner walls
      const cornerSize = 150 + Math.random() * 100;
      const thickness = 40;
      const side = Math.random();
      if (side < 0.5) {
        // Top-left L
        if (margin + cornerSize < W - margin && margin + cornerSize < H - margin) {
          room.contents.colliders.push({x: margin, y: margin, w: cornerSize, h: thickness, wall: true});
          room.contents.colliders.push({x: margin, y: margin, w: thickness, h: cornerSize, wall: true});
        }
      } else {
        // Bottom-right L
        if (W - margin - cornerSize > margin && H - margin - cornerSize > margin) {
          room.contents.colliders.push({x: W - margin - cornerSize, y: H - margin - thickness, w: cornerSize, h: thickness, wall: true});
          room.contents.colliders.push({x: W - margin - thickness, y: H - margin - cornerSize, w: thickness, h: cornerSize, wall: true});
        }
      }
    }
  }
  // compute door gap rectangles
  const gaps = [];
  const gapW = 160, gapH = 200;
  if (room.doors.n) gaps.push({ x: W/2 - gapW/2, y: 0, w: gapW, h: gapH });
  if (room.doors.s) gaps.push({ x: W/2 - gapW/2, y: H - gapH, w: gapW, h: gapH });
  if (room.doors.w) gaps.push({ x: 0, y: H/2 - gapW/2, w: gapH, h: gapW });
  if (room.doors.e) gaps.push({ x: W - gapH, y: H/2 - gapW/2, w: gapH, h: gapW });
  room.contents.doorGaps = gaps;
  // build render cache now that colliders and door gaps are known
  buildRoomCache(room);

  // --- TORCH INTEGRATION ---
  // Import Torch class dynamically to avoid circular import
  let Torch;
  try {
    Torch = (await import('./props.js')).Torch;
  } catch (e) {
    Torch = null;
  }
  function tryAddTorch(x, y, placement = 'floor') {
    if (!Torch) return;
    const torch = new Torch(x, y, placement);
    const col = torch.getCollider();
    const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || gaps.some(g=> rectsOverlap(col, g));
    if (!overlaps && x > 40 && x < W-40 && y > 40 && y < H-40) {
      room.contents.props.push(torch);
      col.prop = torch;
      room.contents.colliders.push(col);
    }
  }

  // Place wall torches near actual walls (not in door gaps)
  // Check if torch position is NOT in a door gap before placing
  function isInDoorGap(x, y) {
    return gaps.some(g => x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h);
  }
  
  // North wall (only if no door)
  if (!room.doors.n && !isInDoorGap(W/4, 48)) tryAddTorch(W/4, 48, 'wall');
  if (!room.doors.n && !isInDoorGap(W*3/4, 48)) tryAddTorch(W*3/4, 48, 'wall');
  // South wall (only if no door)
  if (!room.doors.s && !isInDoorGap(W/4, H-48)) tryAddTorch(W/4, H-48, 'wall');
  if (!room.doors.s && !isInDoorGap(W*3/4, H-48)) tryAddTorch(W*3/4, H-48, 'wall');
  // West wall (only if no door)
  if (!room.doors.w && !isInDoorGap(48, H/4)) tryAddTorch(48, H/4, 'wall');
  if (!room.doors.w && !isInDoorGap(48, H*3/4)) tryAddTorch(48, H*3/4, 'wall');
  // East wall (only if no door)
  if (!room.doors.e && !isInDoorGap(W-48, H/4)) tryAddTorch(W-48, H/4, 'wall');
  if (!room.doors.e && !isInDoorGap(W-48, H*3/4)) tryAddTorch(W-48, H*3/4, 'wall');

  // Place a few random floor torches (not in start/boss rooms)
  if (Torch && !['start','boss'].includes(room.type)) {
    const nFloorTorches = 1 + Math.floor(Math.random()*2); // 1-2 per room
    for (let i=0; i<nFloorTorches; i++) {
      let placed = false, attempts = 0;
      while (!placed && attempts < 8) {
        const fx = 60 + Math.random()*(W-120);
        const fy = 60 + Math.random()*(H-120);
        const torch = new Torch(fx, fy, 'floor');
        const col = torch.getCollider();
        const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || gaps.some(g=> rectsOverlap(col, g));
        if (!overlaps) {
          room.contents.props.push(torch);
          col.prop = torch;
          room.contents.colliders.push(col);
          placed = true;
        }
        attempts++;
      }
    }
  }
  // SECRET TRAPDOOR - 8% chance in any non-start, non-boss room to skip to next level
  let Trapdoor = null;
  try {
    Trapdoor = (await import('./props.js')).Trapdoor;
  } catch (e) {
    Trapdoor = null;
  }
  if (Trapdoor && !['start', 'boss'].includes(room.type) && Math.random() < 0.08) {
    let placed = false, attempts = 0;
    while (!placed && attempts < 16) {
      const tx = 100 + Math.random()*(W-200);
      const ty = 100 + Math.random()*(H-200);
      const trapdoor = new Trapdoor(tx, ty);
      // Check it's not near colliders or gaps
      const tooClose = room.contents.colliders.some(c => {
        const dx = tx - (c.x + c.w/2);
        const dy = ty - (c.y + c.h/2);
        return Math.hypot(dx, dy) < 80;
      }) || gaps.some(g => {
        const dx = tx - (g.x + g.w/2);
        const dy = ty - (g.y + g.h/2);
        return Math.hypot(dx, dy) < 80;
      });
      if (!tooClose) {
        room.contents.props.push(trapdoor);
        room.hasTrapdoor = true;
        placed = true;
      }
      attempts++;
    }
  }

  if (room.type === 'start') {
    // Starting room: welcoming hub with trader at center
    room.lightLevel = 1.0; // Bright and welcoming
    room.theme = 'bright_hall';
    room.cleared = true; // Start room is always safe and cleared
    room.contents.loot.push({ type:'trader', items: traderInventory(), x: W/2, y: H/2 });
    
    // Create a safe haven aesthetic with decorative props
    function tryAddStartProp(x, y, type) {
      const prop = new Prop(x, y, type);
      const col = prop.getCollider();
      const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || gaps.some(g=> rectsOverlap(col, g));
      if (!overlaps && x > 60 && x < W-60 && y > 60 && y < H-60) {
        room.contents.props.push(prop);
        col.prop = prop;
        room.contents.colliders.push(col);
      }
    }
    
    // Decorative pillars framing the trader
    tryAddStartProp(W/2 - 100, H/2 - 100, 'pillar');
    tryAddStartProp(W/2 + 100, H/2 - 100, 'pillar');
    tryAddStartProp(W/2 - 100, H/2 + 100, 'pillar');
    tryAddStartProp(W/2 + 100, H/2 + 100, 'pillar');
    
    // Supply crates near corners for visual interest
    tryAddStartProp(120, 120, 'crate');
    tryAddStartProp(W-120, 120, 'crate');
    tryAddStartProp(120, H-120, 'explosive_barrel');
    tryAddStartProp(W-120, H-120, 'explosive_barrel');
    
    // Decorative vases
    tryAddStartProp(W/2 - 150, H/2, 'vase');
    tryAddStartProp(W/2 + 150, H/2, 'vase');
  } else if (room.type === 'dark' || room.type === 'explosive' || room.type === 'toxic' || room.type === 'frozen') {
    // THEMED ROOM - special enemy types and effects
    const themed = THEMED_ROOMS[room.type];
    room.theme = room.type; // Store theme for rendering
    
    // Spawn themed enemies
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    const baseCount = 6 + Math.floor(Math.random()*4);
    const n = Math.max(3, Math.round(baseCount * diff.enemyCount));
    
    for (let i=0;i<n;i++){
      const p=sampleWalkable(room, 16);
      // Pick from themed enemy pool
      const enemyType = themed.enemies[Math.floor(Math.random() * themed.enemies.length)];
      const eliteRoll = Math.random() < (0.08 + game.depth * 0.015); // Slightly lower elite chance in themed rooms
      room.contents.enemies.push(new Enemy(p.x,p.y,enemyType,eliteRoll));
    }
    
    // Add theme-appropriate props/hazards
    if (room.type === 'explosive') {
      // Extra explosive barrels in explosive rooms
      const barrelCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < barrelCount; i++) {
        const p = sampleWalkable(room, 20);
        const barrel = new Prop(p.x, p.y, 'explosive_barrel');
        room.contents.props.push(barrel);
        const col = barrel.getCollider();
        col.prop = barrel;
        room.contents.colliders.push(col);
      }
    } else if (room.type === 'toxic') {
      // Acid pools in toxic rooms
      const poolCount = 3 + Math.floor(Math.random() * 3);
      for (let i=0;i<poolCount;i++){
        const p=sampleWalkable(room, 30);
        room.contents.traps.push(new AcidPool(p.x, p.y, 80));
      }
    } else if (room.type === 'frozen') {
      // Spike fields (ice spikes) in frozen rooms
      const spikeCount = 2 + Math.floor(Math.random() * 2);
      for (let i=0;i<spikeCount;i++){
        const p=sampleWalkable(room, 26);
        const sf = new SpikeField(
          Math.max(60, Math.min(p.x-60, W-180)), 
          Math.max(60, Math.min(p.y-40, H-140)), 
          120, 80
        );
        room.contents.traps.push(sf);
      }
    }
    
    // Chance for rewards in themed rooms
    if (Math.random() < 0.4 * (diff.coinMult || 1)) { 
      const p=sampleWalkable(room, 20); 
      room.contents.loot.push(new CoinChest(p.x,p.y,12,30)); 
    }
    if (Math.random() < 0.25 * (diff.lootChance || 1)) { 
      const p=sampleWalkable(room, 20); 
      const itemId = pick(ITEMS).id;
      room.contents.loot.push(new ItemPickup(p.x, p.y, itemId)); 
    }
  } else if (room.type === 'combat') {
    // Assign themed room layout
    const themes = ['library', 'armory', 'crypt', 'laboratory', 'dungeon', 'garden', 'dark_chamber', 'bright_hall'];
    room.theme = themes[Math.floor(Math.random() * themes.length)];
    
    // Apply theme-specific room generation
    generateThemedRoom(room, gaps);
    
    // Spawn enemies appropriate to theme
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    const baseCount = 5 + Math.floor(Math.random()*5);
    const n = Math.max(1, Math.round(baseCount * diff.enemyCount));
    
    for (let i=0;i<n;i++){
      const p=sampleWalkable(room, 16);
      const r=Math.random();
      // 12% base chance for elite variant, increases at higher depths
      const eliteRoll = Math.random() < (0.12 + game.depth * 0.02);
      let t;
      
      // Theme-specific enemy spawning
      if (room.theme === 'dark_chamber') {
        t = 'ghost'; // Only ghosts in dark rooms
      } else if (room.theme === 'bright_hall') {
        // High-tier enemies in bright rooms
        t = ['tank', 'berserker', 'charger', 'shielder'][Math.floor(Math.random()*4)];
      } else {
        t = r<0.11?'fast': r<0.21?'ranged': r<0.29?'tank': r<0.35?'sniper': r<0.41?'bomber': r<0.47?'charger': r<0.53?'spawner': r<0.59?'turret': r<0.65?'ghost': r<0.71?'berserker': r<0.77?'healer': r<0.83?'flying': r<0.88?'summoner': r<0.93?'shielder': r<0.96?'elite':'melee';
      }
      room.contents.enemies.push(new Enemy(p.x,p.y,t,eliteRoll));
    }
    
    // Chance to add explosive barrels
    if (Math.random() < 0.6) {
      const barrelCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < barrelCount; i++) {
        const p = sampleWalkable(room, 20);
        const barrel = new Prop(p.x, p.y, 'explosive_barrel');
        room.contents.props.push(barrel);
        const col = barrel.getCollider();
        col.prop = barrel;
        room.contents.colliders.push(col);
      }
    }
    
    // chance to add a coin chest (not every room)
    if (Math.random() < 0.35 * (diff.coinMult || 1)) { const p=sampleWalkable(room, 20); room.contents.loot.push(new CoinChest(p.x,p.y,8,22)); }
    // chance to add an item pickup (20% chance)
    if (Math.random() < 0.20 * (diff.lootChance || 1)) { 
      const p=sampleWalkable(room, 20); 
      const itemId = pick(ITEMS).id;
      room.contents.loot.push(new ItemPickup(p.x, p.y, itemId)); 
    }
    // chance to add a hidden chest in dark areas (15% chance)
    if (Math.random() < 0.15 * (diff.lootChance || 1) && room.lightLevel < 0.6) {
      const p=sampleWalkable(room, 20);
      room.contents.loot.push(new HiddenChest(p.x, p.y, 'rare'));
    }
    // place some traps in combat rooms too
    if (Math.random() < 0.5 * (diff.trapChance || 1)) {
      const tcount = 1 + Math.floor(Math.random()*2);
      for (let i=0;i<tcount;i++){
        const p=sampleWalkable(room, 26);
        const choice = Math.random();
        if (choice < 0.34) {
          const sf = new SpikeField(
            Math.max(60, Math.min(p.x-60, W-180)), 
            Math.max(60, Math.min(p.y-40, H-140)), 
            120, 80
          );
          room.contents.traps.push(sf);
        }
        else if (choice < 0.68) room.contents.traps.push(new AcidPool(p.x, p.y, 70));
        else room.contents.traps.push(new Mine(p.x, p.y));
      }
    }
  } else if (room.type === 'chest') {
    // Chest room: single reward with enemy guardians
    room.contents.loot.push(new Chest(W/2, H/2));
    
    function tryAddChestProp(x, y, type) {
      const prop = new Prop(x, y, type);
      const col = prop.getCollider();
      const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || gaps.some(g=> rectsOverlap(col, g));
      if (!overlaps && x > 60 && x < W-60 && y > 60 && y < H-60) {
        room.contents.props.push(prop);
        col.prop = prop;
        room.contents.colliders.push(col);
      }
    }
    
    // Guardian statues around the chest
    tryAddChestProp(W/2 - 80, H/2 - 80, 'statue');
    tryAddChestProp(W/2 + 80, H/2 - 80, 'statue');
    tryAddChestProp(W/2 - 80, H/2 + 80, 'statue');
    tryAddChestProp(W/2 + 80, H/2 + 80, 'statue');
    
    // Decorative vases
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      tryAddChestProp(W/2 + Math.cos(a) * 120, H/2 + Math.sin(a) * 120, 'vase');
    }
    
    // Add enemy guardians to make chest rooms more challenging
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    const enemyCount = 3 + Math.floor(Math.random() * 3); // 3-5 enemies
    const enemyTypes = ['melee', 'ranged', 'tank'];
    for (let i = 0; i < enemyCount; i++) {
      const pos = sampleWalkable(room, 120); // Keep away from chest center
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const isElite = Math.random() < 0.2; // 20% chance for elite
      room.contents.enemies.push(new Enemy(pos.x, pos.y, type, isElite));
    }
    room.locked = true; // Lock room until enemies cleared
  } else if (room.type === 'treasure') {
    // Treasure room: structured loot arrangement
    room.lightLevel = 0.95;
    room.theme = 'garden';
    // Only spawn treasure room if allowed by difficulty
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    if (Math.random() < (diff.treasureChance || 1)) {
      // Place chests in central positions
      room.contents.loot.push(new Chest(W/2, H/2));
      room.contents.loot.push(new Chest(W/2 - 80, H/2 - 60));
      room.contents.loot.push(new Chest(W/2 + 80, H/2 - 60));
    }
    // ...existing code...
  } else if (room.type === 'trap') {
    // Set default light level for trap rooms
    room.lightLevel = 0.7;
    room.theme = 'dungeon';
    
    // Ensure traps spawn within bounds - use constrained positions
    const p1=sampleWalkable(room, 80); 
    // Center the spike field around the sampled point, but constrain to room bounds
    const sf = new SpikeField(
      Math.max(60, Math.min(p1.x-120, W-260)), 
      Math.max(60, Math.min(p1.y-80, H-220)), 
      240, 160
    );
    room.contents.traps.push(sf);
    const p2=sampleWalkable(room, 60); room.contents.traps.push(new AcidPool(p2.x, p2.y, 110));
    const p3=sampleWalkable(room, 24); room.contents.traps.push(new Mine(p3.x, p3.y));
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    const baseCount = 3 + Math.floor(Math.random()*3);
    const n = Math.max(1, Math.round(baseCount * diff.enemyCount));
    for (let i=0;i<n;i++){ const p=sampleWalkable(room, 16); const r2 = Math.random(); const t = r2<0.3?'melee': r2<0.5?'bomber': r2<0.7?'charger': r2<0.8?'flying': r2<0.9?'summoner':'elite'; room.contents.enemies.push(new Enemy(p.x,p.y,t)); }
  } else if (room.type === 'weapon_room') {
    // Weapon selection room: 3 weapons to choose from
    const weaponChoices = [];
    const availableWeapons = [...WEAPONS];
    for (let i = 0; i < 3; i++) {
      if (availableWeapons.length > 0) {
        const idx = Math.floor(Math.random() * availableWeapons.length);
        weaponChoices.push(availableWeapons.splice(idx, 1)[0]);
      }
    }
    
    // Place weapons in a line at center
    weaponChoices.forEach((wpn, i) => {
      const x = W/2 - 100 + i * 100;
      const y = H/2;
      room.contents.loot.push({
        type: 'weapon_pickup',
        weapon: wpn,
        x: x,
        y: y
      });
    });
    
    // Decorative pedestals
    function tryAddWeaponProp(x, y, type) {
      const prop = new Prop(x, y, type);
      const col = prop.getCollider();
      const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || gaps.some(g=> rectsOverlap(col, g));
      if (!overlaps && x > 60 && x < W-60 && y > 60 && y < H-60) {
        room.contents.props.push(prop);
        col.prop = prop;
        room.contents.colliders.push(col);
      }
    }
    
    tryAddWeaponProp(W/2, H/2 - 100, 'pillar');
    tryAddWeaponProp(W/2, H/2 + 100, 'pillar');
    
  } else if (room.type === 'mystery') {
    // Mystery room: random rewards or challenges
    const mysteryType = Math.random();
    
    if (mysteryType < 0.3) {
      // Loot explosion
      const count = 5 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const p = sampleWalkable(room, 20);
        const roll = Math.random();
        if (roll < 0.6) room.contents.loot.push(new CoinChest(p.x, p.y, 10, 30));
        else room.contents.loot.push(new Chest(p.x, p.y));
      }
    } else if (mysteryType < 0.6) {
      // Elite ambush
      const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
      const baseCount = 2 + Math.floor(Math.random() * 3);
      const count = Math.max(1, Math.round(baseCount * diff.enemyCount));
      for (let i = 0; i < count; i++) {
        const p = sampleWalkable(room, 16);
        const eliteType = Math.random() < 0.5 ? 'elite_melee' : 'elite_fast';
        room.contents.enemies.push(new Enemy(p.x, p.y, eliteType));
      }
      // Reward chest
      const p = sampleWalkable(room, 20);
      room.contents.loot.push(new Chest(p.x, p.y));
    } else {
      // Trap maze with reward
      for (let i = 0; i < 5; i++) {
        const p = sampleWalkable(room, 26);
        const trapType = Math.random();
        if (trapType < 0.5) room.contents.traps.push(new AcidPool(p.x, p.y, 80));
        else room.contents.traps.push(new Mine(p.x, p.y));
      }
      // Central reward
      room.contents.loot.push(new Chest(W/2, H/2));
      room.contents.loot.push(new CoinChest(W/2 - 60, H/2, 15, 35));
      room.contents.loot.push(new CoinChest(W/2 + 60, H/2, 15, 35));
    }
  } else if (room.type === 'boss') {
    // Spawn a random boss variant for boss rooms. Picks one key from BOSS_VARIANTS.
    try {
      const keys = (BOSS_VARIANTS && Object.keys(BOSS_VARIANTS).length) ? Object.keys(BOSS_VARIANTS) : ['boss1','boss2','boss3'];
      const chosen = keys[Math.floor(Math.random() * keys.length)];
      room.contents.enemies.push(new Boss(W/2, 200, chosen));
    } catch (err) {
      // fallback: spawn default boss3 if anything goes wrong
      console.warn('[spawnRoomContents] Boss variant selection failed, falling back to boss3', err);
      room.contents.enemies.push(new Boss(W/2, 200, 'boss3'));
    }
    
    // Create an arena-style boss room with strategic cover
    function tryAddBossProp(x, y, type) {
      const prop = new Prop(x, y, type);
      const col = prop.getCollider();
      const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || gaps.some(g=> rectsOverlap(col, g));
      if (!overlaps && x > 60 && x < W-60 && y > 60 && y < H-60) {
        room.contents.props.push(prop);
        col.prop = prop;
        room.contents.colliders.push(col);
      }
    }
    
    // Arena pillars for cover - symmetrical layout
    const pillarPositions = [
      {x: W/4, y: H/2 - 100}, {x: W*3/4, y: H/2 - 100},
      {x: W/4, y: H/2 + 100}, {x: W*3/4, y: H/2 + 100}
    ];
    pillarPositions.forEach(pos => tryAddBossProp(pos.x, pos.y, 'pillar'));
    
    // Destructible cover (rocks)
    const coverPositions = [
      {x: W/2 - 120, y: H/2 + 60}, {x: W/2 + 120, y: H/2 + 60},
      {x: W/3, y: H/3}, {x: W*2/3, y: H/3}
    ];
    coverPositions.forEach(pos => tryAddBossProp(pos.x, pos.y, 'rock'));
    
    // Decorative statues at corners for atmosphere
    tryAddBossProp(150, 150, 'statue');
    tryAddBossProp(W-150, 150, 'statue');
  }
  // Add spike field colliders (to block movement)
  for (const trap of room.contents.traps) {
    if (trap.getCollider) {
      const col = trap.getCollider();
      col.trap = trap; // mark as trap collider
      room.contents.colliders.push(col);
    }
  }
  // (colliders and door gaps are ready; now place props/loot/enemies/traps using walkable sampling)

  // Generate structured prop layouts for rooms without custom layouts
  const roomsWithCustomLayouts = ['start', 'treasure', 'chest', 'boss'];
  if (!roomsWithCustomLayouts.includes(room.type)) {
    const layoutProps = generatePropLayout(room, W, H, gaps);
    room.contents.props.push(...layoutProps);
  }
}

function rectsOverlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

// Generate themed room layouts with floor tiles and proper prop placement
function generateThemedRoom(room, gaps) {
  const W = room.w, H = room.h;
  
  function tryAddProp(x, y, type) {
    const prop = new Prop(x, y, type);
    const col = prop.getCollider();
    const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || 
                     gaps.some(g=> rectsOverlap(col, g));
    if (!overlaps && x > 60 && x < W-60 && y > 60 && y < H-60) {
      room.contents.props.push(prop);
      col.prop = prop;
      room.contents.colliders.push(col);
      return true;
    }
    return false;
  }
  
  switch(room.theme) {
    case 'library':
      // Bookshelves forming walls and reading areas
      room.lightLevel = 0.7; // Dimmer lighting
      // Create bookshelf "walls"
      for (let i = 0; i < 5; i++) {
        tryAddProp(150 + i * 40, 150, 'bookshelf');
        tryAddProp(150 + i * 40, 200, 'bookshelf');
      }
      for (let i = 0; i < 5; i++) {
        tryAddProp(W - 150 - i * 40, H - 150, 'bookshelf');
        tryAddProp(W - 150 - i * 40, H - 200, 'bookshelf');
      }
      // Reading tables (use crates as tables)
      tryAddProp(W/2, H/2, 'crate');
      tryAddProp(W/2 - 80, H/2 + 80, 'crate');
      break;
      
    case 'armory':
      // Weapon racks (use crates) and barrels arranged in rows
      room.lightLevel = 0.9;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const x = 120 + col * 80;
          const y = 150 + row * 120;
          if (row % 2 === 0) tryAddProp(x, y, 'crate');
          else tryAddProp(x, y, 'explosive_barrel');
        }
      }
      break;
      
    case 'crypt':
      // Pillars and statues creating a somber atmosphere
      room.lightLevel = 0.5;
      // Pillar colonnade
      for (let i = 0; i < 3; i++) {
        tryAddProp(150, 120 + i * 100, 'pillar');
        tryAddProp(W - 150, 120 + i * 100, 'pillar');
      }
      // Central tomb (statue)
      tryAddProp(W/2, H/2, 'statue');
      tryAddProp(W/2 - 60, H/2, 'vase');
      tryAddProp(W/2 + 60, H/2, 'vase');
      break;
      
    case 'laboratory':
      // Tables, vases (beakers), barrels (chemical storage)
      room.lightLevel = 1.0; // Bright
      // Lab benches
      for (let i = 0; i < 6; i++) {
        tryAddProp(120 + i * 60, 180, 'crate');
        if (i % 2 === 0) tryAddProp(120 + i * 60, 220, 'vase');
      }
      // Storage area
      tryAddProp(W - 120, H - 120, 'explosive_barrel');
      tryAddProp(W - 180, H - 120, 'explosive_barrel');
      break;
      
    case 'dungeon':
      // Prison cells with barrels and crates
      room.lightLevel = 0.6;
      // Cell blocks (use rocks as bars)
      for (let i = 0; i < 4; i++) {
        tryAddProp(120, 120 + i * 80, 'rock');
        tryAddProp(W - 120, 120 + i * 80, 'rock');
      }
      // Scattered barrels
      tryAddProp(W/2 - 80, H/2, 'explosive_barrel');
      tryAddProp(W/2 + 80, H/2, 'explosive_barrel');
      break;
      
    case 'garden':
      // Vases, rocks creating natural pathways
      room.lightLevel = 1.0;
      // Stone path
      for (let i = 0; i < 5; i++) {
        tryAddProp(W/2 - 100 + i * 50, H/2 - 80, 'rock');
        tryAddProp(W/2 - 100 + i * 50, H/2 + 80, 'rock');
      }
      // Decorative vases
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = W/2 + Math.cos(angle) * 120;
        const y = H/2 + Math.sin(angle) * 120;
        tryAddProp(x, y, 'vase');
      }
      break;
      
    case 'dark_chamber':
      // Minimal lighting, mostly empty with few props
      room.lightLevel = 0.3; // Very dark
      room.fogDensity = 0.5; // Add fog effect
      // Just a few scattered objects
      tryAddProp(W/4, H/4, 'pillar');
      tryAddProp(W*3/4, H*3/4, 'pillar');
      break;
      
    case 'bright_hall':
      // Well-lit ceremonial hall with pillars
      room.lightLevel = 1.2; // Extra bright
      // Grand pillars
      for (let i = 0; i < 4; i++) {
        tryAddProp(W/2 - 150 + i * 100, 150, 'pillar');
        tryAddProp(W/2 - 150 + i * 100, H - 150, 'pillar');
      }
      // Central altar
      tryAddProp(W/2, H/2, 'statue');
      break;
      
    default:
      // Random scatter
      room.lightLevel = 0.8;
      for (let i = 0; i < 5; i++) {
        const x = 100 + Math.random() * (W - 200);
        const y = 100 + Math.random() * (H - 200);
        const types = ['crate', 'explosive_barrel', 'vase', 'rock'];
        tryAddProp(x, y, types[Math.floor(Math.random() * types.length)]);
      }
  }
}

// Generate structured prop layouts
function generatePropLayout(room, W, H, gaps) {
  const layouts = [
    'corners', 'perimeter', 'grid', 'library', 'garden', 
    'altar', 'workshop', 'barricade', 'pillars', 'random'
  ];
  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  const props = [];
  
  function tryAddProp(x, y, type) {
    const prop = new Prop(x, y, type);
    const col = prop.getCollider();
    const overlaps = room.contents.colliders.some(c=> rectsOverlap(col, c)) || 
                     gaps.some(g=> rectsOverlap(col, g)) ||
                     props.some(p => {
                       const pc = p.getCollider();
                       return rectsOverlap(col, pc);
                     });
    if (!overlaps && x > 60 && x < W-60 && y > 60 && y < H-60) {
      props.push(prop);
      col.prop = prop;
      room.contents.colliders.push(col);
      return true;
    }
    return false;
  }
  
  if (layout === 'corners') {
    // Place decorative items in corners
    const cornerProps = ['statue', 'vase', 'vase', 'pillar'];
    tryAddProp(100, 100, cornerProps[0]);
    tryAddProp(W-100, 100, cornerProps[1]);
    tryAddProp(100, H-100, cornerProps[2]);
    tryAddProp(W-100, H-100, cornerProps[3]);
    // Add some crates in between
    for (let i = 0; i < 3; i++) {
      tryAddProp(120 + i*60, H/2, 'crate');
      tryAddProp(W-120 - i*60, H/2, 'explosive_barrel');
    }
  } else if (layout === 'perimeter') {
    // Line props along the walls
    const spacing = 80;
    for (let x = 100; x < W-100; x += spacing) {
      if (Math.random() > 0.4) tryAddProp(x, 90, Math.random() > 0.5 ? 'explosive_barrel' : 'crate');
      if (Math.random() > 0.4) tryAddProp(x, H-90, Math.random() > 0.5 ? 'rock' : 'vase');
    }
    for (let y = 150; y < H-150; y += spacing) {
      if (Math.random() > 0.5) tryAddProp(90, y, 'pillar');
      if (Math.random() > 0.5) tryAddProp(W-90, y, 'pillar');
    }
  } else if (layout === 'grid') {
    // Symmetrical grid pattern
    const cols = 3 + Math.floor(Math.random() * 2);
    const rows = 2 + Math.floor(Math.random() * 2);
    const xSpacing = (W - 200) / (cols + 1);
    const ySpacing = (H - 200) / (rows + 1);
    const gridType = Math.random() > 0.5 ? 'pillar' : 'rock';
    for (let i = 1; i <= cols; i++) {
      for (let j = 1; j <= rows; j++) {
        tryAddProp(100 + i * xSpacing, 100 + j * ySpacing, gridType);
      }
    }
  } else if (layout === 'library') {
    // Bookshelves along walls with reading area
    const bookshelfCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bookshelfCount; i++) {
      const side = i % 4;
      if (side === 0) tryAddProp(100, 120 + i * 80, 'bookshelf');
      else if (side === 1) tryAddProp(W-100, 120 + i * 80, 'bookshelf');
      else if (side === 2) tryAddProp(120 + i * 80, 100, 'bookshelf');
      else tryAddProp(120 + i * 80, H-100, 'bookshelf');
    }
    // Central table area with vases
    tryAddProp(W/2 - 40, H/2, 'vase');
    tryAddProp(W/2 + 40, H/2, 'vase');
  } else if (layout === 'garden') {
    // Natural arrangement with rocks and vases
    const clusters = 3 + Math.floor(Math.random() * 2);
    for (let c = 0; c < clusters; c++) {
      const cx = 150 + Math.random() * (W - 300);
      const cy = 150 + Math.random() * (H - 300);
      tryAddProp(cx, cy, 'rock');
      // Surround with smaller items
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        const dist = 50 + Math.random() * 30;
        tryAddProp(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 'vase');
      }
    }
  } else if (layout === 'altar') {
    // Central shrine/altar with statues
    tryAddProp(W/2, H/2 - 60, 'statue');
    tryAddProp(W/2 - 80, H/2, 'pillar');
    tryAddProp(W/2 + 80, H/2, 'pillar');
    // Offerings around
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      tryAddProp(W/2 + Math.cos(a) * 120, H/2 + Math.sin(a) * 120, 'vase');
    }
  } else if (layout === 'workshop') {
    // Work benches and storage
    const tablePositions = [
      {x: W/3, y: H/3}, {x: W*2/3, y: H/3},
      {x: W/3, y: H*2/3}, {x: W*2/3, y: H*2/3}
    ];
    tablePositions.forEach(pos => {
      tryAddProp(pos.x, pos.y, 'crate');
      tryAddProp(pos.x + 40, pos.y, 'explosive_barrel');
    });
    // Tool racks (bookshelves)
    tryAddProp(100, H/2, 'bookshelf');
    tryAddProp(W-100, H/2, 'bookshelf');
  } else if (layout === 'barricade') {
    // Defensive positions with cover
    const midY = H / 2;
    // Front line cover
    for (let i = 0; i < 5; i++) {
      tryAddProp(150 + i * 80, midY - 60, 'explosive_barrel');
      tryAddProp(170 + i * 80, midY + 60, 'crate');
    }
    // Back pillars
    tryAddProp(100, 120, 'pillar');
    tryAddProp(100, H-120, 'pillar');
  } else if (layout === 'pillars') {
    // Temple-like pillar arrangement
    const pillarPositions = [
      {x: W/4, y: H/4}, {x: W*3/4, y: H/4},
      {x: W/4, y: H*3/4}, {x: W*3/4, y: H*3/4},
      {x: W/2, y: H/4}, {x: W/2, y: H*3/4}
    ];
    pillarPositions.forEach(pos => {
      tryAddProp(pos.x, pos.y, 'pillar');
      // Small decoration near each pillar
      if (Math.random() > 0.5) {
        tryAddProp(pos.x + 50, pos.y, 'vase');
      }
    });
  } else {
    // Random fallback (old behavior)
    const propCount = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < propCount; i++) {
      const px = 80 + Math.random() * (W - 160);
      const py = 80 + Math.random() * (H - 160);
      const propTypes = ['explosive_barrel', 'crate', 'rock', 'pillar', 'vase', 'statue', 'bookshelf'];
      const type = propTypes[Math.floor(Math.random() * propTypes.length)];
      tryAddProp(px, py, type);
    }
  }
  
  return props;
}

// Update & draw loop
let last = performance.now(); resize();
requestAnimationFrame(loop);
function loop(now){
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  // perf: update fps average
  const instFPS = dt > 0 ? (1/dt) : 60; game.perfFPS = game.perfFPS*0.92 + instFPS*0.08;
  // auto-scale fx
  game.fxScale = game.lowFx ? 0.6 : (game.perfFPS < 50 ? 0.75 : 1.0);
  if (game.hitPause>0) { game.hitPause = Math.max(0, game.hitPause - dt); }
  const eff = game.hitPause>0 ? 0 : dt;
  tick(eff); draw(dt);
  requestAnimationFrame(loop);
}

function tick(dt){
  // Stop all gameplay updates until Start is clicked
  if (!game.started) return;
  // Stop updates when dead (only overlay draws)
  if (game.dead) return;
  // Pause menu
  if (game.paused) return;
  // Pause entirely during level-up selection (UI still draws)
  if (game.levelUpChoices || game.shopOpen) return;
  const theme = PALETTES[game.theme];

  // Input actions
  const weapon = game.player.currentWeapon;
  if (game.mouse.down) {
    // For charged weapons, only start charging on mouse down
    if (weapon && weapon.chargeTime && weapon.chargeTime > 0) {
      if (!game.player.isCharging && game.player.shootCd <= 0) {
        game.player.isCharging = true;
        game.player.chargeTimer = 0;
      }
      // Keep charging while mouse held
    } else {
      // Non-charged weapons fire continuously
      game.player.tryShoot(game);
    }
  } else {
    // Mouse released - fire charged weapons if fully charged
    if (game.player.isCharging && weapon && weapon.chargeTime) {
      if (game.player.chargeTimer >= weapon.chargeTime) {
        game.player.tryShoot(game);
      } else {
        // Not fully charged, cancel
        game.player.isCharging = false;
        game.player.chargeTimer = 0;
      }
    }
  }
  if (game.input.dash) {
    const moveX = (game.input.right ? 1 : 0) - (game.input.left ? 1 : 0);
    const moveY = (game.input.down ? 1 : 0) - (game.input.up ? 1 : 0);
    game.player.dash(moveX, moveY);
  }

  // Update player and aim world coords
  updateMouseWorld();
  game.player.update(dt, game.input, game.mouse, game);

  // Enemies
  for (const e of game.enemies) e.update(dt, game);
  // Handle enemy-triggered explosions (from bomber proximity or on-death)
  for (const e of game.enemies) {
    if (e.pendingExplosion) {
      const ex = e.pendingExplosion; e.pendingExplosion = null;
      triggerExplosion(e.x, e.y, ex.r, ex.dmg);
    }
  }
  
  // Update props (for explosive barrel fuses and trapdoors)
  const roomForProps = game.rooms.get(game.currentRoomKey);
  if (roomForProps && roomForProps.contents) {
    for (const prop of roomForProps.contents.props) {
      if (prop.update && prop.update(dt, game)) {
        // Prop signals it's ready to explode
        if (prop.pendingExplosion) {
          triggerExplosion(prop.x, prop.y, prop.pendingExplosion.r, prop.pendingExplosion.dmg);
          prop.pendingExplosion = null;
        }
      }
      
      // Check for trapdoor interaction (E key)
      if (prop.type === 'trapdoor' && prop.canInteract && prop.canInteract(game.player.x, game.player.y)) {
        if (game.input.interact && !game.trapdoorCooldown) {
          // Use trapdoor to skip to next level
          game.promptTimed('🌀 Descending through secret passage...', 1.5);
          game.trapdoorCooldown = 1.0; // prevent spam
          setTimeout(() => {
            nextLevel();
          }, 500);
        } else if (!game.trapdoorCooldown) {
          // Show interaction hint
          game.hintText = 'Press E to descend (skip to next level)';
        }
      }
    }
  }
  
  // Update trapdoor cooldown
  if (game.trapdoorCooldown > 0) {
    game.trapdoorCooldown -= dt;
    if (game.trapdoorCooldown < 0) game.trapdoorCooldown = 0;
  }
  
  // Projectiles
  for (const p of game.projectiles) p.update(dt, game);
  for (const p of game.enemyProjectiles) p.update(dt, game);

  // Collisions: player bullets -> enemies
  // build simple spatial grid for enemies to speed up projectile collisions
  const cell = 160; const grid = new Map();
  function cellKey(ix,iy){ return ix+","+iy; }
  for (const e of game.enemies){ const ix = (e.x/cell)|0, iy = (e.y/cell)|0; const k = cellKey(ix,iy); (grid.get(k) || grid.set(k, []).get(k)).push(e); }
  for (const p of game.projectiles) {
    if (p.from!=='player') continue;
    const ix = (p.x/cell)|0, iy = (p.y/cell)|0;
    // check 3x3 neighborhood
    for (let gx=-1; gx<=1; gx++) for (let gy=-1; gy<=1; gy++){
      const k = cellKey(ix+gx, iy+gy); const arr = grid.get(k); if (!arr) continue;
      for (const e of arr) {
      if (e.dead) continue; if (circleIntersect(p.x,p.y,p.r, e.x,e.y,e.r)) {
  // damage calculation with crit, armor, and combo
  let baseDmg = p.damage * game.player.getComboMultiplier();
  let isCrit = Math.random() < (game.player.critChance || 0);
  if (isCrit) baseDmg = Math.floor(baseDmg * (game.player.critMult || 1.5));
  const dmg = Math.max(1, baseDmg * (1 - (e.armor||0)));
  // Calculate angle from projectile to enemy for shield blocking
  const attackAngle = Math.atan2(e.y - p.y, e.x - p.x);
  e.damage(dmg, game, attackAngle); e.knockVx += (p.vx)*0.02; e.knockVy += (p.vy)*0.02; p.life = 0; game.audio.hit();
        spawnHitSparks(p.x, p.y, e.color);
  if (isCrit) spawnFloatText('CRIT', e.x, e.y-14, '#ff5252');
  // lifesteal
  const ls = game.player.lifesteal || 0; if (ls>0) game.player.heal(dmg * ls);
        spawnFloatText(`-${Math.round(dmg)}`, e.x, e.y, '#ffca28');
        // status effects
        if (p.explode) triggerExplosion(p.x, p.y, p.explode.r, p.explode.dmg);
        if (p.dot) {
          e.burn = { dps: p.dot.dps, t: p.dot.dur };
          // Visual indicator for ignite/poison
          if (p.projectileType === 'fire' || p.projectileType === 'flame') {
            spawnFloatText('🔥', e.x, e.y - 20, '#ff6d00');
          } else if (p.projectileType === 'poison' || p.projectileType === 'acid') {
            spawnFloatText('☠', e.x, e.y - 20, '#76ff03');
          }
        }
        if (p.slow) {
          e.slow = Math.max(e.slow || 0, 1 - p.slow); // p.slow is speed factor (e.g., 0.6 means 40% slower)
          // Visual indicator for freeze
          if (p.projectileType === 'ice' || p.projectileType === 'frost') {
            spawnFloatText('❄', e.x, e.y - 20, '#81d4fa');
          }
        }
        if (e.dead) { // death: coins/xp/combo
          game.player.addKill(); // track combo
          // Check if enemy should give rewards (spawner minions beyond limit don't)
          if (!e._noRewards) {
            const comboBonus = Math.floor(game.player.combo / 5);
            const c = 1 + Math.floor(Math.random()*3) + comboBonus; 
            game.coins += c; 
            spawnFloatText(`+${c}c`, e.x, e.y, '#ffee58');
            if (game.player.combo >= 5 && game.player.combo % 5 === 0) {
              spawnFloatText('COMBO x' + game.player.combo, e.x, e.y - 30, '#00e676');
            }
            const xpGain = 18 + comboBonus * 3;
            const lvl = game.player.addXp(xpGain);
            if (lvl) { 
              game.levelUpChoices = levelUpChoices(); 
              levelUpOpenTime = Date.now(); 
              game.audio.playLevelUp(); 
              // Add skill point on level up
              if (game.skillTreeManager) {
                game.skillTreeManager.addSkillPoint();
                game.promptTimed(`Level ${game.player.level}! Skill point gained (Press T)`, 2.5);
              }
            }
          } else {
            // Spawned minion beyond limit - no rewards but show message
            spawnFloatText('No reward', e.x, e.y, '#666666');
          }
          game.camera.shake = Math.max(game.camera.shake, 8); game.hitPause = Math.max(game.hitPause, 0.06);
          spawnDeathBurst(e.x, e.y, e.color);
        }
        break;
      }
      }
    }
  }
  // enemy bullets -> player
  for (const p of game.enemyProjectiles) {
    if (circleIntersect(p.x,p.y,p.r, game.player.x, game.player.y, game.player.r)) {
      p.life = 0; game.player.damage(p.damage, game);
    }
  }
  // enemy melee contact damage with cooldown and feedback
  for (const e of game.enemies) {
    if (e.dead) continue;
    e.attackCd = Math.max(0, e.attackCd - dt); // tick down attack cooldown
    if (circleIntersect(e.x, e.y, e.r, game.player.x, game.player.y, game.player.r)) {
      if (e.attackCd <= 0 && e.attackRate > 0) {
        // Melee attack hits
        game.player.damage(e.dmg, game);
        e.attackCd = e.attackRate; // reset cooldown
        // Strong knockback based on enemy type
        const dx = game.player.x - e.x, dy = game.player.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        const knockForce = 500 + e.dmg * 15; // stronger enemies knock back more
        game.player.vx += (dx / len) * knockForce;
        game.player.vy += (dy / len) * knockForce;
        // Hit feedback
        game.camera.shake = Math.max(game.camera.shake, 6 + e.dmg * 0.3);
        game.hitPause = Math.max(game.hitPause, 0.04);
        game.audio.hit();
        spawnHitSparks(game.player.x, game.player.y, e.color);
        spawnFloatText(`-${e.dmg}`, game.player.x, game.player.y - 10, '#ff5252');
      }
    }
  }
  // projectiles hitting props (barrels/crates)
  const currentRoom = game.rooms.get(game.currentRoomKey);
  for (const p of game.projectiles) {
    if (p.from !== 'player' || p.life <= 0) continue;
    for (const prop of currentRoom.contents.props) {
      if (prop.broken) continue;
      const col = prop.getCollider();
      if (col && circleRect(p.x, p.y, p.r, col)) {
        const broke = prop.damage(p.damage);
        p.life = 0; // projectile is consumed
        if (broke) {
          // Explosive barrels start fusing, don't explode immediately
          if (!prop.explosive) {
            // spawn coins only for non-explosive props (crates, etc)
            const coinCount = 2 + Math.floor(Math.random() * 4);
            game.coins += coinCount;
            spawnFloatText(`+${coinCount}c`, prop.x, prop.y, '#ffee58');
          }
          spawnDeathBurst(prop.x, prop.y, prop.type === 'crate' ? '#6d4c41' : '#8d6e63');
          game.audio.hit();
        }
        break;
      }
    }
  }
  
  // Enemies can trigger traps and explosive barrels
  for (const e of game.enemies) {
    if (e.dead) continue;
    // Check traps
    for (const trap of currentRoom.contents.traps) {
      if (trap.triggered) continue;
      const dx = e.x - trap.x, dy = e.y - trap.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < trap.r + e.r) {
        trap.triggered = true;
        trap.triggerTime = 0;
        e.damage(trap.damage, game);
        game.audio.hit();
      }
    }
    // Check explosive barrels proximity
    for (const prop of currentRoom.contents.props) {
      if (prop.broken || !prop.explosive) continue;
      const dx = e.x - prop.x, dy = e.y - prop.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40) {
        prop.damage(999); // enemies destroy barrels on contact, starts fuse
      }
    }
  }
  // death check
  if (game.player.hp <= 0 && !game.dead) { game.dead = true; }

  // cleanup projectiles
  game.projectiles = game.projectiles.filter(p=> (p.life-=dt) > 0);
  game.enemyProjectiles = game.enemyProjectiles.filter(p=> (p.life-=dt) > 0);
  game.enemies = game.enemies.filter(e=>!e.dead);
  // particles update/cleanup - optimized with max limit
  const oldParticles = game.particles;
  game.particles = [];
  const maxParticles = game.perfFPS < 45 ? 150 : 300; // Limit particles on low FPS
  for (const prt of oldParticles) {
    prt.update(dt);
    if (prt.t < prt.life && game.particles.length < maxParticles) game.particles.push(prt);
  }

  // if room cleared now, ping doors
  const roomEnemies = game.enemies.length;
  const room = game.rooms.get(game.currentRoomKey);
  // Only mark room as cleared if it was locked/had enemies to begin with
  const shouldBeLocked = (room.type==='combat' || room.type==='trap' || room.type==='boss');
  if (!room.cleared && roomEnemies === 0 && shouldBeLocked && room.spawned) {
    room.cleared = true; room.locked = false; room.doorPulse = 2; room.unlockAnim = 0.6; game.audio.unlock(); game.promptTimed('Doors unlocked — follow the glowing arrows', 2.2);
    // chance to spawn a reward chest in cleared combat rooms - use sampleWalkable
    if (room.type==='combat' && Math.random()<0.4) {
      const p = sampleWalkable(room, 20);
      room.contents.loot.push(new Chest(p.x, p.y));
    }
    // if boss is cleared, spawn a dimensional portal in the center of the room
    if (room.type==='boss') {
      const W = room.w, H = room.h;
      room.nextPortal = true;
      // Spawn portal in center of room, accessible from all sides
      room.portal = {
        x: W / 2,
        y: H / 2,
        radius: 70,  // Interaction radius
        scale: 0,    // For spawn animation
        rotation: 0, // For spinning animation
        particles: [] // Energy particles
      };
      
      // Initialize portal particles
      for (let i = 0; i < 20; i++) {
        room.portal.particles.push({
          angle: (Math.PI * 2 * i) / 20,
          distance: 50 + Math.random() * 30,
          speed: 0.02 + Math.random() * 0.02,
          size: 2 + Math.random() * 3,
          opacity: 0.5 + Math.random() * 0.5
        });
      }
      
      game.promptTimed('🌀 A dimensional portal opens to the next layer!', 3.0);
      game.camera.shake = 15;
    }
  }

  // Auto-pickup health orbs (no interaction required)
  const room2 = game.rooms.get(game.currentRoomKey);
  for (let i = room2.contents.loot.length - 1; i >= 0; i--) {
    const l = room2.contents.loot[i];
    if (l.type === 'health_orb') {
      if (dist2(l.x, l.y, game.player.x, game.player.y) < 30*30) {
        game.player.heal(l.heal);
        spawnFloatText(`+${l.heal} HP`, game.player.x, game.player.y - 20, '#ff5252');
        game.audio.pickup?.();
        room2.contents.loot.splice(i, 1);
      }
    }
  }

  // Update hidden chest visibility based on player proximity and light
  for (const l of room2.contents.loot) {
    if (l instanceof HiddenChest) {
      const lightRadius = 200; // Base light radius around player
      l.updateVisibility(game.player.x, game.player.y, lightRadius);
    }
  }

  // Interact (single press)
  if (game.input.interact && !interactLock) {
    interactLock = true;
    // chest open or trader interaction
    for (const l of room2.contents.loot) {
      if (l instanceof Chest) {
        if (dist2(l.x,l.y, game.player.x, game.player.y) < 40*40) l.open(game);
      } else if (l.type==='trader') {
        if (room2.cleared && dist2(l.x,l.y, game.player.x, game.player.y) < 80*80) {
          // open shop overlay
          game.shopOpen = l; game.paused = false; // shop pauses gameplay by itself
        } else if (!room2.cleared) {
          game.promptTimed('Clear the room to use the shop', 1.2);
        }
      } else if (l.type==='weapon_pickup') {
        // Weapon pickup interaction
        if (!l.weapon) continue; // Skip if weapon is undefined
        if (dist2(l.x, l.y, game.player.x, game.player.y) < 50*50) {
          // Check if player has 2 weapons equipped
          if (game.player.weapons.length >= 2) {
            // Swap with currently active weapon
            const idx = game.player.weaponIndex || 0;
            const oldWeapon = game.player.weapons[idx];
            const newWeapon = structuredClone(l.weapon);
            // Apply rarity multipliers to new weapon
            const rarity = RARITY[newWeapon.rarity] || RARITY.common;
            const mult = rarity.mult;
            if (mult !== 1.0) {
              newWeapon.damage = Math.round(newWeapon.damage * mult);
              newWeapon.fireRate = newWeapon.fireRate * mult;
              if (newWeapon.bullets) newWeapon.bullets = Math.max(1, Math.round(newWeapon.bullets * Math.sqrt(mult)));
            }
            game.player.weapons[idx] = newWeapon;
            // Drop the old weapon at same location
            l.weapon = oldWeapon;
            game.promptTimed(`Swapped to ${newWeapon.name}`, 1.5);
            game.audio.pickup?.();
          } else {
            // Auto-pickup if less than 2 weapons
            game.player.giveWeapon(l.weapon);
            // Remove from room
            const idx = room2.contents.loot.indexOf(l);
            if (idx !== -1) room2.contents.loot.splice(idx, 1);
            game.promptTimed(`Picked up ${l.weapon.name}`, 1.5);
            game.audio.pickup?.();
            
            // If this is a weapon room (multiple weapon pickups), remove all other weapons
            if (room2.type === 'weapon') {
              room2.contents.loot = room2.contents.loot.filter(item => item.type !== 'weapon_pickup');
            }
          }
        }
      } else if (l.type === 'item_pickup') {
        // Item pickup interaction
        if (dist2(l.x, l.y, game.player.x, game.player.y) < 50*50) {
          l.pickup(game);
          // Remove from room
          const idx = room2.contents.loot.indexOf(l);
          if (idx !== -1) room2.contents.loot.splice(idx, 1);
        }
      }
    }
  }

  // Traps damage
  for (const t of room2.contents.traps) {
    t.update(dt);
    const spikeD = t.collideDamage?.(game.player.x, game.player.y, game.player.r) || 0;
    if (spikeD) game.player.damage(spikeD*dt, game);
    const boom = t.tryExplode?.(game.player.x, game.player.y, game.player.r) || 0;
    if (boom) { game.audio.explosion(); game.player.damage(boom, game); game.camera.shake = Math.max(game.camera.shake, 12); spawnExplosion(room2, t.x, t.y); }
  }

  // Room doors transitions (edges)
  const edge = 22; // must be close to actual door opening, not just wall
  const hasEnemies = game.enemies && game.enemies.length > 0;
  const doorsShouldBeLocked = room2.locked || hasEnemies;
  if (!doorsShouldBeLocked && game.doorCd<=0) {
    const gaps = room2.contents.doorGaps || [];
    const W = room2.w, H = room2.h;
    const nearNorth = game.player.y <= edge && room2.doors.n;
    const nearSouth = game.player.y >= H - edge && room2.doors.s;
    const nearWest = game.player.x <= edge && room2.doors.w;
    const nearEast = game.player.x >= W - edge && room2.doors.e;
    const inNorthGap = nearNorth && gaps.some(g=> g.y === 0 && game.player.x >= g.x && game.player.x <= g.x + g.w);
    const inSouthGap = nearSouth && gaps.some(g=> Math.abs((g.y + g.h) - H) < 1 && game.player.x >= g.x && game.player.x <= g.x + g.w);
    const inWestGap  = nearWest  && gaps.some(g=> g.x === 0 && game.player.y >= g.y && game.player.y <= g.y + g.h);
    const inEastGap  = nearEast  && gaps.some(g=> Math.abs((g.x + g.w) - W) < 1 && game.player.y >= g.y && game.player.y <= g.y + g.h);
    (async()=>{
      if (inNorthGap) await enterRoom(shiftKey(0,-1), 's');
      else if (inSouthGap) await enterRoom(shiftKey(0,1), 'n');
      else if (inWestGap) await enterRoom(shiftKey(-1,0), 'e');
      else if (inEastGap) await enterRoom(shiftKey(1,0), 'w');
    })();
  }
  // Next level portal transition (boss room only - must be cleared)
  if (room2.cleared && !room2.locked && game.doorCd<=0 && room2.nextPortal && room2.portal){
    const portal = room2.portal;
    const px = game.player.x, py = game.player.y;
    const distToPortal = Math.sqrt((px - portal.x) ** 2 + (py - portal.y) ** 2);
    
    // Animate portal opening
    if (portal.scale < 1) {
      portal.scale = Math.min(1, portal.scale + 0.02);
    }
    
    // Spin animation
    portal.rotation += 0.03;
    
    // Update particles
    for (const p of portal.particles) {
      p.angle += p.speed;
    }
    
    // Check if player is near portal (within interaction radius)
    if (distToPortal < portal.radius) {
      // Show prompt to enter
      if (distToPortal < portal.radius - 10) {
        game.prompt = 'Press E to enter the portal';
        
        // Check for E key press to enter portal
        if (game.input.interact && !interactLock) {
          interactLock = true;
          console.log('[Portal] Entering next level from depth', game.depth);
          game.promptTimed('🌀 Entering the dimensional rift...', 2.0);
          game.camera.shake = 20;
          
          // Visual effect: pull player toward portal center
          const pullStrength = 0.3;
          game.player.x += (portal.x - game.player.x) * pullStrength;
          game.player.y += (portal.y - game.player.y) * pullStrength;
          
          // Delay slightly for effect, then transition
          setTimeout(() => {
            nextLevel();
          }, 500);
          return;
        }
      }
    }
  }
  if (game.doorCd>0) game.doorCd = Math.max(0, game.doorCd - dt);

  // Prompt timer
  if (game.promptTimer>0){ game.promptTimer -= dt; if (game.promptTimer<=0) game.prompt=''; }
  if (game.bloodScreen > 0) { game.bloodScreen = Math.max(0, game.bloodScreen - dt * 1.5); }
  // reduce door pulse timer
  if (room2.doorPulse>0) room2.doorPulse = Math.max(0, room2.doorPulse - dt);
}

function shiftKey(dx,dy){ const [x,y]=game.currentRoomKey.split(',').map(Number); return `${x+dx},${y+dy}`; }

function updateMouseWorld(){
  // inverse camera transform (approx since rotation is none)
  game.mouse.worldX = game.mouse.x + (game.camera.x - game.width/2);
  game.mouse.worldY = game.mouse.y + (game.camera.y - game.height/2);
}

function draw(dt){
  const theme = PALETTES[game.theme];
  // camera follow
  game.camera.x = clamp(game.camera.x + (game.player.x - game.camera.x)*0.12, 0, game.roomBounds.w);
  game.camera.y = clamp(game.camera.y + (game.player.y - game.camera.y)*0.12, 0, game.roomBounds.h);

  // parallax background
  ctx.save();
  ctx.fillStyle = theme.bg; ctx.fillRect(0,0,game.width,game.height);
  // fog grid
  ctx.fillStyle = theme.fog; for (let i=0;i<game.width;i+=64){ ctx.fillRect(i,0,1,game.height);} for (let j=0;j<game.height;j+=64){ ctx.fillRect(0,j,game.width,1);} 
  ctx.restore();

  // world transform
  const shakeX = (Math.random()-0.5)*game.camera.shake; const shakeY = (Math.random()-0.5)*game.camera.shake; game.camera.shake = Math.max(0, game.camera.shake - 40*dt);
  ctx.save();
  ctx.translate(Math.floor(game.width/2 - game.camera.x + shakeX), Math.floor(game.height/2 - game.camera.y + shakeY));

  // room floor via cached render (falls back if missing)
  const room = game.rooms.get(game.currentRoomKey);
  const W = room.w, H = room.h;
  if (room?.renderCache) {
    ctx.drawImage(room.renderCache, 0, 0);
  } else {
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,W, H);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(20,20,W-40,H-40);
    if (!MAP_PATTERN && MAP_TILE.complete) { MAP_PATTERN = ctx.createPattern(MAP_TILE, 'repeat'); }
    if (MAP_PATTERN) { ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = MAP_PATTERN; ctx.fillRect(0,0,W, H); ctx.restore(); }
  }
  
  // Draw floor tiles for themed rooms
  if (room.theme) {
    ctx.save();
    const tileSize = 64;
    const tileColors = {
      library: ['#3e2723', '#4e342e'],
      armory: ['#424242', '#616161'],
      crypt: ['#263238', '#37474f'],
      laboratory: ['#e0e0e0', '#f5f5f5'],
      dungeon: ['#1a1a1a', '#2a2a2a'],
      garden: ['#33691e', '#558b2f'],
      dark_chamber: ['#0d0d0d', '#1a1a1a'],
      bright_hall: ['#fafafa', '#ffffff']
    };
    const colors = tileColors[room.theme] || ['#212121', '#424242'];
    
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        const colorIndex = ((x / tileSize) + (y / tileSize)) % 2;
        ctx.fillStyle = colors[colorIndex];
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
    ctx.restore();
  }
  
  // Apply lighting overlay based on room light level
  if (room.lightLevel !== undefined) {
    ctx.save();
    const darkness = Math.max(0, 1 - room.lightLevel);
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.7})`;
    ctx.fillRect(0, 0, W, H);
    
    // Add fog effect for dark chambers
    if (room.fogDensity) {
      ctx.fillStyle = `rgba(100, 100, 120, ${room.fogDensity * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  
  // Themed room visual effects
  if (room.type === 'dark') {
    // Dark room - heavy darkness with slight purple tint
    ctx.save();
    ctx.fillStyle = 'rgba(10, 5, 20, 0.6)';
    ctx.fillRect(0, 0, W, H);
    // Vignette effect
    const vignette = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
    vignette.addColorStop(0, 'rgba(26, 26, 46, 0)');
    vignette.addColorStop(1, 'rgba(10, 5, 20, 0.8)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (room.type === 'explosive') {
    // Explosive room - orange/red heat haze
    ctx.save();
    const pulse = 0.5 + Math.sin(performance.now() * 0.002) * 0.5;
    ctx.fillStyle = `rgba(255, 107, 53, ${pulse * 0.08})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (room.type === 'toxic') {
    // Toxic room - green poison fog
    ctx.save();
    const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.5;
    const fog = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.6);
    fog.addColorStop(0, 'rgba(124, 179, 66, 0)');
    fog.addColorStop(0.7, `rgba(124, 179, 66, ${pulse * 0.12})`);
    fog.addColorStop(1, `rgba(85, 139, 47, ${pulse * 0.18})`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (room.type === 'frozen') {
    // Frozen room - blue ice effects
    ctx.save();
    ctx.fillStyle = 'rgba(100, 181, 246, 0.1)';
    ctx.fillRect(0, 0, W, H);
    // Ice crystals effect
    const pulse = 0.5 + Math.sin(performance.now() * 0.004) * 0.5;
    ctx.fillStyle = `rgba(227, 242, 253, ${pulse * 0.05})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // draw traps/loot/enemies/player/projectiles
  // room colliders already baked into render cache; nothing to carve each frame
  // draw door markers first so they sit under entities
  drawDoorMarkers(ctx, room);
  // draw dimensional portal if present (only when room is cleared)
  if (room.cleared && room.nextPortal && room.portal){
    const portal = room.portal;
    ctx.save();
    
    // Outer glow effect
    const glowSize = 120 * portal.scale;
    const glowGrad = ctx.createRadialGradient(portal.x, portal.y, 0, portal.x, portal.y, glowSize);
    glowGrad.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
    glowGrad.addColorStop(0.5, 'rgba(0, 136, 255, 0.15)');
    glowGrad.addColorStop(1, 'rgba(0, 68, 170, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground circle/platform
    ctx.fillStyle = 'rgba(80, 90, 100, 0.6)';
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y + 10, 75 * portal.scale, 15 * portal.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Energy particles orbiting (limit on low FPS)
    const particleStep = game.perfFPS < 45 ? 2 : 1;
    for (let i = 0; i < portal.particles.length; i += particleStep) {
      const p = portal.particles[i];
      const px = portal.x + Math.cos(p.angle) * p.distance * portal.scale;
      const py = portal.y + Math.sin(p.angle) * p.distance * portal.scale * 0.7;
      
      ctx.fillStyle = `rgba(0, 255, 255, ${p.opacity * portal.scale})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size * portal.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Portal vortex center with rotation
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(portal.rotation);
    ctx.scale(portal.scale, portal.scale);
    
    // Swirling rings
    for (let i = 3; i > 0; i--) {
      const radius = i * 20;
      const alpha = 0.3 / i;
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Draw cached portal SVG
    if (PORTAL_IMG.complete && PORTAL_IMG.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = portal.scale;
      ctx.drawImage(PORTAL_IMG, portal.x - 80, portal.y - 100, 160, 160);
      ctx.restore();
    } else {
      // Fallback: Draw archway structure
      ctx.fillStyle = 'rgba(136, 153, 170, 0.9)';
      const archW = 60 * portal.scale;
      const archH = 100 * portal.scale;
      
      // Left pillar
      ctx.fillRect(portal.x - archW/2 - 10, portal.y - archH/2, 10, archH);
      // Right pillar
      ctx.fillRect(portal.x + archW/2, portal.y - archH/2, 10, archH);
      // Top arch
      ctx.beginPath();
      ctx.arc(portal.x, portal.y - archH/2, archW/2 + 5, Math.PI, 0);
      ctx.fill();
      
      // Gold accents
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y - archH/2, archW/2 + 5, Math.PI, 0);
      ctx.stroke();
    }
    
    // Central bright core
    const coreGrad = ctx.createRadialGradient(portal.x, portal.y, 0, portal.x, portal.y, 15 * portal.scale);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.8)');
    coreGrad.addColorStop(1, 'rgba(0, 136, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, 15 * portal.scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing center
    const pulseSize = 8 + Math.sin(performance.now() * 0.005) * 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, pulseSize * portal.scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Interaction range indicator (when player is near)
    const distToPlayer = Math.sqrt((game.player.x - portal.x) ** 2 + (game.player.y - portal.y) ** 2);
    if (distToPlayer < portal.radius + 20) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // "Press E" text when close enough
      if (distToPlayer < portal.radius - 10) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillText('Press E', portal.x, portal.y - 80);
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.restore();
  }
  for (const t of room.contents.traps) t.draw(ctx);
  // draw blocking props
  for (const p of room.contents.props) p.draw(ctx);
  // draw traders with visible indicator
  for (const l of room.contents.loot) {
    if (l.type === 'trader') {
      // Draw trader/merchant character
      ctx.save();
      
      // Animated floating effect
      const floatOffset = Math.sin(performance.now() * 0.002) * 4;
      const pulseGlow = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;
      
      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(l.x, l.y + 45, 35, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Mystical glow aura
      const glowGrad = ctx.createRadialGradient(l.x, l.y + floatOffset, 0, l.x, l.y + floatOffset, 70);
      glowGrad.addColorStop(0, `rgba(255, 202, 40, ${pulseGlow * 0.4})`);
      glowGrad.addColorStop(0.5, `rgba(255, 202, 40, ${pulseGlow * 0.2})`);
      glowGrad.addColorStop(1, 'rgba(255, 202, 40, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(l.x, l.y + floatOffset, 70, 0, Math.PI * 2);
      ctx.fill();
      
      // Load and draw merchant SVG
      const merchantImg = new Image();
      if (!merchantImg.src) merchantImg.src = 'assets/img/icons/merchant.svg';
      if (merchantImg.complete && merchantImg.naturalWidth > 0) {
        ctx.drawImage(merchantImg, l.x - 40, l.y - 50 + floatOffset, 80, 80);
      } else {
        // Fallback: Draw simple merchant figure
        // Robe/cloak
        ctx.fillStyle = '#6b4423';
        ctx.beginPath();
        ctx.moveTo(l.x, l.y - 30 + floatOffset);
        ctx.lineTo(l.x - 25, l.y - 10 + floatOffset);
        ctx.lineTo(l.x - 20, l.y + 30 + floatOffset);
        ctx.lineTo(l.x + 20, l.y + 30 + floatOffset);
        ctx.lineTo(l.x + 25, l.y - 10 + floatOffset);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3d2712';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Hood
        ctx.fillStyle = '#6b4423';
        ctx.beginPath();
        ctx.arc(l.x, l.y - 25 + floatOffset, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Mysterious shadowed face
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(l.x, l.y - 23 + floatOffset, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing eyes
        ctx.fillStyle = '#ffca28';
        ctx.beginPath();
        ctx.arc(l.x - 4, l.y - 25 + floatOffset, 2, 0, Math.PI * 2);
        ctx.arc(l.x + 4, l.y - 25 + floatOffset, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Floating coins animation
      const coinTime = performance.now() * 0.001;
      for (let i = 0; i < 3; i++) {
        const angle = (coinTime + i * 2.1) % (Math.PI * 2);
        const coinX = l.x + Math.cos(angle) * 30;
        const coinY = l.y - 20 + floatOffset + Math.sin(angle * 2) * 8;
        
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(coinX, coinY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#aa7700';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#aa7700';
        ctx.font = 'bold 6px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', coinX, coinY);
      }
      
      // Shop label with background
      ctx.fillStyle = 'rgba(20, 20, 25, 0.9)';
      ctx.fillRect(l.x - 32, l.y + 38, 64, 20);
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 2;
      ctx.strokeRect(l.x - 32, l.y + 38, 64, 20);
      
      ctx.fillStyle = '#ffca28';
      ctx.font = 'bold 12px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏪 SHOP', l.x, l.y + 48);
      
      ctx.restore();
    } else if (l.type === 'weapon_pickup') {
      // Draw weapon pickup on ground with rarity colors
      if (!l.weapon) continue; // Skip if weapon is undefined
      
      ctx.save();
      const floatOffset = Math.sin(performance.now() * 0.003) * 3;
      const rarity = RARITY[l.weapon.rarity] || RARITY.common;
      
      // Animated glow effect
      const glowPulse = 0.6 + Math.sin(performance.now() * 0.004) * 0.4;
      const gradient = ctx.createRadialGradient(l.x, l.y + floatOffset, 10, l.x, l.y + floatOffset, 60);
      gradient.addColorStop(0, rarity.glow.replace(/[\d.]+\)$/, glowPulse + ')'));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(l.x - 60, l.y - 60 + floatOffset, 120, 120);
      
      // Platform/base with rarity color
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(l.x - 28, l.y - 28 + floatOffset, 56, 56);
      ctx.strokeStyle = rarity.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(l.x - 28, l.y - 28 + floatOffset, 56, 56);
      
      // Inner glow
      ctx.strokeStyle = rarity.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(l.x - 24, l.y - 24 + floatOffset, 48, 48);
      ctx.globalAlpha = 1;
      
      // Weapon SVG image
      const weaponImg = getWeaponImage(l.weapon.id);
      if (weaponImg.complete && weaponImg.naturalWidth > 0) {
        ctx.drawImage(weaponImg, l.x - 20, l.y - 20 + floatOffset, 40, 40);
      } else {
        // Fallback while loading
        ctx.fillStyle = rarity.color;
        ctx.font = 'bold 20px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔫', l.x, l.y - 5 + floatOffset);
      }
      
      // Rarity tag
      ctx.fillStyle = rarity.color;
      ctx.font = 'bold 9px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(rarity.name.toUpperCase(), l.x, l.y - 38 + floatOffset);
      
      // Weapon name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui, Arial';
      ctx.fillText(l.weapon.name, l.x, l.y + 38 + floatOffset);
      
      ctx.restore();
    } else {
      l.draw?.(ctx);
    }
  }
  for (const e of game.enemies) e.draw(ctx);
  for (const p of game.projectiles) p.draw(ctx);
  for (const p of game.enemyProjectiles) p.draw(ctx);
  // particles
  for (const prt of game.particles) prt.draw(ctx);
  game.player.draw(ctx);

  // crosshair (world-space)
  drawCrosshair(ctx);

  // lighting gradient around player (bonus) - only render in high FX mode
  if (!game.lowFx && game.fxScale > 0.7) {
    const lg = ctx.createRadialGradient(game.player.x, game.player.y, 40, game.player.x, game.player.y, 360);
    lg.addColorStop(0, 'rgba(255,255,255,0.08)'); lg.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = lg; ctx.fillRect(0,0,W, H);
  }

  ctx.restore();

  // screen-space vignette (optional enhancement)
  ctx.save(); ctx.resetTransform(); if (VIGNETTE_CANVAS) ctx.drawImage(VIGNETTE_CANVAS, 0, 0); ctx.restore();

  // Ultimate ability screen effects
  if (game.player.ultimateActive) {
    ctx.save(); ctx.resetTransform();
    const pulse = 0.5 + Math.sin(performance.now() * 0.008) * 0.5;
    
    if (game.player.ultimateType === 'fortress') {
      // Golden shield effect
      const glow = ctx.createRadialGradient(game.width/2, game.height/2, 0, game.width/2, game.height/2, game.width * 0.7);
      glow.addColorStop(0, 'rgba(255, 200, 0, 0)');
      glow.addColorStop(0.7, `rgba(255, 200, 0, ${pulse * 0.15})`);
      glow.addColorStop(1, `rgba(255, 150, 0, ${pulse * 0.25})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, game.width, game.height);
    } else if (game.player.ultimateType === 'berserk') {
      // Red rage effect
      const glow = ctx.createRadialGradient(game.width/2, game.height/2, 0, game.width/2, game.height/2, game.width * 0.7);
      glow.addColorStop(0, 'rgba(255, 0, 0, 0)');
      glow.addColorStop(0.7, `rgba(255, 0, 0, ${pulse * 0.12})`);
      glow.addColorStop(1, `rgba(200, 0, 0, ${pulse * 0.2})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, game.width, game.height);
    } else if (game.player.ultimateType === 'timewarp') {
      // Blue time distortion effect
      const glow = ctx.createRadialGradient(game.width/2, game.height/2, 0, game.width/2, game.height/2, game.width * 0.7);
      glow.addColorStop(0, 'rgba(100, 180, 255, 0)');
      glow.addColorStop(0.7, `rgba(100, 180, 255, ${pulse * 0.1})`);
      glow.addColorStop(1, `rgba(50, 120, 255, ${pulse * 0.18})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, game.width, game.height);
    }
    ctx.restore();
  }

  // Blood screen effect (when hit) - improved visuals
  if (game.bloodScreen > 0) {
    ctx.save(); ctx.resetTransform();
    const intensity = game.bloodScreen;
    const fadeOut = Math.pow(intensity, 1.5); // Smoother fade
    
    // Dark vignette from edges
    const vignette = ctx.createRadialGradient(game.width/2, game.height/2, 0, game.width/2, game.height/2, game.width * 0.65);
    vignette.addColorStop(0, `rgba(0, 0, 0, 0)`);
    vignette.addColorStop(0.6, `rgba(20, 0, 0, ${fadeOut * 0.3})`);
    vignette.addColorStop(1, `rgba(40, 0, 0, ${fadeOut * 0.6})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, game.width, game.height);
    
    // Blood spatter from edges with varied sizes
    const splatterCount = 16;
    for (let i = 0; i < splatterCount; i++) {
      const angle = (i / splatterCount) * Math.PI * 2;
      const dist = 0.42 + (i % 3) * 0.04; // Varied distance
      const x = game.width/2 + Math.cos(angle) * game.width * dist;
      const y = game.height/2 + Math.sin(angle) * game.height * dist;
      const size = (15 + (i % 5) * 8) * fadeOut; // Varied sizes
      
      // Blood drop gradient
      const dropGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      dropGradient.addColorStop(0, `rgba(150, 0, 0, ${fadeOut * 0.5})`);
      dropGradient.addColorStop(0.5, `rgba(120, 0, 0, ${fadeOut * 0.3})`);
      dropGradient.addColorStop(1, `rgba(80, 0, 0, 0)`);
      ctx.fillStyle = dropGradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Blood drip trails
      if (i % 4 === 0) {
        const dripLength = 40 * fadeOut;
        const dripGradient = ctx.createLinearGradient(x, y, x, y + dripLength);
        dripGradient.addColorStop(0, `rgba(120, 0, 0, ${fadeOut * 0.4})`);
        dripGradient.addColorStop(1, `rgba(80, 0, 0, 0)`);
        ctx.fillStyle = dripGradient;
        ctx.fillRect(x - 2, y, 4, dripLength);
      }
    }
    
    // Corner blood splatters for extra intensity
    const corners = [
      [0, 0], [game.width, 0], [0, game.height], [game.width, game.height]
    ];
    corners.forEach(([cx, cy], idx) => {
      const cornerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      cornerGradient.addColorStop(0, `rgba(100, 0, 0, ${fadeOut * 0.4})`);
      cornerGradient.addColorStop(1, `rgba(100, 0, 0, 0)`);
      ctx.fillStyle = cornerGradient;
      ctx.fillRect(cx - 100, cy - 100, 200, 200);
    });
    
    // Screen shake effect on initial hit
    if (intensity > 0.8) {
      const shake = (1 - intensity) * 20; // Shake diminishes quickly
      ctx.translate(Math.random() * shake - shake/2, Math.random() * shake - shake/2);
    }
    
    ctx.restore();
  }

  // damage vignette (red flash when low HP)
  if (game.player.hp < game.player.maxHp * 0.3) {
    ctx.save(); ctx.resetTransform();
    const intensity = 1 - (game.player.hp / (game.player.maxHp * 0.3));
    ctx.fillStyle = `rgba(255, 50, 50, ${intensity * 0.25})`;
    ctx.fillRect(0, 0, game.width, game.height);
    // Pulse effect
    const pulse = Math.sin(performance.now() * 0.003) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255, 50, 50, ${intensity * pulse * 0.4})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, game.width - 8, game.height - 8);
    ctx.restore();
  }

  // HUD
  drawHUD(ctx, game);

  // Death overlay
  if (game.dead) {
    ctx.save(); ctx.resetTransform();
    
    // Dark overlay with red vignette
    const overlayGrad = ctx.createRadialGradient(game.width/2, game.height/2, 0, game.width/2, game.height/2, game.width * 0.6);
    overlayGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    overlayGrad.addColorStop(1, 'rgba(20,0,0,0.95)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0,0,game.width,game.height);
    
    // Animated pulse effect
    const pulse = 0.5 + Math.sin(performance.now() * 0.002) * 0.5;
    
    // Main death panel
    const panelW = 500, panelH = 380;
    const panelX = game.width/2 - panelW/2, panelY = game.height/2 - panelH/2;
    
    // Panel shadow/glow
    ctx.shadowColor = 'rgba(255, 0, 0, ' + (0.4 * pulse) + ')';
    ctx.shadowBlur = 50;
    
    // Panel gradient background
    const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGrad.addColorStop(0, 'rgba(25, 10, 10, 0.98)');
    panelGrad.addColorStop(1, 'rgba(15, 5, 5, 0.98)');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    ctx.shadowBlur = 0;
    
    // Panel border with red gradient
    const borderGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    borderGrad.addColorStop(0, 'rgba(255, 50, 50, 0.7)');
    borderGrad.addColorStop(0.5, 'rgba(139, 0, 0, 0.5)');
    borderGrad.addColorStop(1, 'rgba(255, 50, 50, 0.7)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    ctx.textAlign='center';
    
    // Skull icon with glow
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 30 * pulse;
    ctx.font = '64px system-ui, Arial';
    ctx.fillStyle = '#ff5252';
    ctx.fillText('💀', game.width/2, panelY + 80);
    ctx.shadowBlur = 0;
    
    // "You Died" title with dramatic effect
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 25 * pulse;
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 42px system-ui, Arial';
    ctx.fillText('YOU DIED', game.width/2, panelY + 140);
    ctx.shadowBlur = 0;
    
    // Depth subtitle
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 18px system-ui, Arial';
    ctx.fillText(`Reached Depth ${game.depth}`, game.width/2, panelY + 170);
    
    // Separator line
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX + 50, panelY + 195);
    ctx.lineTo(panelX + panelW - 50, panelY + 195);
    ctx.stroke();
    
    // Stats section with icons
    ctx.textAlign = 'left';
    const statsX = panelX + 100;
    const statsY = panelY + 225;
    
    ctx.fillStyle = '#ffca28';
    ctx.font = 'bold 16px system-ui, Arial';
    ctx.fillText('RUN STATISTICS', statsX, statsY);
    
    ctx.font = '15px system-ui, Arial';
    ctx.fillStyle = '#ff9999';
    ctx.fillText('⚔️', statsX, statsY + 30);
    ctx.fillStyle = '#ccc';
    ctx.fillText('Kills:', statsX + 30, statsY + 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, Arial';
    ctx.fillText(game.player.kills.toString(), statsX + 270, statsY + 30);
    
    ctx.font = '15px system-ui, Arial';
    ctx.fillStyle = '#ff9999';
    ctx.fillText('🔥', statsX, statsY + 55);
    ctx.fillStyle = '#ccc';
    ctx.fillText('Max Combo:', statsX + 30, statsY + 55);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, Arial';
    ctx.fillText(`${game.player.maxCombo}x`, statsX + 270, statsY + 55);
    
    const roomsCleared = Array.from(game.rooms.values()).filter(r => r.cleared).length;
    const totalRooms = game.rooms.size;
    ctx.font = '15px system-ui, Arial';
    ctx.fillStyle = '#ff9999';
    ctx.fillText('🚪', statsX, statsY + 80);
    ctx.fillStyle = '#ccc';
    ctx.fillText('Rooms Cleared:', statsX + 30, statsY + 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, Arial';
    ctx.fillText(`${roomsCleared}/${totalRooms}`, statsX + 270, statsY + 80);
    
    ctx.textAlign = 'center';
    
    // New Run button with hover effect
    const bx = game.width/2 - 120, by = panelY + panelH - 70, bw = 240, bh = 52;
    const isHovered = game.mouse.x >= bx && game.mouse.x <= bx+bw && game.mouse.y >= by && game.mouse.y <= by+bh;
    
    // Button glow when hovered
    if (isHovered) {
      ctx.shadowColor = '#ff7a00';
      ctx.shadowBlur = 30;
    }
    
    // Button gradient
    const btnGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    if (isHovered) {
      btnGrad.addColorStop(0, '#ff9500');
      btnGrad.addColorStop(1, '#ff6600');
    } else {
      btnGrad.addColorStop(0, '#ff7a00');
      btnGrad.addColorStop(1, '#cc5500');
    }
    ctx.fillStyle = btnGrad;
    ctx.fillRect(bx, by, bw, bh);
    
    ctx.shadowBlur = 0;
    
    // Button border
    ctx.strokeStyle = isHovered ? '#ffb84d' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    
    // Button icon and text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 New Run', game.width/2, by + bh/2);
    
    // Hint text
    ctx.font = '11px system-ui, Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Press N to restart', game.width/2, panelY + panelH + 25);
    
    ctx.restore();
  }

  // Full Map overlay
  if (game.fullMapOpen) {
    drawFullMap(ctx, game);
  }
  // Pause overlay
  else if (game.started && game.paused) {
    ctx.save(); ctx.resetTransform();
    
    // Dark overlay with gradient
    const overlayGrad = ctx.createRadialGradient(game.width/2, game.height/2, 0, game.width/2, game.height/2, game.width * 0.6);
    overlayGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    overlayGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0,0,game.width,game.height);
    
    // Animated glow pulse
    const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.5;
    
    // Main panel background with gradient
    const panelW = 600, panelH = 420;
    const panelX = game.width/2 - panelW/2, panelY = game.height/2 - panelH/2;
    
    // Panel shadow/glow
    ctx.shadowColor = 'rgba(255, 122, 0, ' + (0.3 * pulse) + ')';
    ctx.shadowBlur = 40;
    
    // Panel gradient background
    const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGrad.addColorStop(0, 'rgba(20, 20, 25, 0.98)');
    panelGrad.addColorStop(1, 'rgba(10, 10, 15, 0.98)');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    
    ctx.shadowBlur = 0;
    
    // Panel border with gradient
    const borderGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    borderGrad.addColorStop(0, 'rgba(255, 122, 0, 0.6)');
    borderGrad.addColorStop(0.5, 'rgba(100, 50, 0, 0.4)');
    borderGrad.addColorStop(1, 'rgba(255, 122, 0, 0.6)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    
    // Inner border highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
    
    ctx.textAlign = 'center';
    
    // Title with glow
    ctx.shadowColor = '#ff7a00';
    ctx.shadowBlur = 20 * pulse;
    ctx.fillStyle = '#ff7a00';
    ctx.font = 'bold 48px system-ui, Arial';
    ctx.fillText('PAUSED', game.width/2, panelY + 80);
    ctx.shadowBlur = 0;
    
    // Subtitle
    ctx.fillStyle = '#aaa';
    ctx.font = '16px system-ui, Arial';
    ctx.fillText('Game is paused - Press ESC to resume', game.width/2, panelY + 115);
    
    // Separator line
    ctx.strokeStyle = 'rgba(255, 122, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX + 50, panelY + 140);
    ctx.lineTo(panelX + panelW - 50, panelY + 140);
    ctx.stroke();
    
    // Controls info with icons
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, Arial';
    ctx.textAlign = 'left';
    const controlsY = panelY + 175;
    const leftCol = panelX + 60;
    const rightCol = panelX + panelW/2 + 30;
    
    ctx.fillStyle = '#ffca28';
    ctx.fillText('CONTROLS', leftCol, controlsY);
    ctx.fillStyle = '#ccc';
    ctx.font = '13px system-ui, Arial';
    ctx.fillText('WASD', leftCol, controlsY + 25);
    ctx.fillStyle = '#999';
    ctx.fillText('Move', leftCol + 80, controlsY + 25);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('Mouse', leftCol, controlsY + 45);
    ctx.fillStyle = '#999';
    ctx.fillText('Aim & Shoot', leftCol + 80, controlsY + 45);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('Shift/Space', leftCol, controlsY + 65);
    ctx.fillStyle = '#999';
    ctx.fillText('Dash', leftCol + 80, controlsY + 65);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('E', leftCol, controlsY + 85);
    ctx.fillStyle = '#999';
    ctx.fillText('Interact', leftCol + 80, controlsY + 85);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('R / Wheel', leftCol, controlsY + 105);
    ctx.fillStyle = '#999';
    ctx.fillText('Swap Weapon', leftCol + 80, controlsY + 105);
    
    // Right column
    ctx.fillStyle = '#ffca28';
    ctx.fillText('SHORTCUTS', rightCol, controlsY);
    ctx.fillStyle = '#ccc';
    ctx.fillText('ESC', rightCol, controlsY + 25);
    ctx.fillStyle = '#999';
    ctx.fillText('Pause', rightCol + 80, controlsY + 25);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('M', rightCol, controlsY + 45);
    ctx.fillStyle = '#999';
    ctx.fillText('Full Map', rightCol + 80, controlsY + 45);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('N', rightCol, controlsY + 65);
    ctx.fillStyle = '#999';
    ctx.fillText('New Run', rightCol + 80, controlsY + 65);
    
    ctx.fillStyle = '#ccc';
    ctx.fillText('+  /  -', rightCol, controlsY + 85);
    ctx.fillStyle = '#999';
    ctx.fillText('Volume', rightCol + 80, controlsY + 85);
    
    ctx.textAlign = 'center';
    
    // Action buttons section with separator
    ctx.strokeStyle = 'rgba(255, 122, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX + 50, panelY + panelH - 130);
    ctx.lineTo(panelX + panelW - 50, panelY + panelH - 130);
    ctx.stroke();
    
    // Resume and New Run buttons side by side
    const buttonY = panelY + panelH - 90;
    const buttonH = 54;
    const gap = 20;
    const buttonW = (panelW - 120 - gap) / 2;
    const resumeX = panelX + 60;
    const newRunX = resumeX + buttonW + gap;
    
    // Resume button (left)
    const resumeHovered = game.mouse.x >= resumeX && game.mouse.x <= resumeX+buttonW && 
                          game.mouse.y >= buttonY && game.mouse.y <= buttonY+buttonH;
    
    if (resumeHovered) {
      ctx.shadowColor = '#4caf50';
      ctx.shadowBlur = 25;
    }
    
    const resumeGrad = ctx.createLinearGradient(resumeX, buttonY, resumeX, buttonY + buttonH);
    if (resumeHovered) {
      resumeGrad.addColorStop(0, '#66bb6a');
      resumeGrad.addColorStop(1, '#43a047');
    } else {
      resumeGrad.addColorStop(0, '#4caf50');
      resumeGrad.addColorStop(1, '#388e3c');
    }
    ctx.fillStyle = resumeGrad;
    ctx.fillRect(resumeX, buttonY, buttonW, buttonH);
    
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = resumeHovered ? '#81c784' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(resumeX, buttonY, buttonW, buttonH);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, Arial';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('▶ Resume', resumeX + buttonW/2, buttonY + buttonH/2 - 5);
    ctx.font = '10px system-ui, Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('ESC', resumeX + buttonW/2, buttonY + buttonH/2 + 12);
    
    // New Run button (right)
    const newRunHovered = game.mouse.x >= newRunX && game.mouse.x <= newRunX+buttonW && 
                          game.mouse.y >= buttonY && game.mouse.y <= buttonY+buttonH;
    
    if (newRunHovered) {
      ctx.shadowColor = '#ff7a00';
      ctx.shadowBlur = 25;
    }
    
    const btnGrad = ctx.createLinearGradient(newRunX, buttonY, newRunX, buttonY + buttonH);
    if (newRunHovered) {
      btnGrad.addColorStop(0, '#ff9500');
      btnGrad.addColorStop(1, '#ff6600');
    } else {
      btnGrad.addColorStop(0, '#ff7a00');
      btnGrad.addColorStop(1, '#cc5500');
    }
    ctx.fillStyle = btnGrad;
    ctx.fillRect(newRunX, buttonY, buttonW, buttonH);
    
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = newRunHovered ? '#ffb84d' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(newRunX, buttonY, buttonW, buttonH);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 New Run', newRunX + buttonW/2, buttonY + buttonH/2 - 5);
    ctx.font = '10px system-ui, Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Press N', newRunX + buttonW/2, buttonY + buttonH/2 + 12);
    
    ctx.restore();
  }
  // Shop overlay
  if (game.shopOpen) drawShop(ctx, game);
  // Skill tree overlay
  if (game.skillTreeOpen) drawSkillTree(ctx, game);
}

function drawSkillTree(ctx, game) {
  if (!game.skillTreeManager) return;
  
  const { width, height } = game;
  const stm = game.skillTreeManager;
  
  ctx.save();
  ctx.resetTransform();
  
  // Dark overlay with gradient
  const overlayGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.6);
  overlayGrad.addColorStop(0, 'rgba(0,0,0,0.90)');
  overlayGrad.addColorStop(1, 'rgba(0,0,0,0.96)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, width, height);
  
  // Animated pulse
  const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.5;
  
  // Title
  ctx.shadowColor = '#ff7a00';
  ctx.shadowBlur = 20 * pulse;
  ctx.fillStyle = '#ff7a00';
  ctx.font = 'bold 32px system-ui, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SKILL TREE', width/2, 50);
  ctx.shadowBlur = 0;
  
  // Subtitle
  ctx.fillStyle = '#aaa';
  ctx.font = '14px system-ui, Arial';
  ctx.fillText(`Skill Points: ${stm.skillPoints}`, width/2, 75);
  ctx.fillStyle = '#ff5252';
  ctx.font = '12px system-ui, Arial';
  ctx.fillText('⚠️ WARNING: Game continues! You can still be killed!', width/2, 92);
  
  // Back button hints
  if (stm.selectedBranch && stm.unlockedSkills.size === 0) {
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui, Arial';
    ctx.fillText('(Press B or ESC to go back | Press T to close)', width/2, 112);
  } else if (!stm.selectedBranch) {
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui, Arial';
    ctx.fillText('(Press B, ESC, or T to close)', width/2, 112);
  } else {
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui, Arial';
    ctx.fillText('(Press T or ESC to close)', width/2, 112);
  }
  
  // Branch selection area if no branch selected yet
  if (!stm.selectedBranch) {
    ctx.fillStyle = '#ffca28';
    ctx.font = 'bold 20px system-ui, Arial';
    ctx.fillText('Choose Your Path', width/2, 155);
    
    const branchNames = Object.keys(SKILL_TREE.branches);
    const branchW = 220, branchH = 280, gap = 25;
    const startX = width/2 - (branchW * 1.5 + gap);
    const branchY = 200;
    
    for (let i = 0; i < branchNames.length; i++) {
      const branchKey = branchNames[i];
      const branch = SKILL_TREE.branches[branchKey];
      const bx = startX + i * (branchW + gap);
      
      // Check if mouse is hovering
      const isHovered = game.mouse.x >= bx && game.mouse.x <= bx + branchW &&
                        game.mouse.y >= branchY && game.mouse.y <= branchY + branchH;
      
      // Background panel
      if (isHovered) {
        ctx.shadowColor = branch.color;
        ctx.shadowBlur = 20;
      }
      
      const panelGrad = ctx.createLinearGradient(bx, branchY, bx, branchY + branchH);
      panelGrad.addColorStop(0, 'rgba(20, 20, 25, 0.95)');
      panelGrad.addColorStop(1, 'rgba(10, 10, 15, 0.95)');
      ctx.fillStyle = panelGrad;
      ctx.fillRect(bx, branchY, branchW, branchH);
      
      ctx.shadowBlur = 0;
      
      // Border
      ctx.strokeStyle = isHovered ? branch.color : 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeRect(bx, branchY, branchW, branchH);
      
      // Icon
      ctx.font = '48px system-ui, Arial';
      ctx.fillStyle = branch.color;
      ctx.fillText(branch.icon, bx + branchW/2, branchY + 65);
      
      // Name
      ctx.font = 'bold 20px system-ui, Arial';
      ctx.fillStyle = branch.color;
      ctx.fillText(branch.name, bx + branchW/2, branchY + 105);
      
      // Description
      ctx.font = '12px system-ui, Arial';
      ctx.fillStyle = '#ccc';
      ctx.fillText(branch.description, bx + branchW/2, branchY + 130);
      
      // Skill list preview
      ctx.font = '11px system-ui, Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#aaa';
      let skillY = branchY + 160;
      for (let j = 0; j < Math.min(6, branch.skills.length); j++) {
        const skill = branch.skills[j];
        const prefix = skill.ultimate ? '⭐ ' : '• ';
        ctx.fillText(prefix + skill.name, bx + 15, skillY);
        skillY += 19;
      }
      
      ctx.textAlign = 'center';
    }
  } else {
    // Show selected branch tree
    const branch = SKILL_TREE.branches[stm.selectedBranch];
    
    // Branch header
    ctx.fillStyle = branch.color;
    ctx.font = 'bold 26px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${branch.icon} ${branch.name}`, width/2, 150);
    
    ctx.fillStyle = '#aaa';
    ctx.font = '13px system-ui, Arial';
    ctx.fillText(branch.description, width/2, 175);
    
    // Draw skill nodes in tier layout (scaled down)
    const nodeSize = 70;
    const nodeGap = 100;
    const tiers = [[], [], [], []];
    
    // Group skills by tier
    for (const skill of branch.skills) {
      if (skill.tier >= 1 && skill.tier <= 4) {
        tiers[skill.tier - 1].push(skill);
      }
    }
    
    const startY = 230;
    let hoveredSkill = null;
    let hoveredPos = null;
    
    for (let tier = 0; tier < tiers.length; tier++) {
      const skills = tiers[tier];
      if (skills.length === 0) continue;
      
      const tierY = startY + tier * (nodeSize + nodeGap + 30);
      const tierStartX = width/2 - (skills.length - 1) * nodeGap / 2;
      
      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        const nx = tierStartX + i * nodeGap;
        const ny = tierY;
        
        const unlocked = stm.unlockedSkills.has(skill.id);
        const canUnlock = stm.canUnlock(skill.id);
        const isHovered = game.mouse.x >= nx - nodeSize/2 && game.mouse.x <= nx + nodeSize/2 &&
                          game.mouse.y >= ny - nodeSize/2 && game.mouse.y <= ny + nodeSize/2;
        
        // Draw connection lines to requirements
        if (skill.requires && skill.requires.length > 0) {
          ctx.strokeStyle = unlocked ? branch.color : 'rgba(100, 100, 100, 0.3)';
          ctx.lineWidth = 2;
          for (const reqId of skill.requires) {
            // Find required skill position
            for (let t = 0; t < tier; t++) {
              const idx = tiers[t].findIndex(s => s.id === reqId);
              if (idx !== -1) {
                const reqX = width/2 - (tiers[t].length - 1) * nodeGap / 2 + idx * nodeGap;
                const reqY = startY + t * (nodeSize + nodeGap);
                ctx.beginPath();
                ctx.moveTo(reqX, reqY + nodeSize/2);
                ctx.lineTo(nx, ny - nodeSize/2);
                ctx.stroke();
              }
            }
          }
        }
        
        // Node background
        if (isHovered && canUnlock) {
          ctx.shadowColor = branch.color;
          ctx.shadowBlur = 20;
        }
        
        const nodeGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodeSize/2);
        if (unlocked) {
          nodeGrad.addColorStop(0, branch.color + '60');
          nodeGrad.addColorStop(1, branch.color + '20');
        } else if (canUnlock) {
          nodeGrad.addColorStop(0, 'rgba(50, 50, 60, 0.9)');
          nodeGrad.addColorStop(1, 'rgba(30, 30, 40, 0.9)');
        } else {
          nodeGrad.addColorStop(0, 'rgba(30, 30, 30, 0.7)');
          nodeGrad.addColorStop(1, 'rgba(20, 20, 20, 0.7)');
        }
        ctx.fillStyle = nodeGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Node border
        if (unlocked) {
          ctx.strokeStyle = branch.color;
          ctx.lineWidth = 4;
        } else if (canUnlock) {
          ctx.strokeStyle = isHovered ? branch.color : '#666';
          ctx.lineWidth = isHovered ? 3 : 2;
        } else {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
        }
        ctx.stroke();
        
        // Skill name (shortened)
        ctx.fillStyle = unlocked ? '#fff' : canUnlock ? '#ddd' : '#666';
        ctx.font = 'bold 10px system-ui, Arial';
        ctx.textAlign = 'center';
        const nameLines = skill.name.split(' ');
        if (nameLines.length > 2) {
          ctx.fillText(nameLines.slice(0, 2).join(' '), nx, ny - 4);
          ctx.fillText(nameLines.slice(2).join(' '), nx, ny + 8);
        } else {
          ctx.fillText(skill.name, nx, ny);
        }
        
        // Ultimate indicator
        if (skill.ultimate) {
          ctx.font = '16px system-ui, Arial';
          ctx.fillText('⭐', nx, ny - 26);
        }
        
        // Store hovered skill for later rendering
        if (isHovered) {
          hoveredSkill = { skill, unlocked, canUnlock, color: branch.color };
          hoveredPos = { nx, ny, nodeSize };
        }
      }
    }
    
    // Universal skills sidebar
    ctx.fillStyle = 'rgba(20, 20, 25, 0.95)';
    ctx.fillRect(20, 180, 160, height - 200);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 180, 160, height - 200);
    
    ctx.fillStyle = '#90caf9';
    ctx.font = 'bold 12px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Universal Skills', 100, 200);
    
    ctx.textAlign = 'left';
    ctx.font = '10px system-ui, Arial';
    let uniY = 220;
    const universalX = 20;
    const universalW = 160;
    for (const skill of SKILL_TREE.universal) {
      const unlocked = stm.unlockedSkills.has(skill.id);
      const canUnlock = stm.canUnlock(skill.id);
      
      // Check if hovering over this universal skill
      const isUniversalHovered = game.mouse.x >= universalX && game.mouse.x <= universalX + universalW &&
                                  game.mouse.y >= uniY - 12 && game.mouse.y <= uniY + 6;
      
      ctx.fillStyle = unlocked ? '#4caf50' : canUnlock ? '#fff' : '#666';
      ctx.fillText((unlocked ? '✓ ' : canUnlock ? '○ ' : '● ') + skill.name, 30, uniY);
      
      // Store hovered universal skill
      if (isUniversalHovered) {
        hoveredSkill = { skill, unlocked, canUnlock, color: '#90caf9' };
        hoveredPos = { nx: universalX + universalW + 10, ny: uniY - 6, nodeSize: 18 };
      }
      
      uniY += 18;
    }
    
    // Draw tooltip AFTER everything else (on top)
    if (hoveredSkill) {
      const { skill, unlocked, canUnlock, color } = hoveredSkill;
      const { nx, ny, nodeSize } = hoveredPos;
      
      const tooltipW = 220;
      const tooltipH = 65;
      const ttx = nx + nodeSize/2 + 15;
      const tty = ny - tooltipH/2;
      
      // Tooltip background
      ctx.fillStyle = 'rgba(20, 20, 25, 0.98)';
      ctx.fillRect(ttx, tty, tooltipW, tooltipH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(ttx, tty, tooltipW, tooltipH);
      
      // Tooltip text
      ctx.textAlign = 'left';
      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui, Arial';
      ctx.fillText(skill.name, ttx + 10, tty + 18);
      
      ctx.fillStyle = '#ccc';
      ctx.font = '11px system-ui, Arial';
      wrapText(ctx, skill.desc, ttx + 10, tty + 34, tooltipW - 20, 14);
      
      if (canUnlock) {
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 10px system-ui, Arial';
        ctx.fillText('Click to unlock (Cost: 1 SP)', ttx + 10, tty + tooltipH - 8);
      } else if (unlocked) {
        ctx.fillStyle = '#ffca28';
        ctx.font = 'bold 10px system-ui, Arial';
        ctx.fillText('✓ Unlocked', ttx + 10, tty + tooltipH - 8);
      } else {
        ctx.fillStyle = '#888';
        ctx.font = 'bold 10px system-ui, Arial';
        const reason = stm.skillPoints <= 0 ? 'Need more skill points' : 'Unlock requirements first';
        ctx.fillText(reason, ttx + 10, tty + tooltipH - 8);
      }
    }
  }
  
  ctx.restore();
}

// Helper function for text wrapping
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// Handle skill tree clicks
function handleSkillTreeClick() {
  const manager = game.skillTreeManager;
  if (!manager) return;
  
  const mx = game.mouse.x;
  const my = game.mouse.y;
  
  // Branch selection (if no branch chosen yet)
  if (!manager.selectedBranch) {
    const branches = ['tank', 'dps', 'support'];
    const cardWidth = 220;
    const cardHeight = 280;
    const gap = 25;
    const startX = (canvas.width - (cardWidth * 3 + gap * 2)) / 2;
    const startY = 200;
    
    for (let i = 0; i < branches.length; i++) {
      const x = startX + i * (cardWidth + gap);
      const y = startY;
      
      if (mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight) {
        manager.selectedBranch = branches[i];
        console.log('Selected branch:', branches[i]);
        break;
      }
    }
    return;
  }
  
  // Skill node clicks (when branch is selected)
  const nodeRadius = 35;
  const nodeSize = 70;
  const nodeGap = 100;
  const startY = 230;
  
  // Organize skills by tier
  const tiers = [[], [], [], []];
  const branchSkills = SKILL_TREE.branches[manager.selectedBranch];
  for (const skill of branchSkills) {
    if (skill.tier >= 1 && skill.tier <= 4) {
      tiers[skill.tier - 1].push(skill);
    }
  }
  
  // Check each tier's skills
  for (let tier = 0; tier < tiers.length; tier++) {
    const skills = tiers[tier];
    if (skills.length === 0) continue;
    
    const tierY = startY + tier * (nodeSize + nodeGap + 10);
    const tierStartX = canvas.width / 2 - (skills.length - 1) * nodeGap / 2;
    
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const nx = tierStartX + i * nodeGap;
      const ny = tierY;
      
      const dist = Math.sqrt((mx - nx) ** 2 + (my - ny) ** 2);
      if (dist <= nodeRadius) {
        if (manager.canUnlock(skill.id)) {
          manager.unlockSkill(skill.id);
          console.log('Unlocked skill:', skill.name);
        } else {
          console.log('Cannot unlock skill:', skill.name, '- Check requirements or skill points');
        }
        return;
      }
    }
  }
  
  // Check universal skills (left sidebar) - just check text clicks
  const universalX = 20;
  const universalW = 160;
  const universalStartY = 220;
  const universalSpacing = 18;
  
  for (let i = 0; i < SKILL_TREE.universal.length; i++) {
    const skill = SKILL_TREE.universal[i];
    const y = universalStartY + i * universalSpacing;
    
    if (mx >= universalX && mx <= universalX + universalW && my >= y - 12 && my <= y + 6) {
      if (manager.canUnlock(skill.id)) {
        manager.unlockSkill(skill.id);
        console.log('Unlocked universal skill:', skill.name);
      } else {
        console.log('Cannot unlock skill:', skill.name, '- Check requirements or skill points');
      }
      return;
    }
  }
}

function drawFullMap(ctx, game) {
  ctx.save(); ctx.resetTransform();
  // Dark background
  ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0,0,game.width,game.height);
  
  // Title
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = '24px system-ui, Segoe UI, Arial'; 
  ctx.fillText(`Map - Layer ${game.currentLayer}`, game.width/2, 40);
  ctx.font = '12px system-ui, Segoe UI, Arial'; 
  ctx.fillText('Press M or ESC to close', game.width/2, 60);
  
  // Calculate bounds of all discovered rooms
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [key, room] of game.rooms) {
    if (!room.discovered) continue;
    minX = Math.min(minX, room.x); maxX = Math.max(maxX, room.x);
    minY = Math.min(minY, room.y); maxY = Math.max(maxY, room.y);
  }
  
  // Room tile size and centering
  const tileSize = 48;
  const mapWidth = (maxX - minX + 1) * tileSize;
  const mapHeight = (maxY - minY + 1) * tileSize;
  const offsetX = (game.width - mapWidth) / 2;
  const offsetY = (game.height - mapHeight) / 2 + 30;
  
  // Get current room coordinates
  const [crx, cry] = game.currentRoomKey.split(',').map(Number);
  
  // Draw rooms and connections
  for (const [key, room] of game.rooms) {
    if (!room.discovered) continue;
    
    const x = (room.x - minX) * tileSize + offsetX;
    const y = (room.y - minY) * tileSize + offsetY;
    
    // Room color based on type
    const roomColors = {
      start: '#4caf50', boss: '#ff5252', trader: '#29b6f6', 
      chest: '#ffca28', treasure: '#ffca28', weapon_room: '#ba68c8',
      mystery: '#9c27b0', trap: '#ff7043', combat: '#90a4ae',
      dark_chamber: '#263238', bright_hall: '#eceff1'
    };
    const color = roomColors[room.type] || '#78909c';
    
    // Current room highlight
    const isCurrent = room.x === crx && room.y === cry;
    if (isCurrent) {
      ctx.fillStyle = '#ffeb3b'; ctx.globalAlpha = 0.4;
      ctx.fillRect(x - 4, y - 4, tileSize + 8, tileSize + 8);
      ctx.globalAlpha = 1.0;
    }
    
    // Room tile
    ctx.fillStyle = color;
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.strokeStyle = room.cleared ? '#4caf50' : '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, tileSize, tileSize);
    
    // Draw door connections (thin lines between rooms)
    const doorLength = tileSize / 3;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
    if (room.doors.n) { const nx = x + tileSize/2, ny = y; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx, ny - doorLength); ctx.stroke(); }
    if (room.doors.s) { const sx = x + tileSize/2, sy = y + tileSize; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + doorLength); ctx.stroke(); }
    if (room.doors.w) { const wx = x, wy = y + tileSize/2; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - doorLength, wy); ctx.stroke(); }
    if (room.doors.e) { const ex = x + tileSize, ey = y + tileSize/2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + doorLength, ey); ctx.stroke(); }
    
    // Room type icon
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '20px system-ui';
    const icons = {
      start: '🏠', boss: '💀', trader: '🛒', chest: '📦', treasure: '💰',
      weapon_room: '⚔️', mystery: '❓', trap: '⚠️'
    };
    const icon = icons[room.type] || '';
    if (icon) ctx.fillText(icon, x + tileSize/2, y + tileSize/2 + 8);
  }
  
  // Legend at bottom
  ctx.textAlign = 'left'; ctx.font = '11px system-ui, Segoe UI, Arial';
  const legendY = game.height - 80;
  const legendX = game.width/2 - 200;
  ctx.fillStyle = '#aaa';
  const legend = [
    '🏠 Start  💀 Boss  🛒 Trader  💰 Treasure  ⚔️ Weapon  ❓ Mystery  ⚠️ Trap',
    'Green border = Cleared  Yellow highlight = Current room'
  ];
  legend.forEach((txt, i) => ctx.fillText(txt, legendX, legendY + i * 16));
  
  ctx.restore();
}

function handleLevelChoice(idx){
  if (!game.levelUpChoices) return;
  const choice = game.levelUpChoices[idx]; if (!choice) return;
  applyLevelUp(game.player, choice.key); game.levelUpChoices = null;
}

function handleShopChoice(idx){
  const shop = game.shopOpen; if (!shop) return; const offer = shop.items[idx]; if (!offer) return;
  if (game.coins < offer.price) { game.promptTimed('Not enough coins', 1.0); return; }
  game.coins -= offer.price;
  if (offer.type === 'weapon') { game.player.giveWeapon(offer.item); game.promptTimed(`Bought ${offer.item.name}`, 1.5); }
  else if (offer.type === 'powerup') {
    const eff = offer.item.apply(game.player);
    game.player.addBuff(eff.prop, eff.val, eff.dur);
    game.promptTimed(`Power-up: ${offer.item.title}`, 1.5);
  } else if (offer.type === 'heal') {
    game.player.heal(offer.item.hp); game.promptTimed(`Healed +${offer.item.hp}`, 1.2);
  } else if (offer.type === 'reroll') {
    // reroll current shop inventory
    shop.items = traderInventory(); game.promptTimed('Shop rerolled', 1.0);
    return; // don't close or remove
  } else if (offer.type === 'permanent') {
    offer.item.apply(game.player); game.promptTimed(`${offer.item.title}`, 1.5);
  }
  shop.items.splice(idx,1);
  if (shop.items.length === 0) game.shopOpen = null;
}

// Explosion helper (area damage + feedback)
function triggerExplosion(x, y, radius, dmg){
  // Damage enemies
  for (const e of game.enemies) {
    if (e.dead) continue; if (dist2(x,y,e.x,e.y) <= radius*radius) e.damage(dmg, game);
  }
  // Damage player
  if (dist2(x, y, game.player.x, game.player.y) <= radius*radius) {
    game.player.damage(dmg, game);
  }
  // Chain reaction: explode nearby barrels
  const currentRoom = game.rooms.get(game.currentRoomKey);
  if (currentRoom && currentRoom.contents) {
    for (const prop of currentRoom.contents.props) {
      if (prop.broken || !prop.explosive) continue;
      if (dist2(x, y, prop.x, prop.y) <= radius*radius) {
        prop.damage(999);
        if (prop.pendingExplosion) {
          // Delay chain explosions slightly to create a cascade effect
          setTimeout(() => {
            if (!prop.broken) return; // safety check
            triggerExplosion(prop.x, prop.y, prop.pendingExplosion.r, prop.pendingExplosion.dmg);
            prop.pendingExplosion = null;
          }, 100);
        }
      }
    }
  }
  game.audio.explosion(); game.camera.shake = Math.max(game.camera.shake, 12); game.hitPause = Math.max(game.hitPause, 0.08);
  spawnExplosion(game.rooms.get(game.currentRoomKey), x, y);
}

function drawDoorMarkers(ctx, room){
  const W = room.w, H = room.h;
  const pulse = Math.max(0, room.doorPulse || 0);
  // Check if room should be locked (has enemies) - use game.enemies which is the active list
  const hasEnemies = game.enemies && game.enemies.length > 0;
  const shouldBeLocked = room.locked || hasEnemies;
  
  // Draw doors with SVG images
  const drawDoor = (x, y, isVertical) => {
    ctx.save();
    const doorImg = shouldBeLocked
      ? (isVertical ? DOOR_CLOSED_V : DOOR_CLOSED_H)
      : (isVertical ? DOOR_OPEN_V : DOOR_OPEN_H);
    // Vertical doors (N/S) - wider, horizontal doors (E/W) - taller
    const w = isVertical ? 160 : 40;
    const h = isVertical ? 40 : 160;
    if (doorImg.complete) {
      ctx.drawImage(doorImg, x - w/2, y - h/2, w, h);
      // Add glow effect for unlocked doors
      if (!shouldBeLocked && pulse > 0) {
        ctx.globalAlpha = pulse * 0.5;
        ctx.strokeStyle = '#ffca28';
        ctx.lineWidth = 3 + pulse * 6;
        ctx.strokeRect(x - w/2, y - h/2, w, h);
      }
    }
    ctx.restore();
  };
  if (room.doors.n) drawDoor(W/2, 20, true);
  if (room.doors.s) drawDoor(W/2, H-20, true);
  if (room.doors.w) drawDoor(20, H/2, false);
  if (room.doors.e) drawDoor(W-20, H/2, false);

  // draw simple barrier bars over doorways while locked - BLOCKS MOVEMENT
  if (shouldBeLocked) {
    ctx.save(); ctx.fillStyle='rgba(255,82,82,0.9)';
    const lw = 8, len = 80;
    if (room.doors.n) ctx.fillRect(W/2 - len/2, 15, len, lw);
    if (room.doors.s) ctx.fillRect(W/2 - len/2, H-23, len, lw);
    if (room.doors.w) ctx.fillRect(15, H/2 - len/2, lw, len);
    if (room.doors.e) ctx.fillRect(W-23, H/2 - len/2, lw, len);
    ctx.restore();
  } else if (room.unlockAnim && room.unlockAnim > 0) {
    // dissolve animation: fading bars and gold sparkles
    const t = room.unlockAnim;
    ctx.save(); ctx.globalAlpha = t; ctx.fillStyle='rgba(255,202,40,0.6)';
    const lw = 4, len = 84;
    if (room.doors.n) ctx.fillRect(W/2 - len/2, 18, len, lw);
    if (room.doors.s) ctx.fillRect(W/2 - len/2, H-22, len, lw);
    if (room.doors.w) ctx.fillRect(18, H/2 - len/2, lw, len);
    if (room.doors.e) ctx.fillRect(W-22, H/2 - len/2, lw, len);
    ctx.restore();
    room.unlockAnim = Math.max(0, room.unlockAnim - 1/30);
  }
}

// Particles
class Particle {
  constructor(x,y,vx,vy,life, color, size=2){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.life=life; this.color=color; this.size=size; this.t=0; }
  update(dt){ this.t+=dt; this.x+=this.vx*dt; this.y+=this.vy*dt; this.vx*=0.98; this.vy*=0.98; }
  draw(ctx){ const a=Math.max(0,1-this.t/this.life); if(a<=0) return; ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); ctx.restore(); }
}

class TextParticle {
  constructor(x,y,text,color='#fff',life=0.9){ this.x=x; this.y=y; this.text=text; this.color=color; this.life=life; this.t=0; this.vx=(Math.random()-0.5)*40; this.vy=-60 - Math.random()*40; }
  update(dt){ this.t+=dt; this.x+=this.vx*dt; this.y+=this.vy*dt; this.vx*=0.98; this.vy+=20*dt; }
  draw(ctx){ const a=Math.max(0,1-this.t/this.life); if(a<=0) return; ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=this.color; ctx.font='14px system-ui, Segoe UI, Arial'; ctx.textAlign='center'; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
}

const MAX_PARTICLES = 300; // reduced from 450 for better performance
function spawnHitSparks(x,y,color){ 
  let n = (game.lowFx? 3:6) * game.fxScale; // reduced from 4:8
  n = Math.max(2, Math.floor(n)); 
  for(let i=0;i<n && game.particles.length<MAX_PARTICLES;i++){ 
    const a=Math.random()*Math.PI*2; 
    const s=120+Math.random()*180; 
    game.particles.push(new Particle(x,y,Math.cos(a)*s,Math.sin(a)*s,0.25+Math.random()*0.2,color,1.5)); 
  } 
}
function spawnDeathBurst(x,y,color){ 
  let n = (game.lowFx? 8:14) * game.fxScale; // reduced from 10:18
  n = Math.max(5, Math.floor(n)); 
  for(let i=0;i<n && game.particles.length<MAX_PARTICLES;i++){ 
    const a=Math.random()*Math.PI*2; 
    const s=100+Math.random()*260; 
    game.particles.push(new Particle(x,y,Math.cos(a)*s,Math.sin(a)*s,0.5+Math.random()*0.4,color,2.2)); 
  } 
}
function spawnExplosion(room,x,y){ 
  let n = (game.lowFx? 12:22) * game.fxScale; // reduced from 16:28
  n = Math.max(8, Math.floor(n)); 
  for(let i=0;i<n && game.particles.length<MAX_PARTICLES;i++){ 
    const a=Math.random()*Math.PI*2; 
    const s=160+Math.random()*320; 
    game.particles.push(new Particle(x,y,Math.cos(a)*s,Math.sin(a)*s,0.6+Math.random()*0.5,'#ffca28',2.6)); 
  } 
}
function spawnFloatText(txt,x,y,color){ game.particles.push(new TextParticle(x + (Math.random()-0.5)*12, y - 12, txt, color)); }

function drawCrosshair(ctx){
  const x = game.mouse.worldX, y = game.mouse.worldY;
  ctx.save(); ctx.strokeStyle = game.player.dashCd<=0 && game.player.stamina>=25 ? '#00e676' : '#ffffffaa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x-8,y); ctx.lineTo(x-2,y); ctx.moveTo(x+2,y); ctx.lineTo(x+8,y);
  ctx.moveTo(x,y-8); ctx.lineTo(x,y-2); ctx.moveTo(x,y+2); ctx.lineTo(x,y+8); ctx.stroke();
  ctx.restore();
}

async function newRun(){
  // Return to home screen for difficulty selection
  game.started = false;
  game.paused = false;
  game.dead = false;
  game.shopOpen = null;
  game.levelUpChoices = null;
  
  // Show the overlay again
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.classList.add('visible');
    overlay.style.pointerEvents = 'all';
  }
  
  console.log('[newRun] Returned to home screen for difficulty selection');
}

async function nextLevel(){
  console.log('[nextLevel] Starting transition to depth', game.depth + 1);
  // preserve player stats/items/coins; just move to a new dungeon
  game.depth += 1;
  // clear dynamic state
  game.projectiles.length=0; game.enemyProjectiles.length=0; game.enemies.length=0; game.particles.length=0;
  game.shopOpen = null; game.levelUpChoices = null; game.paused = false; game.dead = false;
  
  // generate new level with scaling room count based on depth
  console.log('[nextLevel] Generating new dungeon...');
  game.dungeon = new Dungeon().generateCount(6, 10, game.depth);
  game.rooms = game.dungeon.rooms; 
  game.currentRoomKey = game.dungeon.start;
  
  console.log('[nextLevel] New dungeon created, start room:', game.currentRoomKey);
  const startRoom = game.rooms.get(game.currentRoomKey);
  if (!startRoom) {
    console.error('[nextLevel] ERROR: Start room not found!');
    return;
  }
  
  // refill stamina a bit
  game.player.stamina = Math.min(game.player.maxStamina, game.player.stamina + 40);
  game.player.vx = 0; game.player.vy = 0;
  
  // enterRoom will handle positioning, spawning, and camera
  console.log('[nextLevel] Entering start room...');
  await enterRoom(game.currentRoomKey);
  game.camera.shake = 8;
  game.promptTimed(`Entering level ${game.depth}`, 1.6);
  console.log('[nextLevel] Transition complete');
}

// (Particles are updated inside tick; no wrapper overrides required.)
