// skilltree.js
// Comprehensive skill tree system with branching paths and special abilities

export const SKILL_TREE = {
  // Four main branches: Tank, DPS, Support, Universal
  branches: {
    universal: {
      name: 'Universal',
      color: '#9c27b0',
      icon: '⭐',
      description: 'Core improvements for all builds',
      skills: [
        // Tier 1 - Foundation
        { id: 'univ_pierce', name: 'Penetration', desc: 'Bullets pierce +1 enemy', tier: 1, requires: [], apply: (p) => { p.pierceBonus = (p.pierceBonus || 0) + 1; } },
        { id: 'univ_stamina', name: 'Endurance', desc: '+30 Max Stamina', tier: 1, requires: [], apply: (p) => { p.maxStamina += 30; } },
        { id: 'univ_bullet_size', name: 'Large Ammo', desc: '+20% Bullet Size', tier: 1, requires: [], apply: (p) => { p.bulletSizeMultBase = (p.bulletSizeMultBase || 1) * 1.20; } },
        
        // Tier 2 - Economy & Utility
        { id: 'univ_coin', name: 'Treasure Hunter', desc: '+25% Coin Drops', tier: 2, requires: ['univ_pierce'], apply: (p) => { p.coinBonus = (p.coinBonus || 1) * 1.25; } },
        { id: 'univ_combo', name: 'Combo Master', desc: 'Combo timer +50% longer', tier: 2, requires: ['univ_stamina'], apply: (p) => { p.comboTimerMult = (p.comboTimerMult || 1) * 1.5; } },
        { id: 'univ_reload', name: 'Fast Hands', desc: '+15% Reload Speed', tier: 2, requires: ['univ_bullet_size'], apply: (p) => { p.reloadSpeed = (p.reloadSpeed || 1) * 1.15; } },
        
        // Tier 3 - Advanced
        { id: 'univ_lucky', name: 'Lucky', desc: '+10% better loot quality', tier: 3, requires: ['univ_coin'], apply: (p) => { p.luckBonus = (p.luckBonus || 1) * 1.10; } },
        { id: 'univ_multishot', name: 'Spread Shot', desc: '+1 projectile', tier: 3, requires: ['univ_combo', 'univ_reload'], apply: (p) => { p.multiShot = (p.multiShot || 0) + 1; } },
        { id: 'univ_ammo', name: 'Deep Pockets', desc: '+50% Max Ammo', tier: 3, requires: ['univ_reload'], apply: (p) => { p.maxAmmoMult = (p.maxAmmoMult || 1) * 1.5; } },
        
        // Tier 4 - Mastery
        { id: 'univ_master', name: 'Jack of All Trades', desc: '+10% All Stats', tier: 4, requires: ['univ_lucky', 'univ_multishot'], apply: (p) => { p.maxHp = Math.floor(p.maxHp * 1.1); p.dmgMultBase = (p.dmgMultBase || 1) * 1.1; p.speedMultBase = (p.speedMultBase || 1) * 1.1; } },
        { id: 'univ_pierce2', name: 'Deep Pierce', desc: 'Bullets pierce +2 more enemies', tier: 4, requires: ['univ_multishot', 'univ_ammo'], apply: (p) => { p.pierceBonus = (p.pierceBonus || 0) + 2; } },
        
        // Tier 5 - Ultimate
        { id: 'univ_ultimate', name: 'UNIVERSAL MASTERY', desc: '+25% All Stats, +1 to all skills', tier: 5, requires: ['univ_master', 'univ_pierce2'], ultimate: true, apply: (p) => { p.maxHp = Math.floor(p.maxHp * 1.25); p.dmgMultBase = (p.dmgMultBase || 1) * 1.25; p.speedMultBase = (p.speedMultBase || 1) * 1.25; p.fireRateMultBase = (p.fireRateMultBase || 1) * 1.25; } },
        
        // Tier 6 - GODLIKE (Cost 2 skill points each)
        { id: 'univ_god1', name: 'OMNI PIERCE', desc: 'Infinite pierce, +5 projectiles', tier: 6, cost: 2, requires: ['univ_ultimate'], apply: (p) => { p.pierceBonus = 999; p.multiShot = (p.multiShot || 0) + 5; } },
        { id: 'univ_god2', name: 'PERFECT FORM', desc: '+100% all stats, +200% luck', tier: 6, cost: 2, requires: ['univ_ultimate'], apply: (p) => { p.maxHp = Math.floor(p.maxHp * 2.0); p.dmgMultBase = (p.dmgMultBase || 1) * 2.0; p.speedMultBase = (p.speedMultBase || 1) * 2.0; p.fireRateMultBase = (p.fireRateMultBase || 1) * 2.0; p.luckBonus = (p.luckBonus || 1) * 3.0; } },
        
        // Tier 7 - TRANSCENDENT (Cost 3 skill points)
        { id: 'univ_trans', name: 'ASCENSION', desc: '+300% all stats, +15 projectiles, infinite pierce, 100% luck', tier: 7, cost: 3, requires: ['univ_god1', 'univ_god2'], apply: (p) => { p.maxHp = Math.floor(p.maxHp * 4.0); p.dmgMultBase = (p.dmgMultBase || 1) * 4.0; p.speedMultBase = (p.speedMultBase || 1) * 4.0; p.fireRateMultBase = (p.fireRateMultBase || 1) * 4.0; p.multiShot = (p.multiShot || 0) + 15; p.pierceBonus = 999; p.luckBonus = (p.luckBonus || 1) * 5.0; } }
      ]
    },
    
    tank: {
      name: 'Fortress',
      color: '#4caf50',
      icon: '🛡️',
      description: 'Survivability and defense',
      skills: [
        // Tier 1 - Starting nodes
        { id: 'tank_1', name: 'Iron Skin', desc: '+30 Max HP, +20 HP now', tier: 1, requires: [], apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 20); } },
        { id: 'tank_1b', name: 'Vitality', desc: '+25 Max HP', tier: 1, requires: [], apply: (p) => { p.maxHp += 25; } },
        { id: 'tank_1c', name: 'Endurance', desc: '+15% Max HP', tier: 1, requires: [], apply: (p) => { p.maxHp = Math.floor(p.maxHp * 1.15); } },
        
        // Tier 2 - Defense path
        { id: 'tank_2', name: 'Thick Armor', desc: '+20% Damage Reduction', tier: 2, requires: ['tank_1'], apply: (p) => { p.damageReduction = (p.damageReduction || 0) + 0.20; } },
        { id: 'tank_2b', name: 'Stone Skin', desc: '+10% Damage Reduction', tier: 2, requires: ['tank_1b'], apply: (p) => { p.damageReduction = (p.damageReduction || 0) + 0.10; } },
        { id: 'tank_2c', name: 'Fortified', desc: 'Reduce incoming damage by 5', tier: 2, requires: ['tank_1c'], apply: (p) => { p.flatDamageReduction = (p.flatDamageReduction || 0) + 5; } },
        
        // Tier 2 - Regen path
        { id: 'tank_3', name: 'Regeneration', desc: 'Heal 2 HP per second', tier: 2, requires: ['tank_1'], apply: (p) => { p.healthRegen = (p.healthRegen || 0) + 2; } },
        { id: 'tank_3b', name: 'Fast Healing', desc: 'Heal 3 HP per second', tier: 2, requires: ['tank_1b'], apply: (p) => { p.healthRegen = (p.healthRegen || 0) + 3; } },
        { id: 'tank_3c', name: 'Battle Regen', desc: 'Heal 1 HP on kill', tier: 2, requires: ['tank_1c'], apply: (p) => { p.healOnKill = (p.healOnKill || 0) + 1; } },
        
        // Tier 3 - Advanced defense
        { id: 'tank_4', name: 'Guardian', desc: '+50 Max HP, +15% Reduction', tier: 3, requires: ['tank_2'], apply: (p) => { p.maxHp += 50; p.damageReduction = (p.damageReduction || 0) + 0.15; } },
        { id: 'tank_4b', name: 'Bulwark', desc: '+25% Damage Reduction', tier: 3, requires: ['tank_2', 'tank_2b'], apply: (p) => { p.damageReduction = (p.damageReduction || 0) + 0.25; } },
        { id: 'tank_4c', name: 'Shield Wall', desc: 'Block 15 damage from first hit per room', tier: 3, requires: ['tank_2c'], apply: (p) => { p.shieldWall = 15; } },
        
        // Tier 3 - Special abilities
        { id: 'tank_5', name: 'Last Stand', desc: 'Survive fatal damage once per room', tier: 3, requires: ['tank_2'], apply: (p) => { p.lastStand = true; } },
        { id: 'tank_5b', name: 'Second Wind', desc: 'Heal to 30% HP on fatal damage', tier: 3, requires: ['tank_3', 'tank_3b'], apply: (p) => { p.secondWind = true; } },
        { id: 'tank_5c', name: 'Thorn Armor', desc: 'Reflect 20% damage taken', tier: 3, requires: ['tank_3c'], apply: (p) => { p.thornDamage = 0.20; } },
        
        // Tier 4 - Master nodes
        { id: 'tank_6', name: 'Immortal', desc: '+100 Max HP, +30% Reduction', tier: 4, requires: ['tank_4', 'tank_5'], apply: (p) => { p.maxHp += 100; p.damageReduction = (p.damageReduction || 0) + 0.30; } },
        { id: 'tank_6b', name: 'Colossus', desc: '+150 Max HP, -10% Move Speed', tier: 4, requires: ['tank_4b'], apply: (p) => { p.maxHp += 150; p.speedMultBase = (p.speedMultBase || 1) * 0.90; } },
        { id: 'tank_6c', name: 'Juggernaut', desc: '+50 HP, heal 5 HP per second', tier: 4, requires: ['tank_5b', 'tank_5c'], apply: (p) => { p.maxHp += 50; p.healthRegen = (p.healthRegen || 0) + 5; } },
        
        // Tier 5 - Ultimate
        { id: 'tank_ultimate', name: 'FORTRESS MODE', desc: 'Press Q: 5s invulnerable, +100% damage', tier: 5, requires: ['tank_6', 'tank_6b'], ultimate: true, apply: (p) => { p.abilities.fortressMode = true; } },
        
        // Tier 6 - GODLIKE (Cost 2 skill points each)
        { id: 'tank_god1', name: 'TITAN FORM', desc: '+300 HP, +50% reduction, immune to knock', tier: 6, cost: 2, requires: ['tank_ultimate'], apply: (p) => { p.maxHp += 300; p.damageReduction = (p.damageReduction || 0) + 0.50; p.knockImmune = true; } },
        { id: 'tank_god2', name: 'IMMORTAL WILL', desc: 'Survive 3 fatal hits per room', tier: 6, cost: 2, requires: ['tank_ultimate'], apply: (p) => { p.lastStandCharges = 3; } },
        
        // Tier 7 - TRANSCENDENT (Cost 3 skill points)
        { id: 'tank_trans', name: 'ETERNAL GUARDIAN', desc: '+500 HP, +75% reduction, heal 10/sec, reflect 50% damage', tier: 7, cost: 3, requires: ['tank_god1', 'tank_god2'], apply: (p) => { p.maxHp += 500; p.damageReduction = (p.damageReduction || 0) + 0.75; p.healthRegen = (p.healthRegen || 0) + 10; p.thornDamage = (p.thornDamage || 0) + 0.50; } }
      ]
    },
    
    dps: {
      name: 'Annihilator',
      color: '#f44336',
      icon: '⚔️',
      description: 'Raw damage output',
      skills: [
        // Tier 1 - Starting nodes
        { id: 'dps_1', name: 'Power Shot', desc: '+18% Damage', tier: 1, requires: [], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 1.18; } },
        { id: 'dps_1b', name: 'Sharpshooter', desc: '+15% Damage', tier: 1, requires: [], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 1.15; } },
        { id: 'dps_1c', name: 'Marksman', desc: '+12% Damage, +5% Crit', tier: 1, requires: [], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 1.12; p.critChance = (p.critChance || 0) + 0.05; } },
        
        // Tier 2 - Fire rate path
        { id: 'dps_2', name: 'Rapid Fire', desc: '+20% Fire Rate', tier: 2, requires: ['dps_1'], apply: (p) => { p.fireRateMultBase = (p.fireRateMultBase || 1) * 1.20; } },
        { id: 'dps_2b', name: 'Quick Draw', desc: '+25% Fire Rate', tier: 2, requires: ['dps_1b'], apply: (p) => { p.fireRateMultBase = (p.fireRateMultBase || 1) * 1.25; } },
        { id: 'dps_2c', name: 'Trigger Finger', desc: '+15% Fire Rate, +10% Reload', tier: 2, requires: ['dps_1c'], apply: (p) => { p.fireRateMultBase = (p.fireRateMultBase || 1) * 1.15; p.reloadSpeed = (p.reloadSpeed || 1) * 1.10; } },
        
        // Tier 2 - Crit path
        { id: 'dps_3', name: 'Critical Strike', desc: '+10% Crit, x2.5 Damage', tier: 2, requires: ['dps_1'], apply: (p) => { p.critChance = (p.critChance || 0) + 0.10; p.critMult = 2.5; } },
        { id: 'dps_3b', name: 'Precise Aim', desc: '+15% Crit Chance', tier: 2, requires: ['dps_1b'], apply: (p) => { p.critChance = (p.critChance || 0) + 0.15; } },
        { id: 'dps_3c', name: 'Deadly Force', desc: 'x3.0 Crit Damage', tier: 2, requires: ['dps_1c'], apply: (p) => { p.critMult = 3.0; } },
        
        // Tier 3 - Damage amplification
        { id: 'dps_4', name: 'Executioner', desc: '+50% damage below 30% HP', tier: 3, requires: ['dps_2'], apply: (p) => { p.executioner = true; } },
        { id: 'dps_4b', name: 'Assassin', desc: '+100% damage to full HP enemies', tier: 3, requires: ['dps_2b', 'dps_3b'], apply: (p) => { p.assassin = true; } },
        { id: 'dps_4c', name: 'Berserker', desc: '+2% damage per 10% HP missing', tier: 3, requires: ['dps_2c'], apply: (p) => { p.berserker = true; } },
        
        // Tier 3 - Multi-projectile
        { id: 'dps_5', name: 'Multi-Shot', desc: 'Fire 2 extra projectiles', tier: 3, requires: ['dps_3'], apply: (p) => { p.multiShot = (p.multiShot || 0) + 2; } },
        { id: 'dps_5b', name: 'Spread Fire', desc: 'Fire 3 extra projectiles', tier: 3, requires: ['dps_3b'], apply: (p) => { p.multiShot = (p.multiShot || 0) + 3; } },
        { id: 'dps_5c', name: 'Chain Lightning', desc: 'Shots chain to 2 nearby enemies', tier: 3, requires: ['dps_3c'], apply: (p) => { p.chainShots = 2; } },
        
        // Tier 4 - Master nodes
        { id: 'dps_6', name: 'Obliterate', desc: '+40% Damage, +30% Fire Rate', tier: 4, requires: ['dps_4', 'dps_5'], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 1.40; p.fireRateMultBase = (p.fireRateMultBase || 1) * 1.30; } },
        { id: 'dps_6b', name: 'Annihilate', desc: '+60% Damage, crits explode', tier: 4, requires: ['dps_4b', 'dps_5b'], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 1.60; p.critExplode = true; } },
        { id: 'dps_6c', name: 'Rampage', desc: 'Each kill grants +5% damage (stacks)', tier: 4, requires: ['dps_4c', 'dps_5c'], apply: (p) => { p.rampage = true; } },
        
        // Tier 5 - Ultimate
        { id: 'dps_ultimate', name: 'BERSERK RAGE', desc: 'Press Q: 8s +150% damage, +50% fire rate', tier: 5, requires: ['dps_6', 'dps_6b'], ultimate: true, apply: (p) => { p.abilities.berserkRage = true; } },
        
        // Tier 6 - GODLIKE (Cost 2 skill points each)
        { id: 'dps_god1', name: 'APOCALYPSE', desc: '+200% damage, +100% fire rate', tier: 6, cost: 2, requires: ['dps_ultimate'], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 3.0; p.fireRateMultBase = (p.fireRateMultBase || 1) * 2.0; } },
        { id: 'dps_god2', name: 'PERFECT AIM', desc: '50% crit chance, x5.0 crit damage', tier: 6, cost: 2, requires: ['dps_ultimate'], apply: (p) => { p.critChance = (p.critChance || 0) + 0.50; p.critMult = 5.0; } },
        
        // Tier 7 - TRANSCENDENT (Cost 3 skill points)
        { id: 'dps_trans', name: 'GOD OF WAR', desc: '+500% damage, +200% fire rate, +10 projectiles, crits explode twice', tier: 7, cost: 3, requires: ['dps_god1', 'dps_god2'], apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 6.0; p.fireRateMultBase = (p.fireRateMultBase || 1) * 3.0; p.multiShot = (p.multiShot || 0) + 10; p.critExplode = true; p.critExplodeRadius = 2.0; } }
      ]
    },
    
    support: {
      name: 'Tactician',
      color: '#2196f3',
      icon: '✨',
      description: 'Utility and mobility',
      skills: [
        // Tier 1 - Starting nodes
        { id: 'supp_1', name: 'Swift Moves', desc: '+18% Move Speed', tier: 1, requires: [], apply: (p) => { p.speedMultBase = (p.speedMultBase || 1) * 1.18; } },
        { id: 'supp_1b', name: 'Agility', desc: '+15% Move Speed', tier: 1, requires: [], apply: (p) => { p.speedMultBase = (p.speedMultBase || 1) * 1.15; } },
        { id: 'supp_1c', name: 'Fleet Foot', desc: '+20% Move Speed', tier: 1, requires: [], apply: (p) => { p.speedMultBase = (p.speedMultBase || 1) * 1.20; } },
        
        // Tier 2 - Dash path
        { id: 'supp_2', name: 'Nimble Dodge', desc: '-35% Dash Cooldown', tier: 2, requires: ['supp_1'], apply: (p) => { p.dashCdMult = (p.dashCdMult || 1) * 0.65; } },
        { id: 'supp_2b', name: 'Quick Dash', desc: '-40% Dash Cooldown', tier: 2, requires: ['supp_1b'], apply: (p) => { p.dashCdMult = (p.dashCdMult || 1) * 0.60; } },
        { id: 'supp_2c', name: 'Double Dash', desc: 'Dash twice before cooldown', tier: 2, requires: ['supp_1c'], apply: (p) => { p.dashCharges = 2; } },
        
        // Tier 2 - Sustain path
        { id: 'supp_3', name: 'Vampirism', desc: '5% Lifesteal', tier: 2, requires: ['supp_1'], apply: (p) => { p.lifesteal = (p.lifesteal || 0) + 0.05; } },
        { id: 'supp_3b', name: 'Blood Drain', desc: '8% Lifesteal', tier: 2, requires: ['supp_1b'], apply: (p) => { p.lifesteal = (p.lifesteal || 0) + 0.08; } },
        { id: 'supp_3c', name: 'Soul Harvest', desc: 'Heal 5 HP per kill', tier: 2, requires: ['supp_1c'], apply: (p) => { p.healOnKill = (p.healOnKill || 0) + 5; } },
        
        // Tier 3 - Advanced mobility
        { id: 'supp_4', name: 'Phase Dash', desc: 'Dash through enemies', tier: 3, requires: ['supp_2'], apply: (p) => { p.phaseDash = true; } },
        { id: 'supp_4b', name: 'Shadow Step', desc: 'Dash through bullets', tier: 3, requires: ['supp_2b'], apply: (p) => { p.shadowStep = true; } },
        { id: 'supp_4c', name: 'Blink', desc: 'Teleport dash, +50% range', tier: 3, requires: ['supp_2c'], apply: (p) => { p.blinkDash = true; p.dashRange = (p.dashRange || 1) * 1.50; } },
        
        // Tier 3 - Sustain mastery
        { id: 'supp_5', name: 'Blood Magic', desc: 'Restore 8 HP per kill', tier: 3, requires: ['supp_3'], apply: (p) => { p.bloodMagic = (p.bloodMagic || 0) + 8; } },
        { id: 'supp_5b', name: 'Leech', desc: '12% Lifesteal', tier: 3, requires: ['supp_3b'], apply: (p) => { p.lifesteal = (p.lifesteal || 0) + 0.12; } },
        { id: 'supp_5c', name: 'Adrenaline', desc: '+30% speed for 3s on kill', tier: 3, requires: ['supp_3c'], apply: (p) => { p.adrenalineRush = true; } },
        
        // Tier 4 - Master nodes
        { id: 'supp_6', name: 'Ghost Walker', desc: 'Permanent phase, +25% speed', tier: 4, requires: ['supp_4', 'supp_5'], apply: (p) => { p.ghostWalker = true; p.speedMultBase = (p.speedMultBase || 1) * 1.25; } },
        { id: 'supp_6b', name: 'Phantom', desc: '50% dodge chance', tier: 4, requires: ['supp_4b', 'supp_5b'], apply: (p) => { p.dodgeChance = 0.50; } },
        { id: 'supp_6c', name: 'Untouchable', desc: 'Immune while dashing', tier: 4, requires: ['supp_4c', 'supp_5c'], apply: (p) => { p.dashImmunity = true; } },
        
        // Tier 5 - Ultimate
        { id: 'supp_ultimate', name: 'TIME WARP', desc: 'Press Q: 6s slow all enemies 70%', tier: 5, requires: ['supp_6', 'supp_6b'], ultimate: true, apply: (p) => { p.abilities.timeWarp = true; } },
        
        // Tier 6 - GODLIKE (Cost 2 skill points each)
        { id: 'supp_god1', name: 'SHADOW FORM', desc: '+100% speed, 75% dodge, phase everything', tier: 6, cost: 2, requires: ['supp_ultimate'], apply: (p) => { p.speedMultBase = (p.speedMultBase || 1) * 2.0; p.dodgeChance = (p.dodgeChance || 0) + 0.75; p.ghostWalker = true; } },
        { id: 'supp_god2', name: 'BLOOD GOD', desc: '50% lifesteal, +30 HP/kill, heal on damage', tier: 6, cost: 2, requires: ['supp_ultimate'], apply: (p) => { p.lifesteal = (p.lifesteal || 0) + 0.50; p.healOnKill = (p.healOnKill || 0) + 30; p.healOnHit = 2; } },
        
        // Tier 7 - TRANSCENDENT (Cost 3 skill points)
        { id: 'supp_trans', name: 'PHANTOM LORD', desc: '+200% speed, 90% dodge, instant dash, +100% lifesteal', tier: 7, cost: 3, requires: ['supp_god1', 'supp_god2'], apply: (p) => { p.speedMultBase = (p.speedMultBase || 1) * 3.0; p.dodgeChance = 0.90; p.dashCdMult = 0.01; p.lifesteal = (p.lifesteal || 0) + 1.0; p.dashImmunity = true; } }
      ]
    }
  }
};

