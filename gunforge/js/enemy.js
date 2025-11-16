// enemy.js
// Enemy classes: melee, fast, ranged, tank, and a Boss.

import { angleTo, circleIntersect, clamp, dist2, ENEMY_TYPES, BOSS_TEMPLATE, BOSS_VARIANTS, WEAPONS, GAME, DIFFICULTY } from './data.js';
import { GoldenChest } from './loot.js';

const ENEMY_ICONS = {};
function getEnemyIcon(name){
  // Prevent loading boss SVGs without _idle/_walk suffix
  if (name.startsWith('boss')) return null;
  if (!ENEMY_ICONS[name]) {
    const img = new Image();
    img.src = `assets/img/enemies/${name}.svg`;
    ENEMY_ICONS[name] = img;
  }
  return ENEMY_ICONS[name];
}
import { Projectile } from './player.js';

export class Enemy {
  constructor(x, y, type = 'melee', isElite = false) {
    const t = ENEMY_TYPES[type] || ENEMY_TYPES.melee;
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    this.type = type;
    this.isElite = isElite;
    this.x = x; this.y = y;
    
    // Elite enemies are larger and stronger
    this.r = (t.r || 16) * (isElite ? 1.4 : 1);
    
    // Apply difficulty multipliers (and elite multipliers)
    const eliteMult = isElite ? 2.5 : 1;
    this.maxHp = Math.round(t.hp * diff.enemyHp * eliteMult); 
    this.hp = this.maxHp;
    this.speed = t.speed * diff.enemySpeed * (isElite ? 1.15 : 1);
    this.dmg = Math.round(t.dmg * diff.enemyDamage * eliteMult); 
    this.color = t.color;
    this.armor = t.armor || 0; this.range = t.range || 0; this.fireCd = 0;
    this.knockVx = 0; this.knockVy = 0; this.knockT = 0;
    this.ai = { state: 'wander', dir: Math.random()*Math.PI*2, change: 0 };
    this.dead = false;
    this.props = t; // keep type props reference
    this.pendingExplosion = null;
    // status effects
    this.burn = null; // {dps, t}
    this.slow = 0; // 0..1 factor applied to speed
    // visual and attack
    this.angle = Math.random() * Math.PI * 2; // rotation angle
    this.attackCd = 0; // cooldown between melee attacks
    this.attackRate = t.attackRate || 1.0; // seconds between attacks
    // Animation state
    this.animTime = 0;
    this.walkFrame = 0; // 0 = idle, 1 = walk
    this.isMoving = false;
    // Load animated sprites
    this.sprites = { idle: new Image(), walk: new Image() };
    this.sprites.idle.src = `assets/img/enemies/${type}_idle.svg`;
    this.sprites.walk.src = `assets/img/enemies/${type}_walk.svg`;
    // Shield mechanics
    if (t.shield) {
      this.shield = true;
      this.shieldHp = t.shieldHp || 100;
      this.maxShieldHp = this.shieldHp;
      this.shieldArc = (t.shieldArc || 120) * Math.PI / 180; // Convert to radians
    }
  }

