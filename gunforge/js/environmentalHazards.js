// environmentalHazards.js
// Environmental hazards system

const HAZARD_ICONS = {};
function getHazardIcon(name) {
  if (!HAZARD_ICONS[name]) {
    const img = new Image();
    img.src = `assets/img/props/${name}.svg`;
    HAZARD_ICONS[name] = img;
  }
  return HAZARD_ICONS[name];
}

export class LavaFlow {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.damage = 25; // DPS
    this.type = 'lava';
    this.animTime = Math.random() * 100;
  }

  update(dt) {
    this.animTime += dt;
  }

  collideDamage(px, py, pr) {
    // Check if player is standing in lava
    if (px + pr > this.x && px - pr < this.x + this.width &&
        py + pr > this.y && py - pr < this.y + this.height) {
      return this.damage;
    }
    return 0;
  }

  draw(ctx) {
    const img = getHazardIcon('lava_flow');
    const tileSize = 128;
    
    ctx.save();
    // Draw tiled lava
    for (let x = this.x; x < this.x + this.width; x += tileSize) {
      for (let y = this.y; y < this.y + this.height; y += tileSize) {
        const w = Math.min(tileSize, this.x + this.width - x);
        const h = Math.min(tileSize, this.y + this.height - y);
        
        if (img && img.complete) {
          // Animated glow
          const glow = 0.8 + Math.sin(this.animTime * 2 + x * 0.01 + y * 0.01) * 0.2;
          ctx.globalAlpha = glow;
          ctx.drawImage(img, x, y, w, h);
        } else {
          // Fallback
          ctx.fillStyle = '#ff6f00';
          ctx.fillRect(x, y, w, h);
        }
      }
    }
    ctx.restore();
  }
}

