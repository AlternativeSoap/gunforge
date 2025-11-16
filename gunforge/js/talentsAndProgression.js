// talentsAndProgression.js
// Persistent talent tree and character class system

export const TALENT_TREES = {
  combat: {
    name: 'Combat',
    icon: '⚔️',
    color: '#f44336',
    talents: {
      damage_boost_1: { name: 'Firepower I', desc: '+10% weapon damage', cost: 1, effect: { damageMult: 1.1 } },
      damage_boost_2: { name: 'Firepower II', desc: '+15% weapon damage', cost: 2, requires: 'damage_boost_1', effect: { damageMult: 1.15 } },
      damage_boost_3: { name: 'Firepower III', desc: '+20% weapon damage', cost: 3, requires: 'damage_boost_2', effect: { damageMult: 1.2 } },
      
      crit_chance_1: { name: 'Critical Eye I', desc: '+5% crit chance', cost: 1, effect: { critChance: 0.05 } },
      crit_chance_2: { name: 'Critical Eye II', desc: '+10% crit chance', cost: 2, requires: 'crit_chance_1', effect: { critChance: 0.1 } },
      crit_damage: { name: 'Devastating Blows', desc: '+50% crit damage', cost: 3, requires: 'crit_chance_2', effect: { critMult: 1.5 } },
      
      fire_rate: { name: 'Rapid Fire', desc: '+20% fire rate', cost: 2, effect: { fireRateMult: 1.2 } },
      reload_speed: { name: 'Quick Hands', desc: '+30% reload speed', cost: 1, effect: { reloadMult: 0.7 } },
      
      pierce: { name: 'Piercing Rounds', desc: '+2 projectile pierce', cost: 2, effect: { pierce: 2 } },
      explosions: { name: 'Volatile Rounds', desc: '10% chance for bullets to explode', cost: 3, requires: 'damage_boost_2', effect: { explodeChance: 0.1, explodeRadius: 80, explodeDamage: 30 } }
    }
  },
  
  defense: {
    name: 'Defense',
    icon: '🛡️',
    color: '#2196f3',
    talents: {
      max_hp_1: { name: 'Vitality I', desc: '+20 max HP', cost: 1, effect: { maxHpBonus: 20 } },
      max_hp_2: { name: 'Vitality II', desc: '+30 max HP', cost: 2, requires: 'max_hp_1', effect: { maxHpBonus: 30 } },
      max_hp_3: { name: 'Vitality III', desc: '+50 max HP', cost: 3, requires: 'max_hp_2', effect: { maxHpBonus: 50 } },
      
      armor_1: { name: 'Thick Skin I', desc: '+10% damage reduction', cost: 1, effect: { armorMult: 0.9 } },
      armor_2: { name: 'Thick Skin II', desc: '+15% damage reduction', cost: 2, requires: 'armor_1', effect: { armorMult: 0.85 } },
      armor_3: { name: 'Fortified', desc: '+25% damage reduction', cost: 3, requires: 'armor_2', effect: { armorMult: 0.75 } },
      
      regen: { name: 'Regeneration', desc: 'Heal 2 HP per second', cost: 2, effect: { regenRate: 2 } },
      lifesteal: { name: 'Vampiric', desc: '5% lifesteal', cost: 3, requires: 'regen', effect: { lifesteal: 0.05 } },
      
      dodge: { name: 'Evasion', desc: '10% chance to dodge attacks', cost: 2, effect: { dodgeChance: 0.1 } },
      shield: { name: 'Energy Shield', desc: 'Start with 25 shield HP', cost: 3, requires: 'armor_2', effect: { shieldHp: 25 } }
    }
  },
  
  utility: {
    name: 'Utility',
    icon: '⚡',
    color: '#4caf50',
    talents: {
      move_speed_1: { name: 'Swift I', desc: '+10% movement speed', cost: 1, effect: { speedMult: 1.1 } },
      move_speed_2: { name: 'Swift II', desc: '+15% movement speed', cost: 2, requires: 'move_speed_1', effect: { speedMult: 1.15 } },
      dash: { name: 'Dash', desc: 'Unlock dash ability (Space)', cost: 3, requires: 'move_speed_2', effect: { dashUnlock: true, dashCooldown: 3, dashDist: 150 } },
      
      luck_1: { name: 'Fortune I', desc: '+15% item drop rate', cost: 1, effect: { luckMult: 1.15 } },
      luck_2: { name: 'Fortune II', desc: '+30% item drop rate', cost: 2, requires: 'luck_1', effect: { luckMult: 1.3 } },
      treasure: { name: 'Treasure Hunter', desc: '+50% rare loot chance', cost: 3, requires: 'luck_2', effect: { rarityBonus: 0.5 } },
      
      xp_boost: { name: 'Quick Learner', desc: '+25% XP gain', cost: 2, effect: { xpMult: 1.25 } },
      starting_weapon: { name: 'Armed Start', desc: 'Start with uncommon weapon', cost: 2, effect: { startWeaponRarity: 'uncommon' } },
      
      heal_bonus: { name: 'Medic Training', desc: '+50% healing from pickups', cost: 1, effect: { healMult: 1.5 } },
      merchant: { name: 'Haggler', desc: '20% shop discount', cost: 2, requires: 'luck_1', effect: { shopDiscount: 0.2 } }
    }
  }
};

