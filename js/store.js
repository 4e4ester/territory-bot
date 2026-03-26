// Хранилище состояния игры

const GameStore = {
  state: {
    map: new Map(),
    mapSize: { width: 8, height: 8 },
    players: [],
    bots: [],
    currentPlayer: 'player',
    turn: 1,
    phase: 'menu', // menu, action, resolution, gameover
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
    }
  },

  // Получить состояние
  getState() {
    return this.state;
  },

  // Обновить состояние
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  },

  // Получить клетку по ID
  getTile(tileId) {
    return this.state.map.get(tileId);
  },

  // Обновить клетку
  updateTile(tileId, updates) {
    const tile = this.state.map.get(tileId);
    if (tile) {
      Object.assign(tile, updates);
      this.state.map.set(tileId, tile);
      this.notifyListeners();
    }
  },

  // Получить все клетки игрока
  getPlayerTiles(ownerId) {
    return Array.from(this.state.map.values()).filter(t => t.ownerId === ownerId);
  },

  // Подсчитать территории
  countTerritories(ownerId) {
    return this.getPlayerTiles(ownerId).length;
  },

  // Подсчитать войска
  countTroops(ownerId) {
    return this.getPlayerTiles(ownerId).reduce((sum, t) => sum + t.troops, 0);
  },

  // Слушатели изменений
  listeners: [],
  subscribe(listener) {
    this.listeners.push(listener);
  },
  notifyListeners() {
    this.listeners.forEach(fn => fn(this.state));
  },

  // Сброс
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
      settings: this.state.settings
    };
    this.notifyListeners();
  }
};

// Сделать доступным глобально
window.GameStore = GameStore;