// data.js
// Centralized constants, palettes, weapon templates, and helpers.

export const GAME = {
  roomSize: { w: 1600, h: 1200 }, // default logical room size for camera
  tile: 64,
  gravity: 0, // top-down
  difficulty: 'medium', // easy, medium, hard, nightmare
};

// Difficulty multipliers
export const DIFFICULTY = {
  easy: {
    playerHp: 1.5,
    playerDamage: 1.3,
    enemyHp: 0.7,
    enemyDamage: 0.7,
    enemySpeed: 0.8,
    enemyCount: 0.6,
    dropRate: 1.5,
    coinMult: 1.5,
    lootChance: 1.5,
    trapChance: 0.7,
    treasureChance: 1.3,
    staminaMult: 1.2,
    telegraphMult: 1.25
  },
  medium: {
    playerHp: 1.0,
    playerDamage: 1.0,
    enemyHp: 1.0,
    enemyDamage: 1.0,
    enemySpeed: 1.0,
    enemyCount: 1.0,
    dropRate: 1.0,
    coinMult: 1.0,
    lootChance: 1.0,
    trapChance: 1.0,
    treasureChance: 1.0,
    staminaMult: 1.0,
    telegraphMult: 1.0
  },
  hard: {
    playerHp: 0.8,
    playerDamage: 0.9,
    enemyHp: 1.4,
    enemyDamage: 1.3,
    enemySpeed: 1.1,
    enemyCount: 1.4,
    dropRate: 0.7,
    coinMult: 0.7,
    lootChance: 0.7,
    trapChance: 1.3,
    treasureChance: 0.7,
    staminaMult: 0.85,
    telegraphMult: 0.75
  },
  nightmare: {
    playerHp: 0.5,
    playerDamage: 0.8,
    enemyHp: 2.0,
    enemyDamage: 1.8,
    enemySpeed: 1.3,
    enemyCount: 2.0,
    dropRate: 0.5,
    coinMult: 0.5,
    lootChance: 0.5,
    trapChance: 1.7,
    treasureChance: 0.4,
    staminaMult: 0.65,
    telegraphMult: 0.6
  },
};

// Different room sizes based on shape
export const ROOM_SIZES = {
  rect: { w: 1600, h: 1200 },    // standard square-ish room
  long: { w: 2200, h: 900 },     // wide corridor
  circle: { w: 1400, h: 1400 },  // compact circular arena
  hall: { w: 2400, h: 1000 },    // long hallway
  tiny: { w: 900, h: 800 },      // small cramped room
  compact: { w: 1200, h: 1000 }, // medium-small room
  large: { w: 2000, h: 1600 },   // spacious room
  huge: { w: 2600, h: 2000 },    // very large arena
  narrow: { w: 800, h: 1800 },   // tall narrow room
  wide: { w: 2800, h: 1000 },    // extra wide room
  cavern: { w: 2400, h: 2200 },  // massive cave-like space
  chamber: { w: 1800, h: 1800 }, // square chamber
  vault: { w: 1400, h: 900 },    // treasure vault size
  arena: { w: 2200, h: 2200 },   // square arena for bosses
};

// Color palettes for floors (procedural themes)
export const PALETTES = {
  rust: {
    bg: '#120e0c',
    acc1: '#f07e1d',
    acc2: '#713c21',
    fog: 'rgba(255,131,55,0.06)'
  },
  neon: {
    bg: '#0b0f16',
    acc1: '#29b6f6',
    acc2: '#01579b',
    fog: 'rgba(23,162,255,0.06)'
  },
  void: {
    bg: '#0a0713',
    acc1: '#ae52d4',
    acc2: '#4a148c',
    fog: 'rgba(174,82,212,0.06)'
  }
};

export const RARITY = {
  common: { color: '#9e9e9e', glow: 'rgba(158, 158, 158, 0.4)', mult: 0.7, name: 'Common' },
  uncommon: { color: '#4caf50', glow: 'rgba(76, 175, 80, 0.4)', mult: 1.0, name: 'Uncommon' },
  rare: { color: '#2196f3', glow: 'rgba(33, 150, 243, 0.5)', mult: 1.4, name: 'Rare' },
  epic: { color: '#9c27b0', glow: 'rgba(156, 39, 176, 0.5)', mult: 2.0, name: 'Epic' },
  legendary: { color: '#ff9800', glow: 'rgba(255, 152, 0, 0.6)', mult: 3.0, name: 'Legendary' },
  magical: { color: '#f50057', glow: 'rgba(245, 0, 87, 0.7)', mult: 4.5, name: 'Magical' },
};

