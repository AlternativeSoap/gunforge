// weaponMods.js
// Weapon modification system

export const WEAPON_MOD_TYPES = {
  scope: {
    name: 'Scope',
    slot: 'scope',
    icon: '🔭',
    description: 'Reduces spread and increases range'
  },
  magazine: {
    name: 'Magazine',
    slot: 'magazine',
    icon: '📦',
    description: 'Increases fire rate and bullets per shot'
  },
  barrel: {
    name: 'Barrel',
    slot: 'barrel',
    icon: '🔫',
    description: 'Increases damage and projectile speed'
  },
  grip: {
    name: 'Grip',
    slot: 'grip',
    icon: '🤏',
    description: 'Reduces recoil and improves handling'
  },
  elemental: {
    name: 'Elemental Core',
    slot: 'elemental',
    icon: '💎',
    description: 'Adds elemental damage effects'
  }
};

export const WEAPON_MODS = {
  // SCOPES
  reflex_sight: {
    id: 'reflex_sight',
    name: 'Reflex Sight',
    type: 'scope',
    rarity: 'common',
    effects: { spreadMult: 0.85, rangeMult: 1.1 },
    description: '+15% accuracy, +10% range'
  },
  holographic: {
    id: 'holographic',
    name: 'Holographic Sight',
    type: 'scope',
    rarity: 'uncommon',
    effects: { spreadMult: 0.7, rangeMult: 1.2 },
    description: '+30% accuracy, +20% range'
  },
  sniper_scope: {
    id: 'sniper_scope',
    name: 'Sniper Scope',
    type: 'scope',
    rarity: 'rare',
    effects: { spreadMult: 0.5, rangeMult: 1.5, damageMult: 1.15 },
    description: '+50% accuracy, +50% range, +15% damage'
  },
  thermal_scope: {
    id: 'thermal_scope',
    name: 'Thermal Scope',
    type: 'scope',
    rarity: 'epic',
    effects: { spreadMult: 0.4, rangeMult: 1.8, damageMult: 1.25 },
    description: '+60% accuracy, +80% range, +25% damage, see through walls'
  },

  // MAGAZINES
  extended_mag: {
    id: 'extended_mag',
    name: 'Extended Magazine',
    type: 'magazine',
    rarity: 'common',
    effects: { bulletsMult: 1.3, fireRateMult: 1.1 },
    description: '+30% bullets, +10% fire rate'
  },
  drum_mag: {
    id: 'drum_mag',
    name: 'Drum Magazine',
    type: 'magazine',
    rarity: 'uncommon',
    effects: { bulletsMult: 1.6, fireRateMult: 1.15 },
    description: '+60% bullets, +15% fire rate'
  },
  rapid_loader: {
    id: 'rapid_loader',
    name: 'Rapid Loader',
    type: 'magazine',
    rarity: 'rare',
    effects: { fireRateMult: 1.4, bulletsMult: 1.2 },
    description: '+40% fire rate, +20% bullets'
  },
  infinity_coil: {
    id: 'infinity_coil',
    name: 'Infinity Coil',
    type: 'magazine',
    rarity: 'legendary',
    effects: { fireRateMult: 1.8, bulletsMult: 1.5, noCooldown: true },
    description: '+80% fire rate, +50% bullets, no cooldown'
  },

  // BARRELS
  long_barrel: {
    id: 'long_barrel',
    name: 'Long Barrel',
    type: 'barrel',
    rarity: 'common',
    effects: { damageMult: 1.15, speedMult: 1.2 },
    description: '+15% damage, +20% projectile speed'
  },
  heavy_barrel: {
    id: 'heavy_barrel',
    name: 'Heavy Barrel',
    type: 'barrel',
    rarity: 'uncommon',
    effects: { damageMult: 1.3, knockMult: 1.4 },
    description: '+30% damage, +40% knockback'
  },
  rifled_barrel: {
    id: 'rifled_barrel',
    name: 'Rifled Barrel',
    type: 'barrel',
    rarity: 'rare',
    effects: { damageMult: 1.4, speedMult: 1.5, spreadMult: 0.8 },
    description: '+40% damage, +50% speed, +20% accuracy'
  },
  plasma_barrel: {
    id: 'plasma_barrel',
    name: 'Plasma Barrel',
    type: 'barrel',
    rarity: 'epic',
    effects: { damageMult: 1.7, speedMult: 1.4, pierce: 2 },
    description: '+70% damage, +40% speed, +2 pierce'
  },

  // GRIPS
  vertical_grip: {
    id: 'vertical_grip',
    name: 'Vertical Grip',
    type: 'grip',
    rarity: 'common',
    effects: { spreadMult: 0.9, fireRateMult: 1.05 },
    description: '+10% accuracy, +5% fire rate'
  },
  angled_grip: {
    id: 'angled_grip',
    name: 'Angled Grip',
    type: 'grip',
    rarity: 'uncommon',
    effects: { spreadMult: 0.8, knockMult: 0.8 },
    description: '+20% accuracy, -20% recoil'
  },
  ergo_grip: {
    id: 'ergo_grip',
    name: 'Ergonomic Grip',
    type: 'grip',
    rarity: 'rare',
    effects: { spreadMult: 0.7, fireRateMult: 1.2, speedBonus: 10 },
    description: '+30% accuracy, +20% fire rate, +10% move speed'
  },
  titan_grip: {
    id: 'titan_grip',
    name: 'Titan Grip',
    type: 'grip',
    rarity: 'legendary',
    effects: { spreadMult: 0.5, knockMult: 1.5, damageMult: 1.2 },
    description: '+50% accuracy, +50% knockback, +20% damage'
  },

  // ELEMENTAL CORES
  fire_core: {
    id: 'fire_core',
    name: 'Fire Core',
    type: 'elemental',
    rarity: 'rare',
    effects: { element: 'fire', burnDPS: 20, burnDuration: 3 },
    description: 'Inflicts burning (20 DPS for 3s)'
  },
  ice_core: {
    id: 'ice_core',
    name: 'Ice Core',
    type: 'elemental',
    rarity: 'rare',
    effects: { element: 'ice', slowAmount: 0.6, slowDuration: 2.5 },
    description: 'Slows enemies by 60% for 2.5s'
  },
  shock_core: {
    id: 'shock_core',
    name: 'Shock Core',
    type: 'elemental',
    rarity: 'rare',
    effects: { element: 'shock', chain: 3, stunChance: 0.15 },
    description: 'Chains to 3 enemies, 15% stun chance'
  },
  poison_core: {
    id: 'poison_core',
    name: 'Poison Core',
    type: 'elemental',
    rarity: 'rare',
    effects: { element: 'poison', poisonDPS: 18, poisonDuration: 4 },
    description: 'Inflicts poison (18 DPS for 4s)'
  },
  void_core: {
    id: 'void_core',
    name: 'Void Core',
    type: 'elemental',
    rarity: 'epic',
    effects: { element: 'void', damageMult: 1.3, pierce: 5 },
    description: '+30% damage, +5 pierce, ignores armor'
  },
  chaos_core: {
    id: 'chaos_core',
    name: 'Chaos Core',
    type: 'elemental',
    rarity: 'legendary',
    effects: { element: 'chaos', randomStatus: true, damageMult: 1.5 },
    description: '+50% damage, random status effects on hit'
  }
};

