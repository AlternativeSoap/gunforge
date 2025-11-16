// loot.js
// Coins, chests, upgrade choices, and trader inventory.

import { WEAPONS, ITEMS, pick, randRange } from './data.js';

export class Coin {
  constructor(x, y, v = 1) { this.x = x; this.y = y; this.v = v; this.r = 6; this.t = 0; }
  update(dt, game) { this.t += dt; }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#795548'; ctx.fillRect(this.x-2, this.y-3, 4, 6);
    ctx.restore();
  }
}

export class ItemPickup {
  constructor(x, y, itemId) {
    this.x = x; 
    this.y = y; 
    this.itemId = itemId;
    const item = ITEMS.find(i => i.id === itemId) || ITEMS[0];
    this.item = item;
    this.r = 12;
    this.t = 0;
    this.prompt = `E: ${item.name}`;
    this.type = 'item_pickup';
  }
  
  update(dt, game) { 
    this.t += dt; 
  }
  
  draw(ctx) {
    const pulse = 0.8 + Math.sin(this.t * 4) * 0.2;
    
    // Glow effect
    ctx.save();
    ctx.shadowColor = this.item.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.item.color;
    ctx.globalAlpha = 0.6 * pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Item circle
    ctx.save();
    ctx.fillStyle = this.item.color;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    
    // Item icon
    ctx.save();
    ctx.font = '20px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.item.icon, this.x, this.y);
    ctx.restore();
  }
  
  pickup(game) {
    game.player.addItem(this.itemId);
    game.promptTimed(`Picked up: ${this.item.name}`, 2.0);
    game.audio.pickup();
  }
}

export class Chest {
  constructor(x, y, rarity = 'uncommon') {
    this.x = x; this.y = y; this.rarity = rarity; this.r = 14; this.opened = false; this.prompt = 'E: Open chest';
  }
  open(game) {
    if (this.opened) return;
    this.opened = true; game.audio.playChest();
    // Drop weapon on ground or give coins
    if (Math.random() < 0.6) {
      const w = sampleWeaponByRarity(this.rarity);
      // Create weapon pickup on ground instead of auto-equipping
      const room = game.rooms.get(game.currentRoomKey);
      room.contents.loot.push({
        type: 'weapon_pickup',
        weapon: w,
        x: this.x,
        y: this.y
      });
      game.promptTimed(`${w.name} dropped!`, 2.0);
    } else {
      const c = 5 + Math.floor(Math.random()*11);
      game.coins += c; game.promptTimed(`+${c} coins`, 1.5);
    }
  }
  draw(ctx) {
    const img = getChestImg(this.opened);
    if (img && img.complete) {
      ctx.drawImage(img, this.x-20, this.y-20, 40, 40);
    } else {
      // fallback simple draw
      ctx.save();
      ctx.fillStyle = this.opened ? '#8d6e63' : '#6d4c41';
      ctx.fillRect(this.x-16, this.y-12, 32, 24);
      ctx.fillStyle = this.opened ? '#cfd8dc' : '#ffca28'; ctx.fillRect(this.x-4, this.y-6, 8, 12);
      ctx.restore();
    }
  }
}

export class CoinChest extends Chest {
  constructor(x, y, min=8, max=24) {
    super(x, y, 'common'); this.min = min; this.max = max; this.prompt = 'E: Open coin chest';
  }
  open(game){
    if (this.opened) return; this.opened = true; game.audio.playChest();
    const c = this.min + Math.floor(Math.random()*(this.max-this.min+1));
    game.coins += c; game.promptTimed(`+${c} coins`, 1.6);
  }
}

