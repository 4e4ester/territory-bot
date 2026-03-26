// Боевая система

const Combat = {
  // Бонусы местности
  terrainBonus: {
    mountain: 1.5,
    city: 1.3,
    forest: 1.1,
    grass: 1.0,
    water: 0
  },

  // Расчёт боя
  calculateBattle(attackerTile, defenderTile, attackTroops) {
    const defenseBonus = this.terrainBonus[defenderTile.type] || 1.0;
    
    const attackPower = attackTroops;
    const defensePower = defenderTile.troops * defenseBonus;

    const attackerLoss = Math.floor(defensePower * 0.4);
    const defenderLoss = Math.floor(attackPower * 0.6);

    const remainingAttackers = attackTroops - attackerLoss;
    const remainingDefenders = defenderTile.troops - defenderLoss;

    const captured = remainingAttackers > remainingDefenders && remainingAttackers > 0;

    return {
      attackerLoss: Math.min(attackerLoss, attackTroops),
      defenderLoss: Math.min(defenderLoss, defenderTile.troops),
      captured,
      remainingAttackers: captured ? Math.floor(remainingAttackers * 0.6) : 0
    };
  },

  // Выполнить атаку
  performAttack(fromTileId, toTileId, troops) {
    const fromTile = GameStore.getTile(fromTileId);
    const toTile = GameStore.getTile(toTileId);

    if (!fromTile || !toTile) {
      return { success: false, message: 'Ошибка!' };
    }

    if (fromTile.ownerId !== 'player') {
      return { success: false, message: 'Не ваша территория!' };
    }

    if (toTile.ownerId === 'player') {
      return { success: false, message: 'Нельзя атаковать себя!' };
    }

    if (troops > fromTile.troops) {
      return { success: false, message: 'Недостаточно войск!' };
    }

    // Расчёт боя
    const result = this.calculateBattle(fromTile, toTile, troops);

    // Обновляем войска
    GameStore.updateTile(fromTileId, {
      troops: fromTile.troops - result.attackerLoss
    });

    GameStore.updateTile(toTileId, {
      troops: Math.max(0, toTile.troops - result.defenderLoss)
    });

    // Захват
    if (result.captured) {
      GameStore.updateTile(toTileId, {
        ownerId: fromTile.ownerId,
        troops: result.remainingAttackers
      });

      // Проверяем аннексию
      const annexed = this.checkAnnexation(toTile, fromTile.ownerId);
      
      return {
        success: true,
        message: '🎉 Территория захвачена!',
        captured: true,
        annexed
      };
    }

    return {
      success: true,
      message: '⚔️ Бой завершён',
      captured: false,
      annexed: []
    };
  },

  // Проверка аннексии (окружения)
  checkAnnexation(capturedTile, ownerId) {
    const annexed = [];

    capturedTile.neighbors.forEach(neighborId => {
      const neighbor = GameStore.getTile(neighborId);
      if (neighbor && neighbor.ownerId !== ownerId && neighbor.ownerId !== null) {
        if (this.isEncircled(neighbor, ownerId)) {
          GameStore.updateTile(neighborId, {
            ownerId: ownerId,
            troops: Math.floor(neighbor.troops * 0.5)
          });
          annexed.push(neighborId);
        }
      }
    });

    return annexed;
  },

  // Проверка окружения
  isEncircled(tile, ownerId) {
    if (tile.ownerId === ownerId || !tile.ownerId) return false;

    const passableNeighbors = tile.neighbors
      .map(id => GameStore.getTile(id))
      .filter(t => t && t.type !== 'water');

    if (passableNeighbors.length === 0) return false;

    return passableNeighbors.every(t => t.ownerId === ownerId);
  }
};

window.Combat = Combat;