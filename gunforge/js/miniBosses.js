// miniBosses.js
// Mini-boss system - mid-tier bosses between regular floors

import { angleTo, dist2 } from './data.js';
import { Projectile } from './player.js';

export const MINI_BOSS_DATA = {
  warden: {
    name: 'Steel Warden',
    hp: 800,
    speed: 95,
    dmg: 32,
    r: 35,
    color: '#607d8b',
    armor: 0.3,
    phases: 2,
    abilities: {
      shield_bash: { cooldown: 5, range: 150, damage: 50, knockback: 600 },
      summon_guards: { cooldown: 12, count: 3, type: 'melee' },
      fortify: { cooldown: 18, duration: 4, armorBonus: 0.4 }
    },
    sprite: 'warden_miniboss',
    description: 'Armored guardian that summons reinforcements'
  },
  
  pyromancer: {
    name: 'Ember Pyromancer',
    hp: 650,
    speed: 110,
    dmg: 28,
    r: 32,
    color: '#ff6f00',
    phases: 2,
    abilities: {
      fireball: { cooldown: 2, damage: 35, speed: 800, burn: { dps: 18, dur: 3 } },
      fire_wave: { cooldown: 8, count: 8, spread: 360 },
      immolate: { cooldown: 15, duration: 5, trail: { dps: 20, radius: 60 } }
    },
    sprite: 'pyromancer_miniboss',
    description: 'Flame wielder leaving trails of fire'
  },
  
  voidcaller: {
    name: 'Void Caller',
    hp: 700,
    speed: 100,
    dmg: 30,
    r: 33,
    color: '#7c4dff',
    phases: 2,
    abilities: {
      void_bolt: { cooldown: 1.5, damage: 25, speed: 1000, pierce: 3 },
      teleport: { cooldown: 6, range: 400 },
      void_rift: { cooldown: 10, duration: 6, radius: 120, dps: 15 }
    },
    sprite: 'voidcaller_miniboss',
    description: 'Eldritch being that teleports and creates void rifts'
  },
  
  plaguebearer: {
    name: 'Plague Bearer',
    hp: 850,
    speed: 85,
    dmg: 25,
    r: 38,
    color: '#7cb342',
    phases: 2,
    abilities: {
      toxic_spit: { cooldown: 2, damage: 20, speed: 700, poison: { dps: 15, dur: 5 }, slow: 0.6 },
      poison_cloud: { cooldown: 8, count: 5, radius: 90, duration: 8, dps: 12 },
      regenerate: { cooldown: 20, heal: 150, duration: 3 }
    },
    sprite: 'plaguebearer_miniboss',
    description: 'Toxic entity that spreads poison clouds and regenerates'
  }
};

export class MiniBoss {
  constructor(x, y, type) {
    const data = MINI_BOSS_DATA[type];
    if (!data) throw new Error(`Unknown mini-boss type: ${type}`);
    
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = data.r;
    this.maxHp = data.hp;
    this.hp = this.maxHp;
    this.speed = data.speed;
    this.dmg = data.dmg;
    this.color = data.color;
    this.armor = data.armor || 0;
    this.phases = data.phases;
    this.currentPhase = 1;
    
    this.abilities = data.abilities;
    this.abilityCooldowns = {};
    Object.keys(this.abilities).forEach(key => {
      this.abilityCooldowns[key] = 0;
    });
    
    this.angle = 0;
    this.knockVx = 0;
    this.knockVy = 0;
    this.knockT = 0;
    this.dead = false;
    this.isMiniBoss = true;
    this.statusEffects = [];
    
    // Load sprite
    this.sprite = new Image();
    this.sprite.src = `assets/img/enemies/${data.sprite}.svg`;
    
    // Special effects
    this.activeEffects = [];
  }

  damage(v, game, fromAngle = null) {
    const actualDamage = v * (1 - this.armor);
    this.hp -= actualDamage;
    
    // Phase transition
    const phaseThreshold = this.maxHp / this.phases;
    const newPhase = Math.ceil((this.maxHp - this.hp) / phaseThreshold) + 1;
    if (newPhase > this.currentPhase && newPhase <= this.phases) {
      this.currentPhase = newPhase;
      this.onPhaseChange(game);
    }
    
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath(game);
    }
    
