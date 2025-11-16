// ui.js
// HUD, prompts, and minimap rendering.

import { RARITY, clamp } from './data.js';

// lightweight icon cache for weapon type SVGs
const ICON_CACHE = {};
function getWeaponIcon(id){
  const key = id || 'pistol';
  if (!ICON_CACHE[key]) {
    const img = new Image();
    img.src = `assets/img/weapons/${key}.svg`;
    ICON_CACHE[key] = img;
  }
  return ICON_CACHE[key];
}

// Level-up skill icon cache and mapping
const LEVEL_ICON_CACHE = {};
const SKILL_ICON_MAP = {
  hp: 'droplet',
  stamina: 'lightning',
  damage: 'sword',
  firerate: 'bullet',
  movespeed: 'boot',
  stamregen: 'lightning',
  crit: 'star',
  lifesteal: 'droplet',
  pierce: 'arrow',
  bullet: 'bullet',
  dash: 'wing',
};
function getSkillIcon(key){
  const name = SKILL_ICON_MAP[key]; if (!name) return null;
  if (!LEVEL_ICON_CACHE[name]) {
    const img = new Image();
    img.onerror = () => { LEVEL_ICON_CACHE[name] = null; };
    img.src = `assets/img/icons/${name}.svg`;
    LEVEL_ICON_CACHE[name] = img;
  }
  return LEVEL_ICON_CACHE[name];
}

