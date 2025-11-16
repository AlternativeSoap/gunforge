// player.js
// Player, input, projectiles, and leveling.

import { angleTo, clamp, circleIntersect, pick, WEAPONS, GAME, DIFFICULTY, RARITY, ITEMS } from './data.js';

export class Projectile {
  constructor(x, y, vx, vy, opts) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = opts.life ?? 1.0; // seconds
    this.r = opts.r ?? 4;
    this.damage = opts.damage ?? 10;
    this.color = opts.color || '#ffd180';
    this.knock = opts.knock ?? 100;
    this.pierce = opts.pierce ?? 0;
    this.explode = opts.explode || null;
    this.from = opts.from || 'player';
    this.bounce = opts.bounce ?? 0;
    this.projectileType = opts.projectileType || 'bullet'; // projectile visual/behavior type
    this.dot = opts.dot || null; // damage over time
    this.slow = opts.slow || null; // slow effect
    this.chain = opts.chain ?? 0; // chain lightning
  }
  update(dt, game) {
    // Tracking behavior for enemy projectiles
    if (this.tracking && this.from === 'enemy' && game.player) {
      const dx = game.player.x - this.x;
      const dy = game.player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const trackSpeed = this.trackSpeed || 200;
        this.vx += (dx / dist) * trackSpeed * dt;
        this.vy += (dy / dist) * trackSpeed * dt;
        // Limit max speed
        const speed = Math.hypot(this.vx, this.vy);
        const maxSpeed = 700;
        if (speed > maxSpeed) {
          this.vx = (this.vx / speed) * maxSpeed;
          this.vy = (this.vy / speed) * maxSpeed;
        }
      }
    }
    
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    
    // Check collision with walls only (not props/barrels)
    const room = game.rooms?.get(game.currentRoomKey);
    if (room && room.contents && room.contents.colliders) {
      for (const col of room.contents.colliders) {
        if (col.wall && this.circleRectCollision(this.x, this.y, this.r, col)) {
          // Hit a wall - destroy projectile
          this.life = 0;
          break;
        }
      }
    }
    
    // room bounds bounce
    if (this.bounce > 0) {
      const { w, h } = game.roomBounds;
      if (this.x < 40 || this.x > w - 40) { this.vx *= -1; this.bounce--; }
      if (this.y < 40 || this.y > h - 40) { this.vy *= -1; this.bounce--; }
    }
  }
  
  // Helper: circle vs rectangle collision
  circleRectCollision(cx, cy, cr, rect) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx * dx + dy * dy) <= (cr * cr);
  }
  draw(ctx) {
    ctx.save();
    
    // Special rendering based on projectile type
    switch(this.projectileType) {
      case 'arrow':
      case 'bolt':
        // Draw elongated arrow/bolt
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.r * 2, -this.r / 2, this.r * 4, this.r);
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.beginPath();
        ctx.moveTo(this.r * 2, 0);
        ctx.lineTo(this.r * 3, -this.r / 2);
        ctx.lineTo(this.r * 3, this.r / 2);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'beam':
      case 'rail':
        // Draw laser beam line
        const beamAngle = Math.atan2(this.vy, this.vx);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.r;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - Math.cos(beamAngle) * 50, this.y - Math.sin(beamAngle) * 50);
        ctx.stroke();
        // Core bright line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = this.r / 2;
        ctx.globalAlpha = 1;
        ctx.stroke();
        break;
        
      case 'flame':
      case 'fire':
        // Flickering flame effect
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8 + Math.random() * 0.2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * (0.9 + Math.random() * 0.2), 0, Math.PI * 2);
        ctx.fill();
        // Inner bright core
        ctx.fillStyle = '#fff5e6';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'ice':
      case 'frost':
        // Crystalline ice shard
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const iceAngle = Math.atan2(this.vy, this.vx);
        for (let i = 0; i < 6; i++) {
          const a = iceAngle + (i * Math.PI / 3);
          const r = i % 2 === 0 ? this.r : this.r * 0.6;
          ctx.lineTo(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
        
      case 'lightning':
        // Electric arc effect
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.r;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        break;
        
      case 'plasma':
      case 'energy':
        // Glowing energy orb
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'poison':
      case 'acid':
        // Toxic bubbling effect
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        // Bubbles
        for (let i = 0; i < 3; i++) {
          const offset = (Date.now() * 0.005 + i) % 1;
          ctx.fillStyle = 'rgba(150, 255, 100, 0.4)';
          ctx.beginPath();
          ctx.arc(this.x + Math.cos(i * 2) * this.r * 0.5, 
                  this.y + Math.sin(i * 2) * this.r * 0.5, 
                  this.r * 0.3 * offset, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      default:
        // Standard bullet/projectile
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }
}

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 16;
    this.vx = 0; this.vy = 0; this.speed = 280;
    
    // Apply difficulty multipliers to base stats
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
  this.maxHp = Math.round(120 * diff.playerHp); 
  this.hp = this.maxHp;
  this.maxStamina = Math.round(100 * (diff.staminaMult || 1));
  this.stamina = this.maxStamina;
  this.staminaRegen = 18 * (diff.staminaMult || 1); // Regen scales with stamina
    this.aim = 0; this.shootCd = 0; this.dashCd = 0; this.iFrames = 0;
    this.dashVx = 0; this.dashVy = 0; this.dashTime = 0;
    this.level = 1; this.xp = 0; this.xpToLevel = 100;
  // Always start with a pistol only
  const pistol = WEAPONS.find(w=>w.id==='pistol') || WEAPONS[0];
  this.weapons = [ structuredClone(pistol) ];
    this.weaponIndex = 0;
    this.recoil = 0;
    // permanent/base multipliers and temporary buff multipliers
    this.dmgMultBase = 1; this.fireRateMultBase = 1; this.speedMultBase = 1; this.staminaRegenMultBase = 1; this.bulletSizeMultBase = 1;
    this.dmgMult = 1; this.fireRateMult = 1; this.speedMult = 1; this.staminaRegenMult = 1; this.bulletSizeMult = 1;
    // combat stats
    this.critChance = 0; this.critMult = 1.5; this.lifesteal = 0; this.pierceBonus = 0;
    this._buffs = [];
    // combo system
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.kills = 0; // total kill counter
    this.muzzleFlash = 0; // visual effect timer
    // Animation state
    this.animTime = 0; // animation timer
    this.walkFrame = 0; // 0, 1, 2 for walk cycle
    this.isMoving = false;
    // Item inventory
    this.inventory = []; // Array of item IDs
    this.itemBonuses = {}; // Aggregated bonuses from items
    // Weapon mechanics
    this.meleeCd = 0; // melee attack cooldown
    this.isCharging = false; // charging state for bow/laser
    this.chargeTimer = 0; // charge accumulation timer
    // Ultimate ability system
    this.ultimateActive = false;
    this.ultimateDuration = 0;
    this.ultimateCooldown = 0;
    this.ultimateType = null; // 'fortress', 'berserk', 'timewarp'
    // Load sprite images
    this.sprites = {
      idle: new Image(),
      walk1: new Image(),
      walk2: new Image(),
      shoot: new Image()
    };
    this.sprites.idle.src = 'assets/img/player/player_idle.svg';
    this.sprites.walk1.src = 'assets/img/player/player_walk1.svg';
    this.sprites.walk2.src = 'assets/img/player/player_walk2.svg';
    this.sprites.shoot.src = 'assets/img/player/player_shoot.svg';
  }

  get currentWeapon() { return this.weapons[this.weaponIndex % this.weapons.length]; }

  giveWeapon(template) {
    const weapon = structuredClone(template);
    // Apply rarity multipliers to weapon stats
    const rarity = RARITY[weapon.rarity] || RARITY.common;
    const mult = rarity.mult;
    if (mult !== 1.0) {
      weapon.damage = Math.round(weapon.damage * mult);
      weapon.fireRate = weapon.fireRate * mult;
      if (weapon.bullets) weapon.bullets = Math.max(1, Math.round(weapon.bullets * Math.sqrt(mult)));
    }
    this.weapons.push(weapon);
  }

  heal(v) { this.hp = Math.min(this.maxHp, this.hp + v); }

  addXp(v) {
    // Apply difficulty XP modifier
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    const xpMult = diff.xpMult || 1.0;
    const adjustedXp = Math.floor(v * xpMult);
    
    this.xp += adjustedXp;
    if (this.xp >= this.xpToLevel) {
      this.level++;
      this.xp -= this.xpToLevel;
      
      // Exponential XP scaling - gets much harder at higher levels
      // Formula: base * (1.15^level) + (level * 20)
      // This creates steep growth curve for infinite leveling
      const baseXp = 100;
      this.xpToLevel = Math.floor(baseXp * Math.pow(1.15, this.level) + (this.level * 20));
      
      return true; // level up
    }
    return false;
  }

  swapWeapon(dir = 1) {
    this.weaponIndex = (this.weaponIndex + dir + this.weapons.length) % this.weapons.length;
  }

  addBuff(prop, val, dur){
    // stack multiplicatively; push timer
    if (prop in this) this[prop] *= val;
    this._buffs.push({prop, val, t: dur});
  }

  addKill() {
    this.kills++;
    this.combo++;
    this.comboTimer = 3.5; // 3.5 seconds to get next kill
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    // Combo bonuses
    if (this.combo >= 5 && this.combo % 5 === 0) {
      // Every 5 combo: small heal
      this.heal(8);
    }
  }

  getComboMultiplier() {
    // Bonus damage at higher combos
    if (this.combo >= 20) return 1.5;
    if (this.combo >= 10) return 1.3;
    if (this.combo >= 5) return 1.15;
    return 1.0;
  }

  activateUltimate(game) {
    if (this.ultimateActive || this.ultimateCooldown > 0 || !this.ultimateType) return;
    
    this.ultimateActive = true;
    
    switch(this.ultimateType) {
      case 'fortress': // Tank ultimate: 5s invulnerable + 100% damage
        this.ultimateDuration = 5.0;
        this.ultimateCooldown = 45.0;
        this.iFrames = 5.0; // invulnerable for entire duration
        this.addBuff('dmgMult', 2.0, 5.0);
        game.promptTimed('⚔️ FORTRESS MODE ACTIVATED!', 2.0);
        break;
      case 'berserk': // DPS ultimate: 8s +150% damage + 50% fire rate
        this.ultimateDuration = 8.0;
        this.ultimateCooldown = 50.0;
        this.addBuff('dmgMult', 2.5, 8.0);
        this.addBuff('fireRateMult', 1.5, 8.0);
        game.promptTimed('💥 BERSERK RAGE ACTIVATED!', 2.0);
        break;
      case 'timewarp': // Support ultimate: 6s slow all enemies 70%
        this.ultimateDuration = 6.0;
        this.ultimateCooldown = 40.0;
        game.timeWarpActive = true;
        game.timeWarpDuration = 6.0;
        game.promptTimed('⏰ TIME WARP ACTIVATED!', 2.0);
        break;
    }
  }
  
  deactivateUltimate(game) {
    this.ultimateActive = false;
    this.ultimateDuration = 0;
    
    if (this.ultimateType === 'timewarp') {
      game.timeWarpActive = false;
      game.timeWarpDuration = 0;
    }
  }

  damage(v, game) {
    if (this.iFrames > 0) return;
    // Apply dodge chance from items
    const dodgeChance = this.itemBonuses.dodgeChance || 0;
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      // Dodged!
      if (game) {
        game.particles.push({
          x: this.x, y: this.y - 20, t: 0, life: 0.6,
          draw(ctx) {
            const a = 1 - this.t / this.life;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = '#9c27b0';
            ctx.font = 'bold 16px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('DODGE!', this.x, this.y - this.t * 40);
            ctx.restore();
          },
          update(dt) { this.t += dt; }
        });
      }
      return;
    }
    // Apply damage reduction from items
    const dr = this.itemBonuses.damageReduction || 0;
    const actualDamage = Math.max(1, v * (1 - dr));
    // God mode cheat protection
    if (!this.godMode) {
      this.hp -= actualDamage;
    }
    this.iFrames = 0.3;
    // Trigger blood screen effect
    if (game) game.bloodScreen = Math.max(game.bloodScreen || 0, 0.6);
    // Break combo on hit
    if (this.combo > 3) {
      this.combo = Math.floor(this.combo * 0.5);
      this.comboTimer = 3.5;
    }
  }

  addItem(itemId) {
    // Add to inventory
    this.inventory.push(itemId);
    // Recalculate bonuses
    this.itemBonuses = {};
    for (const id of this.inventory) {
      const item = ITEMS.find(i => i.id === id);
      if (!item) continue;
      for (const [key, value] of Object.entries(item.effect)) {
        this.itemBonuses[key] = (this.itemBonuses[key] || 0) + value;
      }
    }
    // Apply immediate effects
    if (this.itemBonuses.maxHpBonus) {
      this.maxHp += this.itemBonuses.maxHpBonus;
      this.hp += this.itemBonuses.maxHpBonus; // Also heal
    }
  }

  dash(moveX = 0, moveY = 0) {
    if (this.dashCd > 0 || this.stamina < 25) return;
    const dashDistance = 120; // pixels to dash forward
    const dashDuration = 0.12; // seconds
    
    // Use movement direction if provided, otherwise fall back to aim direction
    let ax, ay;
    if (moveX !== 0 || moveY !== 0) {
      const mag = Math.sqrt(moveX * moveX + moveY * moveY);
      ax = moveX / mag;
      ay = moveY / mag;
    } else {
      ax = Math.cos(this.aim);
      ay = Math.sin(this.aim);
    }
    
    // Store dash velocity for brief duration
    this.dashVx = (ax * dashDistance) / dashDuration;
    this.dashVy = (ay * dashDistance) / dashDuration;
    this.dashTime = dashDuration;
    this.stamina = Math.max(0, this.stamina - 25);
    this.dashCd = 0.45;
    this.iFrames = Math.max(this.iFrames, 0.12); // brief invulnerability during dash
  }

  tryShoot(game) {
    const w = this.currentWeapon;
    
    // Handle melee weapons (buzz saw)
    if (w.projectile === 'melee') {
      if (this.meleeCd > 0) return;
      // Apply continuous damage to nearby enemies
      const meleeRange = w.meleeRange || 80;
      const meleeDPS = w.meleeDPS || 100;
      const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
      const damagePerTick = (meleeDPS * diff.playerDamage * this.dmgMultBase * this.dmgMult) / 60; // 60 ticks per second
      
      game.enemies.forEach(e => {
        // Safety check: ensure enemy has takeDamage method
        if (!e || typeof e.takeDamage !== 'function') return;
        
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= meleeRange + this.r + e.r) {
          e.takeDamage(damagePerTick, this.x, this.y, 0, game);
        }
      });
      this.muzzleFlash = 0.03; // visual indicator
      return; // melee doesn't create projectiles
    }
    
    // Check cooldown (charging is now handled in main.js)
    if (this.shootCd > 0) return;
    
    // Handle beam weapons (instant hit scan)
    if (w.projectile === 'beam') {
      const beamLength = w.beamLength || 1000;
      const beamWidth = 8;
      const isCrit = Math.random() < this.critChance;
      const comboMult = this.getComboMultiplier();
      const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
      const chargeMult = this.isCharging ? (1 + (w.chargeBonus || 0)) : 1;
      const finalDamage = Math.floor(w.damage * diff.playerDamage * this.dmgMultBase * this.dmgMult * comboMult * chargeMult * (isCrit ? this.critMult : 1));
      
      // Create beam visual projectile
      const vx = Math.cos(this.aim) * 5000; // super fast to simulate instant
      const vy = Math.sin(this.aim) * 5000;
      const px = this.x + Math.cos(this.aim) * (this.r + 6);
      const py = this.y + Math.sin(this.aim) * (this.r + 6);
      
      const proj = new Projectile(px, py, vx, vy, {
        life: beamLength / 5000, // very short life
        r: beamWidth,
        damage: finalDamage,
        color: isCrit ? '#ff3333' : w.color,
        knock: w.knock ?? 120,
        pierce: w.pierce ?? 999,
        explode: w.explode ?? null,
        chain: w.chain ?? 0,
        slow: w.slow ?? null,
        from: 'player',
        isCrit: isCrit,
        projectileType: 'beam',
      });
      game.projectiles.push(proj);
      
      // Beam weapons use laser sound
      if (game.audio.shoot) game.audio.shoot('laser'); else game.audio.playLaserShoot();
      this.recoil = Math.min(1, this.recoil + 0.3);
      this.muzzleFlash = 0.15;
      this.shootCd = w.cooldown || 1.0;
      this.isCharging = false;
      this.chargeTimer = 0;
      return;
    }
    
    // Standard projectile weapons
    if (w.fireRate && w.fireRate > 0) {
      this.shootCd = 1 / (w.fireRate * this.fireRateMultBase * this.fireRateMult);
    } else if (w.cooldown) {
      this.shootCd = w.cooldown;
    }
    
    const spread = (w.spread || 0) * Math.PI/180;
    const bullets = w.bullets || 1;
    
    for (let i = 0; i < bullets; i++) {
      const a = this.aim + (Math.random() - 0.5) * spread;
      const speed = w.speed || 1000;
      const vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
      // Spawn projectile along the actual firing angle, not just the aim direction
      const spawnDist = this.r + 6;
      const px = this.x + Math.cos(a) * spawnDist;
      const py = this.y + Math.sin(a) * spawnDist;
      
      const isCrit = Math.random() < this.critChance;
      const comboMult = this.getComboMultiplier();
      const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
      const chargeMult = this.isCharging ? (1 + (w.chargeBonus || 0)) : 1;
      const finalDamage = Math.floor(w.damage * diff.playerDamage * this.dmgMultBase * this.dmgMult * comboMult * chargeMult * (isCrit ? this.critMult : 1));
      
      // Apply special effects based on projectile type
      let effectExplode = w.explode ?? null;
      let effectDot = w.dot ?? null;
      let effectSlow = w.slow ?? null;
      
      // Fire/flame projectiles: ignite enemies (DOT)
      if ((w.projectile === 'fire' || w.projectile === 'flame') && !effectDot) {
        effectDot = { dps: Math.floor(w.damage * 0.3), dur: 3.0 };
      }
      
      // Ice/frost projectiles: slow enemies
      if ((w.projectile === 'ice' || w.projectile === 'frost') && !effectSlow) {
        effectSlow = 0.6; // 40% speed reduction
      }
      
      // Poison/acid/toxin projectiles: strong DOT
      if ((w.projectile === 'poison' || w.projectile === 'acid') && !effectDot) {
        effectDot = { dps: Math.floor(w.damage * 0.4), dur: 4.0 };
      }
      
      // Explosive projectiles (rockets, grenades, meteors, plasma): explode on hit
      if ((w.projectile === 'rocket' || w.projectile === 'meteor' || w.projectile === 'plasma' || 
           w.projectile === 'grenade' || w.projectile === 'shell') && !effectExplode) {
        effectExplode = { r: 80 + Math.floor(w.damage * 0.3), dmg: Math.floor(w.damage * 0.4) };
      }
      
      const proj = new Projectile(px, py, vx, vy, {
        life: w.life ?? 1.4,
        r: (4 + (w.bullets && w.bullets > 3 ? -2 : 0)) * this.bulletSizeMultBase * this.bulletSizeMult * (isCrit ? 1.3 : 1),
        damage: finalDamage,
        color: isCrit ? '#ff3333' : w.color,
        knock: w.knock ?? 120,
        pierce: (w.pierce ?? 0) + (this.pierceBonus||0),
        explode: effectExplode,
        dot: effectDot,
        slow: effectSlow,
        bounce: w.bounce ?? 0,
        chain: w.chain ?? 0,
        from: 'player',
        isCrit: isCrit,
        projectileType: w.projectile || 'bullet',
      });
      game.projectiles.push(proj);
    }
    
    // Map projectile types to weapon sounds
    let soundType = 'pistol';
    if (w.projectile === 'flame' || w.projectile === 'fire') soundType = 'flamethrower';
    else if (w.projectile === 'pellet' || w.projectile === 'shell') soundType = 'shotgun';
    else if (w.projectile === 'rocket' || w.projectile === 'grenade' || w.projectile === 'meteor') soundType = 'rocket';
    else if (w.projectile === 'energy' || w.projectile === 'plasma' || w.projectile === 'lightning' || w.projectile === 'void' || w.projectile === 'antimatter') soundType = 'energy';
    else if (w.projectile === 'beam') soundType = 'laser';
    
    if (game.audio.shoot) game.audio.shoot(soundType); else game.audio.playShoot();
    this.recoil = Math.min(1, this.recoil + 0.2);
    this.muzzleFlash = 0.08;
    this.isCharging = false;
    this.chargeTimer = 0;
  }

  update(dt, input, mouse, game) {
    // Update ultimate ability timers
    if (this.ultimateActive) {
      this.ultimateDuration -= dt;
      if (this.ultimateDuration <= 0) {
        this.deactivateUltimate(game);
      }
    }
    if (this.ultimateCooldown > 0) {
      this.ultimateCooldown -= dt;
    }
    
    // Update weapon timers
    const weapon = this.currentWeapon;
    if (weapon.chargeTime && weapon.chargeTime > 0 && this.isCharging) {
      this.chargeTimer += dt;
    }
    
    // combo decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
    // dash velocity override
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vx = this.dashVx;
      this.vy = this.dashVy;
      // Create afterimage trail effect during dash
      if (!this.dashTrailTimer) this.dashTrailTimer = 0;
      this.dashTrailTimer -= dt;
      if (this.dashTrailTimer <= 0) {
        this.dashTrailTimer = 0.03; // Create trail every 30ms
        game.particles.push({
          x: this.x,
          y: this.y,
          aim: this.aim,
          t: 0,
          life: 0.25,
          sprite: this.sprites[this.walkFrame === 0 ? 'idle' : 'walk'],
          update(dt) { this.t += dt; },
          draw(ctx) {
            const alpha = Math.max(0, 1 - this.t / this.life) * 0.5;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.aim - Math.PI / 2);
            if (this.sprite && this.sprite.complete) {
              ctx.drawImage(this.sprite, -16, -16, 32, 32);
            }
            ctx.restore();
          }
        });
      }
    } else {
      // normal movement
      let ax = 0, ay = 0;
      if (input.left) ax -= 1; if (input.right) ax += 1; if (input.up) ay -= 1; if (input.down) ay += 1;
      const len = Math.hypot(ax, ay) || 1; ax /= len; ay /= len;
      // Apply frozen room slow effect (30% speed reduction)
      const room = game.rooms.get(game.currentRoomKey);
      const frozenSlow = (room && room.type === 'frozen') ? 0.7 : 1;
      const sp = this.speed * this.speedMultBase * this.speedMult * (this.iFrames > 0 ? 0.9 : 1) * frozenSlow;
      this.vx = ax * sp; this.vy = ay * sp;
      // Track if moving
      this.isMoving = (ax !== 0 || ay !== 0);
    }
    // Animation timer
    this.animTime += dt;
    if (this.isMoving && this.animTime >= 0.15) {
      this.walkFrame = this.walkFrame === 1 ? 2 : 1; // Toggle between 1 (walk1) and 2 (walk2)
      this.animTime = 0;
    } else if (!this.isMoving) {
      this.walkFrame = 0; // 0 = idle
      this.animTime = 0;
    }
  // tentative move with simple collider blocking (respect door gaps)
  const room = game.rooms.get(game.currentRoomKey);
  const cols = room?.contents?.colliders || [];
  const gaps = room?.contents?.doorGaps || [];
  let nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
  // resolve X
  const inGapX = gaps.some(g=> circleRect(nx, this.y, this.r, g));
  const hitX = cols.some(c=> (!c.prop || !c.prop.broken) && circleRect(nx, this.y, this.r, c)) && !inGapX;
  if (hitX) nx = this.x; // cancel X move
  // resolve Y
  const inGapY = gaps.some(g=> circleRect(this.x, ny, this.r, g));
  const hitY = cols.some(c=> (!c.prop || !c.prop.broken) && circleRect(this.x, ny, this.r, c)) && !inGapY;
  if (hitY) ny = this.y; // cancel Y move
  this.x = nx; this.y = ny;

    // clamp to room bounds
    const { w, h } = game.roomBounds;
    // Smaller margins so player can hit door thresholds
    this.x = clamp(this.x, 16, w - 16);
    this.y = clamp(this.y, 16, h - 16);

    // aim
    this.aim = angleTo(this.x, this.y, mouse.worldX, mouse.worldY);

    // cooldowns/regens
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.iFrames = Math.max(0, this.iFrames - dt);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
  this.stamina = clamp(this.stamina + (this.staminaRegen * this.staminaRegenMultBase * this.staminaRegenMult) * dt, 0, this.maxStamina);

    // recoil decay
    this.recoil = Math.max(0, this.recoil - dt*2);
    // tick buffs and auto-expire
    for (let i=this._buffs.length-1;i>=0;i--){ const b=this._buffs[i]; b.t-=dt; if (b.t<=0){ if (b.prop in this) this[b.prop]/=b.val; this._buffs.splice(i,1); } }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Select sprite based on state
    let sprite;
    if (this.muzzleFlash > 0) {
      sprite = this.sprites.shoot;
    } else if (this.isMoving) {
      sprite = this.walkFrame === 1 ? this.sprites.walk1 : this.sprites.walk2;
    } else {
      sprite = this.sprites.idle;
    }
    
    // Rotate entire sprite to face aim direction
    ctx.rotate(this.aim - Math.PI / 2); // -90 degrees because sprite faces up by default
    
    // Draw sprite
    const size = this.r * 2.2; // Slightly larger than hitbox
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // Flash white when hit
      if (this.iFrames > 0) {
        ctx.globalAlpha = 0.7 + Math.sin(performance.now() * 0.05) * 0.3;
        ctx.filter = 'brightness(150%)';
      }
      ctx.drawImage(sprite, -size/2, -size/2, size, size);
      if (this.iFrames > 0) {
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
    }
    // No fallback circle - only show sprite when loaded
    
    ctx.restore();
    
    // Draw weapon (especially visible when shooting)
    this.drawWeapon(ctx);
    
    // Draw charge indicator for charging weapons
    const weapon = this.currentWeapon;
    if (this.isCharging && weapon.chargeTime) {
      ctx.save();
      const chargePercent = Math.min(1, this.chargeTimer / weapon.chargeTime);
      const chargeRadius = this.r + 10 + (chargePercent * 15);
      ctx.strokeStyle = chargePercent >= 1 ? '#00ff00' : `rgba(255, 200, 0, ${0.5 + chargePercent * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, chargeRadius, 0, Math.PI * 2 * chargePercent);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw melee range indicator for buzz saw
    if (weapon.projectile === 'melee') {
      ctx.save();
      const meleeRange = weapon.meleeRange || 80;
      ctx.strokeStyle = 'rgba(255, 100, 50, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, meleeRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw muzzle flash separately (in world space, not rotated with sprite)
    if (this.muzzleFlash > 0) {
      ctx.save();
      const flashIntensity = this.muzzleFlash / 0.08;
      const flashX = this.x + Math.cos(this.aim) * (this.r + 12);
      const flashY = this.y + Math.sin(this.aim) * (this.r + 12);
      ctx.fillStyle = `rgba(255, 220, 100, ${flashIntensity})`;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 8 * flashIntensity, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 160, 50, ${flashIntensity * 0.6})`;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 12 * flashIntensity, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  
  drawWeapon(ctx) {
    if (!this.currentWeapon) return;
    
    // Get weapon image
    if (!this._weaponImages) this._weaponImages = {};
    if (!this._weaponImages[this.currentWeapon.id]) {
      const img = new Image();
      img.src = `assets/img/weapons/${this.currentWeapon.id}.svg`;
      this._weaponImages[this.currentWeapon.id] = img;
    }
    const weaponImg = this._weaponImages[this.currentWeapon.id];
    
    ctx.save();
    
    // Position weapon relative to player
    const weaponDistance = this.r + 8; // Distance from player center
    const weaponX = this.x + Math.cos(this.aim) * weaponDistance;
    const weaponY = this.y + Math.sin(this.aim) * weaponDistance;
    
    ctx.translate(weaponX, weaponY);
    ctx.rotate(this.aim);
    
    // Apply recoil effect
    const recoilOffset = -this.recoil * 8;
    
    // Weapon size based on type
    const baseSize = 24;
    const weaponW = baseSize;
    const weaponH = baseSize;
    
    // Make weapon more visible when shooting
    const alpha = this.muzzleFlash > 0 ? 1 : 0.85;
    ctx.globalAlpha = alpha;
    
    if (weaponImg && weaponImg.complete && weaponImg.naturalWidth > 0) {
      ctx.drawImage(weaponImg, recoilOffset - weaponW/2, -weaponH/2, weaponW, weaponH);
    } else {
      // Fallback: simple weapon shape
      ctx.fillStyle = '#757575';
      ctx.fillRect(recoilOffset - weaponW/2, -weaponH/4, weaponW, weaponH/2);
    }
    
    ctx.restore();
  }
}

function circleRect(cx, cy, cr, r){
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx, dy = cy - ny; return dx*dx + dy*dy <= cr*cr;
}