export const CHARACTER_CLASSES = {
  soldier: {
    name: 'Soldier',
    icon: '🎖️',
    description: 'Balanced combatant with reliable firepower',
    color: '#8d6e63',
    stats: {
      maxHp: 100,
      speed: 160,
      startingWeapons: ['rifle', 'pistol']
    },
    passive: {
      name: 'Combat Veteran',
      desc: '+15% weapon damage, +10% max HP',
      effects: { damageMult: 1.15, maxHpMult: 1.1 }
    }
  },
  
  assassin: {
    name: 'Assassin',
    icon: '🗡️',
    description: 'Fast and deadly, strikes from shadows',
    color: '#7c4dff',
    stats: {
      maxHp: 75,
      speed: 200,
      startingWeapons: ['katana', 'dualpistol']
    },
    passive: {
      name: 'Shadow Strike',
      desc: '+50% crit damage, +25% move speed, -25% max HP',
      effects: { critMult: 1.5, speedMult: 1.25, maxHpMult: 0.75 }
    }
  },
  
  tank: {
    name: 'Tank',
    icon: '🛡️',
    description: 'Heavily armored, absorbs punishment',
    color: '#546e7a',
    stats: {
      maxHp: 150,
      speed: 130,
      startingWeapons: ['shotgun', 'war_hammer']
    },
    passive: {
      name: 'Fortress',
      desc: '+50% max HP, +20% damage reduction, -15% move speed',
      effects: { maxHpMult: 1.5, armorMult: 0.8, speedMult: 0.85 }
    }
  },
  
  demolitionist: {
    name: 'Demolitionist',
    icon: '💣',
    description: 'Explosive specialist causing mayhem',
    color: '#ff6f00',
    stats: {
      maxHp: 90,
      speed: 150,
      startingWeapons: ['grenade', 'scatter']
    },
    passive: {
      name: 'Explosive Expert',
      desc: '+50% explosion radius, +30% explosion damage',
      effects: { explosionRadiusMult: 1.5, explosionDamageMult: 1.3 }
    }
  }
};

export const ACHIEVEMENTS = {
  first_blood: {
    name: 'First Blood',
    desc: 'Defeat your first enemy',
    icon: '🩸',
    reward: { coins: 50, talentPoints: 1 },
    check: (stats) => stats.enemiesKilled >= 1
  },
  
  slayer: {
    name: 'Slayer',
    desc: 'Defeat 100 enemies',
    icon: '⚔️',
    reward: { coins: 200, talentPoints: 2 },
    check: (stats) => stats.enemiesKilled >= 100
  },
  
  massacre: {
    name: 'Massacre',
    desc: 'Defeat 1000 enemies',
    icon: '💀',
    reward: { coins: 1000, talentPoints: 5 },
    check: (stats) => stats.enemiesKilled >= 1000
  },
  
  boss_slayer: {
    name: 'Boss Slayer',
    desc: 'Defeat your first boss',
    icon: '👑',
    reward: { coins: 150, talentPoints: 2 },
    check: (stats) => stats.bossesKilled >= 1
  },
  
  survivor: {
    name: 'Survivor',
    desc: 'Reach floor 5',
    icon: '🏆',
    reward: { coins: 250, talentPoints: 2 },
    check: (stats) => stats.maxFloor >= 5
  },
  
  deep_delver: {
    name: 'Deep Delver',
    desc: 'Reach floor 10',
    icon: '🏅',
    reward: { coins: 500, talentPoints: 3 },
    check: (stats) => stats.maxFloor >= 10
  },
  
  treasure_hunter: {
    name: 'Treasure Hunter',
    desc: 'Open 50 chests',
    icon: '📦',
    reward: { coins: 200, talentPoints: 1 },
    check: (stats) => stats.chestsOpened >= 50
  },
  
  wealthy: {
    name: 'Wealthy',
    desc: 'Collect 10,000 coins (total)',
    icon: '💰',
    reward: { talentPoints: 3 },
    check: (stats) => stats.coinsCollected >= 10000
  },
  
  legendary_find: {
    name: 'Legendary Find',
    desc: 'Find a legendary weapon',
    icon: '🌟',
    reward: { coins: 500, talentPoints: 2 },
    check: (stats) => stats.legendaryFound >= 1
  },
  
  perfectionist: {
    name: 'Perfectionist',
    desc: 'Complete a floor without taking damage',
    icon: '✨',
    reward: { coins: 300, talentPoints: 2 },
    check: (stats) => stats.flawlessFloors >= 1
  },
  
  speed_runner: {
    name: 'Speed Runner',
    desc: 'Complete floor 1 in under 2 minutes',
    icon: '⏱️',
    reward: { coins: 200, talentPoints: 1 },
    check: (stats) => stats.fastestFloor1 && stats.fastestFloor1 < 120
  },
  
  combo_master: {
    name: 'Combo Master',
    desc: 'Get a 50 kill streak',
    icon: '🔥',
    reward: { coins: 300, talentPoints: 2 },
    check: (stats) => stats.maxKillStreak >= 50
  },
  
  elite_hunter: {
    name: 'Elite Hunter',
    desc: 'Defeat 20 elite enemies',
    icon: '⭐',
    reward: { coins: 400, talentPoints: 2 },
    check: (stats) => stats.elitesKilled >= 20
  },
  
  arsenal: {
    name: 'Arsenal',
    desc: 'Try 25 different weapons',
    icon: '🔫',
    reward: { coins: 300, talentPoints: 2 },
    check: (stats) => stats.weaponsUsed && stats.weaponsUsed.size >= 25
  },
  
  unstoppable: {
    name: 'Unstoppable',
    desc: 'Defeat a boss without taking damage',
    icon: '🛡️',
    reward: { coins: 500, talentPoints: 3 },
    check: (stats) => stats.flawlessBosses >= 1
  }
};