export function drawHUD(ctx, game) {
  const { player, width, height } = game;
  ctx.save();
  ctx.resetTransform();
  ctx.font = '14px system-ui, Segoe UI, Arial';
  ctx.textBaseline = 'top';

  // HUD background panel
  const pad = 10;
  const barW = 240;
  const barH = 18;
  const x = 16, y = 16;
  
  // Draw semi-transparent panel background
  ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
  ctx.fillRect(x - 8, y - 8, barW + 16, 180);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 8, y - 8, barW + 16, 180);

  // HP Bar with gradient and glow
  drawBarAdvanced(ctx, x, y, barW, barH, player.hp / player.maxHp, 
    ['#ff5252', '#ef5350', '#e53935'], '#1a0505', '#ff1744');
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, Arial';
  ctx.fillText(`❤ ${Math.ceil(player.hp)}/${player.maxHp}`, x + 4, y + 4);

  // Stamina Bar with gradient
  drawBarAdvanced(ctx, x, y + 28, barW, barH, player.stamina / player.maxStamina,
    ['#42a5f5', '#2196f3', '#1976d2'], '#051a2a', '#2196f3');
  ctx.fillText(`⚡ Stamina ${Math.floor(player.stamina)}`, x + 4, y + 32);

  // XP Bar with golden gradient
  drawBarAdvanced(ctx, x, y + 56, barW, barH, player.xp / player.xpToLevel,
    ['#ffeb3b', '#ffc107', '#ff9800'], '#2a1f05', '#ffca28');
  ctx.fillText(`★ LV ${player.level} — ${Math.floor(player.xp)}/${player.xpToLevel} XP`, x + 4, y + 60);

  // Weapon section
  const w = player.currentWeapon;
  const rarity = RARITY[w.rarity] || RARITY.common;
  
  // Weapon background box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y + 88, barW, 52);
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y + 88, barW, 52);
  
  // Weapon icon with glow
  const icon = getWeaponIcon(w.id);
  try {
    if (icon && icon.complete) {
      ctx.shadowColor = rarity.color;
      ctx.shadowBlur = 10;
      ctx.drawImage(icon, x + 6, y + 94, 40, 40);
      ctx.shadowBlur = 0;
    }
  } catch {}
  
  // Weapon name and rarity
  ctx.fillStyle = rarity.color;
  ctx.font = 'bold 12px system-ui, Arial';
  ctx.fillText(rarity.name.toUpperCase(), x + 52, y + 96);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, Arial';
  ctx.fillText(w.name, x + 52, y + 113);
  
  // Weapon counter if multiple
  if (player.weapons.length > 1) {
    ctx.fillStyle = '#aaa';
    ctx.font = '11px system-ui, Arial';
    ctx.fillText(`[${player.weaponIndex + 1}/${player.weapons.length}] R to swap`, x + 52, y + 128);
  }
  
  // Coins and depth below HUD panel
  ctx.font = 'bold 14px system-ui, Arial';
  ctx.fillStyle = '#ffeb3b';
  ctx.fillText(`💰 ${game.coins} Coins`, x, y + 154);
  ctx.fillStyle = '#64b5f6';
  ctx.fillText(`🎯 Depth ${game.depth || 1}`, x + 120, y + 154);
  
  // Enemy count (if in combat)
  if (game.enemies.length > 0) {
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 13px system-ui, Arial';
    ctx.fillText(`☠ ${game.enemies.length} Enemies`, x, y + 172);
  }
  
  // Dash cooldown indicator (bottom-left)
  const dashX = x;
  const dashY = height - 80;
  const dashSize = 50;
  const dashReady = player.dashCd <= 0 && player.stamina >= 25;
  
  ctx.save();
  // Background circle
  ctx.fillStyle = dashReady ? 'rgba(0, 230, 118, 0.2)' : 'rgba(50, 50, 50, 0.5)';
  ctx.beginPath();
  ctx.arc(dashX + dashSize/2, dashY + dashSize/2, dashSize/2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dashReady ? '#00e676' : 'rgba(150, 150, 150, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Cooldown arc
  if (player.dashCd > 0) {
    const cooldownPercent = 1 - (player.dashCd / 0.45);
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(dashX + dashSize/2, dashY + dashSize/2, dashSize/2 - 2, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * cooldownPercent));
    ctx.stroke();
  }
  
  // Dash icon
  ctx.fillStyle = dashReady ? '#fff' : '#666';
  ctx.font = 'bold 20px system-ui, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', dashX + dashSize/2, dashY + dashSize/2);
  
  // Keybind hint
  ctx.font = '10px system-ui, Arial';
  ctx.fillStyle = '#aaa';
  ctx.fillText('SHIFT', dashX + dashSize/2, dashY + dashSize + 8);
  ctx.restore();

  // Combo counter (top-right)
  if (player.combo > 0) {
    const comboX = width - 120;
    const comboY = 20;
    ctx.save();
    ctx.font = 'bold 28px system-ui, Arial';
    ctx.textAlign = 'right';
    // Color based on combo level
    const comboColor = player.combo >= 20 ? '#ff5252' : player.combo >= 10 ? '#ffca28' : '#00e676';
    ctx.fillStyle = comboColor;
    ctx.fillText(`x${player.combo}`, comboX, comboY);
    ctx.font = '12px system-ui, Arial';
    ctx.fillStyle = '#ccc';
    ctx.fillText('COMBO', comboX, comboY + 30);
    // Timer bar
    const timerRatio = player.comboTimer / 3.5;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(comboX - 80, comboY + 42, 80, 4);
    ctx.fillStyle = comboColor;
    ctx.fillRect(comboX - 80, comboY + 42, 80 * timerRatio, 4);
    ctx.restore();
  }
  
  // Ultimate ability indicator (bottom-right)
  if (player.ultimateType) {
    const ultX = width - 80;
    const ultY = height - 80;
    const ultSize = 60;
    const isActive = player.ultimateActive;
    const isReady = player.ultimateCooldown <= 0 && !isActive;
    
    ctx.save();
    // Background
    ctx.fillStyle = isActive ? 'rgba(255, 200, 0, 0.3)' : isReady ? 'rgba(100, 200, 255, 0.2)' : 'rgba(50, 50, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(ultX, ultY, ultSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isActive ? '#ffca28' : isReady ? '#64b5f6' : '#666';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Active pulse effect
    if (isActive) {
      const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.5;
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 2;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(ultX, ultY, ultSize/2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    // Cooldown arc
    if (player.ultimateCooldown > 0) {
      const maxCd = player.ultimateType === 'fortress' ? 45 : player.ultimateType === 'berserk' ? 50 : 40;
      const cdPercent = 1 - (player.ultimateCooldown / maxCd);
      ctx.strokeStyle = '#64b5f6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ultX, ultY, ultSize/2 - 2, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * cdPercent));
      ctx.stroke();
    }
    
    // Duration bar (when active)
    if (isActive) {
      const maxDur = player.ultimateType === 'fortress' ? 5 : player.ultimateType === 'berserk' ? 8 : 6;
      const durPercent = player.ultimateDuration / maxDur;
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ultX, ultY, ultSize/2 - 8, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * durPercent));
      ctx.stroke();
    }
    
    // Icon
    const icon = player.ultimateType === 'fortress' ? '⚔️' : player.ultimateType === 'berserk' ? '💥' : '⏰';
    ctx.font = 'bold 24px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive ? '#fff' : isReady ? '#fff' : '#666';
    ctx.fillText(icon, ultX, ultY);
    
    // Keybind
    ctx.font = '10px system-ui, Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Q', ultX, ultY + ultSize/2 + 12);
    ctx.restore();
  }

  // Interaction prompt
  if (game.prompt) {
    drawPrompt(ctx, game.prompt, width);
  }
  
  // Hint text (for trapdoor interactions, etc.)
  if (game.hintText && !game.prompt) {
    ctx.save();
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(138, 43, 226, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 4;
    const hintY = height / 2 + 80;
    ctx.strokeText(game.hintText, width / 2, hintY);
    ctx.fillText(game.hintText, width / 2, hintY);
    ctx.restore();
    // Clear hint text each frame (must be set each frame if needed)
    game.hintText = '';
  }

  // Level-up prompt
  if (game.levelUpChoices && game.levelUpChoices.length) {
    drawLevelUp(ctx, game);
  }

  // Shop overlay hint if near trader and cleared
  const room = game.rooms.get(game.currentRoomKey);
  const trader = room?.contents?.loot?.find?.(l=>l.type==='trader');
  if (!game.shopOpen && trader && room.cleared) {
    const dx = trader.x - player.x, dy = trader.y - player.y; const d2 = dx*dx + dy*dy;
    if (d2 < 80*80) drawPrompt(ctx, 'E: Open shop', width);
  }

  // Weapon pickup prompt if near weapon
  if (!game.shopOpen && room?.contents?.loot) {
    const nearbyWeapon = room.contents.loot.find(l => {
      if (l.type !== 'weapon_pickup' || !l.weapon) return false;
      const dx = l.x - player.x, dy = l.y - player.y;
      return (dx*dx + dy*dy) < 50*50;
    });
    if (nearbyWeapon && nearbyWeapon.weapon) {
      const action = player.weapons.length >= 2 ? 'Swap' : 'Pick up';
      drawPrompt(ctx, `E: ${action} ${nearbyWeapon.weapon.name}`, width);
    }
  }

  // Minimap
  drawMinimap(ctx, game);

  ctx.restore();
}