// Passive item system - power-ups that stack
export const ITEMS = [
  { id: 'damage_boost', name: 'Molten Core', desc: '+15% Damage', icon: '💥', color: '#ff5252', effect: { damageBonus: 0.15 } },
  { id: 'speed_boots', name: 'Speed Boots', desc: '+20% Speed', icon: '👟', color: '#4fc3f7', effect: { speedBonus: 0.20 } },
  { id: 'vampire_fang', name: 'Vampire Fang', desc: '+5% Lifesteal', icon: '🦷', color: '#d32f2f', effect: { lifesteal: 0.05 } },
  { id: 'armor_plate', name: 'Armor Plate', desc: '+10% DR', icon: '🛡️', color: '#78909c', effect: { damageReduction: 0.10 } },
  { id: 'crit_lens', name: 'Critical Lens', desc: '+8% Crit', icon: '🎯', color: '#ffca28', effect: { critChance: 0.08 } },
  { id: 'fire_rate', name: 'Hair Trigger', desc: '+12% Fire Rate', icon: '⚡', color: '#ffa726', effect: { fireRateBonus: 0.12 } },
  { id: 'health_up', name: 'Heart Container', desc: '+25 Max HP', icon: '❤️', color: '#e57373', effect: { maxHpBonus: 25 } },
  { id: 'bullet_bank', name: 'Bullet Bank', desc: '+1 Bullets', icon: '📦', color: '#ffd54f', effect: { bulletBonus: 1 } },
  { id: 'pierce', name: 'Sharp Rounds', desc: '+1 Pierce', icon: '🔸', color: '#00bcd4', effect: { pierceBonus: 1 } },
  { id: 'knockback', name: 'Force Amplifier', desc: '+30% Knockback', icon: '💨', color: '#b0bec5', effect: { knockbackBonus: 0.30 } },
  { id: 'dodge', name: 'Dodge Matrix', desc: '+5% Dodge', icon: '👁️', color: '#9c27b0', effect: { dodgeChance: 0.05 } },
  { id: 'regen', name: 'Regen Module', desc: '+0.5 HP/s', icon: '💚', color: '#66bb6a', effect: { healthRegen: 0.5 } },
];

