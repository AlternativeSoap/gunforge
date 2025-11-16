// meleeWeapons.js
// Melee weapon system with swing mechanics

export const MELEE_WEAPONS = [
  // Common melee
  {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    damage: 35,
    range: 90,
    swingSpeed: 1.8,
    knockback: 200,
    color: '#8d6e63',
    rarity: 'common',
    type: 'sword',
    swingArc: 120
  },
  {
    id: 'pipe_wrench',
    name: 'Pipe Wrench',
    damage: 40,
    range: 70,
    swingSpeed: 1.5,
    knockback: 280,
    color: '#757575',
    rarity: 'common',
    type: 'club',
    swingArc: 90,
    stunChance: 0.15
  },

  // Uncommon melee
  {
    id: 'scrap_axe',
    name: 'Scrap Axe',
    damage: 55,
    range: 85,
    swingSpeed: 1.4,
    knockback: 320,
    color: '#ff7043',
    rarity: 'uncommon',
    type: 'axe',
    swingArc: 100,
    cleave: 2
  },
  {
    id: 'steel_blade',
    name: 'Steel Blade',
    damage: 48,
    range: 95,
    swingSpeed: 2.2,
    knockback: 180,
    color: '#90a4ae',
    rarity: 'uncommon',
    type: 'sword',
    swingArc: 130,
    critChance: 0.15
  },
  {
    id: 'war_hammer',
    name: 'War Hammer',
    damage: 70,
    range: 75,
    swingSpeed: 1.0,
    knockback: 450,
    color: '#5d4037',
    rarity: 'uncommon',
    type: 'hammer',
    swingArc: 100,
    stunChance: 0.25,
    slam: true
  },

  // Rare melee
  {
    id: 'katana',
    name: 'Wasteland Katana',
    damage: 65,
    range: 100,
    swingSpeed: 2.8,
    knockback: 200,
    color: '#b0bec5',
    rarity: 'rare',
    type: 'sword',
    swingArc: 140,
    critChance: 0.3,
    dash: 80
  },
  {
    id: 'battle_axe',
    name: 'Battle Axe',
    damage: 85,
    range: 90,
    swingSpeed: 1.3,
    knockback: 400,
    color: '#ff6f00',
    rarity: 'rare',
    type: 'axe',
    swingArc: 110,
    cleave: 4,
    bleed: { dps: 15, dur: 4 }
  },
  {
    id: 'shock_baton',
    name: 'Shock Baton',
    damage: 50,
    range: 80,
    swingSpeed: 2.5,
    knockback: 220,
    color: '#00e5ff',
    rarity: 'rare',
    type: 'club',
    swingArc: 95,
    stunChance: 0.4,
    shock: { chain: 2 }
  },

  // Epic melee
  {
    id: 'plasma_blade',
    name: 'Plasma Blade',
    damage: 95,
    range: 105,
    swingSpeed: 3.0,
    knockback: 250,
    color: '#69f0ae',
    rarity: 'epic',
    type: 'sword',
    swingArc: 150,
    burn: { dps: 20, dur: 3 },
    projectile: true
  },
  {
    id: 'thunder_hammer',
    name: 'Thunder Hammer',
    damage: 140,
    range: 85,
    swingSpeed: 1.1,
    knockback: 600,
    color: '#ffd54f',
    rarity: 'epic',
    type: 'hammer',
    swingArc: 120,
    stunChance: 0.6,
    slam: true,
    shockwave: 180
  },
  {
    id: 'reaper_scythe',
    name: 'Reaper Scythe',
    damage: 110,
    range: 120,
    swingSpeed: 1.8,
    knockback: 350,
    color: '#9c27b0',
    rarity: 'epic',
    type: 'polearm',
    swingArc: 160,
    cleave: 6,
    lifesteal: 0.2
  },

  // Legendary melee
  {
    id: 'void_blade',
    name: 'Void Blade',
    damage: 160,
    range: 110,
    swingSpeed: 3.5,
    knockback: 300,
    color: '#7c4dff',
    rarity: 'legendary',
    type: 'sword',
    swingArc: 180,
    critChance: 0.5,
    dash: 120,
    projectile: true,
    pierce: 999
  },
  {
    id: 'inferno_axe',
    name: 'Inferno Axe',
    damage: 180,
    range: 95,
    swingSpeed: 1.5,
    knockback: 500,
    color: '#ff6d00',
    rarity: 'legendary',
    type: 'axe',
    swingArc: 135,
    cleave: 8,
    burn: { dps: 30, dur: 5 },
    explosion: { radius: 120, damage: 60 }
  },
  {
    id: 'titan_hammer',
    name: 'Titan Hammer',
    damage: 250,
    range: 90,
    swingSpeed: 0.8,
    knockback: 800,
    color: '#8d6e63',
    rarity: 'legendary',
    type: 'hammer',
    swingArc: 120,
    slam: true,
    shockwave: 300,
    stunChance: 0.8,
    earthquake: true
  }
];