// Persistent player progression
export class PlayerProgression {
  constructor() {
    this.load();
  }

  load() {
    const saved = localStorage.getItem('gunforge_progression');
    if (saved) {
      const data = JSON.parse(saved);
      this.stats = data.stats || this.getDefaultStats();
      this.talents = data.talents || {};
      this.talentPoints = data.talentPoints || 0;
      this.unlockedAchievements = new Set(data.unlockedAchievements || []);
      this.selectedClass = data.selectedClass || 'soldier';
    } else {
      this.stats = this.getDefaultStats();
      this.talents = {};
      this.talentPoints = 0;
      this.unlockedAchievements = new Set();
      this.selectedClass = 'soldier';
    }
  }

  save() {
    const data = {
      stats: this.stats,
      talents: this.talents,
      talentPoints: this.talentPoints,
      unlockedAchievements: Array.from(this.unlockedAchievements),
      selectedClass: this.selectedClass
    };
    localStorage.setItem('gunforge_progression', JSON.stringify(data));
  }

  getDefaultStats() {
    return {
      enemiesKilled: 0,
      bossesKilled: 0,
      elitesKilled: 0,
      maxFloor: 0,
      chestsOpened: 0,
      coinsCollected: 0,
      legendaryFound: 0,
      flawlessFloors: 0,
      fastestFloor1: null,
      maxKillStreak: 0,
      flawlessBosses: 0,
      weaponsUsed: new Set(),
      runsCompleted: 0,
      totalDeaths: 0
    };
  }

  unlockTalent(treeId, talentId) {
    const key = `${treeId}.${talentId}`;
    const tree = TALENT_TREES[treeId];
    const talent = tree.talents[talentId];
    
    if (this.talents[key]) return false; // Already unlocked
    if (this.talentPoints < talent.cost) return false; // Not enough points
    
    // Check requirements
    if (talent.requires) {
      const reqKey = `${treeId}.${talent.requires}`;
      if (!this.talents[reqKey]) return false;
    }
    
    this.talents[key] = true;
    this.talentPoints -= talent.cost;
    this.save();
    return true;
  }

  getTalentEffects() {
    const effects = {};
    
    for (const key in this.talents) {
      const [treeId, talentId] = key.split('.');
      const talent = TALENT_TREES[treeId].talents[talentId];
      
      // Merge effects
      for (const effectKey in talent.effect) {
        if (effectKey.endsWith('Mult')) {
          effects[effectKey] = (effects[effectKey] || 1) * talent.effect[effectKey];
        } else {
          effects[effectKey] = (effects[effectKey] || 0) + talent.effect[effectKey];
        }
      }
    }
    
    return effects;
  }

  checkAchievements() {
    const newUnlocks = [];
    
    for (const id in ACHIEVEMENTS) {
      if (this.unlockedAchievements.has(id)) continue;
      
      const achievement = ACHIEVEMENTS[id];
      if (achievement.check(this.stats)) {
        this.unlockedAchievements.add(id);
        
        // Grant rewards
        if (achievement.reward.coins) {
          // Would add coins to player
        }
        if (achievement.reward.talentPoints) {
          this.talentPoints += achievement.reward.talentPoints;
        }
        
        newUnlocks.push(achievement);
      }
    }
    
    if (newUnlocks.length > 0) {
      this.save();
    }
    
    return newUnlocks;
  }

  getClassEffects() {
    const classData = CHARACTER_CLASSES[this.selectedClass];
    return classData.passive.effects;
  }

  getCombinedEffects() {
    const talentEffects = this.getTalentEffects();
    const classEffects = this.getClassEffects();
    
    const combined = { ...talentEffects };
    
    // Merge class effects
    for (const key in classEffects) {
      if (key.endsWith('Mult')) {
        combined[key] = (combined[key] || 1) * classEffects[key];
      } else {
        combined[key] = (combined[key] || 0) + classEffects[key];
      }
    }
    
    return combined;
  }
}