// Balanced weapon templates - DPS tuned by rarity
export const WEAPONS = [
  // Common tier (DPS ~25-35)
  { id: 'pistol', name: 'Rust Pistol', damage: 18, fireRate: 2.5, spread: 3, speed: 950, bullets: 1, knock: 150, color: '#ffad66', rarity: 'common', projectile: 'bullet' },
  { id: 'smg', name: 'Scrap SMG', damage: 6, fireRate: 10, spread: 8, speed: 1100, bullets: 1, knock: 70, color: '#ffc27a', rarity: 'common', projectile: 'bullet' },
  
  // Uncommon tier (DPS ~40-60)
  { id: 'rifle', name: 'Pipe Rifle', damage: 24, fireRate: 4, spread: 2, speed: 1300, bullets: 1, knock: 200, color: '#ffd9a3', rarity: 'uncommon', projectile: 'bullet' },
  { id: 'shotgun', name: 'Junk Shotgun', damage: 9, fireRate: 1.8, spread: 14, speed: 950, bullets: 7, knock: 350, color: '#ffa366', rarity: 'uncommon', projectile: 'pellet', cooldown: 0.3 },
  { id: 'bow', name: 'Rebar Bow', damage: 35, fireRate: 2, spread: 1, speed: 1200, bullets: 1, knock: 280, color: '#d2ffa8', rarity: 'uncommon', projectile: 'arrow', life: 1.8, chargeTime: 0.4, chargeBonus: 0.5 },
  { id: 'crossbow', name: 'Makeshift Crossbow', damage: 40, fireRate: 1.6, spread: 0.8, speed: 1400, bullets: 1, pierce: 2, knock: 300, color: '#8d6e63', rarity: 'uncommon', projectile: 'bolt', life: 1.6, cooldown: 0.4 },
  { id: 'carbine', name: 'Auto Carbine', damage: 14, fireRate: 6, spread: 4, speed: 1200, bullets: 1, knock: 120, color: '#c5e1a5', rarity: 'uncommon', projectile: 'bullet' },
  { id: 'quill', name: 'Quill Gun', damage: 16, fireRate: 5, spread: 10, speed: 1400, bullets: 4, knock: 100, color: '#fff59d', rarity: 'uncommon', projectile: 'needle', life: 0.9 },
  { id: 'scatter', name: 'Scatter Blaster', damage: 12, fireRate: 4, spread: 18, speed: 1100, bullets: 5, knock: 140, color: '#ffab91', rarity: 'uncommon', projectile: 'pellet', cooldown: 0.15 },
  { id: 'shard', name: 'Shard Launcher', damage: 14, fireRate: 5, spread: 16, speed: 1200, bullets: 6, knock: 110, color: '#80deea', rarity: 'uncommon', projectile: 'shard', life: 1.0 },
  { id: 'spread', name: 'Spread Cannon', damage: 15, fireRate: 3, spread: 22, speed: 950, bullets: 7, knock: 180, color: '#ffcc80', rarity: 'uncommon', projectile: 'pellet', cooldown: 0.2 },
  
  // Rare tier (DPS ~70-100)
  { id: 'dualpistol', name: 'Dual Pistols', damage: 16, fireRate: 8, spread: 4, speed: 1050, bullets: 2, knock: 110, color: '#ffcc99', rarity: 'rare', projectile: 'bullet' },
  { id: 'burst', name: 'Burst Rifle', damage: 18, fireRate: 3, spread: 2.5, speed: 1350, bullets: 3, knock: 160, color: '#ffd6a6', rarity: 'rare', projectile: 'bullet', burstDelay: 0.08 },
  { id: 'revolver', name: 'Heavy Revolver', damage: 50, fireRate: 2.5, spread: 2, speed: 1200, bullets: 1, knock: 350, color: '#bcaaa4', rarity: 'rare', projectile: 'bullet', cooldown: 0.2 },
  { id: 'magnum', name: 'Scrap Magnum', damage: 55, fireRate: 2.2, spread: 2.5, speed: 1400, bullets: 1, knock: 380, color: '#a1887f', rarity: 'rare', projectile: 'bullet', cooldown: 0.25 },
  { id: 'tripleshot', name: 'Triple Barrel', damage: 20, fireRate: 2.8, spread: 10, speed: 1100, bullets: 3, knock: 200, color: '#ffb74d', rarity: 'rare', projectile: 'pellet', cooldown: 0.3 },
  { id: 'pulse', name: 'Pulse Rifle', damage: 28, fireRate: 4.5, spread: 2, speed: 1500, bullets: 1, pierce: 2, knock: 150, color: '#4fc3f7', rarity: 'rare', projectile: 'energy', life: 1.2 },
  { id: 'flak', name: 'Flak Thrower', damage: 12, fireRate: 6, spread: 18, speed: 950, bullets: 9, life: 0.4, knock: 130, color: '#ffd36e', rarity: 'rare', projectile: 'flak' },
  { id: 'ignite', name: 'Igniter', damage: 8, fireRate: 14, spread: 12, speed: 1200, bullets: 1, dot: { dps: 15, dur: 2.5 }, knock: 70, color: '#ff7a00', rarity: 'rare', projectile: 'fire', life: 0.5 },
  { id: 'ice', name: 'Cryo Blaster', damage: 16, fireRate: 7, spread: 5, speed: 1100, bullets: 1, slow: 0.5, knock: 150, color: '#90e0ff', rarity: 'rare', projectile: 'ice', life: 0.8 },
  { id: 'saw', name: 'Buzz Saw', damage: 25, fireRate: 0, spread: 0, speed: 0, bullets: 0, knock: 120, color: '#ffcc80', rarity: 'rare', projectile: 'melee', meleeRange: 80, meleeDPS: 120, cooldown: 0 },
  { id: 'hurricane', name: 'Hurricane SMG', damage: 10, fireRate: 14, spread: 11, speed: 1300, bullets: 2, knock: 80, color: '#b0bec5', rarity: 'rare', projectile: 'bullet' },
  { id: 'cyclone', name: 'Cyclone Rifle', damage: 20, fireRate: 10, spread: 10, speed: 1250, bullets: 1, bounce: 1, knock: 110, color: '#81c784', rarity: 'rare', projectile: 'energy', life: 1.0 },
  { id: 'venom', name: 'Venom Spitter', damage: 15, fireRate: 7, spread: 8, speed: 1000, bullets: 1, dot: { dps: 22, dur: 4 }, knock: 90, color: '#9ccc65', rarity: 'rare', projectile: 'poison', life: 0.9 },
  { id: 'flamethrower', name: 'Jury Flamer', damage: 10, fireRate: 18, spread: 20, speed: 750, bullets: 1, life: 0.45, dot: { dps: 18, dur: 3 }, knock: 40, color: '#ff6f00', rarity: 'rare', projectile: 'flame' },
  
  // Epic tier (DPS ~110-150)
  { id: 'cannon', name: 'Scrap Cannon', damage: 65, fireRate: 1.5, spread: 3, speed: 850, bullets: 1, knock: 550, color: '#ffbd45', rarity: 'epic', projectile: 'shell', cooldown: 0.5 },
  { id: 'slug', name: 'Slug Launcher', damage: 85, fireRate: 1.2, spread: 1, speed: 1400, bullets: 1, knock: 700, color: '#ffe399', rarity: 'epic', projectile: 'slug', cooldown: 0.6 },
  { id: 'handcannon', name: 'Hand Cannon', damage: 95, fireRate: 1.1, spread: 4, speed: 950, bullets: 1, knock: 650, color: '#ff9800', rarity: 'epic', projectile: 'shell', cooldown: 0.7 },
  { id: 'laser', name: 'Jury Laser', damage: 85, fireRate: 0, spread: 0, speed: 0, bullets: 0, knock: 50, color: '#7ce6ff', rarity: 'epic', projectile: 'beam', beamLength: 800, chargeTime: 0.8, cooldown: 1.2 },
  { id: 'gatling', name: 'Scrap Gatling', damage: 8, fireRate: 22, spread: 14, speed: 1300, bullets: 1, knock: 60, color: '#ff8a65', rarity: 'epic', projectile: 'bullet', spinup: 0.3 },
  { id: 'acid', name: 'Acid Sprayer', damage: 8, fireRate: 16, spread: 16, speed: 900, bullets: 1, slow: 0.7, dot: { dps: 12, dur: 2.5 }, knock: 50, color: '#9cff57', rarity: 'epic', projectile: 'acid', life: 0.6 },
  { id: 'shock', name: 'Shock Arc', damage: 14, fireRate: 12, spread: 7, speed: 1400, bullets: 1, chain: 3, knock: 100, color: '#8df0ff', rarity: 'epic', projectile: 'lightning', life: 0.5 },
  { id: 'grenade', name: 'Pipe Grenade', damage: 30, fireRate: 2.5, spread: 3, speed: 850, bullets: 1, explode: { r: 130, dmg: 55 }, knock: 450, color: '#ffc400', rarity: 'epic', projectile: 'grenade', life: 1.5 },
  { id: 'sticky', name: 'Sticky Bomb', damage: 20, fireRate: 2, spread: 3, speed: 750, bullets: 1, stick: true, explode: { r: 170, dmg: 75 }, knock: 600, color: '#ffe082', rarity: 'epic', projectile: 'sticky', life: 2.0 },
  { id: 'needle', name: 'Needle Storm', damage: 8, fireRate: 20, spread: 14, speed: 1700, bullets: 2, pierce: 2, knock: 60, color: '#e1bee7', rarity: 'epic', projectile: 'needle', life: 0.8 },
  { id: 'plasma', name: 'Plasma Burst', damage: 45, fireRate: 3.5, spread: 5, speed: 1200, bullets: 1, explode: { r: 90, dmg: 28 }, knock: 250, color: '#69f0ae', rarity: 'epic', projectile: 'plasma', life: 1.0 },
  { id: 'tesla', name: 'Tesla Coil', damage: 22, fireRate: 7, spread: 9, speed: 1300, bullets: 1, chain: 4, knock: 140, color: '#00e5ff', rarity: 'epic', projectile: 'lightning', life: 0.6 },
  { id: 'wave', name: 'Wave Gun', damage: 28, fireRate: 5, spread: 4, speed: 1100, bullets: 1, pierce: 5, bounce: 1, knock: 190, color: '#e040fb', rarity: 'epic', projectile: 'wave', life: 1.2 },
  { id: 'toxin', name: 'Toxin Blaster', damage: 16, fireRate: 10, spread: 10, speed: 1000, bullets: 1, dot: { dps: 20, dur: 3.5 }, slow: 0.4, knock: 80, color: '#aed581', rarity: 'epic', projectile: 'poison', life: 0.8 },
  { id: 'beam', name: 'Particle Beam', damage: 120, fireRate: 0, spread: 0, speed: 0, bullets: 0, knock: 70, color: '#f48fb1', rarity: 'epic', projectile: 'beam', beamLength: 1000, chargeTime: 1.2, cooldown: 1.5 },
  { id: 'frostbite', name: 'Frostbite Cannon', damage: 35, fireRate: 4.5, spread: 7, speed: 1100, bullets: 1, slow: 0.8, explode: { r: 100, dmg: 22 }, knock: 220, color: '#81d4fa', rarity: 'epic', projectile: 'ice', life: 0.9 },
  { id: 'thunder', name: 'Thunder Strike', damage: 38, fireRate: 4, spread: 6, speed: 1400, bullets: 1, chain: 5, knock: 250, color: '#ffd54f', rarity: 'epic', projectile: 'lightning', life: 0.7 },
  { id: 'disruptor', name: 'Disruptor Beam', damage: 140, fireRate: 0, spread: 0, speed: 0, bullets: 0, chain: 3, slow: 0.5, knock: 150, color: '#ba68c8', rarity: 'epic', projectile: 'beam', beamLength: 900, chargeTime: 1.0, cooldown: 1.8 },
  { id: 'reaper', name: 'Reaper Cannon', damage: 48, fireRate: 3.2, spread: 6, speed: 1100, bullets: 1, dot: { dps: 25, dur: 3.5 }, knock: 320, color: '#424242', rarity: 'epic', projectile: 'energy', life: 1.1 },
  
  // Legendary tier (DPS ~170-250)
  { id: 'rail', name: 'Rail Coil', damage: 140, fireRate: 1, spread: 0.3, speed: 2200, bullets: 1, pierce: 4, knock: 250, color: '#8df0ff', rarity: 'legendary', projectile: 'rail', chargeTime: 0.5, cooldown: 1.2 },
  { id: 'railgun', name: 'Plasma Rail', damage: 280, fireRate: 0, spread: 0, speed: 0, bullets: 0, pierce: 999, knock: 200, color: '#18ffff', rarity: 'legendary', projectile: 'beam', beamLength: 1600, chargeTime: 0.8, cooldown: 1.8 },
  { id: 'sniper', name: 'Wasteland Sniper', damage: 160, fireRate: 0.85, spread: 0.3, speed: 2800, bullets: 1, knock: 300, color: '#90a4ae', rarity: 'legendary', projectile: 'bullet', cooldown: 1.5 },
  { id: 'minigun', name: 'Hand Minigun', damage: 10, fireRate: 24, spread: 10, speed: 1250, bullets: 1, knock: 70, color: '#ffd180', rarity: 'legendary', projectile: 'bullet', spinup: 0.5 },
  { id: 'boomer', name: 'Boomstick+', damage: 14, fireRate: 2.2, spread: 16, speed: 1000, bullets: 12, knock: 450, color: '#ffb74d', rarity: 'legendary', projectile: 'pellet', cooldown: 0.8 },
  { id: 'void', name: 'Void Lance', damage: 75, fireRate: 1.8, spread: 0.8, speed: 2400, bullets: 1, pierce: 8, knock: 180, color: '#ae52d4', rarity: 'legendary', projectile: 'void', life: 1.5 },
  { id: 'rocket', name: 'Rocket Pod', damage: 60, fireRate: 1.8, spread: 6, speed: 900, bullets: 1, explode: { r: 150, dmg: 65 }, knock: 550, color: '#ff3d00', rarity: 'legendary', projectile: 'rocket', life: 2.0 },
  { id: 'vortex', name: 'Vortex Cannon', damage: 45, fireRate: 2.5, spread: 3, speed: 1000, bullets: 1, explode: { r: 180, dmg: 50 }, slow: 0.6, knock: 400, color: '#651fff', rarity: 'legendary', projectile: 'vortex', life: 1.5 },
  { id: 'meteor', name: 'Meteor Gun', damage: 80, fireRate: 1.6, spread: 5, speed: 800, bullets: 1, explode: { r: 110, dmg: 45 }, dot: { dps: 12, dur: 2.5 }, knock: 500, color: '#ff5722', rarity: 'legendary', projectile: 'meteor', life: 1.8 },
  { id: 'antimatter', name: 'Antimatter Rifle', damage: 220, fireRate: 0.6, spread: 0.8, speed: 3000, bullets: 1, pierce: 15, explode: { r: 140, dmg: 70 }, knock: 300, color: '#7c4dff', rarity: 'legendary', projectile: 'antimatter', life: 1.5, cooldown: 2.0 },
  { id: 'decimator', name: 'Decimator', damage: 120, fireRate: 1.2, spread: 10, speed: 900, bullets: 10, knock: 600, color: '#ff5252', rarity: 'legendary', projectile: 'shell', cooldown: 1.5 },
  { id: 'inferno', name: 'Inferno Thrower', damage: 15, fireRate: 22, spread: 22, speed: 700, bullets: 1, life: 0.4, dot: { dps: 24, dur: 3.5 }, explode: { r: 70, dmg: 15 }, knock: 50, color: '#ff6d00', rarity: 'legendary', projectile: 'flame' },
];

