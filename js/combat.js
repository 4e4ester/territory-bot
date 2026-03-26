const Combat = {
  terrainBonus: {
    mountain: 1.5,
    city: 1.3,
    forest: 1.1,
    grass: 1.0,
    water: 0
  },

  calculateBattle(attacker, defender, troops) {
    const bonus = this.terrainBonus[defender.type] || 1.0;
    const atkLoss = Math.floor(defender.troops * bonus * 0.4);
    const defLoss = Math.floor(troops * 0.6);
    const remaining = troops - atkLoss;
    const captured = remaining > (defender.troops - defLoss) && remaining > 0;
    
    return {
      attackerLoss: Math.min(atkLoss, troops),
      defenderLoss: Math.min(defLoss, defender.troops),
      captured,
      remainingAttackers: captured ? Math.floor(remaining * 0.6) : 0
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
    
    if (troops > from.troops) {
      return { success: false, message: 'Недостаточно войск!' };
    }
    
    const result = this.calculateBattle(from, to, troops);
    
    GameStore.updateTile(fromId, {
      troops: from.troops - result.attackerLoss
    });
    
    GameStore.updateTile(toId, {
      troops: Math.max(0, to.troops - result.defenderLoss)
    });
    
    if (result.captured) {
      GameStore.updateTile(toId, {
        ownerId: from.ownerId,
        troops: result.remainingAttackers
      });
      
      const annexed = this.checkAnnexation(to, from.ownerId);
      
      return {
        success: true,
        message: '🎉 Захвачено!',
        captured: true,
        annexed
      };
    }
    
    return {
      success: true,
      message: '⚔️ Бой',
      captured: false,
      annexed: []
    };
  },

  checkAnnexation(tile, ownerId) {
    const annexed = [];
    
    tile.neighbors.forEach(nid => {
      const n = GameStore.getTile(nid);
      if (n && n.ownerId && n.ownerId !== ownerId) {
        if (this.isEncircled(n, ownerId)) {
          GameStore.updateTile(nid, {
            ownerId,
            troops: Math.floor(n.troops * 0.5)
          });
          annexed.push(nid);
        }
      }
    });
    
    return annexed;
  },

  isEncircled(tile, ownerId) {
    if (tile.ownerId === ownerId || !tile.ownerId) {
      return false;
    }
    
    const passable = tile.neighbors
      .map(id => GameStore.getTile(id))
      .filter(t => t && t.type !== 'water');
    
    return passable.length > 0 && passable.every(t => t.ownerId === ownerId);
  }
};

window.Combat = Combat;
