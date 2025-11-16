// gameFeatures.js
// Additional game features: telegraphing, secrets, combos, room events

// ATTACK TELEGRAPHING
export class AttackTelegraph {
  constructor(x, y, type, params) {
    this.x = x;
    this.y = y;
    this.type = type; // 'circle', 'line', 'cone'
    this.params = params;
    this.duration = params.duration || 1.0;
    this.timer = 0;
    this.active = true;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
      return true; // telegraph complete, trigger attack
    }
    return false;
  }

  draw(ctx) {
    const progress = this.timer / this.duration;
    const flash = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
    
    ctx.save();
    ctx.globalAlpha = 0.3 + flash * 0.4;
    
    switch(this.type) {
      case 'circle':
        ctx.strokeStyle = '#ff1744';
        ctx.fillStyle = 'rgba(255, 23, 68, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.params.radius * progress, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'line':
        const dx = Math.cos(this.params.angle) * this.params.length;
        const dy = Math.sin(this.params.angle) * this.params.length;
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = this.params.width || 20;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + dx * progress, this.y + dy * progress);
        ctx.stroke();
        break;
        
      case 'cone':
        ctx.fillStyle = 'rgba(255, 23, 68, 0.3)';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.params.radius * progress, 
                this.params.angle - this.params.arc / 2, 
                this.params.angle + this.params.arc / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }
}

// WEAPON COMBOS
export const WEAPON_COMBOS = {
  // Ranged + Melee
  'shotgun+katana': {
    name: 'Close Quarters Master',
    bonus: { damageMult: 1.2, speedBonus: 15 },
    desc: '+20% damage, +15% move speed'
  },
  'rifle+war_hammer': {
    name: 'Tactical Bruiser',
    bonus: { knockMult: 1.4, armorMult: 0.9 },
    desc: '+40% knockback, +10% damage reduction'
  },
  
  // Dual Ranged
  'pistol+smg': {
    name: 'Gun Slinger',
    bonus: { fireRateMult: 1.15, spreadMult: 0.9 },
    desc: '+15% fire rate, +10% accuracy'
  },
  'shotgun+rifle': {
    name: 'Versatile Marksman',
    bonus: { damageMult: 1.15, reloadMult: 0.85 },
    desc: '+15% damage, +15% reload speed'
  },
  'sniper+pistol': {
    name: 'Sniper Support',
    bonus: { critChance: 0.15, rangeMult: 1.2 },
    desc: '+15% crit chance, +20% range'
  },
  
  // Elemental Combos
  'ignite+ice': {
    name: 'Thermal Shock',
    bonus: { statusDamageMult: 1.5, explosionChance: 0.15 },
    desc: '+50% status damage, 15% freeze-shatter explosion'
  },
  'shock+toxin': {
    name: 'Corrosive Storm',
    bonus: { chainBonus: 2, dotMult: 1.3 },
    desc: '+2 chain targets, +30% DoT damage'
  },
  
  // Heavy Weapons
  'cannon+grenade': {
    name: 'Demolition Expert',
    bonus: { explosionRadiusMult: 1.4, explosionDamageMult: 1.3 },
    desc: '+40% explosion radius, +30% explosion damage'
  },
  'laser+plasma': {
    name: 'Energy Weapons Specialist',
    bonus: { damageMult: 1.25, pierce: 3 },
    desc: '+25% damage, +3 pierce'
  },
  
  // Support Combos
  'bow+crossbow': {
    name: 'Master Archer',
    bonus: { chargeSpeedMult: 1.5, pierceMult: 2 },
    desc: '+50% charge speed, Double pierce'
  }
};

export function getWeaponCombo(weapon1, weapon2) {
  if (!weapon1 || !weapon2) return null;
  
  const key1 = `${weapon1.id}+${weapon2.id}`;
  const key2 = `${weapon2.id}+${weapon1.id}`;
  
  return WEAPON_COMBOS[key1] || WEAPON_COMBOS[key2] || null;
}

