// skilltree.js
// Comprehensive skill tree system with branching paths and special abilities

export const SKILL_TREE = {
  // Three main branches: Tank, DPS, Support
  branches: {
    tank: {
      name: 'Fortress',
      color: '#4caf50',
      icon: '🛡️',
      description: 'Survivability and defense',
      skills: [
        {
          id: 'tank_1',
          name: 'Iron Skin',
          desc: '+30 Max HP, +20 HP now',
          tier: 1,
          requires: [],
          apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 20); }
        },
        {
          id: 'tank_2',
          name: 'Thick Armor',
          desc: '+20% Damage Reduction',
          tier: 2,
          requires: ['tank_1'],
          apply: (p) => { p.damageReduction = (p.damageReduction || 0) + 0.20; }
        },
        {
          id: 'tank_3',
          name: 'Regeneration',
          desc: 'Heal 2 HP per second',
          tier: 2,
          requires: ['tank_1'],
          apply: (p) => { p.healthRegen = (p.healthRegen || 0) + 2; }
        },
        {
          id: 'tank_4',
          name: 'Guardian',
          desc: '+50 Max HP, +15% Damage Reduction',
          tier: 3,
          requires: ['tank_2'],
          apply: (p) => { p.maxHp += 50; p.damageReduction = (p.damageReduction || 0) + 0.15; }
        },
        {
          id: 'tank_5',
          name: 'Last Stand',
          desc: 'Survive fatal damage once (per room)',
          tier: 3,
          requires: ['tank_2'],
          apply: (p) => { p.lastStand = true; }
        },
        {
          id: 'tank_ultimate',
          name: 'FORTRESS MODE',
          desc: 'Press Q: 5s invulnerable, +100% damage',
          tier: 4,
          requires: ['tank_4', 'tank_5'],
          ultimate: true,
          apply: (p) => { p.abilities.fortressMode = true; }
        }
      ]
    },
    
    dps: {
      name: 'Annihilator',
      color: '#f44336',
      icon: '⚔️',
      description: 'Raw damage output',
      skills: [
        {
          id: 'dps_1',
          name: 'Power Shot',
          desc: '+18% Damage',
          tier: 1,
          requires: [],
          apply: (p) => { p.dmgMultBase = (p.dmgMultBase || 1) * 1.18; }
        },
        {
          id: 'dps_2',
          name: 'Rapid Fire',
          desc: '+20% Fire Rate',
          tier: 2,
          requires: ['dps_1'],
          apply: (p) => { p.fireRateMultBase = (p.fireRateMultBase || 1) * 1.20; }
        },
        {
          id: 'dps_3',
          name: 'Critical Strike',
          desc: '+10% Crit Chance, x2.5 Crit Damage',
          tier: 2,
          requires: ['dps_1'],
          apply: (p) => { p.critChance = (p.critChance || 0) + 0.10; p.critMult = 2.5; }
        },
        {
          id: 'dps_4',
          name: 'Executioner',
          desc: '+50% damage to enemies below 30% HP',
          tier: 3,
          requires: ['dps_2'],
          apply: (p) => { p.executioner = true; }
        },
        {
          id: 'dps_5',
          name: 'Multi-Shot',
          desc: 'Fire 2 extra projectiles (spread)',
          tier: 3,
          requires: ['dps_3'],
          apply: (p) => { p.multiShot = (p.multiShot || 0) + 2; }
        },
        {
          id: 'dps_ultimate',
          name: 'BERSERK RAGE',
          desc: 'Press Q: 8s +150% damage, +50% fire rate',
          tier: 4,
          requires: ['dps_4', 'dps_5'],
          ultimate: true,
          apply: (p) => { p.abilities.berserkRage = true; }
        }
      ]
    },
    
    support: {
      name: 'Tactician',
      color: '#2196f3',
      icon: '✨',
      description: 'Utility and mobility',
      skills: [
        {
          id: 'supp_1',
          name: 'Swift Moves',
          desc: '+18% Move Speed',
          tier: 1,
          requires: [],
          apply: (p) => { p.speedMultBase = (p.speedMultBase || 1) * 1.18; }
        },
        {
          id: 'supp_2',
          name: 'Nimble Dodge',
          desc: '-35% Dash Cooldown',
          tier: 2,
          requires: ['supp_1'],
          apply: (p) => { p.dashCdMult = (p.dashCdMult || 1) * 0.65; }
        },
        {
          id: 'supp_3',
          name: 'Vampirism',
          desc: '5% Lifesteal',
          tier: 2,
          requires: ['supp_1'],
          apply: (p) => { p.lifesteal = (p.lifesteal || 0) + 0.05; }
        },
        {
          id: 'supp_4',
          name: 'Phase Dash',
          desc: 'Dash through enemies and bullets',
          tier: 3,
          requires: ['supp_2'],
          apply: (p) => { p.phaseDash = true; }
        },
        {
          id: 'supp_5',
          name: 'Blood Magic',
          desc: 'Kill enemies to restore 8 HP',
          tier: 3,
          requires: ['supp_3'],
          apply: (p) => { p.bloodMagic = (p.bloodMagic || 0) + 8; }
        },
        {
          id: 'supp_ultimate',
          name: 'TIME WARP',
          desc: 'Press Q: 6s slow all enemies 70%',
          tier: 4,
          requires: ['supp_4', 'supp_5'],
          ultimate: true,
          apply: (p) => { p.abilities.timeWarp = true; }
        }
      ]
    }
  },
  
  // Universal skills (available to all branches)
  universal: [
    {
      id: 'univ_pierce',
      name: 'Penetration',
      desc: 'Bullets pierce +1 enemy',
      tier: 1,
      apply: (p) => { p.pierceBonus = (p.pierceBonus || 0) + 1; }
    },
    {
      id: 'univ_stamina',
      name: 'Endurance',
      desc: '+30 Max Stamina',
      tier: 1,
      apply: (p) => { p.maxStamina += 30; }
    },
    {
      id: 'univ_bullet_size',
      name: 'Large Ammo',
      desc: '+20% Bullet Size',
      tier: 1,
      apply: (p) => { p.bulletSizeMultBase = (p.bulletSizeMultBase || 1) * 1.20; }
    },
    {
      id: 'univ_coin',
      name: 'Treasure Hunter',
      desc: '+25% Coin Drops',
      tier: 1,
      apply: (p) => { p.coinBonus = (p.coinBonus || 1) * 1.25; }
    },
    {
      id: 'univ_combo',
      name: 'Combo Master',
      desc: 'Combo timer lasts 50% longer',
      tier: 2,
      apply: (p) => { p.comboTimerMult = (p.comboTimerMult || 1) * 1.5; }
    }
  ]
};

