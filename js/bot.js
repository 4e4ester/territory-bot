// ИИ ботов

const BotAI = {
  // Сделать ход бота
  makeTurn(botId) {
    const botTiles = GameStore.getPlayerTiles(botId);
    if (botTiles.length === 0) return;

    const difficulty = this.getBotDifficulty(botId);
    const decision = this.makeDecision(botId, botTiles, difficulty);

    if (decision.action === 'attack') {
      this.executeAttack(decision.fromTile, decision.toTile, decision.troops, botId);
    }
  },

  // Получить сложность бота
  getBotDifficulty(botId) {
    const bot = GameStore.getState().bots.find(b => b.id === botId);
    return bot ? bot.difficulty : 'easy';
  },

  // Принять решение
  makeDecision(botId, botTiles, difficulty) {
    // Найти слабую соседнюю клетку врага
    for (const tile of botTiles) {
      if (tile.troops < 20) continue;

      for (const neighborId of tile.neighbors) {
        const neighbor = GameStore.getTile(neighborId);
        if (neighbor && neighbor.ownerId !== botId && neighbor.type !== 'water') {
          const attackRatio = this.getAttackRatio(difficulty);
          if (neighbor.troops < tile.troops * attackRatio) {
            return {
              action: 'attack',
              fromTile: tile.id,
              toTile: neighbor.id,
              troops: Math.floor(tile.troops * 0.7)
            };
          }
        }
      }
    }

    // Атаковать нейтральную территорию
    for (const tile of botTiles) {
      if (tile.troops < 30) continue;

      for (const neighborId of tile.neighbors) {
        const neighbor = GameStore.getTile(neighborId);
        if (neighbor && !neighbor.ownerId && neighbor.type !== 'water') {
          return {
            action: 'attack',
            fromTile: tile.id,
            toTile: neighbor.id,
            troops: Math.floor(tile.troops * 0.5)
          };
        }
      }
    }

    return { action: 'wait' };
  },

  // Коэффициент атаки по сложности
  getAttackRatio(difficulty) {
    const ratios = {
      easy: 0.5,
      medium: 0.7,
      hard: 0.9
    };
    return ratios[difficulty] || 0.5;
  },

  // Выполнить атаку
  executeAttack(fromTileId, toTileId, troops, botId) {
    const fromTile = GameStore.getTile(fromTileId);
    const toTile = GameStore.getTile(toTileId);

    if (!fromTile || !toTile) return;

    const result = Combat.calculateBattle(fromTile, toTile, troops);

    GameStore.updateTile(fromTileId, {
      troops: fromTile.troops - result.attackerLoss
    });

    GameStore.updateTile(toTileId, {
      troops: Math.max(0, toTile.troops - result.defenderLoss)
    });

    if (result.captured) {
      GameStore.updateTile(toTileId, {
        ownerId: botId,
        troops: result.remainingAttackers
      });
    }
  },

  // Регенерация войск
  regenerateTroops(botId) {
    const botTiles = GameStore.getPlayerTiles(botId);
    const difficulty = this.getBotDifficulty(botId);
    const regenRate = { easy: 2, medium: 4, hard: 6 }[difficulty] || 2;

    botTiles.forEach(tile => {
      if (tile.troops < tile.maxTroops * 0.5) {
        GameStore.updateTile(tile.id, {
          troops: Math.min(tile.maxTroops, tile.troops + regenRate)
        });
      }
    });
  }
};

window.BotAI = BotAI;