// Skill tree state management
export class SkillTreeManager {
  constructor(player) {
    this.player = player;
    this.unlockedSkills = new Set();
    this.selectedBranch = null; // null, 'tank', 'dps', or 'support'
    this.skillPoints = 0;
    
    // Camera/viewport for panning
    this.cameraX = 0;
    this.cameraY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartCameraX = 0;
    this.dragStartCameraY = 0;
    
    // Initialize abilities object on player
    if (!player.abilities) {
      player.abilities = {
        fortressMode: false,
        berserkRage: false,
        timeWarp: false,
        abilityCd: 0,
        abilityActive: false,
        abilityDuration: 0
      };
    }
  }
  
  canUnlock(skillId) {
    // Find the skill
    let skill = null;
    let branch = null;
    
    // Check branches
    for (const [branchName, branchData] of Object.entries(SKILL_TREE.branches)) {
      const found = branchData.skills.find(s => s.id === skillId);
      if (found) {
        skill = found;
        branch = branchName;
        break;
      }
    }
    
    if (!skill) return false;
    if (this.unlockedSkills.has(skillId)) return false;
    
    // Check if player has enough skill points (skills can cost more than 1)
    const cost = skill.cost || 1;
    if (this.skillPoints < cost) return false;
    
    // Branch selection check: if this is a branch skill, either no branch selected yet or same branch
    if (branch) {
      if (this.selectedBranch && this.selectedBranch !== branch) return false;
    }
    
    // Check requirements
    if (skill.requires && skill.requires.length > 0) {
      return skill.requires.every(reqId => this.unlockedSkills.has(reqId));
    }
    
    return true;
  }
  