// SECRET ROOMS
export class SecretWall {
  constructor(x, y, width, height, roomData) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.revealed = false;
    this.opening = false;
    this.openProgress = 0;
    this.roomData = roomData; // Data for secret room beyond
    this.hitCount = 0;
    this.hitsToReveal = 3;
  }

  checkProximity(px, py) {
    const dist = Math.sqrt(
      Math.pow(Math.max(this.x, Math.min(px, this.x + this.width)) - px, 2) +
      Math.pow(Math.max(this.y, Math.min(py, this.y + this.height)) - py, 2)
    );
    return dist < 50; // Reveal when very close
  }

  hit() {
    this.hitCount++;
    if (this.hitCount >= this.hitsToReveal && !this.revealed) {
      this.revealed = true;
      this.opening = true;
      return true; // Wall broken
    }
    return false;
  }

  update(dt) {
    if (this.opening) {
      this.openProgress += dt * 2; // Open in 0.5s
      if (this.openProgress >= 1) {
        this.openProgress = 1;
        this.opening = false;
      }
    }
  }

  isPassable() {
    return this.openProgress >= 1;
  }

  draw(ctx) {
    if (this.openProgress >= 1) return; // Fully open, don't draw
    
    ctx.save();
    
    const alpha = 1 - this.openProgress;
    ctx.globalAlpha = alpha;
    
    // Draw cracked wall texture
    if (!this.revealed) {
      // Hidden - looks like normal wall but with subtle cracks
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Subtle crack hints
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width * 0.3, this.y);
      ctx.lineTo(this.x + this.width * 0.35, this.y + this.height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(this.x + this.width * 0.7, this.y);
      ctx.lineTo(this.x + this.width * 0.65, this.y + this.height);
      ctx.stroke();
    } else {
      // Revealed - heavy cracking
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Many cracks
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const startX = this.x + Math.random() * this.width;
        const startY = this.y + Math.random() * this.height;
        const endX = this.x + Math.random() * this.width;
        const endY = this.y + Math.random() * this.height;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      
      // Glowing edges (secret detected)
      const glow = Math.sin(performance.now() / 200) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255, 215, 0, ${glow * 0.6})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    // Shake effect when opening
    if (this.opening) {
      const shake = (Math.random() - 0.5) * 10 * (1 - this.openProgress);
      ctx.translate(shake, shake);
    }
    
    // Hit indicators
    if (this.hitCount > 0 && !this.revealed) {
      ctx.fillStyle = '#ffab00';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.hitCount}/${this.hitsToReveal}`, 
                   this.x + this.width / 2, 
                   this.y + this.height / 2);
    }
    
    ctx.restore();
  }
}

// ROOM EVENTS
export const ROOM_EVENTS = {
  horde_mode: {
    name: 'Horde',
    desc: 'Waves of enemies!',
    color: '#ff5252',
    icon: '🌊',
    modifiers: {
      enemyCountMult: 2.5,
      spawnWaves: true,
      waveCount: 3,
      waveDelay: 8
    },
    rewards: {
      coinsMult: 2.0,
      chestChance: 0.5
    }
  },
  
  timed_survival: {
    name: 'Survival',
    desc: 'Survive for 60 seconds!',
    color: '#ff9800',
    icon: '⏰',
    modifiers: {
      timerDuration: 60,
      continuousSpawns: true,
      spawnRate: 3
    },
    rewards: {
      coinsMult: 1.8,
      guaranteedRareWeapon: true
    }
  },
  
  protect_objective: {
    name: 'Defense',
    desc: 'Protect the objective!',
    color: '#2196f3',
    icon: '🛡️',
    modifiers: {
      objectiveHp: 200,
      enemyTargetsObjective: true,
      waveCount: 4
    },
    rewards: {
      coinsMult: 2.2,
      chestChance: 0.7
    }
  },
  
  boss_rush: {
    name: 'Boss Rush',
    desc: 'Face 2 mini-bosses!',
    color: '#9c27b0',
    icon: '👹',
    modifiers: {
      spawnMiniBosses: 2,
      bossTypes: ['random', 'random']
    },
    rewards: {
      coinsMult: 3.0,
      guaranteedEpicWeapon: true,
      talentPoint: 1
    }
  },
  
  darkness: {
    name: 'Darkness',
    desc: 'Limited visibility!',
    color: '#424242',
    icon: '🌑',
    modifiers: {
      lightRadius: 150,
      enemyCountMult: 1.5
    },
    rewards: {
      coinsMult: 1.6,
      hiddenChests: 2
    }
  },
  
  elite_squad: {
    name: 'Elite Squad',
    desc: 'All enemies are elite!',
    color: '#ffd700',
    icon: '⭐',
    modifiers: {
      allElite: true,
      enemyCountMult: 0.7
    },
    rewards: {
      coinsMult: 2.5,
      guaranteedMod: true
    }
  }
};

export class RoomEvent {
  constructor(type) {
    this.type = type;
    this.data = ROOM_EVENTS[type];
    this.active = true;
    this.completed = false;
    this.timer = 0;
    this.progress = 0;
    
    // Event-specific state
    if (this.data.modifiers.timerDuration) {
      this.timeLimit = this.data.modifiers.timerDuration;
      this.timeRemaining = this.timeLimit;
    }
    
    if (this.data.modifiers.objectiveHp) {
      this.objectiveHp = this.data.modifiers.objectiveHp;
      this.objectiveMaxHp = this.objectiveHp;
    }
    
    if (this.data.modifiers.waveCount) {
      this.currentWave = 0;
      this.totalWaves = this.data.modifiers.waveCount;
    }
  }

  update(dt, game) {
    if (!this.active || this.completed) return;
    
    this.timer += dt;
    
    // Type-specific updates
    switch(this.type) {
      case 'timed_survival':
        this.timeRemaining -= dt;
        this.progress = 1 - (this.timeRemaining / this.timeLimit);
        if (this.timeRemaining <= 0) {
          this.completed = true;
        }
        break;
        
      case 'protect_objective':
        this.progress = this.currentWave / this.totalWaves;
        if (this.objectiveHp <= 0) {
          this.active = false; // Failed
        }
        break;
        
      case 'horde_mode':
      case 'boss_rush':
      case 'elite_squad':
        this.progress = this.currentWave / this.totalWaves;
        break;
    }
  }

  drawUI(ctx, x, y, width) {
    if (!this.active) return;
    
    ctx.save();
    
    // Event banner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, width, 60);
    
    ctx.strokeStyle = this.data.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, 60);
    
    // Event name
    ctx.fillStyle = this.data.color;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.data.icon} ${this.data.name}`, x + 10, y + 25);
    
    // Description
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.fillText(this.data.desc, x + 10, y + 45);
    
    // Progress bar
    const barY = y + 50;
    const barHeight = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x + 5, barY, width - 10, barHeight);
    
    ctx.fillStyle = this.data.color;
    ctx.fillRect(x + 5, barY, (width - 10) * this.progress, barHeight);
    
    // Special indicators
    if (this.timeRemaining !== undefined) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(this.timeRemaining)}s`, x + width - 10, y + 25);
    }
    
    if (this.objectiveHp !== undefined) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'right';
      const hpPercent = Math.ceil((this.objectiveHp / this.objectiveMaxHp) * 100);
      ctx.fillText(`Objective: ${hpPercent}%`, x + width - 10, y + 25);
    }
    
    if (this.totalWaves !== undefined) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`Wave ${this.currentWave + 1}/${this.totalWaves}`, x + width - 10, y + 25);
    }
    
    ctx.restore();
  }
}