export const ENEMY_TYPES = {
  // Basic enemies
  melee: { hp: 60, speed: 140, dmg: 14, attackRate: 0.9, color: '#ff7043', r: 16 }, // Basic melee
  fast: { hp: 35, speed: 220, dmg: 8, attackRate: 0.6, color: '#ffa726', r: 14 }, // Fast, low HP
  ranged: { hp: 50, speed: 110, dmg: 12, attackRate: 0, color: '#26a69a', r: 16, range: 500, fireCd: 1.4 }, // Ranged shooter
  tank: { hp: 180, speed: 65, dmg: 28, attackRate: 1.6, color: '#8d6e63', r: 22, armor: 0.25 }, // Slow tank
  // Advanced enemies
  sniper: { hp: 45, speed: 85, dmg: 22, attackRate: 0, color: '#b39ddb', r: 16, range: 750, fireCd: 2.2, projSpeed: 1200 }, // Long range
  bomber: { hp: 65, speed: 130, dmg: 16, attackRate: 1.3, color: '#ff8a65', r: 18, explode: { r: 130, dmg: 45 }, prox: 50 }, // Suicide bomber
  charger: { hp: 80, speed: 120, dmg: 20, attackRate: 2.8, color: '#81d4fa', r: 18, chargeCd: 2.5, chargeDur: 0.6, chargeMult: 3.5 }, // Charging enemy
  turret: { hp: 90, speed: 0, dmg: 16, attackRate: 0, color: '#546e7a', r: 18, range: 650, fireCd: 1.2 }, // Stationary turret
  ghost: { hp: 55, speed: 170, dmg: 12, attackRate: 1.1, color: '#80cbc4', r: 15, phase: true }, // Phasing ghost
  berserker: { hp: 140, speed: 95, dmg: 32, attackRate: 0.7, color: '#e53935', r: 19, rage: true }, // Enraged when low HP
  spawner: { hp: 120, speed: 55, dmg: 0, attackRate: 0, color: '#7e57c2', r: 20, spawnCd: 3.5, spawnMax: 8, spawnWarmup: 2.0, rewardLimit: 5 }, // Spawns minions with limits
  healer: { hp: 75, speed: 95, dmg: 10, attackRate: 1.3, color: '#4dd0e1', r: 17, healCd: 5, healRadius: 220 }, // Heals allies
  flying: { hp: 45, speed: 160, dmg: 12, attackRate: 0.7, color: '#4fc3f7', r: 15, flying: true }, // Flying enemy that ignores walls
  summoner: { hp: 100, speed: 60, dmg: 0, attackRate: 0, color: '#ab47bc', r: 18, summonCd: 3, summonCount: 2 }, // Summons minions
  elite: { hp: 120, speed: 130, dmg: 20, attackRate: 0.8, color: '#ff5722', r: 17, armor: 0.2, elite: true }, // Elite enemy
  // Elite variants (25% more stats)
  elite_melee: { hp: 110, speed: 150, dmg: 24, attackRate: 0.8, color: '#ff1744', r: 18, armor: 0.15, elite: true },
  elite_fast: { hp: 65, speed: 260, dmg: 14, attackRate: 0.5, color: '#ff6f00', r: 15, elite: true },
  elite_tank: { hp: 280, speed: 75, dmg: 42, attackRate: 1.4, color: '#5d4037', r: 24, armor: 0.4, elite: true },
  // Shield enemy
  shielder: { hp: 100, speed: 110, dmg: 16, attackRate: 1.0, color: '#546e7a', r: 17, shield: true, shieldHp: 150, shieldArc: 120 }, // Front shield blocks 120° arc
};

