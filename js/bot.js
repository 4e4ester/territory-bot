const BotAI = {
  makeTurn(botId) {
    const tiles = GameStore.getPlayerTiles(botId);
    if (tiles.length === 0) return;
    
    const bot = GameStore.getState().bots.find(b => b.id === botId);
    const difficulty = bot ? bot.difficulty : 'easy';
    
    // Атака слабых соседей
    for (const tile of tiles) {
      if (tile.troops < 20) continue;
      
      for (const nid of tile.neighbors) {
        const n = GameStore.getTile(nid);
        if (n && n.ownerId !== botId && n.type !== 'water') {
          const ratio = { easy: 0.5, medium: 0.7, hard: 0.9 }[difficulty] || 0.5;
          if (n.troops < tile.troops * ratio) {
            this.attack(tile.id, nid, Math.floor(tile.troops * 0.7), botId);
            return;
          }
        }
      }
    }
    
    // Захват нейтральных
    for (const tile of tiles) {
      if (tile.troops < 30) continue;
      
      for (const nid of tile.neighbors) {
        const n = GameStore.getTile(nid);
        if (n && !n.ownerId && n.type !== 'water') {
          this.attack(tile.id, nid, Math.floor(tile.troops * 0.5), botId);
          return;
        }
      }
    }
  },

  attack(fromId, toId, troops, botId) {
    const from = GameStore.getTile(fromId);
    const to = GameStore.getTile(toId);
    
    if (!from || !to) return;
    
    const result = Combat.calculateBattle(from, to, troops);
    
    GameStore.updateTile(fromId, {
      troops: from.troops - result.attackerLoss
    });
    
    GameStore.updateTile(toId, {
      troops: Math.max(0, to.troops - result.defenderLoss)
    });
    
    if (result.captured) {
      GameStore.updateTile(toId, {
        ownerId: botId,
        troops: result.remainingAttackers
      });
    }
  },

  regenerateTroops(botId) {
    const tiles = GameStore.getPlayerTiles(botId);
    const bot = GameStore.getState().bots.find(b => b.id === botId);
    const rate = { easy: 2, medium: 4, hard: 6 }[bot?.difficulty] || 2;
    
    tiles.forEach(t => {
      if (t.troops < t.maxTroops * 0.5) {
        GameStore.updateTile(t.id, {
          troops: Math.min(t.maxTroops, t.troops + rate)
        });
      }
    });
  }
};

window.BotAI = BotAI;
