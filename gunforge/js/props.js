// ...existing code...

// props.js
// Static blocking props (barrels/crates) with SVG rendering.

const PROP_ICONS = {};
function getPropIcon(name){
  if (!PROP_ICONS[name]) { const img = new Image(); img.src = `assets/img/props/${name}.svg`; PROP_ICONS[name] = img; }
  return PROP_ICONS[name];
}

export class Prop {
  constructor(x,y,type='barrel'){
    this.x=x; this.y=y; this.type=type;
    
    // Different sizes and properties for different types
    const specs = {
      barrel: { w: 32, h: 32, hp: 20, explosive: false },
      explosive_barrel: { w: 36, h: 36, hp: 15, explosive: true, explodeRadius: 220, explodeDamage: 80 },
      crate: { w: 32, h: 32, hp: 15, explosive: false },
      chest: { w: 36, h: 36, hp: 25, explosive: false },
      rock: { w: 40, h: 40, hp: 50, explosive: false },
      pillar: { w: 28, h: 48, hp: 100, explosive: false },
      vase: { w: 24, h: 30, hp: 8, explosive: false },
      statue: { w: 40, h: 48, hp: 80, explosive: false },
      bookshelf: { w: 36, h: 44, hp: 30, explosive: false }
    };
    
    const spec = specs[type] || specs.barrel;
    this.w = spec.w; this.h = spec.h;
    this.hp = spec.hp;
    this.broken = false;
    this.explosive = spec.explosive || false;
    this.explodeRadius = spec.explodeRadius || 0;
    this.explodeDamage = spec.explodeDamage || 0;
    this.fuseTimer = 0; // countdown timer for explosion
    this.fuseActive = false; // is fuse burning?
  }
  getCollider(){ 
    if (this.broken) return null; // no collision when broken
    return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; 
  }
  damage(v) {
    if (this.broken) return false;
    this.hp -= v;
    if (this.hp <= 0) {
      this.broken = true;
      // Start 2-second fuse for explosive barrel
      if (this.explosive && !this.fuseActive) {
        this.fuseActive = true;
        this.fuseTimer = 2.0; // 2 seconds until explosion
      }
      return true; // signal that it broke
    }
    return false;
  }
  
