const GameStore = {
  state: {
    map: new Map(),
    mapSize: { width: 8, height: 8 },
    bots: [],
    currentPlayer: 'player',
    turn: 1,
    phase: 'menu',
    selectedTile: null,
    attackTarget: null,
    attackAmount: 10,
    gameOver: false,
    winner: null,
    settings: {
      mapSize: 'small',
      botCount: 2,
      difficulty: 'easy',
      style: 'modern'
    },
    stats: {
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      totalTurns: 0
    }
  },

  getState() {
    return this.state;
  },

  setState(newData) {
    this.state = { ...this.state, ...newData };
    this.listeners.forEach(fn => fn(this.state));
    this.save();
  },

  getTile(id) {
    return this.state.map.get(id);
  },

  updateTile(id, updates) {
    const tile = this.state.map.get(id);
    if (tile) {
      Object.assign(tile, updates);
      this.state.map.set(id, tile);
      this.listeners.forEach(fn => fn(this.state));
    }
  },

  getPlayerTiles(ownerId) {
    return Array.from(this.state.map.values()).filter(t => t.ownerId === ownerId);
  },

  countTerritories(ownerId) {
    return this.getPlayerTiles(ownerId).length;
  },

  countTroops(ownerId) {
    return this.getPlayerTiles(ownerId).reduce((sum, t) => sum + (t.troops || 0), 0);
  },

  listeners: [],
  
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },

  reset() {
    this.state = {
      ...this.state,
      map: new Map(),
      bots: [],
      currentPlayer: 'player',
      turn: 1,
      phase: 'action',
      selectedTile: null,
      attackTarget: null,
      attackAmount: 10,
      gameOver: false,
      winner: null
    };
    this.listeners.forEach(fn => fn(this.state));
  },

  load() {
    try {
      const saved = localStorage.getItem('territoryWar_save');
      if (saved) {
        const data = JSON.parse(saved);
        this.state.stats = data.stats || this.state.stats;
        console.log('✅ Stats loaded');
      }
    } catch (e) {
      console.warn('⚠️ Could not load save:', e);
    }
  },

  save() {
    try {
      const data = {
        stats: this.state.stats
      };
      localStorage.setItem('territoryWar_save', JSON.stringify(data));
    } catch (e) {
      console.warn('⚠️ Could not save:', e);
    }
  },

  updateStats(win, turns) {
    if (win) {
      this.state.stats.wins++;
    } else {
      this.state.stats.losses++;
    }
    this.state.stats.gamesPlayed++;
    this.state.stats.totalTurns += turns;
    this.save();
  },

  getAverageTurns() {
    if (this.state.stats.gamesPlayed === 0) return 0;
    return Math.round(this.state.stats.totalTurns / this.state.stats.gamesPlayed);
  },

  clearStats() {
    this.state.stats = {
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      totalTurns: 0
    };
    this.save();
    this.listeners.forEach(fn => fn(this.state));
  }
};

window.GameStore = GameStore;