    return actualDamage;
  }

  onPhaseChange(game) {
    // Spawn visual effect
    if (game && game.particles) {
      game.particles.push({
        x: this.x,
        y: this.y,
        t: 0,
        life: 1.5,
        draw(ctx) {
          const progress = this.t / this.life;
          const radius = 60 * progress;
          ctx.save();
          ctx.globalAlpha = 1 - progress;
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        },
        update(dt) { this.t += dt; },
        color: this.color
      });
    }
    
    // Heal slightly
    this.hp = Math.min(this.hp + this.maxHp * 0.1, this.maxHp);
    
    // Reset ability cooldowns
    Object.keys(this.abilityCooldowns).forEach(key => {
      this.abilityCooldowns[key] = Math.max(0, this.abilityCooldowns[key] - 2);
    });
  }

  onDeath(game) {
    // Spawn death particles
    if (game && game.particles) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = 150 + Math.random() * 100;
        game.particles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          t: 0,
          life: 1.0 + Math.random() * 0.5,
          r: 4 + Math.random() * 4,
          color: this.color,
          draw(ctx) {
            const a = 1 - this.t / this.life;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          },
          update(dt) {
            this.t += dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.vx *= 0.95;
            this.vy *= 0.95;
          }
        });
      }
    }
  }

  update(dt, game) {
    if (this.dead) return;
    
    // Update ability cooldowns
    Object.keys(this.abilityCooldowns).forEach(key => {
      if (this.abilityCooldowns[key] > 0) {
        this.abilityCooldowns[key] -= dt;
      }
    });
    
    // Update knockback
    if (this.knockT > 0) {
      this.x += this.knockVx * dt;
      this.y += this.knockVy * dt;
      this.knockT -= dt;
      this.knockVx *= 0.92;
      this.knockVy *= 0.92;
    }
    
    // AI based on type
    this.updateAI(dt, game);
    
    // Update active effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      if (effect.update) effect.update(dt);
      if (effect.duration !== undefined) {
        effect.duration -= dt;
        if (effect.duration <= 0) {
          this.activeEffects.splice(i, 1);
        }
      }
    }
  }

  updateAI(dt, game) {
    const player = game.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    this.angle = Math.atan2(dy, dx);
    
    // Type-specific AI
    switch(this.type) {
      case 'warden':
        this.updateWardenAI(dt, game, dist);
        break;
      case 'pyromancer':
        this.updatePyromancerAI(dt, game, dist);
        break;
      case 'voidcaller':
        this.updateVoidcallerAI(dt, game, dist);
        break;
      case 'plaguebearer':
        this.updatePlagebearerAI(dt, game, dist);
        break;
    }
  }

  updateWardenAI(dt, game, dist) {
    // Stay at medium range
    const targetDist = 250;
    
    if (dist > targetDist + 50) {
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    } else if (dist < targetDist - 50) {
      this.x -= Math.cos(this.angle) * this.speed * dt;
      this.y -= Math.sin(this.angle) * this.speed * dt;
    }
    
    // Shield bash when close
    if (dist < this.abilities.shield_bash.range && this.abilityCooldowns.shield_bash <= 0) {
      this.useShieldBash(game);
    }
    
    // Summon guards
    if (this.abilityCooldowns.summon_guards <= 0) {
      this.useSummonGuards(game);
    }
    
    // Fortify in phase 2
    if (this.currentPhase >= 2 && this.abilityCooldowns.fortify <= 0 && this.hp < this.maxHp * 0.4) {
      this.useFortify(game);
    }
  }

  updatePyromancerAI(dt, game, dist) {
    // Keep distance
    const targetDist = 400;
    
    if (dist > targetDist + 100) {
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    } else if (dist < targetDist - 100) {
      this.x -= Math.cos(this.angle) * this.speed * dt;
      this.y -= Math.sin(this.angle) * this.speed * dt;
    }
    
    // Regular fireballs
    if (this.abilityCooldowns.fireball <= 0) {
      this.useFireball(game);
    }
    
    // Fire wave
    if (this.abilityCooldowns.fire_wave <= 0 && dist < 500) {
      this.useFireWave(game);
    }
    
    // Immolate in phase 2
    if (this.currentPhase >= 2 && this.abilityCooldowns.immolate <= 0) {
      this.useImmolate(game);
    }
  }

  updateVoidcallerAI(dt, game, dist) {
    // Teleport if too close
    if (dist < 200 && this.abilityCooldowns.teleport <= 0) {
      this.useTeleport(game);
      return;
    }
    
    // Keep moving
    this.x += Math.cos(this.angle + Math.PI / 2) * this.speed * 0.5 * dt;
    this.y += Math.sin(this.angle + Math.PI / 2) * this.speed * 0.5 * dt;
    
    // Void bolts
    if (this.abilityCooldowns.void_bolt <= 0) {
      this.useVoidBolt(game);
    }
    
    // Void rift
    if (this.abilityCooldowns.void_rift <= 0) {
      this.useVoidRift(game);
    }
  }

  updatePlagebearerAI(dt, game, dist) {
    // Slow approach
    const targetDist = 300;
    
    if (dist > targetDist) {
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    }
    
    // Toxic spit
    if (this.abilityCooldowns.toxic_spit <= 0) {
      this.useToxicSpit(game);
    }
    
    // Poison clouds
    if (this.abilityCooldowns.poison_cloud <= 0 && dist < 400) {
      this.usePoisonCloud(game);
    }
    
    // Regenerate when low HP
    if (this.hp < this.maxHp * 0.3 && this.abilityCooldowns.regenerate <= 0) {
      this.useRegenerate(game);
    }
  }

  // Ability implementations (placeholder - would add full implementations)
  useShieldBash(game) {
    this.abilityCooldowns.shield_bash = this.abilities.shield_bash.cooldown;
    // Implementation would push player back and deal damage
  }

  useSummonGuards(game) {
    this.abilityCooldowns.summon_guards = this.abilities.summon_guards.cooldown;
    // Would spawn melee enemies
  }

  useFortify(game) {
    this.abilityCooldowns.fortify = this.abilities.fortify.cooldown;
    this.armor += this.abilities.fortify.armorBonus;
    this.activeEffects.push({
      type: 'fortify',
      duration: this.abilities.fortify.duration,
      update: () => {},
      onEnd: () => { this.armor -= this.abilities.fortify.armorBonus; }
    });
  }

  useFireball(game) {
    this.abilityCooldowns.fireball = this.abilities.fireball.cooldown;
    // Would create fire projectile
  }

  useFireWave(game) {
    this.abilityCooldowns.fire_wave = this.abilities.fire_wave.cooldown;
    // Would create circular wave of projectiles
  }

  useImmolate(game) {
    this.abilityCooldowns.immolate = this.abilities.immolate.cooldown;
    this.activeEffects.push({
      type: 'immolate',
      duration: this.abilities.immolate.duration,
      trail: this.abilities.immolate.trail
    });
  }

  useVoidBolt(game) {
    this.abilityCooldowns.void_bolt = this.abilities.void_bolt.cooldown;
    // Would create void projectile
  }

  useTeleport(game) {
    this.abilityCooldowns.teleport = this.abilities.teleport.cooldown;
    const range = this.abilities.teleport.range;
    const angle = Math.random() * Math.PI * 2;
    this.x += Math.cos(angle) * range;
    this.y += Math.sin(angle) * range;
  }

  useVoidRift(game) {
    this.abilityCooldowns.void_rift = this.abilities.void_rift.cooldown;
    // Would create damaging area
  }

  useToxicSpit(game) {
    this.abilityCooldowns.toxic_spit = this.abilities.toxic_spit.cooldown;
    // Would create poison projectile
  }

  usePoisonCloud(game) {
    this.abilityCooldowns.poison_cloud = this.abilities.poison_cloud.cooldown;
    // Would create multiple poison clouds
  }

  useRegenerate(game) {
    this.abilityCooldowns.regenerate = this.abilities.regenerate.cooldown;
    this.activeEffects.push({
      type: 'regenerate',
      duration: this.abilities.regenerate.duration,
      heal: this.abilities.regenerate.heal,
      timer: 0,
      update: (dt) => {
        this.timer += dt;
        if (this.timer >= 0.5) {
          this.timer = 0;
          const healAmount = this.heal / (this.duration / 0.5);
          this.hp = Math.min(this.hp + healAmount, this.maxHp);
        }
      }
    });
  }

  draw(ctx) {
    if (this.dead) return;
    
    ctx.save();
    
    // Draw health bar
    const barWidth = this.r * 2.5;
    const barHeight = 6;
    const barY = this.y - this.r - 15;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
    
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpPercent, barHeight);
    
    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(MINI_BOSS_DATA[this.type].name, this.x, barY - 8);
    
    // Draw sprite or fallback
    if (this.sprite && this.sprite.complete) {
      const size = this.r * 2;
      ctx.drawImage(this.sprite, this.x - size / 2, this.y - size / 2, size, size);
    } else {
      // Fallback circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      
      // Elite border
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Phase indicator
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText(`Phase ${this.currentPhase}`, this.x, this.y + this.r + 12);
    
    ctx.restore();
  }
}
