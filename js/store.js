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
      difficulty: 'easy'
    }
  },

  getState() {
    return this.state;
  },

  setState(newData) {
    this.state = { ...this.state, ...newData };
    this.listeners.forEach(fn => fn(this.state));
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
    return this.getPlayerTiles(ownerId).reduce((sum, t) => sum + t.troops, 0);
  },

  listeners: [],
  
  subscribe(fn) {
    this.listeners.push(fn);
  },

  reset() {
    this.state = {
      map: new Map(),
      mapSize: { width: 8, height: 8 },
      bots: [],
      currentPlayer: 'player',
      turn: 1,
      phase: 'action',
      selectedTile: null,
      attackTarget: null,
      attackAmount: 10,
      gameOver: false,
      winner: null,
      settings: this.state.settings
    };
    this.listeners.forEach(fn => fn(this.state));
  }
};

window.GameStore = GameStore;
