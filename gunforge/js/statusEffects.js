// statusEffects.js
// Comprehensive status effect system for player and enemies

export class StatusEffect {
  constructor(type, duration, intensity = 1.0, source = null) {
    this.type = type; // 'burn', 'poison', 'slow', 'stun', 'freeze', 'shock', 'corrode'
    this.duration = duration;
    this.maxDuration = duration;
    this.intensity = intensity; // 0-1 scale for effect strength
    this.source = source; // what caused this effect
    this.tickTimer = 0;
    this.tickRate = 0.5; // tick every 0.5 seconds for DoT
  }

  update(dt, target, game) {
    this.duration -= dt;
    if (this.duration <= 0) return true; // effect expired

    // Update DoT ticks
    if (this.isDoT()) {
      this.tickTimer += dt;
      if (this.tickTimer >= this.tickRate) {
        this.tickTimer = 0;
        this.applyTick(target, game);
      }
    }

    return false; // still active
  }

  isDoT() {
    return ['burn', 'poison', 'corrode', 'bleed'].includes(this.type);
  }

  applyTick(target, game) {
    const effects = STATUS_EFFECT_DATA[this.type];
    if (!effects || !effects.dps) return;

    const damage = effects.dps * this.intensity * this.tickRate;
    target.damage(damage, game);

    // Spawn damage particles
    if (game && game.particles) {
      game.particles.push({
        x: target.x + (Math.random() - 0.5) * target.r,
        y: target.y + (Math.random() - 0.5) * target.r,
        t: 0,
        life: 0.4,
        color: effects.color,
        draw(ctx) {
          const a = 1 - this.t / this.life;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.fillStyle = this.color;
          ctx.font = 'bold 12px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`-${Math.round(damage)}`, this.x, this.y - this.t * 30);
          ctx.restore();
        },
        update(dt) { this.t += dt; }
      });
    }
  }

  getSpeedMultiplier() {
    if (this.type === 'slow') return 1 - (0.5 * this.intensity);
    if (this.type === 'freeze') return 0.2;
    if (this.type === 'stun') return 0;
    return 1;
  }

  canAct() {
    return !['stun', 'freeze'].includes(this.type);
  }
}

export const STATUS_EFFECT_DATA = {
  burn: {
    name: 'Burning',
    color: '#ff6f00',
    particleColor: '#ff9800',
    dps: 18,
    icon: '🔥',
    description: 'Taking fire damage over time'
  },
  poison: {
    name: 'Poisoned',
    color: '#7cb342',
    particleColor: '#aed581',
    dps: 15,
    icon: '☠️',
    description: 'Taking poison damage over time'
  },
  slow: {
    name: 'Slowed',
    color: '#81d4fa',
    particleColor: '#b3e5fc',
    speedMult: 0.5,
    icon: '❄️',
    description: 'Movement speed reduced by 50%'
  },
  stun: {
    name: 'Stunned',
    color: '#ffd54f',
    particleColor: '#fff59d',
    icon: '⚡',
    description: 'Cannot move or act'
  },
  freeze: {
    name: 'Frozen',
    color: '#00bcd4',
    particleColor: '#80deea',
    speedMult: 0.2,
    icon: '🧊',
    description: 'Nearly immobilized'
  },
  shock: {
    name: 'Shocked',
    color: '#00e5ff',
    particleColor: '#84ffff',
    icon: '⚡',
    description: 'Electrical discharge'
  },
  corrode: {
    name: 'Corroded',
    color: '#9cff57',
    particleColor: '#c5e1a5',
    dps: 12,
    icon: '🧪',
    description: 'Armor reduced, taking acid damage'
  },
  bleed: {
    name: 'Bleeding',
    color: '#e53935',
    particleColor: '#ff6659',
    dps: 20,
    icon: '🩸',
    description: 'Taking bleeding damage'
  }
};

// Status effect manager mixin
export function addStatusEffects(entity) {
  entity.statusEffects = [];

  entity.addStatusEffect = function(type, duration, intensity = 1.0, source = null) {
    // Check if effect already exists, refresh if so
    const existing = this.statusEffects.find(e => e.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.intensity = Math.max(existing.intensity, intensity);
      return existing;
    }

    const effect = new StatusEffect(type, duration, intensity, source);
    this.statusEffects.push(effect);
    return effect;
  };

  entity.removeStatusEffect = function(type) {
    const index = this.statusEffects.findIndex(e => e.type === type);
    if (index !== -1) this.statusEffects.splice(index, 1);
  };

  entity.hasStatusEffect = function(type) {
    return this.statusEffects.some(e => e.type === type);
  };

  entity.getStatusEffect = function(type) {
    return this.statusEffects.find(e => e.type === type);
  };

  entity.updateStatusEffects = function(dt, game) {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i];
      const expired = effect.update(dt, this, game);
      if (expired) {
        this.statusEffects.splice(i, 1);
      }
    }
  };

  entity.getSpeedMultiplier = function() {
    let mult = 1.0;
    for (const effect of this.statusEffects) {
      mult *= effect.getSpeedMultiplier();
    }
    return mult;
  };

  entity.canAct = function() {
    for (const effect of this.statusEffects) {
      if (!effect.canAct()) return false;
    }
    return true;
  };

  entity.drawStatusEffects = function(ctx) {
    if (this.statusEffects.length === 0) return;

    // Draw status effect particles
    for (const effect of this.statusEffects) {
      const data = STATUS_EFFECT_DATA[effect.type];
      if (!data) continue;

      // Floating particles around entity
      const time = performance.now() / 1000;
      const particleCount = 3;
      for (let i = 0; i < particleCount; i++) {
        const angle = (time * 2 + i * (Math.PI * 2 / particleCount)) % (Math.PI * 2);
        const dist = this.r + 10 + Math.sin(time * 3 + i) * 5;
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * dist;

        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(time * 4 + i) * 0.2;
        ctx.fillStyle = data.particleColor;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw status icons above entity
    const iconY = this.y - this.r - 20;
    const iconSpacing = 16;
    const startX = this.x - (this.statusEffects.length * iconSpacing) / 2;

    ctx.save();
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < this.statusEffects.length; i++) {
      const effect = this.statusEffects[i];
      const data = STATUS_EFFECT_DATA[effect.type];
      if (!data) continue;

      const x = startX + i * iconSpacing;
      
      // Background circle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(x, iconY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Duration bar
      const progress = effect.duration / effect.maxDuration;
      ctx.strokeStyle = data.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, iconY, 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      // Icon/dot
      ctx.fillStyle = data.particleColor;
      ctx.beginPath();
      ctx.arc(x, iconY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
}