// drawMinimap implementation is provided below as an exported function

function drawBar(ctx, x, y, w, h, t, fg, bg) {
  t = clamp(t, 0, 1);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg; ctx.fillRect(x, y, w * t, h);
}

function drawBarAdvanced(ctx, x, y, w, h, t, gradientColors, bg, glowColor) {
  t = clamp(t, 0, 1);
  
  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  
  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  
  if (t > 0) {
    // Inner glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(0.5, gradientColors[1]);
    gradient.addColorStop(1, gradientColors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 2, y + 2, (w - 4) * t, h - 4);
    
    // Shine effect on top
    const shineGradient = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shineGradient;
    ctx.fillRect(x + 2, y + 2, (w - 4) * t, h * 0.4);
    
    ctx.shadowBlur = 0;
  }
  
  // Inner border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawPrompt(ctx, text, width) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(width/2 - 220, 18, 440, 26);
  ctx.fillStyle = '#eee';
  ctx.fillText(text, width/2, 22);
  ctx.restore();
}

function drawLevelUp(ctx, game) {
  const { width, height } = game;
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Level Up! Choose an upgrade [1-3] or Click', width/2, height/2 - 80);
  ctx.font = '16px system-ui, Segoe UI, Arial';
  const cards = game.levelUpChoices;
  const cw = 260, ch = 110, gap = 24; const startX = width/2 - (cw*1.5 + gap);
  for (let i = 0; i < 3; i++) {
    const c = cards[i];
    const x = startX + i*(cw + gap), y = height/2 - ch/2;
    
    // Check if mouse is hovering over this card
    const isHovered = game.mouse.x >= x && game.mouse.x <= x+cw && game.mouse.y >= y && game.mouse.y <= y+ch;
    
    // Draw glow effect for hovered card
    if (isHovered) {
      ctx.save();
      ctx.shadowColor = '#ffca28';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, cw + 4, ch + 4);
      ctx.restore();
    }
    
    ctx.fillStyle = isHovered ? 'rgba(30,30,20,0.95)' : 'rgba(20,20,20,0.9)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = isHovered ? '#ffca28' : '#555'; 
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.strokeRect(x, y, cw, ch);

    // skill icon (if available)
    const icon = getSkillIcon(c.key);
    try {
      if (icon && icon.complete && icon.naturalWidth > 0) ctx.drawImage(icon, x + 14, y + 14, 28, 28);
    } catch {}
    ctx.fillStyle = isHovered ? '#fff' : '#ffca28';
    ctx.fillText(`[${i+1}] ${c.title}`, x + cw/2, y + 28);
    ctx.fillStyle = isHovered ? '#eee' : '#ccc';
    wrapText(ctx, c.desc, x + 16, y + 52, cw - 32, 18);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' '); let line = '';
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line, x + maxWidth/2, y);
      line = words[n] + ' '; y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line.trim(), x + maxWidth/2, y);
}