// Skill tree state management
export class SkillTreeManager {
  constructor(player) {
    this.player = player;
    this.unlockedSkills = new Set();
    this.selectedBranch = null; // null, 'tank', 'dps', or 'support'
    this.skillPoints = 0;
    
    // Initialize abilities object on player
    if (!player.abilities) {
      player.abilities = {
        fortressMode: false,
        berserkRage: false,
        timeWarp: false,
        abilityCd: 0,
        abilityActive: false,
        abilityDuration: 0
      };
    }
  }
  
  canUnlock(skillId) {
    // Find the skill
    let skill = null;
    let branch = null;
    
    // Check branches
    for (const [branchName, branchData] of Object.entries(SKILL_TREE.branches)) {
      const found = branchData.skills.find(s => s.id === skillId);
      if (found) {
        skill = found;
        branch = branchName;
        break;
      }
    }
    
    // Check universal
    if (!skill) {
      skill = SKILL_TREE.universal.find(s => s.id === skillId);
    }
    
    if (!skill) return false;
    if (this.unlockedSkills.has(skillId)) return false;
    if (this.skillPoints <= 0) return false;
    
    // Branch selection check: if this is a branch skill, either no branch selected yet or same branch
    if (branch) {
      if (this.selectedBranch && this.selectedBranch !== branch) return false;
    }
    
    // Check requirements
    if (skill.requires && skill.requires.length > 0) {
      return skill.requires.every(reqId => this.unlockedSkills.has(reqId));
    }
    
    return true;
  }
  
  unlockSkill(skillId) {
    if (!this.canUnlock(skillId)) return false;
    
    // Find and apply the skill
    let skill = null;
    let branch = null;
    
    for (const [branchName, branchData] of Object.entries(SKILL_TREE.branches)) {
      const found = branchData.skills.find(s => s.id === skillId);
      if (found) {
        skill = found;
        branch = branchName;
        break;
      }
    }
    
    if (!skill) {
      skill = SKILL_TREE.universal.find(s => s.id === skillId);
    }
    
    if (!skill) return false;
    
    // Lock branch on first selection
    if (branch && !this.selectedBranch) {
      this.selectedBranch = branch;
    }
    
    // Apply skill effect
    skill.apply(this.player);
    this.unlockedSkills.add(skillId);
    this.skillPoints--;
    
    // Set ultimate type if this is an ultimate skill
    if (skill.ultimate) {
      if (skillId === 'tank_ultimate') {
        this.player.ultimateType = 'fortress';
      } else if (skillId === 'dps_ultimate') {
        this.player.ultimateType = 'berserk';
      } else if (skillId === 'supp_ultimate') {
        this.player.ultimateType = 'timewarp';
      }
    }
    
    return true;
  }
  
  addSkillPoint() {
    this.skillPoints++;
  }
  
  getAvailableSkills() {
    const available = [];
    
    // Add universal skills
    for (const skill of SKILL_TREE.universal) {
      if (this.canUnlock(skill.id)) {
        available.push({ ...skill, branch: 'universal' });
      }
    }
    
    // Add branch skills
    for (const [branchName, branchData] of Object.entries(SKILL_TREE.branches)) {
      if (this.selectedBranch && this.selectedBranch !== branchName) continue;
      
      for (const skill of branchData.skills) {
        if (this.canUnlock(skill.id)) {
          available.push({ ...skill, branch: branchName, branchColor: branchData.color, branchIcon: branchData.icon });
        }
      }
    }
    
    return available;
  }
}