  unlockSkill(skillId) {
    if (!this.canUnlock(skillId)) return false;
    
    // Find and apply the skill
    let skill = null;
    let branch = null;
    
    for (const [branchName, branchData] of Object.entries(SKILL_TREE.branches)) {
      const found = branchData.skills.find(s => s.id === skillId);
      if (found) {
        skill = found;
        branch = branchName;
        break;
      }
    }
    
    if (!skill) {
      skill = SKILL_TREE.universal.find(s => s.id === skillId);
    }
    
    if (!skill) return false;
    
    // Lock branch on first selection
    if (branch && !this.selectedBranch) {
      this.selectedBranch = branch;
    }
    
    // Apply skill effect
    skill.apply(this.player);
    this.unlockedSkills.add(skillId);
    
    // Deduct skill points based on cost
    const cost = skill.cost || 1;
    this.skillPoints -= cost;
    
    // Set ultimate type if this is an ultimate skill
    if (skill.ultimate) {
      if (skillId === 'tank_ultimate') {
        this.player.ultimateType = 'fortress';
      } else if (skillId === 'dps_ultimate') {
        this.player.ultimateType = 'berserk';
      } else if (skillId === 'supp_ultimate') {
        this.player.ultimateType = 'timewarp';
      }
    }
    
    return true;
  }
  
  addSkillPoint() {
    this.skillPoints++;
  }
  
  getAvailableSkills() {
    const available = [];
    
    // Add branch skills
    for (const [branchName, branchData] of Object.entries(SKILL_TREE.branches)) {
      if (this.selectedBranch && this.selectedBranch !== branchName) continue;
      
      for (const skill of branchData.skills) {
        if (this.canUnlock(skill.id)) {
          available.push({ ...skill, branch: branchName, branchColor: branchData.color, branchIcon: branchData.icon });
        }
      }
    }
    
    return available;
  }
}