export const BOSS_TEMPLATE = {
  hp: 1200, speed: 95, dmg: 30, r: 42, color: '#ffca28', phases: 3, armor: 0.1,
};

// Boss variants with varied difficulty and mechanics
export const BOSS_VARIANTS = {
  // EASY BOSSES (1200-1500 HP)
  scrap_colossus: { 
    name: 'Scrap Colossus', difficulty: 'easy',
    hp: 1200, speed: 80, dmg: 28, r: 45, color: '#8d6e63', phases: 3, armor: 0.12, 
    attackType: 'volley', volleyCount: 8, volleySpread: 0.6, fireCd: 2.5,
    description: 'A lumbering heap of scrap metal' 
  },
  
  crystal_guardian: { 
    name: 'Crystal Guardian', difficulty: 'easy',
    hp: 1300, speed: 90, dmg: 26, r: 42, color: '#64b5f6', phases: 3, armor: 0.1, 
    attackType: 'tracking', trackingSpeed: 600, fireCd: 1.8,
    shieldPhase: 2, shieldDuration: 3.0, shieldCooldown: 8.0,
    description: 'Crystalline protector with temporary shields' 
  },
  
  rust_warden: { 
    name: 'Rust Warden', difficulty: 'easy',
    hp: 1400, speed: 85, dmg: 30, r: 43, color: '#a1887f', phases: 3, armor: 0.15, 
    attackType: 'burst', burstCount: 5, burstDelay: 0.15, fireCd: 3.0,
    summonCd: 15.0, minionType: 'melee', minionCount: 2,
    description: 'Rusty construct that summons minions' 
  },

  // MEDIUM BOSSES (1600-2000 HP)
  void_reaper: { 
    name: 'Void Reaper', difficulty: 'medium',
    hp: 1700, speed: 110, dmg: 35, r: 44, color: '#7b1fa2', phases: 4, armor: 0.14, 
    attackType: 'spiral', spiralCount: 12, spiralRotation: 0.3, fireCd: 2.0,
    teleportPhase: 3, teleportCd: 7.0, teleportRange: 300,
    description: 'Shadowy entity that teleports and fires spiraling projectiles' 
  },
  
  inferno_titan: { 
    name: 'Inferno Titan', difficulty: 'medium',
    hp: 1800, speed: 95, dmg: 38, r: 48, color: '#ff6f00', phases: 4, armor: 0.16, 
    attackType: 'flame_wave', waveCount: 3, waveCd: 4.0,
    fireTrail: true, trailDamage: 15, trailDuration: 2.5,
    description: 'Burning colossus leaving trails of fire' 
  },
  
  toxic_behemoth: { 
    name: 'Toxic Behemoth', difficulty: 'medium',
    hp: 1900, speed: 88, dmg: 36, r: 46, color: '#7cb342', phases: 4, armor: 0.18, 
    attackType: 'poison_cloud', cloudCount: 5, cloudRadius: 100, cloudDuration: 4.0, cloudCd: 5.0,
    summonCd: 12.0, minionType: 'fast', minionCount: 3,
    description: 'Toxic monster spreading poison clouds' 
  },

  // HARD BOSSES (2100-2800 HP)
  eldritch_horror: { 
    name: 'Eldritch Horror', difficulty: 'hard',
    hp: 2200, speed: 105, dmg: 42, r: 50, color: '#2b002f', phases: 5, armor: 0.20, 
    attackType: 'tentacle', tentacleCd: 4.5, tentacleCount: 8, tentacleSpread: Math.PI * 1.5,
    tentacleRadius: 180, telegraphDuration: 1.0, telegraphColor: '#8b00ff',
    summonCd: 10.0, minionType: 'ghost', minionCount: 2,
    phaseAbility: 'rage', rageDamageMult: 1.5, rageSpeedMult: 1.3,
    description: 'Nightmare incarnate with devastating tentacle attacks' 
  },
  
  storm_sovereign: { 
    name: 'Storm Sovereign', difficulty: 'hard',
    hp: 2400, speed: 115, dmg: 40, r: 47, color: '#01579b', phases: 5, armor: 0.17, 
    attackType: 'lightning_burst', burstCount: 16, chainCount: 3, fireCd: 2.5,
    dashPhase: 3, dashCd: 5.0, dashSpeed: 800, dashDuration: 0.4,
    shockwave: true, shockwaveCd: 8.0, shockwaveRadius: 250, shockwaveDamage: 50,
    description: 'Lightning-charged tyrant with devastating area attacks' 
  },
  
  apocalypse_engine: { 
    name: 'Apocalypse Engine', difficulty: 'hard',
    hp: 2600, speed: 100, dmg: 45, r: 52, color: '#b71c1c', phases: 5, armor: 0.22, 
    attackType: 'omni_barrage', barrageCount: 24, barrageWaves: 3, fireCd: 3.5,
    turretPhase: 2, turretCount: 4, turretCd: 20.0, turretDuration: 12.0,
    laserPhase: 4, laserCd: 7.0, laserWidth: 20, laserLength: 600, laserDuration: 2.0,
    description: 'Ultimate war machine with multi-phase attack patterns' 
  },

  // ADDITIONAL BOSSES - Expanding roster
  frost_tyrant: { 
    name: 'Frost Tyrant', difficulty: 'medium',
    hp: 1650, speed: 92, dmg: 34, r: 45, color: '#00bcd4', phases: 4, armor: 0.15, 
    attackType: 'ice_nova', novaCount: 20, novaCd: 3.5,
    freezeEffect: true, freezeDuration: 2.0, freezeSlowMult: 0.3,
    iceWall: true, wallCd: 10.0, wallDuration: 6.0,
    description: 'Frozen monarch that slows and traps enemies with ice' 
  },

  plague_doctor: { 
    name: 'Plague Doctor', difficulty: 'easy',
    hp: 1350, speed: 100, dmg: 27, r: 40, color: '#558b2f', phases: 3, armor: 0.11, 
    attackType: 'poison_dart', dartCount: 4, dartCd: 1.5,
    poisonAura: true, auraDamage: 8, auraRadius: 120,
    healAbility: true, healAmount: 150, healCd: 15.0,
    description: 'Corrupted healer spreading disease' 
  },

  arcane_sentinel: { 
    name: 'Arcane Sentinel', difficulty: 'medium',
    hp: 1750, speed: 105, dmg: 37, r: 43, color: '#d500f9', phases: 4, armor: 0.13, 
    attackType: 'magic_missile', missileCount: 8, missileSpeed: 700, fireCd: 2.2,
    blink: true, blinkCd: 6.0, blinkRange: 250,
    runeCircle: true, runeCd: 12.0, runeDamage: 60, runeRadius: 150,
    description: 'Mystical guardian with arcane magic' 
  },

  molten_core: { 
    name: 'Molten Core', difficulty: 'hard',
    hp: 2300, speed: 85, dmg: 44, r: 50, color: '#ff5722', phases: 5, armor: 0.25, 
    attackType: 'lava_burst', burstCount: 16, burstCd: 2.8,
    lavaPool: true, poolCd: 8.0, poolCount: 3, poolDamage: 20, poolDuration: 8.0,
    eruptionPhase: 4, eruptionCd: 15.0, eruptionRadius: 300,
    description: 'Living magma with devastating area denial' 
  },

  shadow_stalker: { 
    name: 'Shadow Stalker', difficulty: 'easy',
    hp: 1250, speed: 130, dmg: 25, r: 38, color: '#424242', phases: 3, armor: 0.08, 
    attackType: 'shadow_strike', strikeCd: 1.2, strikeCount: 3,
    phaseWalk: true, phaseChance: 0.15, phaseDuration: 0.5,
    shadowClone: true, cloneCd: 18.0, cloneDuration: 8.0,
    description: 'Swift assassin that phases in and out of reality' 
  },

  iron_colossus: { 
    name: 'Iron Colossus', difficulty: 'hard',
    hp: 2800, speed: 75, dmg: 50, r: 55, color: '#607d8b', phases: 5, armor: 0.30, 
    attackType: 'ground_pound', poundCd: 4.0, poundRadius: 200, poundWaves: 3,
    chargeAttack: true, chargeCd: 10.0, chargeSpeed: 500, chargeDuration: 1.5,
    shieldPhase: 2, shieldDuration: 4.0, shieldCooldown: 12.0,
    description: 'Massive armored titan with devastating melee attacks' 
  },

  // LEGACY BOSSES (kept for compatibility)
  boss1: { name: 'Scrap Golem', difficulty: 'easy', hp: 1200, speed: 95, dmg: 30, r: 42, color: '#ffca28', phases: 3, armor: 0.1, attackType: 'volley' },
  boss2: { name: 'Void Walker', difficulty: 'medium', hp: 1400, speed: 88, dmg: 34, r: 44, color: '#7b49ff', phases: 3, armor: 0.12, attackType: 'arc' },
  boss3: { name: 'Tentacle Beast', difficulty: 'hard', hp: 2000, speed: 70, dmg: 42, r: 50, color: '#2b002f', phases: 4, armor: 0.18, attackType: 'tentacle',
    tentacleCd: 5.0, tentacleCount: 6, tentacleSpread: Math.PI * 1.2, tentacleRadius: 160,
    telegraphDuration: 1.1, telegraphColor: '#8b00ff', summonCd: 12.0, minionType: 'bomber' }
};