export class GoldenChest extends Chest {
  constructor(x, y) {
    super(x, y, 'legendary'); 
    this.isGolden = true;
    this.prompt = 'E: Open Golden Chest';
  }
  open(game) {
    if (this.opened) return;
    this.opened = true; 
    game.audio.playChest();
    
    // High coin reward (50-100 coins)
    const coins = 50 + Math.floor(Math.random() * 51);
    game.coins += coins;
    game.promptTimed(`+${coins} COINS!`, 2.5);
    
    // Guaranteed high-rarity weapon (epic or legendary)
    const highRarityWeapons = WEAPONS.filter(w => w.rarity === 'epic' || w.rarity === 'legendary');
    const weapon = highRarityWeapons[Math.floor(Math.random() * highRarityWeapons.length)] || WEAPONS[0];
    
    const room = game.rooms.get(game.currentRoomKey);
    room.contents.loot.push({
      type: 'weapon_pickup',
      weapon: weapon,
      x: this.x,
      y: this.y - 30
    });
    game.promptTimed(`${weapon.name} obtained!`, 2.5);
    
    // Visual effect
    game.camera.shake = Math.max(game.camera.shake, 12);
  }
  draw(ctx) {
    // Draw pulsing golden glow
    const pulse = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20 * pulse;
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw golden chest using special SVG
    const goldenImg = getGoldenChestImg(this.opened);
    if (goldenImg && goldenImg.complete) {
      ctx.drawImage(goldenImg, this.x - 30, this.y - 30, 60, 60);
    } else {
      // Fallback golden chest
      ctx.save();
      ctx.fillStyle = this.opened ? '#b8860b' : '#ffd700';
      ctx.fillRect(this.x - 20, this.y - 16, 40, 32);
      ctx.fillStyle = '#fff8dc';
      ctx.fillRect(this.x - 6, this.y - 8, 12, 16);
      ctx.strokeStyle = '#ffecb3';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - 20, this.y - 16, 40, 32);
      ctx.restore();
    }
  }
}

export class HiddenChest extends Chest {
  constructor(x, y, rarity = 'rare') {
    super(x, y, rarity);
    this.isHidden = true;
    this.revealed = false;
    this.prompt = 'E: Open Hidden Chest';
  }
  
  updateVisibility(playerX, playerY, lightRadius = 200) {
    // Reveal chest when player gets close
    const dist = Math.hypot(playerX - this.x, playerY - this.y);
    if (dist < lightRadius && !this.revealed) {
      this.revealed = true;
    }
  }
  
  draw(ctx) {
    // Only draw if revealed or very close
    if (!this.revealed && !this.opened) {
      // Draw very faint outline for close proximity
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 16, this.y - 12, 32, 24);
      ctx.restore();
      return;
    }
    
    // Draw with revealing glow effect when first found
    if (this.revealed && !this.wasRevealed) {
      this.wasRevealed = true;
      // Pulse effect
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.save();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 15 * pulse;
      ctx.globalAlpha = 0.8;
    }
    
    // Draw normal chest
    super.draw(ctx);
    
    if (this.revealed && !this.wasRevealed) {
      ctx.restore();
    }
  }
}

export function traderInventory() {
  // two random weapons, one timed powerup, plus utility (heal/reroll) and a permanent upgrade
  const items = [];
  const w1 = pick(WEAPONS), w2 = pick(WEAPONS);
  items.push({ type: 'weapon', item: w1, price: 30 + Math.floor(randRange(0, 50)) });
  items.push({ type: 'weapon', item: w2, price: 30 + Math.floor(randRange(0, 50)) });
  // timed powerup
  const powerups = [
    { key:'dmg', title:'+25% Damage (2m)', apply:(p)=>({prop:'dmgMult', val:1.25, dur:120}) },
    { key:'firerate', title:'+20% Fire Rate (2m)', apply:(p)=>({prop:'fireRateMult', val:1.2, dur:120}) },
    { key:'speed', title:'+20% Move Speed (2m)', apply:(p)=>({prop:'speedMult', val:1.2, dur:120}) },
    { key:'regen', title:'+50% Stamina Regen (2m)', apply:(p)=>({prop:'staminaRegenMult', val:1.5, dur:120}) },
    { key:'crit', title:'+10% Crit Chance (1m)', apply:(p)=>({prop:'critChance', val:1.1, dur:60}) },
  ];
  const pu = pick(powerups);
  items.push({ type: 'powerup', item: pu, price: 45 + Math.floor(randRange(0, 40)) });
  // utility
  items.push({ type: 'heal', item: {hp: 60, title:'Heal +60 HP'}, price: 25 });
  items.push({ type: 'reroll', item: {title:'Reroll Shop'}, price: 20 });
  // permanent upgrade
  const perms = [
    { key:'perm_dmg', title:'Permanent +8% Damage', apply:(p)=>{ p.dmgMultBase = (p.dmgMultBase||1)*1.08; } },
    { key:'perm_rate', title:'Permanent +8% Fire Rate', apply:(p)=>{ p.fireRateMultBase = (p.fireRateMultBase||1)*1.08; } },
    { key:'perm_speed', title:'Permanent +8% Move Speed', apply:(p)=>{ p.speedMultBase = (p.speedMultBase||1)*1.08; } },
  ];
  items.push({ type: 'permanent', item: pick(perms), price: 60 + Math.floor(randRange(0, 30)) });
  // limit to 5 visible (we'll still allow drawing 3 cards; surplus will be sold out in overlay positions if any)
  return items.slice(0,5);
}

