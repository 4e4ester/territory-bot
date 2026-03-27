const Combat = {
  terrainBonus: {
    mountain: 1.5,
    city: 1.3,
    forest: 1.2,
    grass: 1.0,
    desert: 0.9,
    water: 0
  },

  calculateBattle(attacker, defender, troops) {
    const defenseBonus = this.terrainBonus[defender.type] || 1.0;
    const defensePower = defender.troops * defenseBonus;
    const attackPower = troops;
    
    const attackerLoss = Math.floor(defensePower * 0.4);
    const defenderLoss = Math.floor(attackPower * 0.6);
    
    const remainingAttackers = Math.max(0, troops - attackerLoss);
    const remainingDefenders = Math.max(0, defender.troops - defenderLoss);
    
    const captured = remainingAttackers > remainingDefenders && remainingAttackers > 0;
    
    const winChance = Math.min(95, Math.max(5, Math.floor((attackPower / (defensePower + 1)) * 100)));
    
    return {
      attackerLoss: Math.min(attackerLoss, troops),
      defenderLoss: Math.min(defenderLoss, defender.troops),
      remainingAttackers,
      remainingDefenders,
      captured,
      winChance
    };
  },

  performAttack(fromId, toId, troops) {
    const from = GameStore.getTile(fromId);
    const to = GameStore.getTile(toId);
    
    if (!from || !to) {
      return { success: false, message: 'Ошибка!' };
    }
    
    if (from.ownerId !== 'player') {
      return { success: false, message: 'Не ваша территория!' };
    }
    
    if (to.ownerId === 'player') {
      return { success: false, message: 'Нельзя атаковать себя!' };
    }
    
    if (!from.neighbors.includes(toId)) {
      return { success: false, message: 'Только соседние клетки!' };
    }
    
    if (troops < 1 || troops > from.troops) {
      return { success: false, message: 'Неверное количество войск!' };
    }
    
    const result = this.calculateBattle(from, to, troops);
    
    GameStore.updateTile(fromId, { 
      troops: from.troops - result.attackerLoss 
    });
    
    GameStore.updateTile(toId, { 
      troops: result.remainingDefenders 
    });
    
    let annexed = [];
    
    if (result.captured) {
      GameStore.updateTile(toId, { 
        ownerId: from.ownerId, 
        troops: result.remainingAttackers 
      });
      
      annexed = this.checkAnnexation(to, from.ownerId);
      
      return { 
        success: true, 
        message: '🎉 Территория захвачена!', 
        captured: true, 
        annexed,
        winChance: result.winChance
      };
    }
    
    return { 
      success: true, 
      message: '⚔️ Бой завершён', 
      captured: false, 
      annexed: [],
      winChance: result.winChance
    };
  },

  checkAnnexation(capturedTile, ownerId) {
    const annexed = [];
    const visited = new Set();
    
    const checkTile = (tile) => {
      if (visited.has(tile.id)) return;
      visited.add(tile.id);
      
      if (this.isEncircled(tile, ownerId)) {
        GameStore.updateTile(tile.id, { 
          ownerId, 
          troops: Math.floor(tile.troops * 0.5) 
        });
        annexed.push(tile.id);
        
        tile.neighbors.forEach(nid => {
          const neighbor = GameStore.getTile(nid);
          if (neighbor && neighbor.ownerId !== ownerId && neighbor.ownerId !== null) {
            checkTile(neighbor);
          }
        });
      }
    };
    
    capturedTile.neighbors.forEach(nid => {
      const neighbor = GameStore.getTile(nid);
      if (neighbor && neighbor.ownerId !== ownerId && neighbor.ownerId !== null) {
        checkTile(neighbor);
      }
    });
    
    return annexed;
  },

  isEncircled(tile, ownerId) {
    if (tile.ownerId === ownerId || !tile.ownerId) return false;
    
    const passableNeighbors = tile.neighbors
      .map(id => GameStore.getTile(id))
      .filter(t => t && t.type !== 'water');
    
    if (passableNeighbors.length === 0) return false;
    
    return passableNeighbors.every(t => t.ownerId === ownerId);
  },

  getWinChance(fromId, toId, troops) {
    const from = GameStore.getTile(fromId);
    const to = GameStore.getTile(toId);
    
    if (!from || !to) return 50;
    
    const result = this.calculateBattle(from, to, troops);
    return result.winChance;
  }
};

window.Combat = Combat;
