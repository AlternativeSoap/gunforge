// minimap.js
// Minimap rendering system

export class Minimap {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.explored = new Map(); // key: 'x,y', value: roomData
    this.currentRoom = { x: 0, y: 0 };
    this.scale = 30; // pixels per room
    this.padding = 5;
  }

  markExplored(roomX, roomY, roomData) {
    const key = `${roomX},${roomY}`;
    if (!this.explored.has(key)) {
      this.explored.set(key, {
        type: roomData.type,
        cleared: roomData.cleared,
        hasBoss: roomData.hasBoss,
        hasShop: roomData.hasShop,
        hasChest: roomData.contents?.loot?.some(l => l.type === 'chest'),
        doors: roomData.doors
      });
    } else {
      // Update cleared status
      const existing = this.explored.get(key);
      existing.cleared = roomData.cleared;
    }
  }

  setCurrentRoom(roomX, roomY) {
    this.currentRoom = { x: roomX, y: roomY };
  }

  getRoomColor(roomData) {
    if (!roomData.cleared) return '#ff5252'; // Unclearedor combat room
    if (roomData.hasBoss) return '#ffd700'; // Boss room (gold)
    if (roomData.hasShop) return '#00e5ff'; // Shop (cyan)
    if (roomData.type === 'treasure') return '#ffab00'; // Treasure (orange)
    if (roomData.type === 'safe') return '#4caf50'; // Safe room (green)
    return '#78909c'; // Cleared normal room (gray)
  }

  draw(ctx, game) {
    if (!game || this.explored.size === 0) return;

    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Border
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Calculate center offset
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const offsetX = centerX - this.currentRoom.x * this.scale;
    const offsetY = centerY - this.currentRoom.y * this.scale;
    
    // Draw explored rooms
    for (const [key, roomData] of this.explored.entries()) {
      const [rx, ry] = key.split(',').map(Number);
      
      const roomX = offsetX + rx * this.scale;
      const roomY = offsetY + ry * this.scale;
      const roomSize = this.scale - this.padding;
      
      // Skip if outside minimap bounds
      if (roomX + roomSize < this.x || roomX > this.x + this.width ||
          roomY + roomSize < this.y || roomY > this.y + this.height) {
        continue;
      }
      
      // Draw room square
      ctx.fillStyle = this.getRoomColor(roomData);
      ctx.fillRect(roomX, roomY, roomSize, roomSize);
      
      // Room border
      ctx.strokeStyle = roomData.cleared ? '#90a4ae' : '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(roomX, roomY, roomSize, roomSize);
      
      // Draw doors
      ctx.strokeStyle = '#b0bec5';
      ctx.lineWidth = 2;
      const doorSize = roomSize * 0.3;
      const doorOffset = (roomSize - doorSize) / 2;
      
      if (roomData.doors.n) {
        ctx.beginPath();
        ctx.moveTo(roomX + doorOffset, roomY);
        ctx.lineTo(roomX + doorOffset + doorSize, roomY);
        ctx.stroke();
      }
      if (roomData.doors.s) {
        ctx.beginPath();
        ctx.moveTo(roomX + doorOffset, roomY + roomSize);
        ctx.lineTo(roomX + doorOffset + doorSize, roomY + roomSize);
        ctx.stroke();
      }
      if (roomData.doors.w) {
        ctx.beginPath();
        ctx.moveTo(roomX, roomY + doorOffset);
        ctx.lineTo(roomX, roomY + doorOffset + doorSize);
        ctx.stroke();
      }
      if (roomData.doors.e) {
        ctx.beginPath();
        ctx.moveTo(roomX + roomSize, roomY + doorOffset);
        ctx.lineTo(roomX + roomSize, roomY + doorOffset + doorSize);
        ctx.stroke();
      }
      
      // Room icons
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      
      if (roomData.hasBoss) {
        ctx.fillText('👑', roomX + roomSize / 2, roomY + roomSize / 2);
      } else if (roomData.hasShop) {
        ctx.fillText('🛒', roomX + roomSize / 2, roomY + roomSize / 2);
      } else if (roomData.hasChest) {
        ctx.fillText('📦', roomX + roomSize / 2, roomY + roomSize / 2);
      }
      
      // Current room indicator
      if (rx === this.currentRoom.x && ry === this.currentRoom.y) {
        const time = performance.now() / 1000;
        const pulse = 0.8 + Math.sin(time * 4) * 0.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(roomX - 2, roomY - 2, roomSize + 4, roomSize + 4);
        
        // Player dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(roomX + roomSize / 2, roomY + roomSize / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Legend
    const legendY = this.y + this.height + 5;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    
    const legendItems = [
      { color: '#ff5252', text: 'Combat' },
      { color: '#78909c', text: 'Cleared' },
      { color: '#ffd700', text: 'Boss' },
      { color: '#00e5ff', text: 'Shop' },
      { color: '#ffab00', text: 'Treasure' },
      { color: '#4caf50', text: 'Safe' }
    ];
    
    let legendX = this.x;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY, 8, 8);
      ctx.fillStyle = '#fff';
      ctx.fillText(item.text, legendX + 10, legendY + 7);
      legendX += 60;
      
      if (legendX > this.x + this.width - 60) break; // Wrap if needed
    }
    
    ctx.restore();
  }
}
