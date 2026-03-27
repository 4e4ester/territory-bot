const BotAI = {
  strategies: {
    aggressive: { attackRatio: 0.8, defendRatio: 0.3, expandRatio: 0.5 },
    defensive: { attackRatio: 0.5, defendRatio: 0.7, expandRatio: 0.4 },
    balanced: { attackRatio: 0.65, defendRatio: 0.5, expandRatio: 0.6 },
    expander: { attackRatio: 0.7, defendRatio: 0.4, expandRatio: 0.8 }
  },

  makeTurn(botId) {
    const bot = GameStore.getState().bots.find(b => b.id === botId);
    if (!bot || bot.eliminated) return;
    
    const tiles = GameStore.getPlayerTiles(botId);
    if (tiles.length === 0) {
      bot.eliminated = true;
      return;
    }
    
    const strategy = this.getStrategy(bot.difficulty);
    const decision = this.makeDecision(botId, tiles, strategy);
    
    if (decision.action === 'attack') {
      this.executeAttack(decision.fromTile, decision.toTile, decision.troops, botId);
    }
  },

  getStrategy(difficulty) {
    const strategies = {
      easy: this.strategies.defensive,
      medium: this.strategies.balanced,
      hard: this.strategies.aggressive
    };
    return strategies[difficulty] || this.strategies.balanced;
  },

  makeDecision(botId, tiles, strategy) {
    // 1. Защита слабых территорий
    for (const tile of tiles) {
      if (tile.troops < 30) {
        const enemyNeighbors = tile.neighbors.filter(nid => {
          const n = GameStore.getTile(nid);
          return n && n.ownerId !== botId && n.ownerId !== null && n.type !== 'water';
        });
        
        if (enemyNeighbors.length > 0) {
          return { action: 'defend', fromTile: tile.id };
        }
      }
    }
    
    // 2. Атака слабых соседей
    for (const tile of tiles) {
      if (tile.troops < 20) continue;
      
      for (const nid of tile.neighbors) {
        const neighbor = GameStore.getTile(nid);
        if (neighbor && neighbor.ownerId !== botId && neighbor.type !== 'water') {
          const ratio = strategy.attackRatio;
          if (neighbor.troops < tile.troops * ratio) {
            return {
              action: 'attack',
              fromTile: tile.id,
              toTile: nid,
              troops: Math.floor(tile.troops * 0.7)
            };
          }
        }
      }
    }
    
    // 3. Захват нейтральных территорий
    for (const tile of tiles) {
      if (tile.troops < 25) continue;
      
      for (const nid of tile.neighbors) {
        const neighbor = GameStore.getTile(nid);
        if (neighbor && !neighbor.ownerId && neighbor.type !== 'water') {
          return {
            action: 'attack',
            fromTile: tile.id,
            toTile: nid,
            troops: Math.floor(tile.troops * 0.5)
          };
        }
      }
    }
    
    // 4. Укрепление границ
    for (const tile of tiles) {
      const enemyNeighbors = tile.neighbors.filter(nid => {
        const n = GameStore.getTile(nid);
        return n && n.ownerId !== botId && n.ownerId !== null && n.type !== 'water';
      });
      
      if (enemyNeighbors.length > 0 && tile.troops < tile.maxTroops * 0.5) {
        return { action: 'defend', fromTile: tile.id };
      }
    }
    
    return { action: 'wait' };
  },

  executeAttack(fromId, toId, troops, botId) {
    const from = GameStore.getTile(fromId);
    const to = GameStore.getTile(toId);
    
    if (!from || !to) return;
    
    const result = Combat.calculateBattle(from, to, troops);
    
    GameStore.updateTile(fromId, { 
      troops: from.troops - result.attackerLoss 
    });
    
    GameStore.updateTile(toId, { 
      troops: result.remainingDefenders 
    });
    
    if (result.captured) {
      GameStore.updateTile(toId, { 
        ownerId: botId, 
        troops: result.remainingAttackers 
      });
      
      Combat.checkAnnexation(to, botId);
    }
  },

  regenerateTroops(botId) {
    const bot = GameStore.getState().bots.find(b => b.id === botId);
    if (!bot) return;
    
    const tiles = GameStore.getPlayerTiles(botId);
    const rate = { easy: 3, medium: 5, hard: 7 }[bot.difficulty] || 3;
    
    tiles.forEach(tile => {
      if (tile.troops < tile.maxTroops * 0.6) {
        GameStore.updateTile(tile.id, { 
          troops: Math.min(tile.maxTroops, tile.troops + rate) 
        });
      }
    });
  },

  getBotConfigs(count, difficulty) {
    const configs = [
      { id: 'bot_easy', name: 'Бот 1', difficulty: 'easy', strategy: 'defensive' },
      { id: 'bot_medium', name: 'Бот 2', difficulty: 'medium', strategy: 'balanced' },
      { id: 'bot_hard', name: 'Бот 3', difficulty: 'hard', strategy: 'aggressive' },
      { id: 'bot_expert', name: 'Бот 4', difficulty: 'hard', strategy: 'expander' }
    ];
    
    const bots = [];
    for (let i = 0; i < count; i++) {
      const c = configs[i % configs.length];
      bots.push({
        id: c.id,
        name: c.name,
        difficulty: difficulty,
        strategy: c.strategy,
        eliminated: false
      });
    }
    
    return bots;
  }
};

window.BotAI = BotAI;
