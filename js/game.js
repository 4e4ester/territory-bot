const Game = {
  canvas: null,
  isRunning: false,
  hoverTile: null,
  
  // Управление камерой
  isDragging: false,
  isPinching: false,
  dragStart: { x: 0, y: 0 },
  pinchStart: 0,
  dragMoved: 0,
  dragThreshold: 10,
  
  // Таймеры
  botTurnTimeout: null,
  
  init() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      console.error('❌ Canvas not found');
      return;
    }
    
    Renderer.init(this.canvas);
    this.setupEventListeners();
    console.log('✅ Game initialized');
  },
  
  setupEventListeners() {
    // Мышь
    this.canvas.addEventListener('mousedown', e => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', e => this.onPointerMove(e));
    this.canvas.addEventListener('mouseup', e => this.onPointerUp(e));
    this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp());
    
    // Тач
    this.canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', e => this.onTouchEnd(e), { passive: false });
    
    // UI кнопки
    this.setupUIListeners();
    
    // Рендер цикл
    this.renderLoop();
  },
  
  setupUIListeners() {
    document.getElementById('end-turn-btn')?.addEventListener('click', () => {
      SoundSystem.play('click');
      TelegramAPI.haptic('light');
      this.endTurn();
    });
    
    document.getElementById('attack-btn')?.addEventListener('click', () => {
      SoundSystem.play('attack');
      TelegramAPI.haptic('medium');
      this.performAttack();
    });
    
    document.getElementById('cancel-attack-btn')?.addEventListener('click', () => {
      SoundSystem.play('click');
      this.hideAttackPanel();
    });
    
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      SoundSystem.play('click');
      TelegramAPI.haptic('success');
      this.startGame();
    });
    
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      SoundSystem.play('click');
      this.showMenu();
    });
    
    document.getElementById('troops-slider')?.addEventListener('input', e => {
      const troops = parseInt(e.target.value);
      GameStore.setState({ attackAmount: troops });
      document.getElementById('troops-value').textContent = troops;
      
      const state = GameStore.getState();
      if (state.selectedTile && state.attackTarget) {
        const chance = Combat.getWinChance(state.selectedTile, state.attackTarget, troops);
        document.getElementById('win-chance').textContent = chance + '%';
      }
    });
  },
  
  startGame() {
    const state = GameStore.getState();
    const settings = state.settings;
    const size = MapGenerator.getSizeByName(settings.mapSize);
    
    GameStore.reset();
    GameStore.setState({
      map: MapGenerator.generate(size.width, size.height),
      mapSize: size,
      phase: 'action',
      bots: BotAI.getBotConfigs(settings.botCount, settings.difficulty)
    });
    
    Renderer.setStyle(settings.style);
    Renderer.setCamera(0, 0, 1);
    
    this.hideMenu();
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('controls-hint').classList.remove('hidden');
    
    this.updateUI();
    TelegramAPI.haptic('success');
    SoundSystem.play('turn');
    
    this.isRunning = true;
    console.log('✅ Game started');
  },
  
  endTurn() {
    const state = GameStore.getState();
    if (state.gameOver || state.currentPlayer !== 'player') return;
    
    GameStore.setState({ phase: 'resolution' });
    document.getElementById('end-turn-btn').disabled = true;
    
    // Ходы ботов
    let botIndex = 0;
    const processBotTurn = () => {
      if (botIndex < state.bots.length) {
        const bot = state.bots[botIndex];
        if (!bot.eliminated) {
          BotAI.makeTurn(bot.id);
          BotAI.regenerateTroops(bot.id);
        }
        botIndex++;
        this.botTurnTimeout = setTimeout(processBotTurn, 300);
      } else {
        this.finishTurn();
      }
    };
    
    processBotTurn();
  },
  
  finishTurn() {
    const state = GameStore.getState();
    
    // Регенерация игрока
    GameStore.getPlayerTiles('player').forEach(tile => {
      if (tile.troops < tile.maxTroops * 0.5) {
        GameStore.updateTile(tile.id, { troops: tile.troops + 3 });
      }
    });
    
    GameStore.setState({
      turn: state.turn + 1,
      currentPlayer: 'player',
      phase: 'action',
      selectedTile: null,
      attackTarget: null
    });
    
    this.hideAttackPanel();
    this.updateUI();
    this.checkWin();
    
    document.getElementById('end-turn-btn').disabled = false;
    TelegramAPI.haptic('light');
    SoundSystem.play('turn');
  },
  
  performAttack() {
    const state = GameStore.getState();
    if (!state.selectedTile || !state.attackTarget) return;
    
    const result = Combat.performAttack(
      state.selectedTile,
      state.attackTarget,
      state.attackAmount
    );
    
    if (result.success) {
      TelegramAPI.haptic(result.captured ? 'success' : 'medium');
      
      const toTile = GameStore.getTile(state.attackTarget);
      
      if (result.captured) {
        Renderer.addAnimation(state.attackTarget, 'capture');
        SoundSystem.play('capture');
        
        result.annexed.forEach(id => {
          Renderer.addAnimation(id, 'annex');
          SoundSystem.play('annex', 0.2);
        });
      } else {
        SoundSystem.play('hit');
      }
      
      this.showMessage(result.message);
      this.checkWin();
    } else {
      TelegramAPI.haptic('error');
      SoundSystem.play('error');
      this.showMessage(result.message);
    }
    
    this.hideAttackPanel();
    this.updateUI();
  },
  
  checkWin() {
    const state = GameStore.getState();
    const totalTiles = Array.from(state.map.values()).filter(t => t.type !== 'water').length;
    const playerTiles = GameStore.countTerritories('player');
    const activeBots = state.bots.filter(b => !b.eliminated).length;
    
    if (playerTiles === totalTiles) {
      this.endGame(true);
    } else if (playerTiles === 0 || activeBots === 0) {
      this.endGame(playerTiles > 0);
    }
  },
  
  endGame(win) {
    const state = GameStore.getState();
    GameStore.setState({ gameOver: true, winner: win ? 'player' : 'bot' });
    GameStore.updateStats(win, state.turn);
    
    const screen = document.getElementById('game-over-screen');
    const icon = document.getElementById('result-icon');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    
    icon.textContent = win ? '🏆' : '💀';
    title.textContent = win ? 'Победа!' : 'Поражение!';
    title.style.color = win ? '#44ff44' : '#ff4444';
    
    document.getElementById('final-turns').textContent = state.turn;
    document.getElementById('final-territories').textContent = GameStore.countTerritories('player');
    document.getElementById('final-bots').textContent = state.bots.filter(b => b.eliminated).length;
    
    message.textContent = win 
      ? `Вы захватили все территории за ${state.turn} ходов!` 
      : 'Попробуйте ещё раз!';
    
    screen.classList.remove('hidden');
    
    TelegramAPI.haptic(win ? 'success' : 'error');
    SoundSystem.play(win ? 'win' : 'lose');
    
    this.isRunning = false;
  },
  
  showMessage(text) {
    const box = document.getElementById('message-box');
    document.getElementById('message-text').textContent = text;
    box.classList.remove('hidden');
    
    setTimeout(() => {
      box.classList.add('hidden');
    }, 2000);
  },
  
  showAttackPanel(tile) {
    const panel = document.getElementById('attack-panel');
    const slider = document.getElementById('troops-slider');
    const selected = GameStore.getTile(GameStore.getState().selectedTile);
    
    if (!selected) return;
    
    document.getElementById('target-tile').textContent = `(${tile.x}, ${tile.y})`;
    slider.max = selected.troops - 1;
    slider.value = Math.min(10, slider.max);
    
    GameStore.setState({ attackAmount: parseInt(slider.value) });
    document.getElementById('troops-value').textContent = slider.value;
    document.getElementById('available-troops').textContent = selected.troops;
    
    const chance = Combat.getWinChance(GameStore.getState().selectedTile, tile.id, parseInt(slider.value));
    document.getElementById('win-chance').textContent = chance + '%';
    
    panel.classList.remove('hidden');
  },
  
  hideAttackPanel() {
    document.getElementById('attack-panel').classList.add('hidden');
    GameStore.setState({ attackTarget: null });
  },
  
  updateUI() {
    const state = GameStore.getState();
    
    document.getElementById('territories-count').textContent = GameStore.countTerritories('player');
    document.getElementById('troops-count').textContent = GameStore.countTroops('player');
    document.getElementById('turn-count').textContent = state.turn;
    
    const btn = document.getElementById('end-turn-btn');
    if (btn) {
      btn.disabled = state.currentPlayer !== 'player' || state.gameOver;
      btn.style.opacity = btn.disabled ? 0.5 : 1;
    }
  },
  
  hideMenu() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('how-to-play-screen').classList.add('hidden');
    document.getElementById('stats-screen').classList.add('hidden');
  },
  
  showMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('top-bar').classList.add('hidden');
    document.getElementById('controls-hint').classList.add('hidden');
    document.getElementById('attack-panel').classList.add('hidden');
    
    GameStore.setState({ phase: 'menu' });
    Renderer.clear();
    this.isRunning = false;
  },
  
  // ===== ОБРАБОТКА ВВОДА =====
  
  onPointerDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragMoved = 0;
  },
  
  onPointerMove(e) {
    if (!this.isDragging) {
      // Hover эффект
      const tileId = Renderer.screenToWorld(e.clientX, e.clientY);
      if (tileId !== this.hoverTile) {
        this.hoverTile = tileId;
      }
      return;
    }
    
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    
    Renderer.setCamera(
      Renderer.camera.x + dx,
      Renderer.camera.y + dy,
      Renderer.camera.zoom
    );
    
    this.dragStart = { x: e.clientX, y: e.clientY };
  },
  
  onPointerUp(e) {
    this.isDragging = false;
    
    if (this.dragMoved < this.dragThreshold) {
      this.handleTap(e);
    }
  },
  
  onWheel(e) {
    e.preventDefault();
    Renderer.zoomCamera(e.deltaY * 0.001);
  },
  
  onTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.dragMoved = 0;
    } else if (e.touches.length === 2) {
      this.isPinching = true;
      this.pinchStart = this.getPinchDistance(e.touches);
    }
  },
  
  onTouchMove(e) {
    e.preventDefault();
    
    if (this.isPinching && e.touches.length === 2) {
      const dist = this.getPinchDistance(e.touches);
      const delta = (this.pinchStart - dist) * 0.005;
      Renderer.zoomCamera(delta);
      this.pinchStart = dist;
    } else if (this.isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - this.dragStart.x;
      const dy = e.touches[0].clientY - this.dragStart.y;
      this.dragMoved += Math.abs(dx) + Math.abs(dy);
      
      Renderer.setCamera(
        Renderer.camera.x + dx,
        Renderer.camera.y + dy,
        Renderer.camera.zoom
      );
      
      this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  },
  
  onTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.isPinching = false;
      
      if (this.dragMoved < this.dragThreshold && e.changedTouches[0]) {
        this.handleTap(e.changedTouches[0]);
      }
    }
  },
  
  getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },
  
  handleTap(e) {
    const tileId = Renderer.screenToWorld(e.clientX, e.clientY);
    if (!tileId) return;
    
    const tile = GameStore.getTile(tileId);
    if (!tile) return;
    
    this.onTileSelect(tile);
  },
  
  onTileSelect(tile) {
    const state = GameStore.getState();
    
    if (state.gameOver || state.currentPlayer !== 'player') return;
    
    // Снять выделение
    if (state.selectedTile) {
      const prevTile = GameStore.getTile(state.selectedTile);
      if (prevTile) {
        // Визуальный сброс
      }
    }
    
    // Если та же клетка - отмена
    if (state.selectedTile === tile.id) {
      GameStore.setState({ selectedTile: null, attackTarget: null });
      this.hideAttackPanel();
      TelegramAPI.haptic('selection');
      return;
    }
    
    // Выделить новую
    GameStore.setState({ selectedTile: tile.id });
    SoundSystem.play('select');
    TelegramAPI.haptic('light');
    
    // Если вражеская и соседняя - показать атаку
    if (tile.ownerId && tile.ownerId !== 'player') {
      const selected = GameStore.getTile(state.selectedTile);
      if (selected && selected.neighbors.includes(tile.id)) {
        GameStore.setState({ attackTarget: tile.id });
        this.showAttackPanel(tile);
      }
    } else {
      this.hideAttackPanel();
    }
  },
  
  renderLoop() {
    requestAnimationFrame(() => this.renderLoop());
    
    if (this.isRunning) {
      const state = GameStore.getState();
      Renderer.renderMap(state.map, state.selectedTile, this.hoverTile);
    }
  }
};

window.Game = Game;