  damage(v, game, fromAngle = null) {
    // Check shield blocking
    if (this.shield && this.shieldHp > 0 && fromAngle !== null) {
      // Calculate angle difference between shield facing and incoming damage
      let angleDiff = Math.abs(this.angle - fromAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      
      // If within shield arc, damage shield instead
      if (angleDiff < this.shieldArc / 2) {
        this.shieldHp -= v;
        if (this.shieldHp <= 0) {
          this.shieldHp = 0;
          // Shield broken effect
          if (game) {
            game.particles.push({
              x: this.x + Math.cos(this.angle) * (this.r + 10),
              y: this.y + Math.sin(this.angle) * (this.r + 10),
              t: 0, life: 0.6,
              draw(ctx) {
                const a = 1 - this.t / this.life;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.fillStyle = '#78909c';
                ctx.font = 'bold 14px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText('SHIELD BROKEN!', this.x, this.y - this.t * 40);
                ctx.restore();
              },
              update(dt) { this.t += dt; }
            });
          }
        }
        return; // Shield absorbed damage
      }
    }
    
    const reduction = (this.damageReduction || 0) + this.armor;
    this.hp -= Math.max(1, v * (1 - Math.min(0.95, reduction)));
    if (this.hp <= 0) {
      // trigger on-death explosion for bomber types
      if (this.props?.explode && !this.pendingExplosion) this.pendingExplosion = { ...this.props.explode };
      this.dead = true;
      // Rare loot drops
      if (game) {
        this.dropLoot(game);
      }
    }
  }

  dropLoot(game) {
    // Don't drop loot if spawned from spawner beyond reward limit
    if (this._noRewards) return;
    
    const room = game.rooms.get(game.currentRoomKey);
    if (!room) return;
    
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    
    // Elite enemies always drop loot
    const dropChance = this.isElite ? 1.0 : (0.15 * diff.dropRate);
    
    // Health orb drop
    if (Math.random() < dropChance) {
      room.contents.loot.push({
        type: 'health_orb',
        x: this.x,
        y: this.y,
        r: 8,
        heal: 20,
        draw(ctx) {
          ctx.save();
          ctx.fillStyle = '#ff5252';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#ffaaaa';
          ctx.beginPath();
          ctx.arc(this.x - 2, this.y - 2, this.r * 0.4, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
      });
    }
    
    // Rare weapon drop for elite/boss (5% for normal, 50% for elite, modified by difficulty)
    const baseWeaponDropChance = this.isElite ? 0.5 : 0.05;
    const weaponDropChance = baseWeaponDropChance * diff.dropRate;
    if (Math.random() < weaponDropChance) {
      const rareWeapons = WEAPONS.filter(w => w.rarity === 'rare' || w.rarity === 'epic' || w.rarity === 'legendary');
      if (rareWeapons.length > 0) {
        const weapon = rareWeapons[Math.floor(Math.random() * rareWeapons.length)];
        room.contents.loot.push({
          type: 'weapon_pickup',
          weapon: weapon,
          x: this.x,
          y: this.y
        });
      }
    }
  }

  update(dt, game) {
    if (this.dead) return;
    
    // Apply time warp slow effect
    let effectiveDt = dt;
    if (game.timeWarpActive) {
      effectiveDt = dt * 0.3; // 70% slow = 30% speed
    }
    
    const { player } = game; const dx = player.x - this.x; const dy = player.y - this.y;
    const d2 = dx*dx + dy*dy; const d = Math.sqrt(d2);

  // AI state default - increased detection range for better player tracking
  let desired = d < 800 ? 'chase' : 'wander'; // Increased from 520 to 800
  // Sniper prefers holding distance
  if (this.type === 'sniper') desired = 'snipe';
  if (this.ai.state !== desired) this.ai.state = desired;

    let ax = 0, ay = 0;
    let targetAngle = this.angle; // default keep current angle
    
    // Track if enemy is moving for animation
    this.isMoving = false;
    if (this.ai.state === 'chase') {
      ax = dx / (d || 1); ay = dy / (d || 1);
      targetAngle = Math.atan2(dy, dx); // face player
    } else if (this.ai.state === 'snipe') {
      const pref = this.props.range || 700;
      if (d < pref - 100) { ax = -dx / (d || 1); ay = -dy / (d || 1); targetAngle = Math.atan2(-dy, -dx); }
      else if (d > pref + 120) { ax = dx / (d || 1); ay = dy / (d || 1); targetAngle = Math.atan2(dy, dx); }
      else { ax = 0; ay = 0; targetAngle = Math.atan2(dy, dx); } // still face player
    } else {
      this.ai.change -= dt; if (this.ai.change <= 0) { this.ai.dir = Math.random()*Math.PI*2; this.ai.change = 1 + Math.random()*2; }
      ax = Math.cos(this.ai.dir); ay = Math.sin(this.ai.dir);
      targetAngle = this.ai.dir; // face wander direction
    }
    // Smooth rotation towards target angle
    let angleDiff = targetAngle - this.angle;
    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += angleDiff * Math.min(1, dt * 8); // smooth rotation

    // ranged enemies shoot
    if (this.type === 'ranged' && d < (this.range || 500)) {
      this.fireCd -= dt;
      if (this.fireCd <= 0) {
        this.fireCd = 1.2;
        const a = angleTo(this.x, this.y, player.x, player.y) + (Math.random()-0.5)*0.08;
        const v = 500; const vx = Math.cos(a)*v, vy = Math.sin(a)*v;
        game.enemyProjectiles.push(new Projectile(this.x, this.y, vx, vy, { from: 'enemy', damage: 10, color: '#26a69a' }));
      }
    }

    // sniper precise shot
    if (this.type === 'sniper' && d < (this.range || 720)) {
      this.fireCd -= dt;
      if (this.fireCd <= 0) {
        this.fireCd = this.props.fireCd || 1.8;
        const a = angleTo(this.x, this.y, player.x, player.y) + (Math.random()-0.5)*0.02;
        const v = this.props.projSpeed || 900; const vx = Math.cos(a)*v, vy = Math.sin(a)*v;
        game.enemyProjectiles.push(new Projectile(this.x, this.y, vx, vy, { from: 'enemy', damage: this.dmg, color: '#b39ddb' }));
      }
    }

    // bomber proximity detonation
    if (this.type === 'bomber') {
      const prox = (this.props?.prox || 48);
      if (d < prox) { this.pendingExplosion = { ...(this.props.explode || {r:100,dmg:30}) }; this.dead = true; }
    }

    // charger dash behavior
    if (this.type === 'charger') {
      this.ai.chargeCd = (this.ai.chargeCd ?? (this.props.chargeCd || 2.2)) - dt;
      if ((this.ai.chargeCd ?? 0) <= 0) {
        // start charge
        this.ai.chargeCd = (this.props.chargeCd || 2.2) + 0.3*Math.random();
        this.ai.chargeT = this.props.chargeDur || 0.5;
        this.ai.chargeDir = Math.atan2(dy, dx);
      }
      if ((this.ai.chargeT ?? 0) > 0) {
        this.ai.chargeT -= dt;
        ax = Math.cos(this.ai.chargeDir); ay = Math.sin(this.ai.chargeDir);
      }
    }

    // spawner behavior: spawn minions periodically
    if (this.type === 'spawner') {
      // Initialize spawner state
      if (this.ai.warmupTimer === undefined) {
        this.ai.warmupTimer = this.props.spawnWarmup || 2.0;
        this.ai.spawnCd = this.props.spawnCd || 3.5;
        this.ai.activeSpawns = 0; // Track currently alive spawned enemies
        this.ai.totalSpawned = 0; // Total spawned (for reward limit)
        this.ai.spawnedIds = new Set(); // Track spawned enemy IDs
      }
      
      // Warmup period before first spawn
      if (this.ai.warmupTimer > 0) {
        this.ai.warmupTimer -= dt;
        // Visual telegraph during warmup
        this.ai.warmupPulse = (this.ai.warmupPulse || 0) + dt * 3;
        return; // Don't spawn during warmup
      }
      
      // Count active spawns
      this.ai.activeSpawns = 0;
      for (const e of game.enemies) {
        if (this.ai.spawnedIds.has(e._spawnId)) {
          this.ai.activeSpawns++;
        }
      }
      
      // Spawn cooldown
      this.ai.spawnCd -= dt;
      
      // Spawn new enemy if conditions met
      const maxActive = this.props.spawnMax || 4;
      if (this.ai.spawnCd <= 0 && this.ai.activeSpawns < maxActive) {
        this.ai.spawnCd = this.props.spawnCd || 3.5;
        this.ai.totalSpawned++;
        
        // Spawn a fast enemy nearby with random offset
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 50 + Math.random() * 30;
        const spawnX = this.x + Math.cos(angle) * spawnDist;
        const spawnY = this.y + Math.sin(angle) * spawnDist;
        const spawned = new Enemy(spawnX, spawnY, 'fast');
        
        // Mark as spawned minion and track it
        spawned._spawnId = `spawn_${this.x}_${this.y}_${this.ai.totalSpawned}`;
        spawned._fromSpawner = true;
        
        // Limit rewards after threshold to prevent farming
        const rewardLimit = this.props.rewardLimit || 5;
        if (this.ai.totalSpawned > rewardLimit) {
          spawned._noRewards = true; // Flag to prevent XP/coins
        }
        
        this.ai.spawnedIds.add(spawned._spawnId);
        game.enemies.push(spawned);
        
        // Spawn particle effect
        if (game.spawnHitSparks) {
          game.spawnHitSparks(spawnX, spawnY, this.color);
        }
      }
    }

    // turret behavior: stationary shooting
    if (this.type === 'turret') {
      ax = 0; ay = 0; // no movement
      targetAngle = Math.atan2(dy, dx); // always face player
      if (d < (this.range || 600)) {
        this.fireCd -= dt;
        if (this.fireCd <= 0) {
          this.fireCd = this.props.fireCd || 1.0;
          const a = angleTo(this.x, this.y, player.x, player.y);
          const v = 700; const vx = Math.cos(a)*v, vy = Math.sin(a)*v;
          game.enemyProjectiles.push(new Projectile(this.x, this.y, vx, vy, { from: 'enemy', damage: this.dmg, color: '#ff5252' }));
        }
      }
    }

    // ghost behavior: can phase through walls
    if (this.type === 'ghost') {
      this.ai.phaseTimer = (this.ai.phaseTimer ?? 0) - dt;
      if ((this.ai.phaseTimer ?? 0) <= 0) {
        this.ai.phaseTimer = 3.0 + Math.random() * 2.0;
        this.ai.phasing = !this.ai.phasing;
      }
    }

    // berserker behavior: rage mode when low hp
    if (this.type === 'berserker') {
      const hpRatio = this.hp / this.maxHp;
      if (hpRatio < 0.5 && !this.ai.raged) {
        this.ai.raged = true;
        this.speed = (this.props.speed || 180) * (this.props.rageMult || 1.5);
      }
    }

    // healer behavior: heal nearby allies
    if (this.type === 'healer') {
      this.ai.healCd = (this.ai.healCd ?? (this.props.healCd || 2.5)) - dt;
      if ((this.ai.healCd ?? 0) <= 0) {
        this.ai.healCd = this.props.healCd || 2.5;
        const healRadius = this.props.healRadius || 200;
        const healAmount = this.props.healAmount || 15;
        // heal nearby enemies
        game.enemies.forEach(e => {
          if (e !== this && !e.dead) {
            const dist = Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2);
            if (dist <= healRadius) {
              e.hp = Math.min(e.maxHp, e.hp + healAmount);
            }
          }
        });
      }
    }

    // summoner behavior: summon minions
    if (this.type === 'summoner') {
      if (Math.random() < 0.015) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 60;
        const spawnX = this.x + Math.cos(angle) * spawnDist;
        const spawnY = this.y + Math.sin(angle) * spawnDist;
        game.enemies.push(new Enemy(spawnX, spawnY, 'melee'));
      }
    }

    // movement + simple separation
    // apply slow
    let sp = this.speed * (this.slow>0 ? (1 - this.slow) : 1);
    if (d < 70 && this.type === 'fast') sp *= 1.1;
    if ((this.ai.chargeT ?? 0) > 0 && this.type === 'charger') sp *= (this.props.chargeMult || 3.0);
    
    // Animation: check if moving
    this.isMoving = (ax !== 0 || ay !== 0) && this.type !== 'turret';
    if (this.isMoving) {
      this.animTime += dt;
      if (this.animTime >= 0.2) { // Slower animation for enemies
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
        this.animTime = 0;
      }
    } else {
      this.walkFrame = 0;
      this.animTime = 0;
    }
    
  // tentative move with collider blocking (respect door gaps)
  // ghosts can phase through walls when phasing
  const room = game.rooms.get(game.currentRoomKey);
  const cols = room?.contents?.colliders || [];
  const gaps = room?.contents?.doorGaps || [];
  let nx = this.x + (ax * sp + this.knockVx) * effectiveDt;
  let ny = this.y + (ay * sp + this.knockVy) * effectiveDt;
  
  if ((this.type !== 'ghost' || !this.ai.phasing) && this.type !== 'flying') {
    if (cols.some(c=> (!c.prop || !c.prop.broken) && circleRect(nx, this.y, this.r, c)) && !gaps.some(g=> circleRect(nx, this.y, this.r, g))) nx = this.x;
    if (cols.some(c=> (!c.prop || !c.prop.broken) && circleRect(this.x, ny, this.r, c)) && !gaps.some(g=> circleRect(this.x, ny, this.r, g))) ny = this.y;
  }
  
  this.x = nx; this.y = ny;
    this.knockVx *= Math.pow(0.001, dt); this.knockVy *= Math.pow(0.001, dt);
    this.knockT = Math.max(0, this.knockT - dt);

    // Nudge out of colliders if stuck (similar to player spawn logic)
    let nudgeTries = 0;
    while (nudgeTries++ < 8 && this.type !== 'flying' && cols.some(c => (!c.prop || !c.prop.broken) && circleRect(this.x, this.y, this.r, c))) {
      const cx = room.w / 2, cy = room.h / 2;
      const dx = cx - this.x, dy = cy - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.x += (dx / len) * 6;
      this.y += (dy / len) * 6;
    }

    // bounds
    const { w, h } = game.roomBounds;
    this.x = clamp(this.x, 20, w-20); this.y = clamp(this.y, 20, h-20);

    // burn tick
    if (this.burn) {
      this.hp -= this.burn.dps * dt; this.burn.t -= dt; if (this.hp <= 0) this.dead = true; if (this.burn.t <= 0) this.burn = null;
    }
    // slow decay
    if (this.slow>0) this.slow = Math.max(0, this.slow - dt*0.3);
  }

  draw(ctx) {
    if (this.dead) return;
    
    // Ghost phasing transparency
    if (this.type === 'ghost' && this.ai.phasing) {
      ctx.globalAlpha = 0.5;
    }
    
    ctx.save();
    ctx.translate(this.x, this.y);
    // Turrets need 90-degree rotation offset for top-down view
    const rotationAngle = this.type === 'turret' ? this.angle + Math.PI / 2 : this.angle;
    ctx.rotate(rotationAngle);
    
    // Use animated sprite (idle, walk, attack, hurt, dead)
    const sprite = this.getCurrentSprite();
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -this.r*1.2, -this.r*1.2, this.r*2.4, this.r*2.4);
    } else {
      // Fallback: draw oriented circle with direction indicator (no icon fallback to prevent 404s)
      ctx.fillStyle = this.color;
      ctx.beginPath(); 
      ctx.arc(0, 0, this.r, 0, Math.PI*2); 
      ctx.fill();
      // Direction indicator
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(this.r * 0.6, 0);
      ctx.lineTo(this.r * 0.2, this.r * 0.3);
      ctx.lineTo(this.r * 0.2, -this.r * 0.3);
      ctx.closePath();
      ctx.fill();
    }