export class MeleeSwing {
  constructor(x, y, angle, weapon, owner) {
    this.x = x;
    this.y = y;
    this.startAngle = angle;
    this.weapon = weapon;
    this.owner = owner;
    this.progress = 0;
    this.duration = 0.25; // swing animation duration
    this.hitEnemies = new Set();
    this.active = true;
  }

  update(dt) {
    this.progress += dt / this.duration;
    if (this.progress >= 1) {
      this.active = false;
      return true; // swing complete
    }
    return false;
  }

  getArc() {
    const arcRad = (this.weapon.swingArc || 90) * Math.PI / 180;
    const swingAmount = Math.sin(this.progress * Math.PI); // 0->1->0 curve
    return {
      startAngle: this.startAngle - arcRad / 2,
      endAngle: this.startAngle + arcRad / 2,
      currentAngle: this.startAngle - arcRad / 2 + arcRad * this.progress
    };
  }

  checkHit(enemy) {
    if (this.hitEnemies.has(enemy)) return false;

    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > this.weapon.range + enemy.r) return false;

    const angleToEnemy = Math.atan2(dy, dx);
    const arc = this.getArc();
    
    // Normalize angle difference
    let diff = angleToEnemy - arc.currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const arcSize = (this.weapon.swingArc || 90) * Math.PI / 180;
    if (Math.abs(diff) < arcSize / 2) {
      this.hitEnemies.add(enemy);
      return true;
    }

    return false;
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.owner.x, this.owner.y);

    const arc = this.getArc();
    const intensity = Math.sin(this.progress * Math.PI);

    // Draw swing trail
    ctx.globalAlpha = intensity * 0.4;
    ctx.strokeStyle = this.weapon.color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, this.weapon.range * 0.7, arc.startAngle, arc.currentAngle);
    ctx.stroke();

    // Draw weapon
    ctx.globalAlpha = 1;
    ctx.rotate(arc.currentAngle);
    
    // Weapon shape based on type
    switch(this.weapon.type) {
      case 'sword':
        ctx.fillStyle = this.weapon.color;
        ctx.fillRect(this.weapon.range * 0.2, -4, this.weapon.range * 0.8, 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.weapon.range * 0.2, -2, this.weapon.range * 0.8, 4);
        break;
      case 'axe':
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(this.weapon.range * 0.2, -3, this.weapon.range * 0.6, 6);
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.moveTo(this.weapon.range * 0.7, -12);
        ctx.lineTo(this.weapon.range, 0);
        ctx.lineTo(this.weapon.range * 0.7, 12);
        ctx.fill();
        break;
      case 'hammer':
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(this.weapon.range * 0.2, -2, this.weapon.range * 0.6, 4);
        ctx.fillStyle = this.weapon.color;
        ctx.fillRect(this.weapon.range * 0.75, -14, this.weapon.range * 0.25, 28);
        break;
      case 'polearm':
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(this.weapon.range * 0.1, -2, this.weapon.range * 0.85, 4);
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.moveTo(this.weapon.range * 0.85, -10);
        ctx.lineTo(this.weapon.range, 0);
        ctx.lineTo(this.weapon.range * 0.85, 10);
        ctx.fill();
        break;
      default:
        ctx.fillStyle = this.weapon.color;
        ctx.fillRect(this.weapon.range * 0.3, -5, this.weapon.range * 0.7, 10);
    }

    ctx.restore();
  }
}