// Skill pool for level-ups: pick 3 each time
const SKILLS = [
  { key:'hp', title:'Max Health +20', desc:'Increase survivability (heal +20 now).', apply:(p)=>{ p.maxHp+=20; p.hp = Math.min(p.maxHp, p.hp+20); } },
  { key:'stamina', title:'Max Stamina +25', desc:'Dash more often. Stamina regen +5.', apply:(p)=>{ p.maxStamina+=25; p.staminaRegen+=5; } },
  { key:'damage', title:'Damage +12%', desc:'All weapons deal more damage.', apply:(p)=>{ p.dmgMultBase = (p.dmgMultBase||1)*1.12; } },
  { key:'firerate', title:'Fire Rate +12%', desc:'Shoot faster across weapons.', apply:(p)=>{ p.fireRateMultBase = (p.fireRateMultBase||1)*1.12; } },
  { key:'movespeed', title:'Move Speed +12%', desc:'Strafe and dodge faster.', apply:(p)=>{ p.speedMultBase = (p.speedMultBase||1)*1.12; } },
  { key:'stamregen', title:'Stamina Regen +25%', desc:'Recover stamina quicker.', apply:(p)=>{ p.staminaRegenMultBase = (p.staminaRegenMultBase||1)*1.25; } },
  { key:'crit', title:'Crit Chance +6%', desc:'Chance to deal x1.8 damage.', apply:(p)=>{ p.critChance = (p.critChance||0) + 0.06; p.critMult = Math.max(p.critMult||1.5, 1.8); } },
  { key:'lifesteal', title:'Lifesteal +2%', desc:'Heal a portion of damage dealt.', apply:(p)=>{ p.lifesteal = (p.lifesteal||0) + 0.02; } },
  { key:'pierce', title:'Pierce +1', desc:'Bullets pierce one extra enemy.', apply:(p)=>{ p.pierceBonus = (p.pierceBonus||0) + 1; } },
  { key:'bullet', title:'Bullet Size +15%', desc:'Larger bullets are easier to hit.', apply:(p)=>{ p.bulletSizeMultBase = (p.bulletSizeMultBase||1)*1.15; } },
  { key:'dash', title:'Dash Cooldown -15%', desc:'Dash more frequently.', apply:(p)=>{ p.dashCd = Math.max(0.15, (p.dashCd||0.45) * 0.85); } },
];

export function levelUpChoices() {
  // random 3 without replacement
  const pool = [...SKILLS]; const out = [];
  for (let i=0;i<3;i++) { const idx = Math.floor(Math.random()*pool.length); out.push(pool.splice(idx,1)[0]); }
  return out;
}

export function applyLevelUp(player, key) {
  const s = SKILLS.find(s=>s.key===key); if (s) s.apply(player);
}

function sampleWeaponByRarity(r) {
  // Weighted rarity selection - much lower chance for epic/legendary
  const rarityWeights = {
    common: 50,
    uncommon: 30,
    rare: 15,
    epic: 4,
    legendary: 1
  };
  
  // If specific rarity requested, filter by that
  if (r && r !== 'uncommon') {
    const pool = WEAPONS.filter(w => w.rarity === r);
    return pool.length ? pick(pool) : pick(WEAPONS);
  }
  
  // Otherwise use weighted random for 'uncommon' or default chest rarity
  const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  
  let selectedRarity = 'common';
  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    roll -= weight;
    if (roll <= 0) {
      selectedRarity = rarity;
      break;
    }
  }
  
  const pool = WEAPONS.filter(w => w.rarity === selectedRarity);
  return pool.length ? pick(pool) : pick(WEAPONS);
}

// Chest images cache
const CHEST_ICONS = { closed: null, open: null, golden_closed: null, golden_open: null };
function getChestImg(opened){
  const key = opened ? 'open' : 'closed';
  if (!CHEST_ICONS[key]) { const img = new Image(); img.src = `assets/img/chest_${key}.svg`; CHEST_ICONS[key] = img; }
  return CHEST_ICONS[key];
}
function getGoldenChestImg(opened){
  const key = opened ? 'golden_open' : 'golden_closed';
  if (!CHEST_ICONS[key]) { 
    const img = new Image(); 
    img.src = `assets/img/chest_${key}.svg`; 
    img.onerror = () => { CHEST_ICONS[key] = getChestImg(opened); }; // Fallback to normal chest
    CHEST_ICONS[key] = img; 
  }
  return CHEST_ICONS[key];
}
