// traps.js
// Spikes, acid pools, and mines. Drawn with SVGs for small/big variants.

const TRAP_ICONS = {};
function getTrapIcon(name){
  if (!TRAP_ICONS[name]) { const img = new Image(); img.src = `assets/img/traps/${name}.svg`; TRAP_ICONS[name] = img; }
  return TRAP_ICONS[name];
}

export class SpikeField {
  constructor(x, y, w=120, h=120) { this.x=x; this.y=y; this.w=w; this.h=h; this.t=0; }
  update(dt) { this.t+=dt; }
  collideDamage(px, py, pr) { return rectCircle(this.x,this.y,this.w,this.h,px,py,pr) ? 16 : 0; }
  getCollider() { return { x: this.x, y: this.y, w: this.w, h: this.h }; } // return collision box for blocking movement
  draw(ctx) {
    // Draw a more distinct spike field visual - optimized to use single path
    ctx.save();
    // Dark metal base
    ctx.fillStyle = '#37474f';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    // Draw all spikes in a single path for better performance
    const spikeSize = 12;
    const spacing = 18;
    const globalOffset = Math.sin(this.t * 2) * 1.5; // simplified animation
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    for (let sx = this.x + spacing/2; sx < this.x + this.w; sx += spacing) {
      for (let sy = this.y + spacing/2; sy < this.y + this.h; sy += spacing) {
        ctx.moveTo(sx, sy - spikeSize/2 + globalOffset);
        ctx.lineTo(sx - spikeSize/3, sy + spikeSize/2 + globalOffset);
        ctx.lineTo(sx + spikeSize/3, sy + spikeSize/2 + globalOffset);
        ctx.closePath();
      }
    }
    ctx.fill();
    // Border highlight
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    ctx.restore();
  }
}

export class AcidPool {
  constructor(x,y,r=70){ this.x=x; this.y=y; this.r=r; this.t=0; }
  update(dt){ this.t+=dt; }
  collideDamage(px,py,pr){ const dx=px-this.x,dy=py-this.y; return (dx*dx+dy*dy)<(this.r+pr)*(this.r+pr) ? 8 : 0; }
  draw(ctx){ const key = this.r>90?'acid_big':'acid_small'; const img = getTrapIcon(key); if (img && img.complete) ctx.drawImage(img, this.x-this.r, this.y-this.r, this.r*2, this.r*2); else { ctx.save(); const g=ctx.createRadialGradient(this.x,this.y,10,this.x,this.y,this.r); g.addColorStop(0,'#9cff57'); g.addColorStop(1,'rgba(156,255,87,0.1)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.restore(); } }
}

export class Mine {
  constructor(x,y){ this.x=x; this.y=y; this.r=12; this.armed=true; this.t=0; }
  update(dt){ this.t+=dt; }
  tryExplode(px,py,pr){ if(!this.armed) return 0; const dx=px-this.x,dy=py-this.y; if(dx*dx+dy*dy<(pr+18)*(pr+18)){ this.armed=false; return 55; } return 0; }
  draw(ctx){ const key = this.r>16?'mine_big':'mine_small'; const img = getTrapIcon(key); if (img && img.complete) ctx.drawImage(img, this.x-this.r, this.y-this.r, this.r*2, this.r*2); else { ctx.save(); ctx.fillStyle=this.armed?'#455a64':'#263238'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ff5252'; ctx.beginPath(); ctx.arc(this.x,this.y,3,0,Math.PI*2); ctx.fill(); ctx.restore(); } }
}

function rectCircle(rx,ry,rw,rh,cx,cy,cr){ const nx=Math.max(rx,Math.min(cx,rx+rw)); const ny=Math.max(ry,Math.min(cy,ry+rh)); const dx=cx-nx,dy=cy-ny; return dx*dx+dy*dy<=cr*cr; }