  // restore transform used for sprite rotation/translation
    ctx.restore();

    // Elite glow effect
    if (this.isElite) {
      ctx.save();
      // Pulsing golden aura
      const pulse = 0.6 + Math.sin(performance.now() * 0.005) * 0.4;
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 4;
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#ffca28';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      // Secondary inner glow
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = pulse * 0.8;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      // Elite sparkle particles
      if (Math.random() < 0.15) {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.r + 8 + Math.random() * 10;
        ctx.save();
        ctx.fillStyle = '#ffeb3b';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(angle) * distance, this.y + Math.sin(angle) * distance, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Berserker rage effect
    if (this.type === 'berserker' && this.ai.raged) {
      ctx.save();
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7 + Math.sin(performance.now() * 0.01) * 0.3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Spawner warmup telegraph
    if (this.type === 'spawner' && this.ai.warmupTimer > 0) {
      ctx.save();
      const progress = 1 - (this.ai.warmupTimer / (this.props.spawnWarmup || 2.0));
      const pulseIntensity = Math.sin((this.ai.warmupPulse || 0) * Math.PI) * 0.5 + 0.5;
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 + pulseIntensity * 0.4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 8 + pulseIntensity * 6, 0, Math.PI * 2 * progress);
      ctx.stroke();
      ctx.restore();
    }

    // Healer aura effect
    if (this.type === 'healer') {
      ctx.save();
      ctx.strokeStyle = '#80deea';
      ctx.lineWidth = 1;
      const pulseRadius = this.r + 4 + Math.sin(performance.now() * 0.003) * 4;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Shield visualization
    if (this.shield && this.shieldHp > 0) {
      ctx.save();
      const shieldRadius = this.r + 12;
      const shieldAlpha = clamp(this.shieldHp / this.maxShieldHp, 0.3, 0.8);
      
      // Shield arc
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      
      // Shield gradient
      const grad = ctx.createRadialGradient(0, 0, this.r, 0, 0, shieldRadius);
      grad.addColorStop(0, `rgba(120, 144, 156, 0)`);
      grad.addColorStop(1, `rgba(120, 144, 156, ${shieldAlpha})`);
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, shieldRadius, -this.shieldArc / 2, this.shieldArc / 2);
      ctx.closePath();
      ctx.fill();
      
      // Shield border
      ctx.strokeStyle = `rgba(96, 125, 139, ${shieldAlpha + 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, -this.shieldArc / 2, this.shieldArc / 2);
      ctx.stroke();
      
      // Shield edge lines
      ctx.strokeStyle = `rgba(176, 190, 197, ${shieldAlpha + 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-this.shieldArc / 2) * shieldRadius, Math.sin(-this.shieldArc / 2) * shieldRadius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(this.shieldArc / 2) * shieldRadius, Math.sin(this.shieldArc / 2) * shieldRadius);
      ctx.stroke();
      
      ctx.restore();
      
      // Shield health bar
      const shieldRatio = clamp(this.shieldHp / this.maxShieldHp, 0, 1);
      const sbw = Math.max(22, this.r * 1.8);
      const sbh = 3;
      const sbx = this.x - sbw / 2;
      const sby = this.y - this.r - 18;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sbx, sby, sbw, sbh);
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(sbx, sby, sbw * shieldRatio, sbh);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(sbx, sby, sbw, sbh);
      ctx.restore();
    }

    // healthbar
    const ratio = clamp(this.hp / this.maxHp, 0, 1);
    const bw = Math.max(22, this.r * 1.8); const bh = 4; const bx = this.x - bw/2; const by = this.y - this.r - 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, bh);
    const hpColor = this.props?.elite ? '#ffca28' : '#66bb6a';
    ctx.fillStyle = hpColor; ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();

