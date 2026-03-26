const GameStore = {
  state: {
    map: new Map(),
    mapSize: { width: 8, height: 8 },
    players: [],
    bots: [],
    currentPlayer: 'player',
    turn: 1,
    phase: 'menu',
    selectedTile: null,
    attackTarget: null,
    attackAmount: 10,
    message: null,
    gameOver: false,
    winner: null,
    settings: {
      mapSize: 'small',
      botCount: 2,
      difficulty: 'easy'
    },
    loaded: false
  },

  getState() {
    return this.state;
  },

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  },

  getTile(tileId) {
    return this.state.map.get(tileId);
  },

  updateTile(tileId, updates) {
    const tile = this.state.map.get(tileId);
    if (tile) {
      Object.assign(tile, updates);
      this.state.map.set(tileId, tile);
      this.notifyListeners();
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
  subscribe(listener) {
    this.listeners.push(listener);
  },
  notifyListeners() {
    this.listeners.forEach(fn => fn(this.state));
  },

  reset() {
    this.state = {
      map: new Map(),
      mapSize: { width: 8, height: 8 },
      players: [],
      bots: [],
      currentPlayer: 'player',
      turn: 1,
      phase: 'action',
      selectedTile: null,
      attackTarget: null,
      attackAmount: 10,
      message: '🎮 Ваш ход!',
      gameOver: false,
      winner: null,
      settings: this.state.settings,
      loaded: true
    };
    this.notifyListeners();
  },

  setLoading(loaded) {
    this.state.loaded = loaded;
    this.notifyListeners();
  }
};

window.GameStore = GameStore;