  update(dt) {
    if (this.fuseActive) {
      this.fuseTimer -= dt;
      if (this.fuseTimer <= 0) {
        // Time to explode!
        this.pendingExplosion = {
          r: this.explodeRadius,
          dmg: this.explodeDamage
        };
        this.fuseActive = false;
        return true; // signal explosion ready
      }
    }
    return false;
  }
  draw(ctx){
    // Draw fuse warning even when broken
    if (this.fuseActive) {
      ctx.save();
      // Rapidly pulsing danger warning
      const urgency = 1 - (this.fuseTimer / 2.0); // 0 to 1 as timer counts down
      const pulseSpeed = 10 + urgency * 30; // faster pulse as explosion nears
      const pulse = 0.5 + Math.sin(Date.now() * pulseSpeed * 0.001) * 0.5;
      
      // Expanding red circle
      const radius = this.w / 2 + (1 - this.fuseTimer / 2.0) * 20;
      ctx.globalAlpha = pulse * 0.6;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Warning text
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      const text = this.fuseTimer.toFixed(1);
      ctx.strokeText(text, this.x, this.y - this.h/2 - 10);
      ctx.fillText(text, this.x, this.y - this.h/2 - 10);
      
      // Draw barrel still
      const key = this.type === 'explosive_barrel' ? 'barrel' : this.type;
      const img = getPropIcon(key);
      if (img && img.complete) {
        ctx.globalAlpha = 0.8 + pulse * 0.2;
        ctx.drawImage(img, this.x - this.w/2, this.y - this.h/2, this.w, this.h);
      }
      ctx.restore();
      return;
    }
    
    if (this.broken) return; // don't draw if broken
    const key = this.type === 'explosive_barrel' ? 'barrel' : this.type;
    const img = getPropIcon(key);
    if (img && img.complete) {
      ctx.drawImage(img, this.x - this.w/2, this.y - this.h/2, this.w, this.h);
      // Add pulsing red glow for explosive barrels
      if (this.explosive) {
        ctx.save();
        const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.w / 2 + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // fallback colors for different prop types
      ctx.save();
      const colors = {
        crate: '#6d4c41',
        barrel: '#8d6e63',
        explosive_barrel: '#ff4500',
        chest: '#a1887f',
        rock: '#616161',
        pillar: '#757575',
        vase: '#ff6f00',
        statue: '#90a4ae',
        bookshelf: '#5d4037'
      };
      ctx.fillStyle = colors[this.type] || '#8d6e63';
      ctx.fillRect(this.x-this.w/2, this.y-this.h/2, this.w, this.h);
      ctx.restore();
    }
  }
}

// Torch prop with animation and light effect
export class Torch extends Prop {
  constructor(x, y, placement = 'floor') {
    super(x, y, 'torch');
    this.placement = placement; // 'floor' or 'wall'
    this.animTime = Math.random() * 2;
    this.frame = 0;
    const prefix = placement === 'wall' ? 'torch_wall_' : 'torch_floor_';
    this.frames = [
      getPropIcon(`${prefix}0`),
      getPropIcon(`${prefix}1`),
      getPropIcon(`${prefix}2`)
    ];
    this.w = placement === 'wall' ? 24 : 20;
    this.h = placement === 'wall' ? 32 : 40;
    this.hp = 9999; // not breakable
  }
  update(dt) {
    this.animTime += dt;
    // 8 fps animation
    this.frame = Math.floor(this.animTime * 8) % this.frames.length;
  }
  draw(ctx) {
    // Torch sprite - wall torches should be positioned against the wall edge
    const img = this.frames[this.frame];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    } else {
      // fallback: simple flame
      ctx.save();
      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 7, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Light glow effect - position based on torch type
    ctx.save();
    // Wall torches light from their top, floor torches from higher up
    const lightY = this.placement === 'wall' ? this.y - 12 : this.y - 18;
    ctx.globalAlpha = 0.3 + Math.sin(this.animTime * 3) * 0.15;
    const gradient = ctx.createRadialGradient(this.x, lightY, 5, this.x, lightY, 80);
    gradient.addColorStop(0, 'rgba(255, 200, 80, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 40, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, lightY, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Secret trapdoor that appears when player is nearby and allows skipping to next level
export class Trapdoor extends Prop {
  constructor(x, y) {
    super(x, y, 'trapdoor');
    this.w = 48;
    this.h = 48;
    this.hp = 9999; // indestructible
    this.visible = false; // starts hidden
    this.revealRadius = 120; // reveal when player within this distance
    this.interactRadius = 60; // can interact when within this distance
    this.pulseTime = 0;
  }
  
  getCollider() {
    return null; // trapdoors don't block movement
  }
  
  update(dt, game) {
    this.pulseTime += dt;
    
    // Check if player is nearby to reveal
    const player = game?.player;
    if (player) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < this.revealRadius) {
        this.visible = true;
      }
    }
  }
  
  canInteract(px, py) {
    const dist = Math.hypot(px - this.x, py - this.y);
    return this.visible && dist < this.interactRadius;
  }
  
  draw(ctx) {
    if (!this.visible) return; // hidden until player nearby
    
    ctx.save();
    
    // Draw stone trapdoor with runes
    const pulse = 0.7 + Math.sin(this.pulseTime * 2) * 0.3;
    
    // Base trapdoor
    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.w/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Inner ring
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.w/2 - 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Mystical glow
    ctx.globalAlpha = pulse * 0.5;
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.w/2 + 10);
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.8)');
    gradient.addColorStop(0.7, 'rgba(138, 43, 226, 0.3)');
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.w/2 + 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mystical runes around the edge
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(138, 43, 226, ${pulse})`;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const runeCount = 6;
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2 + this.pulseTime * 0.5;
      const rx = this.x + Math.cos(angle) * (this.w/2 - 8);
      const ry = this.y + Math.sin(angle) * (this.w/2 - 8);
      ctx.fillText('✦', rx, ry);
    }
    
    // Center icon
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = 'bold 24px system-ui';
    ctx.fillText('↓', this.x, this.y);
    
    ctx.restore();
  }
}