export function drawMinimap(ctx, game) {
  const { width, height, rooms, currentRoomKey } = game;
  const size = 12; const mapW = 17, mapH = 13; // Larger minimap
  const cx = width - (mapW * size) - 20; const cy = 20;
  ctx.save();
  ctx.resetTransform();
  // Stylish background with gradient
  const bgGrad = ctx.createLinearGradient(cx - 8, cy - 8, cx - 8, cy + mapH * size + 16);
  bgGrad.addColorStop(0, 'rgba(15, 15, 20, 0.92)');
  bgGrad.addColorStop(1, 'rgba(8, 8, 12, 0.95)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cx - 8, cy - 8, mapW*size + 16, mapH*size + 16);
  ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 8, cy - 8, mapW*size + 16, mapH*size + 16);
  
  // Title
  ctx.fillStyle = '#90caf9';
  ctx.font = 'bold 10px system-ui, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MAP', cx + (mapW * size) / 2, cy - 12);
  // draw only known rooms around current
  const [rx, ry] = currentRoomKey.split(',').map(Number);
  // Fog-of-war preview: faint adjacent rooms of current room
  const cur = rooms.get(currentRoomKey);
  const neighbors = [];
  if (cur?.doors.n) neighbors.push([rx, ry-1]);
  if (cur?.doors.s) neighbors.push([rx, ry+1]);
  if (cur?.doors.w) neighbors.push([rx-1, ry]);
  if (cur?.doors.e) neighbors.push([rx+1, ry]);
  ctx.fillStyle = 'rgba(158,158,158,0.25)';
  for (const [nx, ny] of neighbors) {
    const nk = `${nx},${ny}`; const nr = rooms.get(nk);
    if (nr && !nr.discovered) {
      const px = cx + (nx - rx + Math.floor(mapW/2)) * size;
      const py = cy + (ny - ry + Math.floor(mapH/2)) * size;
      ctx.fillRect(px, py, size, size);
    }
  }
  for (let [key, room] of rooms) {
    if (!room.discovered) continue; // only draw discovered rooms
    const [x, y] = key.split(',').map(Number);
    // Expanded view range to always show boss rooms if discovered
    if (Math.abs(x - rx) > 12 || Math.abs(y - ry) > 10) continue;
    const px = cx + (x - rx + Math.floor(mapW/2)) * size;
    const py = cy + (y - ry + Math.floor(mapH/2)) * size;
    
    // Color code rooms by type
    let roomColor = '#7f8c8d'; // default gray
    if (room.type === 'boss') roomColor = '#ff5252';
    else if (room.type === 'trader') roomColor = '#29b6f6';
    else if (room.type === 'chest') roomColor = '#ffca28';
    else if (room.type === 'combat') roomColor = '#e91e63';
    else if (room.type === 'weapon') roomColor = '#9c27b0';
    else if (room.cleared) roomColor = '#4caf50'; // Cleared rooms are green
    
    // Room fill
    ctx.fillStyle = roomColor;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    
    // Room border (darker)
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
    
    // Draw doors/connections
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.lineWidth = 2;
    if (room.doors.n && rooms.get(`${x},${y-1}`)?.discovered) {
      ctx.beginPath();
      ctx.moveTo(px + size/2, py);
      ctx.lineTo(px + size/2, py - 1);
      ctx.stroke();
    }
    if (room.doors.s && rooms.get(`${x},${y+1}`)?.discovered) {
      ctx.beginPath();
      ctx.moveTo(px + size/2, py + size);
      ctx.lineTo(px + size/2, py + size + 1);
      ctx.stroke();
    }
    if (room.doors.w && rooms.get(`${x-1},${y}`)?.discovered) {
      ctx.beginPath();
      ctx.moveTo(px, py + size/2);
      ctx.lineTo(px - 1, py + size/2);
      ctx.stroke();
    }
    if (room.doors.e && rooms.get(`${x+1},${y}`)?.discovered) {
      ctx.beginPath();
      ctx.moveTo(px + size, py + size/2);
      ctx.lineTo(px + size + 1, py + size/2);
      ctx.stroke();
    }
    
    // Icon overlay for special rooms
    ctx.font = `${size - 4}px system-ui, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    if (room.type === 'boss') ctx.fillText('☠', px + size/2, py + size/2);
    else if (room.type === 'trader') ctx.fillText('$', px + size/2, py + size/2);
    else if (room.type === 'chest') ctx.fillText('?', px + size/2, py + size/2);
    else if (room.type === 'weapon') ctx.fillText('⚔', px + size/2, py + size/2);
  }
  // player/current room - pulsing indicator
  const prx = cx + Math.floor(mapW/2) * size;
  const pry = cy + Math.floor(mapH/2) * size;
  const pulse = 0.7 + Math.sin(performance.now() * 0.005) * 0.3;
  ctx.fillStyle = `rgba(0, 230, 118, ${pulse})`;
  ctx.fillRect(prx + 1, pry + 1, size - 2, size - 2);
  // Glowing border for current room
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = 8;
  ctx.strokeRect(prx + 1, pry + 1, size - 2, size - 2);
  ctx.shadowBlur = 0;
  
  // Player dot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(prx + size/2, pry + size/2, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

export function drawShop(ctx, game){
  const { width, height } = game; const shop = game.shopOpen; if (!shop) return;
  ctx.save(); ctx.resetTransform();
  
  // Modern dark overlay with gradient
  const overlayGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/2);
  overlayGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, width, height);
  
  // Modern header with glow
  ctx.shadowColor = '#ffca28';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffca28';
  ctx.font = 'bold 38px system-ui, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏪 Merchant\'s Bazaar', width/2, 120);
  ctx.shadowBlur = 0;
  
  // Subtitle
  ctx.fillStyle = '#aaa';
  ctx.font = '15px system-ui, Arial';
  ctx.fillText('Press 1, 2, or 3 to purchase • ESC to close', width/2, 155);
  
  // Player coins display
  ctx.fillStyle = '#ffca28';
  ctx.font = 'bold 22px system-ui, Arial';
  ctx.fillText(`💰 ${game.coins} coins`, width/2, 195);
  
  const cards = shop.items;
  const cw = 300, ch = 400, gap = 40; 
  const startX = width/2 - (cw*1.5 + gap);
  const y = 220;
  
  for (let i = 0; i < 3; i++){
    const x = startX + i * (cw + gap);
    const off = cards[i];
    
    // Check if hovering
    const isHovered = game.mouse.x >= x && game.mouse.x <= x + cw &&
                      game.mouse.y >= y && game.mouse.y <= y + ch;
    
    // Card background with gradient
    if (isHovered && off) {
      ctx.shadowColor = '#ffca28';
      ctx.shadowBlur = 20;
    }
    
    const cardGrad = ctx.createLinearGradient(x, y, x, y + ch);
    cardGrad.addColorStop(0, 'rgba(25, 25, 30, 0.95)');
    cardGrad.addColorStop(1, 'rgba(15, 15, 20, 0.95)');
    ctx.fillStyle = cardGrad;
    ctx.fillRect(x, y, cw, ch);
    
    ctx.shadowBlur = 0;
    
    // Border with glow for available items
    if (off && game.coins >= off.price) {
      ctx.strokeStyle = isHovered ? '#ffca28' : 'rgba(255, 202, 40, 0.5)';
      ctx.lineWidth = isHovered ? 3 : 2;
    } else if (off) {
      ctx.strokeStyle = 'rgba(150, 50, 50, 0.5)';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(60, 60, 60, 0.5)';
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(x, y, cw, ch);
    
    if (off) {
      // Key indicator badge - top left
      ctx.fillStyle = isHovered ? '#ffca28' : 'rgba(255, 202, 40, 0.8)';
      ctx.fillRect(x + 12, y + 12, 45, 45);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, x + 34.5, y + 34.5);
      
      // Icon section with background
      ctx.fillStyle = 'rgba(40, 40, 50, 0.6)';
      ctx.fillRect(x + 25, y + 75, cw - 50, 120);
      
      // Item icon/emoji - larger and centered
      ctx.font = '72px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let icon = '📦';
      if (off.type === 'weapon') icon = '⚔️';
      else if (off.type === 'powerup') icon = '⚡';
      else if (off.type === 'heal') icon = '❤️';
      else if (off.type === 'reroll') icon = '🔄';
      else if (off.type === 'perk') icon = '✨';
      ctx.fillText(icon, x + cw/2, y + 135);
      
      // Item name - more space below icon
      ctx.fillStyle = '#ffca28';
      ctx.font = 'bold 20px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const itemName = off.type === 'weapon' ? off.item.name : off.item.title;
      ctx.fillText(itemName, x + cw/2, y + 220);
      
      // Type badge - clear spacing
      ctx.fillStyle = 'rgba(60, 60, 80, 0.9)';
      ctx.fillRect(x + 50, y + 245, cw - 100, 32);
      ctx.fillStyle = '#ccc';
      ctx.font = '13px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const typeDesc = off.type === 'weapon' ? 'WEAPON' : 
                       off.type === 'powerup' ? 'POWER-UP' : 
                       off.type === 'heal' ? 'HEALING' : 
                       off.type === 'reroll' ? 'SERVICE' : 'UPGRADE';
      ctx.fillText(typeDesc, x + cw/2, y + 261);
      
      // Description - good spacing from badge
      ctx.fillStyle = '#bbb';
      ctx.font = '14px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let desc = '';
      if (off.type === 'weapon') {
        desc = `Damage: ${off.item.damage} | Rate: ${off.item.fireRate.toFixed(1)}`;
      } else if (off.type === 'heal') {
        desc = `Restores ${off.item.hp} HP`;
      } else if (off.type === 'powerup') {
        desc = off.item.desc || 'Temporary boost';
      } else if (off.type === 'reroll') {
        desc = 'Refresh shop inventory';
      } else {
        desc = off.item.desc || 'Permanent upgrade';
      }
      ctx.fillText(desc, x + cw/2, y + 295);
      
      // Affordability status - clear spacing
      const canAfford = game.coins >= off.price;
      if (!canAfford) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 14px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠ Insufficient funds', x + cw/2, y + 325);
      }
      
      // Price button - bottom with clear spacing
      ctx.fillStyle = canAfford ? 'rgba(40, 120, 40, 0.9)' : 'rgba(120, 40, 40, 0.9)';
      ctx.fillRect(x + 25, y + ch - 55, cw - 50, 45);
      
      ctx.fillStyle = canAfford ? '#4ade80' : '#ff6b6b';
      ctx.font = 'bold 22px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`💰 ${off.price} coins`, x + cw/2, y + ch - 32.5);
      
    } else {
      // Sold out state
      ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
      ctx.fillRect(x + 25, y + 75, cw - 50, ch - 100);
      
      ctx.font = '56px system-ui, Arial';
      ctx.fillStyle = '#555';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✖', x + cw/2, y + ch/2 - 10);
      
      ctx.font = 'bold 20px system-ui, Arial';
      ctx.fillStyle = '#777';
      ctx.fillText('SOLD OUT', x + cw/2, y + ch/2 + 40);
    }
  }
  
  ctx.restore();
}