export class WeaponMod {
  constructor(modId) {
    const template = WEAPON_MODS[modId];
    if (!template) throw new Error(`Unknown mod: ${modId}`);
    
    Object.assign(this, template);
  }

  applyToWeapon(weapon) {
    const modded = { ...weapon, mods: weapon.mods || {} };
    modded.mods[this.type] = this.id;

    // Apply multipliers
    if (this.effects.damageMult) modded.damage = Math.round(weapon.damage * this.effects.damageMult);
    if (this.effects.fireRateMult) modded.fireRate = weapon.fireRate * this.effects.fireRateMult;
    if (this.effects.spreadMult) modded.spread = weapon.spread * this.effects.spreadMult;
    if (this.effects.speedMult) modded.speed = weapon.speed * this.effects.speedMult;
    if (this.effects.bulletsMult) modded.bullets = Math.max(1, Math.round(weapon.bullets * this.effects.bulletsMult));
    if (this.effects.knockMult) modded.knock = weapon.knock * this.effects.knockMult;
    if (this.effects.rangeMult) modded.life = (weapon.life || 1) * this.effects.rangeMult;
    
    // Add new properties
    if (this.effects.pierce) modded.pierce = (weapon.pierce || 0) + this.effects.pierce;
    if (this.effects.noCooldown) modded.cooldown = 0;
    if (this.effects.element) modded.element = this.effects.element;
    if (this.effects.chain) modded.chain = (weapon.chain || 0) + this.effects.chain;

    // Status effects
    if (this.effects.burnDPS) {
      modded.dot = modded.dot || {};
      modded.dot.dps = this.effects.burnDPS;
      modded.dot.dur = this.effects.burnDuration || 3;
      modded.dot.type = 'burn';
    }
    if (this.effects.poisonDPS) {
      modded.dot = modded.dot || {};
      modded.dot.dps = this.effects.poisonDPS;
      modded.dot.dur = this.effects.poisonDuration || 4;
      modded.dot.type = 'poison';
    }
    if (this.effects.slowAmount) {
      modded.slow = this.effects.slowAmount;
      modded.slowDuration = this.effects.slowDuration || 2;
    }

    return modded;
  }
}

// Get random mod of specific type and rarity
export function getRandomMod(type = null, rarity = null) {
  let mods = Object.values(WEAPON_MODS);
  
  if (type) mods = mods.filter(m => m.type === type);
  if (rarity) mods = mods.filter(m => m.rarity === rarity);
  
  if (mods.length === 0) return null;
  return mods[Math.floor(Math.random() * mods.length)].id;
}