    // Status effect visual indicators
    if (this.burn) { 
      ctx.save(); 
      ctx.strokeStyle='rgba(255,122,0,0.8)'; 
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.arc(this.x, this.y, this.r + 6 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI*2); 
      ctx.stroke(); 
      // Fire particles
      ctx.fillStyle = 'rgba(255,100,0,0.6)';
      for (let i = 0; i < 3; i++) {
        const angle = (Date.now() * 0.005 + i * 2) % (Math.PI * 2);
        const px = this.x + Math.cos(angle) * (this.r + 8);
        const py = this.y + Math.sin(angle) * (this.r + 8);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore(); 
    }
    
    if (this.slow > 0.3) { 
      ctx.save();
      // Icy blue tint over enemy
      ctx.fillStyle = `rgba(129, 212, 250, ${this.slow * 0.3})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      // Ice crystals
      ctx.strokeStyle = 'rgba(150, 230, 255, 0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + (Date.now() * 0.001);
        const x1 = this.x + Math.cos(angle) * this.r;
        const y1 = this.y + Math.sin(angle) * this.r;
        const x2 = this.x + Math.cos(angle) * (this.r + 6);
        const y2 = this.y + Math.sin(angle) * (this.r + 6);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore(); 
    }

    // Reset alpha for ghost
    if (this.type === 'ghost' && this.ai.phasing) {
      ctx.globalAlpha = 1.0;
    }

  }

}

// Animation: choose sprite based on state
Enemy.prototype.getCurrentSprite = function() {
  if (this.animState && this.sprites[this.animState]) {
    return this.sprites[this.animState];
  }
  if (this.isMoving) return this.sprites.walk;
  return this.sprites.idle;
};
 
function circleRect(cx, cy, cr, r){
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx, dy = cy - ny; return dx*dx + dy*dy <= cr*cr;
}

export class Boss extends Enemy {
  // variant is the string key for BOSS_VARIANTS (e.g. 'boss1','boss2','boss3')
  constructor(x, y, variant = 'boss') {
    super(x, y, 'tank');
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;
    this.variant = variant;
    const tpl = (BOSS_VARIANTS && BOSS_VARIANTS[variant]) ? BOSS_VARIANTS[variant] : BOSS_TEMPLATE;
    // copy template properties
    Object.assign(this, tpl);
    // Apply difficulty multipliers to boss stats from template
    this.hp = this.maxHp = Math.round(tpl.hp * diff.enemyHp);
    this.speed = tpl.speed * diff.enemySpeed;
    this.dmg = Math.round(tpl.dmg * diff.enemyDamage);
    this.phase = 1; this.timer = 0; this.fireCd = 0; this.summonTimer = 0;
    this.color = tpl.color || BOSS_TEMPLATE.color;
    // load boss-specific sprites/icons
    this.sprites.idle = new Image(); this.sprites.walk = new Image();
    this.sprites.idle.onerror = () => { this.sprites.idle = null; };
    this.sprites.walk.onerror = () => { this.sprites.walk = null; };
    this.sprites.idle.src = `assets/img/enemies/${variant}_idle.svg`;
    this.sprites.walk.src = `assets/img/enemies/${variant}_walk.svg`;
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.player;
    const a = angleTo(this.x, this.y, p.x, p.y);
    // simple pursuit (bosses are big and deliberate)
    const vx = Math.cos(a) * this.speed, vy = Math.sin(a) * this.speed;
    let nx = this.x + vx * dt;
    let ny = this.y + vy * dt;
    
    // Collision detection for bosses
    const room = game.rooms.get(game.currentRoomKey);
    const cols = room?.contents?.colliders || [];
    const gaps = room?.contents?.doorGaps || [];
    
    if (cols.some(c=> (!c.prop || !c.prop.broken) && circleRect(nx, this.y, this.r, c)) && !gaps.some(g=> circleRect(nx, this.y, this.r, g))) nx = this.x;
    if (cols.some(c=> (!c.prop || !c.prop.broken) && circleRect(this.x, ny, this.r, c)) && !gaps.some(g=> circleRect(this.x, ny, this.r, g))) ny = this.y;
    
    this.x = nx; this.y = ny;
    
    // Nudge out of colliders if stuck
    let nudgeTries = 0;
    while (nudgeTries++ < 8 && cols.some(c => (!c.prop || !c.prop.broken) && circleRect(this.x, this.y, this.r, c))) {
      const cx = room.w / 2, cy = room.h / 2;
      const dx = cx - this.x, dy = cy - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.x += (dx / len) * 6;
      this.y += (dy / len) * 6;
    }
    
    // bounds
    const { w, h } = game.roomBounds;
    this.x = clamp(this.x, 20, w-20); this.y = clamp(this.y, 20, h-20);
    
    this.fireCd -= dt; this.timer += dt; this.summonTimer -= dt;

    // phase thresholds
    if (this.hp < this.maxHp * 0.75) this.phase = Math.max(this.phase, 2);
    if (this.hp < this.maxHp * 0.5) this.phase = Math.max(this.phase, 3);
    if (this.hp < this.maxHp * 0.25) this.phase = Math.max(this.phase, 4);

    const tpl = (BOSS_VARIANTS && BOSS_VARIANTS[this.variant]) ? BOSS_VARIANTS[this.variant] : BOSS_TEMPLATE;
    const diff = DIFFICULTY[GAME.difficulty] || DIFFICULTY.medium;

    // Handle special abilities
    if (tpl.special) {
      // Teleport ability
      if (tpl.special.includes('teleport') && this.timer > 8 && Math.random() < 0.03) {
        const range = 200;
        this.x = p.x + (Math.random() - 0.5) * range;
        this.y = p.y + (Math.random() - 0.5) * range;
        this.timer = 0;
        game.particles.push({ x: this.x, y: this.y, t: 0, life: 0.5, draw(ctx) {
          const a = 1 - this.t / this.life;
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ba68c8'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(this.x, this.y, 40 * (1 + this.t / this.life), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }, update(dt) { this.t += dt; } });
      }
      // Shields (reduce damage during phase 1-2)
      if (tpl.special.includes('shields') && this.phase < 3) {
        this.damageReduction = 0.5;
      } else {
        this.damageReduction = 0;
      }
    }

    // Variant-specific attack patterns
    if (tpl.attackType === 'tentacle') {
      const rate = tpl.tentacleCd || 5.0;
      // If we are not telegraphing and cooldown reached, start telegraph
      if (!this.telegraphing && this.fireCd <= 0) {
        this.telegraphing = true;
        this.telegraphTimer = tpl.telegraphDuration || 1.0;
        // create a ground arc telegraph particle object and push into game.particles
        const tele = {
          t: 0,
          life: this.telegraphTimer,
          x: this.x,
          y: this.y,
          angle: a,
          spread: tpl.tentacleSpread || Math.PI * 1.2,
          radius: tpl.tentacleRadius || (this.r + 80),
          color: tpl.telegraphColor || '#8b00ff',
          update(dt) { this.t += dt; },
          draw(ctx) {
            const alpha = Math.max(0, 1 - this.t / this.life);
            const pulse = 0.8 + Math.sin(performance.now() * 0.01) * 0.2;
            ctx.save(); ctx.translate(this.x, this.y);
            // filled arc with gradient
            const outer = this.radius;
            const inner = Math.max(10, this.radius - 26);
            const g = ctx.createRadialGradient(0,0,inner, 0,0, outer);
            // Use a robust hex->rgba conversion for canvas gradients
            g.addColorStop(0, hexToRgba(this.color, 0.75));
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = alpha * 0.9 * pulse;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(Math.cos(this.angle - this.spread/2) * inner, Math.sin(this.angle - this.spread/2) * inner);
            ctx.arc(0, 0, outer, this.angle - this.spread/2, this.angle + this.spread/2);
            ctx.lineTo(Math.cos(this.angle + this.spread/2) * inner, Math.sin(this.angle + this.spread/2) * inner);
            ctx.arc(0,0, inner, this.angle + this.spread/2, this.angle - this.spread/2, true);
            ctx.closePath(); ctx.fill();
            // segmented ring ticks
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = this.color; ctx.lineWidth = 2;
            const segs = 8;
            for (let s = 0; s < segs; s++) {
              const t = s / segs; const a1 = this.angle - this.spread/2 + t * this.spread; const a2 = a1 + (this.spread / segs) * 0.6;
              ctx.beginPath(); ctx.arc(0,0, outer - 6, a1, a2); ctx.stroke();
            }
            // countdown number in center
            const remaining = Math.max(0, Math.ceil((this.life - this.t) * 10) / 10);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(remaining.toFixed(1) + 's', 0, 0);
            ctx.restore();
          }
        };
        game.particles.push(tele);
        // Play telegraph SFX if available
        try { game.audio.playBossTelegraph(); } catch(e) { /* ignore if audio not initialized */ }
      }

      // If telegraphing, countdown then perform attack when telegraphTimer elapses
        function hexToRgba(hex, a = 1) {
          if (!hex) return `rgba(255,255,255,${a})`;
          let h = String(hex).trim();
          if (h[0] === '#') h = h.slice(1);
          if (h.length === 3) h = h.split('').map(c => c + c).join('');
          if (h.length !== 6) return `rgba(255,255,255,${a})`;
          const r = parseInt(h.substring(0,2), 16);
          const g = parseInt(h.substring(2,4), 16);
          const b = parseInt(h.substring(4,6), 16);
          return `rgba(${r},${g},${b},${a})`;
        }
      if (this.telegraphing) {
        this.telegraphTimer -= dt;
        if (this.telegraphTimer <= 0) {
          // perform the tentacle swipe attack
          const count = tpl.tentacleCount || 6;
          const spread = tpl.tentacleSpread || Math.PI * 1.2;
          for (let i = 0; i < count; i++) {
            const ang = a + (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
            const speed = 380 + this.phase * 50;
            const vx2 = Math.cos(ang) * speed, vy2 = Math.sin(ang) * speed;
            const bossDmg = Math.round((tpl.dmg + 12 + this.phase * 6) * diff.enemyDamage);
            // spawn thick, slow projectile representing a tentacle swipe
            game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: tpl.telegraphColor || '#8b00ff', life: 1.6, radius: 12 }));
          }
          // slam feedback: camera shake and SFX
          try { game.audio.playBossSlam(); } catch(e) {}
          game.camera.shake = Math.max(game.camera.shake, 18 + this.phase * 6);
          this.telegraphing = false;
          this.fireCd = rate * (0.85 - (this.phase - 1) * 0.12);
        }
      }

      // summon minions occasionally on higher phases
      if (this.phase >= 3 && this.summonTimer <= 0) {
        this.summonTimer = tpl.summonCd || 12.0;
        const spawns = 1 + Math.floor(this.phase / 2);
        for (let s = 0; s < spawns; s++) {
          const ang = Math.random() * Math.PI * 2;
          const sx = this.x + Math.cos(ang) * (this.r + 40 + Math.random() * 40);
          const sy = this.y + Math.sin(ang) * (this.r + 40 + Math.random() * 40);
          game.enemies.push(new Enemy(sx, sy, tpl.minionType || 'fast'));
        }
      }
      return;
    }

    // VOLLEY attack - spread of projectiles
    if (tpl.attackType === 'volley') {
      const rate = this.phase === 1 ? 1.2 : this.phase === 2 ? 0.9 : 0.6;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 3 + this.phase;
        for (let i = 0; i < count; i++) {
          const aa = a + (i - (count - 1) / 2) * 0.2;
          const v = 550;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((14 + this.phase * 3) * diff.enemyDamage);
          game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: tpl.color }));
        }
      }
      return;
    }

    // TRACKING attack - homing projectiles
    if (tpl.attackType === 'tracking') {
      const rate = this.phase === 1 ? 1.8 : this.phase === 2 ? 1.4 : 1.0;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 1 + Math.floor(this.phase / 2);
        for (let i = 0; i < count; i++) {
          const aa = a + (Math.random() - 0.5) * 0.3;
          const v = 400;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((18 + this.phase * 4) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: tpl.color, life: 3.0 });
          proj.tracking = true; proj.trackSpeed = 200;
          game.enemyProjectiles.push(proj);
        }
      }
      return;
    }

    // BURST attack - rapid fire bursts
    if (tpl.attackType === 'burst') {
      const rate = this.phase === 1 ? 2.5 : this.phase === 2 ? 2.0 : 1.5;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        this.burstCount = 5 + this.phase * 2;
        this.burstTimer = 0.15;
      }
      if (this.burstCount > 0 && this.burstTimer > 0) {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          const v = 650;
          const vx2 = Math.cos(a) * v, vy2 = Math.sin(a) * v;
          const bossDmg = Math.round((12 + this.phase * 2) * diff.enemyDamage);
          game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: tpl.color }));
          this.burstCount--;
          this.burstTimer = 0.15;
        }
      }
      return;
    }

    // SPIRAL attack - rotating projectiles
    if (tpl.attackType === 'spiral') {
      const rate = this.phase === 1 ? 0.4 : this.phase === 2 ? 0.3 : 0.2;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 8;
        const rotation = (this.timer * 2) % (Math.PI * 2);
        for (let i = 0; i < count; i++) {
          const aa = rotation + (i / count) * Math.PI * 2;
          const v = 450;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((15 + this.phase * 3) * diff.enemyDamage);
          game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: tpl.color, life: 2.5 }));
        }
      }
      return;
    }

    // FLAME_WAVE attack - expanding fire wave
    if (tpl.attackType === 'flame_wave') {
      const rate = this.phase === 1 ? 3.5 : this.phase === 2 ? 2.8 : 2.2;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 16 + this.phase * 4;
        for (let i = 0; i < count; i++) {
          const aa = (i / count) * Math.PI * 2;
          const v = 350 + Math.random() * 100;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((20 + this.phase * 4) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#ff6f00', life: 2.0 });
          proj.ignite = true;
          game.enemyProjectiles.push(proj);
        }
        game.camera.shake = Math.max(game.camera.shake, 12);
      }
      return;
    }

    // POISON_CLOUD attack - toxic area denial
    if (tpl.attackType === 'poison_cloud') {
      const rate = this.phase === 1 ? 4.0 : this.phase === 2 ? 3.2 : 2.5;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const clouds = 2 + Math.floor(this.phase / 2);
        for (let c = 0; c < clouds; c++) {
          const aa = a + (c - (clouds - 1) / 2) * 0.8;
          const dist = 150 + Math.random() * 100;
          const cx = this.x + Math.cos(aa) * dist;
          const cy = this.y + Math.sin(aa) * dist;
          const cloud = {
            x: cx, y: cy, r: 60, t: 0, life: 5.0 + this.phase,
            damage: Math.round((8 + this.phase * 2) * diff.enemyDamage),
            tickRate: 0.5, tickTimer: 0,
            update(dt) {
              this.t += dt;
              this.tickTimer -= dt;
              if (this.tickTimer <= 0) {
                this.tickTimer = this.tickRate;
                const dx = p.x - this.x, dy = p.y - this.y;
                if (Math.hypot(dx, dy) < this.r + p.r) {
                  p.damage(this.damage, 'poison');
                }
              }
            },
            draw(ctx) {
              const a = Math.max(0, 1 - this.t / this.life);
              ctx.save();
              ctx.globalAlpha = a * 0.6;
              const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
              g.addColorStop(0, '#76ff03');
              g.addColorStop(1, 'rgba(118,255,3,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          };
          game.particles.push(cloud);
        }
      }
      return;
    }

    // LIGHTNING_BURST attack - electric chains
    if (tpl.attackType === 'lightning_burst') {
      const rate = this.phase === 1 ? 2.5 : this.phase === 2 ? 2.0 : 1.5;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 6 + this.phase * 2;
        for (let i = 0; i < count; i++) {
          const aa = a + (Math.random() - 0.5) * Math.PI;
          const v = 600 + Math.random() * 200;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((16 + this.phase * 3) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#00e5ff', life: 1.5 });
          proj.chain = true;
          game.enemyProjectiles.push(proj);
        }
        game.camera.shake = Math.max(game.camera.shake, 8);
      }
      return;
    }

    // OMNI_BARRAGE attack - massive projectile spam
    if (tpl.attackType === 'omni_barrage') {
      const rate = this.phase === 1 ? 5.0 : this.phase === 2 ? 4.0 : 3.0;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const waves = 3 + this.phase;
        for (let w = 0; w < waves; w++) {
          setTimeout(() => {
            const count = 20 + this.phase * 4;
            for (let i = 0; i < count; i++) {
              const aa = (i / count) * Math.PI * 2 + w * 0.2;
              const v = 400 + w * 100;
              const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
              const bossDmg = Math.round((14 + this.phase * 3) * diff.enemyDamage);
              game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: tpl.color, life: 3.0 }));
            }
          }, w * 400);
        }
        game.camera.shake = Math.max(game.camera.shake, 16);
      }
      return;
    }

    // ICE_NOVA attack - freezing radial burst with ice walls
    if (tpl.attackType === 'ice_nova') {
      const rate = this.phase === 1 ? 4.0 : this.phase === 2 ? 3.2 : 2.5;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 20 + this.phase * 4;
        for (let i = 0; i < count; i++) {
          const aa = (i / count) * Math.PI * 2;
          const v = 380 + Math.random() * 80;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((18 + this.phase * 4) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#00bcd4', life: 2.5 });
          proj.freeze = true;
          game.enemyProjectiles.push(proj);
        }
        // Create ice walls phase 3+
        if (this.phase >= 3) {
          for (let w = 0; w < 3; w++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 80;
            const wx = this.x + Math.cos(ang) * dist;
            const wy = this.y + Math.sin(ang) * dist;
            game.particles.push({
              x: wx, y: wy, w: 40, h: 60, t: 0, life: 4.0,
              update(dt) { this.t += dt; },
              draw(ctx) {
                const a = Math.max(0, 1 - this.t / this.life);
                ctx.save();
                ctx.globalAlpha = a * 0.8;
                ctx.fillStyle = '#80deea';
                ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
                ctx.strokeStyle = '#00bcd4';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
                ctx.restore();
              }
            });
          }
        }
        game.camera.shake = Math.max(game.camera.shake, 14);
      }
      return;
    }

    // POISON_DART attack - toxic projectiles with poison aura and heal
    if (tpl.attackType === 'poison_dart') {
      const rate = this.phase === 1 ? 1.8 : this.phase === 2 ? 1.4 : 1.0;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 4 + this.phase;
        for (let i = 0; i < count; i++) {
          const aa = a + (i - (count - 1) / 2) * 0.25;
          const v = 520;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((16 + this.phase * 3) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#9ccc65', life: 2.0 });
          proj.poison = true;
          game.enemyProjectiles.push(proj);
        }
      }
      // Poison aura damage
      if (!this.auraTimer) this.auraTimer = 0;
      this.auraTimer -= dt;
      if (this.auraTimer <= 0) {
        this.auraTimer = 1.0;
        const auraRadius = tpl.special?.poisonAuraRadius || 120;
        const dx = p.x - this.x, dy = p.y - this.y;
        if (Math.hypot(dx, dy) < auraRadius + p.r) {
          p.damage(Math.round((6 + this.phase) * diff.enemyDamage), 'poison');
        }
      }
      // Heal ability
      if (!this.healTimer) this.healTimer = 15;
      this.healTimer -= dt;
      if (this.healTimer <= 0 && this.hp < this.maxHp * 0.8) {
        this.healTimer = 15;
        const healAmount = tpl.special?.healAmount || 150;
        this.hp = Math.min(this.maxHp, this.hp + healAmount);
        game.particles.push({
          x: this.x, y: this.y, t: 0, life: 1.0,
          draw(ctx) {
            const a = 1 - this.t / this.life;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = '#9ccc65';
            ctx.font = 'bold 18px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('+' + healAmount, this.x, this.y - 40 - this.t * 30);
            ctx.restore();
          },
          update(dt) { this.t += dt; }
        });
      }
      return;
    }

    // MAGIC_MISSILE attack - homing arcane projectiles with blink and rune circles
    if (tpl.attackType === 'magic_missile') {
      const rate = this.phase === 1 ? 2.0 : this.phase === 2 ? 1.6 : 1.2;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 8 + this.phase * 2;
        for (let i = 0; i < count; i++) {
          const aa = a + (i - (count - 1) / 2) * 0.15;
          const v = 480;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((15 + this.phase * 3) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#d500f9', life: 2.5 });
          proj.tracking = true;
          proj.trackSpeed = 180;
          game.enemyProjectiles.push(proj);
        }
      }
      // Blink ability
      if (!this.blinkTimer) this.blinkTimer = 8;
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = 8;
        const blinkRange = tpl.special?.blinkRange || 250;
        const ang = Math.random() * Math.PI * 2;
        this.x = p.x + Math.cos(ang) * blinkRange;
        this.y = p.y + Math.sin(ang) * blinkRange;
        game.particles.push({
          x: this.x, y: this.y, t: 0, life: 0.6,
          draw(ctx) {
            const a = 1 - this.t / this.life;
            ctx.save();
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#e040fb';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 50 * (1 + this.t / this.life), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          },
          update(dt) { this.t += dt; }
        });
      }
      // Rune circles phase 3+
      if (this.phase >= 3) {
        if (!this.runeTimer) this.runeTimer = 6;
        this.runeTimer -= dt;
        if (this.runeTimer <= 0) {
          this.runeTimer = 6;
          const runeRadius = tpl.special?.runeRadius || 150;
          const runeDamage = tpl.special?.runeDamage || 60;
          game.particles.push({
            x: p.x, y: p.y, r: runeRadius, t: 0, life: 3.0, damage: Math.round(runeDamage * diff.enemyDamage), hit: false,
            update(dt) {
              this.t += dt;
              if (!this.hit && this.t > 2.5) {
                const dx = p.x - this.x, dy = p.y - this.y;
                if (Math.hypot(dx, dy) < this.r + p.r) {
                  p.damage(this.damage);
                  this.hit = true;
                }
              }
            },
            draw(ctx) {
              const a = Math.max(0, 1 - this.t / this.life);
              const pulse = this.t > 2.0 ? Math.sin((this.t - 2.0) * 20) * 0.5 + 0.5 : 0.5;
              ctx.save();
              ctx.globalAlpha = a * 0.7 * pulse;
              ctx.strokeStyle = '#e040fb';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
              ctx.stroke();
              for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2 + this.t * 2;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(ang) * this.r, this.y + Math.sin(ang) * this.r, 6, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          });
        }
      }
      return;
    }

    // LAVA_BURST attack - molten projectiles with lava pools and eruption
    if (tpl.attackType === 'lava_burst') {
      const rate = this.phase === 1 ? 3.0 : this.phase === 2 ? 2.4 : 1.8;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const count = 16 + this.phase * 4;
        for (let i = 0; i < count; i++) {
          const aa = (i / count) * Math.PI * 2;
          const v = 420 + Math.random() * 100;
          const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
          const bossDmg = Math.round((20 + this.phase * 4) * diff.enemyDamage);
          const proj = new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#ff6d00', life: 2.2 });
          proj.ignite = true;
          game.enemyProjectiles.push(proj);
        }
        // Lava pools
        const poolCount = tpl.special?.lavaPools || 3;
        for (let i = 0; i < poolCount; i++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 120;
          const px = this.x + Math.cos(ang) * dist;
          const py = this.y + Math.sin(ang) * dist;
          const poolDmg = tpl.special?.poolDamage || 20;
          const poolDuration = tpl.special?.poolDuration || 8;
          game.particles.push({
            x: px, y: py, r: 50, t: 0, life: poolDuration, damage: Math.round(poolDmg * diff.enemyDamage), tickTimer: 0, tickRate: 0.4,
            update(dt) {
              this.t += dt;
              this.tickTimer -= dt;
              if (this.tickTimer <= 0) {
                this.tickTimer = this.tickRate;
                const dx = p.x - this.x, dy = p.y - this.y;
                if (Math.hypot(dx, dy) < this.r + p.r) {
                  p.damage(this.damage, 'fire');
                }
              }
            },
            draw(ctx) {
              const a = Math.max(0, 1 - this.t / this.life);
              ctx.save();
              ctx.globalAlpha = a * 0.7;
              const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
              g.addColorStop(0, '#ff9100');
              g.addColorStop(0.5, '#ff6d00');
              g.addColorStop(1, 'rgba(255,69,0,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          });
        }
        game.camera.shake = Math.max(game.camera.shake, 15);
      }
      // Eruption phase
      if (this.phase === 4) {
        if (!this.eruptTimer) this.eruptTimer = 10;
        this.eruptTimer -= dt;
        if (this.eruptTimer <= 0) {
          this.eruptTimer = 10;
          const count = 32;
          for (let i = 0; i < count; i++) {
            const aa = (i / count) * Math.PI * 2;
            const v = 350 + Math.random() * 150;
            const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
            const bossDmg = Math.round((25 + this.phase * 5) * diff.enemyDamage);
            game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#ffff00', life: 2.5 }));
          }
          game.camera.shake = Math.max(game.camera.shake, 22);
        }
      }
      return;
    }

    // SHADOW_STRIKE attack - rapid melee combo with phase walk and clones
    if (tpl.attackType === 'shadow_strike') {
      const rate = this.phase === 1 ? 2.0 : this.phase === 2 ? 1.6 : 1.2;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        // Triple strike combo
        for (let s = 0; s < 3; s++) {
          setTimeout(() => {
            const count = 5;
            for (let i = 0; i < count; i++) {
              const aa = a + (i - (count - 1) / 2) * 0.3;
              const v = 680 + s * 100;
              const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
              const bossDmg = Math.round((18 + this.phase * 4) * diff.enemyDamage);
              game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#616161', life: 1.2 }));
            }
          }, s * 200);
        }
      }
      // Phase walk (dodge chance)
      const phaseChance = tpl.special?.phaseWalkChance || 0.15;
      if (Math.random() < phaseChance * dt * 10) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 100;
        this.x = p.x + Math.cos(ang) * dist;
        this.y = p.y + Math.sin(ang) * dist;
      }
      // Clone summon phase 2+
      if (this.phase >= 2) {
        if (!this.cloneTimer) this.cloneTimer = tpl.special?.cloneCd || 18;
        this.cloneTimer -= dt;
        if (this.cloneTimer <= 0) {
          this.cloneTimer = tpl.special?.cloneCd || 18;
          const cloneDuration = tpl.special?.cloneDuration || 8;
          for (let c = 0; c < 2; c++) {
            const ang = (c / 2) * Math.PI * 2;
            const cx = this.x + Math.cos(ang) * 100;
            const cy = this.y + Math.sin(ang) * 100;
            const clone = new Enemy(cx, cy, 'fast');
            clone.hp = Math.round(this.hp * 0.3);
            clone.maxHp = clone.hp;
            clone.isClone = true;
            clone.cloneLife = cloneDuration;
            game.enemies.push(clone);
          }
        }
      }
      return;
    }

    // GROUND_POUND attack - shockwave with charge and shields
    if (tpl.attackType === 'ground_pound') {
      const rate = this.phase === 1 ? 4.5 : this.phase === 2 ? 3.6 : 2.8;
      if (this.fireCd <= 0) {
        this.fireCd = rate;
        const waves = tpl.special?.poundWaves || 3;
        const waveRadius = tpl.special?.poundRadius || 200;
        for (let w = 0; w < waves; w++) {
          game.particles.push({
            x: this.x, y: this.y, r: 0, maxR: waveRadius + w * 60, t: 0, life: 1.5, wave: w,
            damage: Math.round((30 + this.phase * 6) * diff.enemyDamage), hit: false,
            update(dt) {
              this.t += dt;
              this.r = (this.t / this.life) * this.maxR;
              if (!this.hit) {
                const dx = p.x - this.x, dy = p.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist < this.r + p.r && dist > this.r - 30) {
                  p.damage(this.damage);
                  p.vx += (dx / dist) * 400;
                  p.vy += (dy / dist) * 400;
                  this.hit = true;
                }
              }
            },
            draw(ctx) {
              const a = Math.max(0, 1 - this.t / this.life);
              ctx.save();
              ctx.globalAlpha = a * 0.8;
              ctx.strokeStyle = '#78909c';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          });
        }
        game.camera.shake = Math.max(game.camera.shake, 20);
      }
      // Charge attack phase 3+
      if (this.phase >= 3) {
        if (!this.chargeTimer) this.chargeTimer = 7;
        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0 && !this.charging) {
          this.charging = true;
          this.chargeTimer = 7;
          this.chargeDuration = tpl.special?.chargeDuration || 1.5;
          this.chargeSpeed = tpl.special?.chargeSpeed || 500;
          const dx = p.x - this.x, dy = p.y - this.y;
          const len = Math.hypot(dx, dy) || 1;
          this.chargeVx = (dx / len) * this.chargeSpeed;
          this.chargeVy = (dy / len) * this.chargeSpeed;
        }
        if (this.charging) {
          this.chargeDuration -= dt;
          this.x += this.chargeVx * dt;
          this.y += this.chargeVy * dt;
          if (this.chargeDuration <= 0) {
            this.charging = false;
          }
        }
      }
      // Shields phase 2+
      if (this.phase >= 2 && tpl.special?.shields) {
        this.damageReduction = 0.4;
      }
      return;
    }

    // Default legacy behavior for old bosses
    const rate = this.phase === 1 ? 1.1 : this.phase === 2 ? 0.8 : 0.55;
    if (this.fireCd <= 0) {
      this.fireCd = rate;
      const volley = this.phase + 2;
      for (let i = 0; i < volley; i++) {
        const aa = a + (i - (volley - 1) / 2) * 0.15;
        const v = 600 + this.phase * 100;
        const vx2 = Math.cos(aa) * v, vy2 = Math.sin(aa) * v;
        const bossDmg = Math.round((16 + this.phase * 3) * diff.enemyDamage);
        game.enemyProjectiles.push(new Projectile(this.x, this.y, vx2, vy2, { from: 'enemy', damage: bossDmg, color: '#ffca28' }));
      }
    }
  }

  dropLoot(game) {
    // Bosses drop golden chests instead of normal loot
    const room = game.rooms.get(game.currentRoomKey);
    if (!room) return;
    
    // Spawn golden chest at boss position
    const goldenChest = new GoldenChest(this.x, this.y);
    room.contents.loot.push(goldenChest);
    
    // Also spawn some health orbs
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 * i) / 3;
      const dist = 50;
      room.contents.loot.push({
        type: 'health_orb',
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        r: 10,
        heal: 30,
        draw(ctx) {
          ctx.save();
          ctx.fillStyle = '#ff5252';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#ffaaaa';
          ctx.beginPath();
          ctx.arc(this.x - 2, this.y - 2, this.r * 0.4, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
      });
    }
  }

  draw(ctx) {
    if (this.dead) return;
    const icon = getEnemyIcon(this.variant || 'boss');
    if (icon && icon.complete && icon.naturalWidth > 0) ctx.drawImage(icon, this.x - this.r * 1.3, this.y - this.r * 1.3, this.r * 2.6, this.r * 2.6);
    else { ctx.save(); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    // Boss healthbar (larger and more prominent)
    const ratio = clamp(this.hp / this.maxHp, 0, 1);
    const bw = Math.max(60, this.r * 2.5); const bh = 8; const bx = this.x - bw / 2; const by = this.y - this.r - 20;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx, by, bw, bh);
    // Phase-colored health bar
    const phaseColor = this.phase === 4 ? '#d50000' : this.phase === 3 ? '#ff1744' : this.phase === 2 ? '#ff5722' : '#ff9800';
    ctx.fillStyle = phaseColor; ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    // Phase indicator
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`PHASE ${this.phase}`, this.x, by - 6);
    ctx.restore();
  }
}