export const ROOM_TYPES = ['combat', 'chest', 'trader', 'trap', 'boss', 'dark', 'explosive', 'toxic', 'frozen'];

// Themed room configurations
export const THEMED_ROOMS = {
  dark: {
    name: 'Dark Room',
    description: 'A room shrouded in darkness where ghosts lurk',
    enemies: ['ghost', 'ghost', 'fast', 'ghost'],
    color: '#1a1a2e',
    ambientLight: 0.3, // Darker lighting
    fog: true
  },
  explosive: {
    name: 'Explosive Room',
    description: 'Volatile room filled with bombers',
    enemies: ['bomber', 'bomber', 'charger', 'bomber'],
    color: '#ff6b35',
    hazards: true
  },
  toxic: {
    name: 'Toxic Room',
    description: 'Poisonous chamber with toxic enemies',
    enemies: ['spawner', 'healer', 'fast', 'ranged'],
    color: '#7cb342',
    poison: true
  },
  frozen: {
    name: 'Frozen Room',
    description: 'Ice-covered room with slowing effects',
    enemies: ['sniper', 'turret', 'tank', 'sniper'],
    color: '#64b5f6',
    slow: 0.7 // 30% speed reduction
  }
};

// Utility helpers
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = () => Math.random();
export const randRange = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(randRange(a, b + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy;
}

export function circleIntersect(ax, ay, ar, bx, by, br) {
  const r = ar + br; return dist2(ax, ay, bx, by) <= r * r;
}

export function seededRandom(seed) {
  // Mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedPick(entries) {
  // entries: [{item, weight}]
  const sum = entries.reduce((a, e) => a + e.weight, 0);
  let r = Math.random() * sum;
  for (const e of entries) { if ((r -= e.weight) <= 0) return e.item; }
  return entries[entries.length - 1].item;
}

export const INPUT_KEYS = {
  up: ['w', 'arrowup'],
  down: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'],
  right: ['d', 'arrowright'],
  dash: ['shift', ' '],
  interact: ['e'],
  swap: ['r'],
};