export class SpikeWall {
  constructor(x, y, width, height, orientation = 'horizontal') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.orientation = orientation;
    this.damage = 35;
    this.type = 'spikes';
    this.extendTime = 0;
    this.retractTime = 2;
    this.cycleDuration = 4; // 2s extended, 2s retracted
    this.cycleTimer = 0;
  }

  update(dt) {
    this.cycleTimer += dt;
    if (this.cycleTimer >= this.cycleDuration) {
      this.cycleTimer = 0;
    }
  }

  isExtended() {
    return this.cycleTimer < this.retractTime;
  }

  collideDamage(px, py, pr) {
    if (!this.isExtended()) return 0;

    if (px + pr > this.x && px - pr < this.x + this.width &&
        py + pr > this.y && py - pr < this.y + this.height) {
      return this.damage;
    }
    return 0;
  }

  draw(ctx) {
    const img = getHazardIcon('spike_wall');
    const extended = this.isExtended();
    const tileSize = 64;
    
    ctx.save();
    // Warning indicator when retracted
    if (!extended) {
      ctx.fillStyle = 'rgba(255, 152, 0, 0.2)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Flashing warning
      const flash = Math.sin(this.cycleTimer * 8) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255, 152, 0, ${flash})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    // Draw spikes
    const offset = extended ? 0 : tileSize;
    ctx.globalAlpha = extended ? 1 : 0.3;

    if (this.orientation === 'horizontal') {
      for (let x = this.x; x < this.x + this.width; x += tileSize) {
        if (img && img.complete) {
          ctx.drawImage(img, x, this.y - offset, tileSize, tileSize);
        }
      }
    } else {
      for (let y = this.y; y < this.y + this.height; y += tileSize) {
        ctx.save();
        ctx.translate(this.x, y + tileSize / 2);
        ctx.rotate(Math.PI / 2);
        if (img && img.complete) {
          ctx.drawImage(img, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

export class LaserGrid {
  constructor(x, y, width, height, pattern = 'horizontal') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.pattern = pattern; // 'horizontal', 'vertical', 'cross'
    this.damage = 40;
    this.type = 'laser';
    this.cycleTimer = 0;
    this.cycleDuration = 3; // 1.5s on, 1.5s off
    this.spacing = 80;
  }

  update(dt) {
    this.cycleTimer += dt;
    if (this.cycleTimer >= this.cycleDuration) {
      this.cycleTimer = 0;
    }
  }

  isActive() {
    return this.cycleTimer < this.cycleDuration / 2;
  }

  collideDamage(px, py, pr) {
    if (!this.isActive()) return 0;

    const beamWidth = 8;
    
    // Check horizontal beams
    if (this.pattern === 'horizontal' || this.pattern === 'cross') {
      for (let y = this.y; y <= this.y + this.height; y += this.spacing) {
        if (px + pr > this.x && px - pr < this.x + this.width &&
            py + pr > y - beamWidth && py - pr < y + beamWidth) {
          return this.damage;
        }
      }
    }
    
    // Check vertical beams
    if (this.pattern === 'vertical' || this.pattern === 'cross') {
      for (let x = this.x; x <= this.x + this.width; x += this.spacing) {
        if (py + pr > this.y && py - pr < this.y + this.height &&
            px + pr > x - beamWidth && px - pr < x + beamWidth) {
          return this.damage;
        }
      }
    }

    return 0;
  }

  draw(ctx) {
    const active = this.isActive();
    const beamWidth = 8;
    
    ctx.save();
    
    // Warning when inactive
    if (!active) {
      const flash = Math.sin(this.cycleTimer * 10) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255, 23, 68, ${flash * 0.3})`;
      ctx.lineWidth = 2;
      
      if (this.pattern === 'horizontal' || this.pattern === 'cross') {
        for (let y = this.y; y <= this.y + this.height; y += this.spacing) {
          ctx.beginPath();
          ctx.moveTo(this.x, y);
          ctx.lineTo(this.x + this.width, y);
          ctx.stroke();
        }
      }
      
      if (this.pattern === 'vertical' || this.pattern === 'cross') {
        for (let x = this.x; x <= this.x + this.width; x += this.spacing) {
          ctx.beginPath();
          ctx.moveTo(x, this.y);
          ctx.lineTo(x, this.y + this.height);
          ctx.stroke();
        }
      }
    } else {
      // Draw active lasers
      const img = getHazardIcon('laser_grid');
      
      if (this.pattern === 'horizontal' || this.pattern === 'cross') {
        for (let y = this.y; y <= this.y + this.height; y += this.spacing) {
          // Glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff1744';
          ctx.fillStyle = 'rgba(255, 23, 68, 0.3)';
          ctx.fillRect(this.x, y - beamWidth, this.width, beamWidth * 2);
          
          // Core beam
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ff1744';
          ctx.fillRect(this.x, y - beamWidth / 2, this.width, beamWidth);
          
          // Bright center
          ctx.fillStyle = '#fff';
          ctx.fillRect(this.x, y - 1, this.width, 2);
        }
      }
      
      if (this.pattern === 'vertical' || this.pattern === 'cross') {
        for (let x = this.x; x <= this.x + this.width; x += this.spacing) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff1744';
          ctx.fillStyle = 'rgba(255, 23, 68, 0.3)';
          ctx.fillRect(x - beamWidth, this.y, beamWidth * 2, this.height);
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ff1744';
          ctx.fillRect(x - beamWidth / 2, this.y, beamWidth, this.height);
          
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - 1, this.y, 2, this.height);
        }
      }
    }
    
    ctx.restore();
  }
}

export class CollapsingFloor {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = 'collapsing';
    this.integrity = 1.0; // 1.0 = stable, 0.0 = collapsed
    this.collapsing = false;
    this.collapseTimer = 0;
    this.warningTime = 1.0; // warning before collapse
    this.fallDamage = 100;
    this.playerOn = false;
  }

  update(dt, player) {
    // Check if player is on floor
    const wasOn = this.playerOn;
    this.playerOn = player.x + player.r > this.x && 
                    player.x - player.r < this.x + this.width &&
                    player.y + player.r > this.y && 
                    player.y - player.r < this.y + this.height;

    if (this.playerOn && !this.collapsing && this.integrity > 0) {
      // Start collapsing
      if (!wasOn) {
        this.collapsing = true;
        this.collapseTimer = 0;
      } else {
        this.collapseTimer += dt;
      }
      
      if (this.collapseTimer >= this.warningTime) {
        this.integrity -= dt * 2; // collapse in 0.5s after warning
        if (this.integrity <= 0) {
          this.integrity = 0;
        }
      }
    }
  }

  collideDamage(px, py, pr) {
    if (this.integrity <= 0 && this.playerOn) {
      return this.fallDamage; // instant damage when falling through
    }
    return 0;
  }

  isPassable() {
    return this.integrity > 0;
  }

  draw(ctx) {
    const img = getHazardIcon('collapsing_floor');
    const tileSize = 64;
    
    ctx.save();
    
    // Draw floor tiles
    for (let x = this.x; x < this.x + this.width; x += tileSize) {
      for (let y = this.y; y < this.y + this.height; y += tileSize) {
        const w = Math.min(tileSize, this.x + this.width - x);
        const h = Math.min(tileSize, this.y + this.height - y);
        
        ctx.globalAlpha = this.integrity;
        
        // Shake when collapsing
        let offsetX = 0, offsetY = 0;
        if (this.collapsing && this.integrity > 0) {
          const shake = (1 - this.integrity) * 5;
          offsetX = (Math.random() - 0.5) * shake;
          offsetY = (Math.random() - 0.5) * shake;
        }
        
        if (img && img.complete) {
          ctx.drawImage(img, x + offsetX, y + offsetY, w, h);
        } else {
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(x + offsetX, y + offsetY, w, h);
        }
      }
    }
    
    // Warning indicator
    if (this.collapsing && this.collapseTimer < this.warningTime) {
      const flash = Math.sin(this.collapseTimer * 15) * 0.5 + 0.5;
      ctx.globalAlpha = flash * 0.5;
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff5722';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    // Collapsed (pit)
    if (this.integrity <= 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Pit edges
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 4;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    ctx.restore();
  }
}
