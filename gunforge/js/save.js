// SAVE SYSTEM - 3 Slots with Auto-Save
const SAVE_KEY = 'gunforge_saves';
const MAX_SAVE_SLOTS = 3;

class SaveManager {
  constructor() {
    this.currentSlot = null;
    this.allSaves = this.loadAllSaves();
  }

  loadAllSaves() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return { slot1: null, slot2: null, slot3: null };
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load saves:', e);
      return { slot1: null, slot2: null, slot3: null };
    }
  }

  saveAllSaves() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.allSaves));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  createSaveData(player, coins, currentLayer, difficulty, gameTime) {
    // Collect all unlocked skills
    const unlockedSkills = [];
    if (player.skillTreeManager && player.skillTreeManager.unlockedSkills) {
      for (const branchName in player.skillTreeManager.unlockedSkills) {
        const skills = player.skillTreeManager.unlockedSkills[branchName];
        if (skills) {
          for (const skillId of skills) {
            unlockedSkills.push({ branch: branchName, id: skillId });
          }
        }
      }
    }

    return {
      // Player stats
      level: player.level || 1,
      xp: player.xp || 0,
      maxHp: player.maxHp || 100,
      hp: player.hp || 100,
      speed: player.speed || 200,
      skillPoints: player.skillTreeManager ? player.skillTreeManager.skillPoints : 0,
      chosenBranch: player.skillTreeManager ? player.skillTreeManager.chosenBranch : null,
      
      // Equipment
      currentWeaponName: player.currentWeapon ? player.currentWeapon.name : null,
      weaponIndex: player.weaponIndex || 0,
      weapons: player.weapons.map(w => ({
        name: w.name,
        rarity: w.rarity,
        damage: w.damage,
        fireRate: w.fireRate,
        projectile: w.projectile,
        bullets: w.bullets,
        icon: w.icon
      })),
      
      // Skills
      unlockedSkills: unlockedSkills,
      
      // Progression
      coins: coins,
      currentLayer: currentLayer,
      difficulty: difficulty,
      
      // Metadata
      timestamp: Date.now(),
      gameTime: gameTime || 0,
      version: '1.0'
    };
  }

  saveToSlot(slotNumber, player, coins, currentLayer, difficulty, gameTime) {
    if (slotNumber < 1 || slotNumber > MAX_SAVE_SLOTS) {
      console.error('Invalid slot number:', slotNumber);
      return false;
    }

    const slotKey = `slot${slotNumber}`;
    const saveData = this.createSaveData(player, coins, currentLayer, difficulty, gameTime);
    
    this.allSaves[slotKey] = saveData;
    this.currentSlot = slotNumber;
    
    return this.saveAllSaves();
  }

  loadFromSlot(slotNumber) {
    if (slotNumber < 1 || slotNumber > MAX_SAVE_SLOTS) {
      console.error('Invalid slot number:', slotNumber);
      return null;
    }

    const slotKey = `slot${slotNumber}`;
    const saveData = this.allSaves[slotKey];
    
    if (!saveData) {
      console.log('Slot is empty:', slotNumber);
      return null;
    }

    this.currentSlot = slotNumber;
    return saveData;
  }

  deleteSlot(slotNumber) {
    if (slotNumber < 1 || slotNumber > MAX_SAVE_SLOTS) {
      console.error('Invalid slot number:', slotNumber);
      return false;
    }

    const slotKey = `slot${slotNumber}`;
    this.allSaves[slotKey] = null;
    
    if (this.currentSlot === slotNumber) {
      this.currentSlot = null;
    }
    
    return this.saveAllSaves();
  }

  autoSave(player, coins, currentLayer, difficulty, gameTime) {
    // Auto-save to last used slot, or slot 1 if no slot selected
    const slotToUse = this.currentSlot || 1;
    return this.saveToSlot(slotToUse, player, coins, currentLayer, difficulty, gameTime);
  }

  getSlotInfo(slotNumber) {
    if (slotNumber < 1 || slotNumber > MAX_SAVE_SLOTS) return null;
    
    const slotKey = `slot${slotNumber}`;
    const saveData = this.allSaves[slotKey];
    
    if (!saveData) {
      return {
        isEmpty: true,
        slotNumber: slotNumber
      };
    }

    return {
      isEmpty: false,
      slotNumber: slotNumber,
      level: saveData.level,
      layer: saveData.currentLayer,
      difficulty: saveData.difficulty,
      timestamp: saveData.timestamp,
      gameTime: saveData.gameTime,
      skillPoints: saveData.skillPoints,
      chosenBranch: saveData.chosenBranch,
      coins: saveData.coins
    };
  }

  getAllSlotsInfo() {
    return [
      this.getSlotInfo(1),
      this.getSlotInfo(2),
      this.getSlotInfo(3)
    ];
  }

  applyLoadedData(player, saveData) {
    // Restore player stats
    player.level = saveData.level;
    player.xp = saveData.xp;
    player.maxHp = saveData.maxHp;
    player.hp = saveData.hp;
    player.speed = saveData.speed;
    
    // Ensure skill tree manager exists
    if (!player.skillTreeManager) {
      // Import and create skill tree manager if it doesn't exist
      const { SkillTreeManager } = window;
      if (SkillTreeManager) {
        player.skillTreeManager = new SkillTreeManager(player);
      } else {
        console.error('[SaveManager] SkillTreeManager not available');
        return null;
      }
    }
    
    // Restore skill tree
    player.skillTreeManager.skillPoints = saveData.skillPoints;
    player.skillTreeManager.chosenBranch = saveData.chosenBranch;
    player.skillTreeManager.unlockedSkills = {};
    
    // Restore unlocked skills
    for (const skillData of saveData.unlockedSkills) {
      if (!player.skillTreeManager.unlockedSkills[skillData.branch]) {
        player.skillTreeManager.unlockedSkills[skillData.branch] = new Set();
      }
      player.skillTreeManager.unlockedSkills[skillData.branch].add(skillData.id);
      
      // Apply skill effects
      const branch = SKILL_TREE.branches[skillData.branch];
      const skill = branch.skills.find(s => s.id === skillData.id);
      if (skill && skill.apply) {
        skill.apply(player);
      }
    }
    
    // Restore weapons array from save data
    if (saveData.weapons && Array.isArray(saveData.weapons) && saveData.weapons.length > 0) {
      // Import WEAPONS from data.js
      const { WEAPONS } = window;
      if (WEAPONS) {
        // Clear existing weapons and restore from save
        player.weapons = [];
        for (const savedWeapon of saveData.weapons) {
          // Find weapon template by name
          const weaponTemplate = WEAPONS.find(w => w.name === savedWeapon.name);
          if (weaponTemplate) {
            // Clone and restore saved stats
            const weapon = { ...weaponTemplate, ...savedWeapon };
            player.weapons.push(weapon);
          } else {
            console.warn('[SaveManager] Could not find weapon template:', savedWeapon.name);
          }
        }
        console.log('[SaveManager] Restored', player.weapons.length, 'weapons');
      }
    }
    
    // Restore weapon index
    if (typeof saveData.weaponIndex === 'number') {
      player.weaponIndex = saveData.weaponIndex;
      console.log('[SaveManager] Restored weaponIndex:', saveData.weaponIndex);
    } else if (saveData.currentWeaponName) {
      // Fallback: find weapon by name (for old saves)
      const weaponIndex = player.weapons.findIndex(w => w.name === saveData.currentWeaponName);
      if (weaponIndex !== -1) {
        player.weaponIndex = weaponIndex;
        console.log('[SaveManager] Restored weapon by name:', saveData.currentWeaponName, 'at index', weaponIndex);
      } else {
        console.warn('[SaveManager] Could not find saved weapon:', saveData.currentWeaponName);
        player.weaponIndex = 0;
      }
    } else {
      console.warn('[SaveManager] No weapon index or name in save data, defaulting to 0');
      player.weaponIndex = 0;
    }
    
    return {
      coins: saveData.coins,
      currentLayer: saveData.currentLayer,
      difficulty: saveData.difficulty,
      gameTime: saveData.gameTime || 0
    };
  }
}

// Create global save manager instance
const saveManager = new SaveManager();

// Expose globally for use in main.js and index.html
window.saveManager = saveManager;
console.log('SaveManager initialized and available globally');
