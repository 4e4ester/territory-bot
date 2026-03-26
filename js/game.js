// Главная логика игры

const Game = {
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouse: null,
  isInitialized: false,

  // Инициализация
  init() {
    // Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    // 3D сцена
    this.init3D();
    
    // UI события
    this.initUI();
    
    // Подписка на изменения
    GameStore.subscribe(state => this.onStateChange(state));

    this.isInitialized = true;
  },

  // 3D инициализация
  init3D() {
    const canvas = document.getElementById('game-canvas');
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(5, 12, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Raycaster для кликов
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // События
    canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    window.addEventListener('resize', () => this.onResize());

    // TileRenderer
    TileRenderer.init(this.scene);

    // Цикл рендера
    this.animate();
  },

  // UI события
  initUI() {
    // Кнопки меню
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        GameStore.setState({
          settings: { ...GameStore.getState().settings, mapSize: e.target.dataset.size }
        });
      });
    });

    document.querySelectorAll('.bot-count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.bot-count-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        GameStore.setState({
          settings: { ...GameStore.getState().settings, botCount: parseInt(e.target.dataset.count) }
        });
      });
    });

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        GameStore.setState({
          settings: { ...GameStore.getState().settings, difficulty: e.target.dataset.difficulty }
        });
      });
    });

    // Старт игры
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.startGame();
    });

    // Завершить ход
    document.getElementById('end-turn-btn').addEventListener('click', () => {
      this.endTurn();
    });

    // Атака
    document.getElementById('attack-btn').addEventListener('click', () => {
      this.performAttack();
    });

    // Отмена атаки
    document.getElementById('cancel-attack-btn').addEventListener('click', () => {
      this.hideAttackPanel();
    });

    // Слайдер войск
    document.getElementById('troops-slider').addEventListener('input', (e) => {
      GameStore.setState({ attackAmount: parseInt(e.target.value) });
      document.getElementById('troops-value').textContent = e.target.value;
    });

    // Рестарт
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.showMenu();
    });

    // Вибрация Telegram
    window.triggerHaptic = (type = 'light') => {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback[`${type}Occurred`]();
      }
    };
  },

  // Старт игры
  startGame() {
    const settings = GameStore.getState().settings;
    const size = MapGenerator.getSizeByName(settings.mapSize);
    
    GameStore.reset();
    GameStore.setState({
      map: MapGenerator.generate(size.width, size.height),
      mapSize: size,
      phase: 'action',
      bots: this.createBots(settings.botCount, settings.difficulty)
    });

    // Рендер карты
    TileRenderer.clear();
    GameStore.getState().map.forEach(tile => {
      TileRenderer.createTile(tile, (t) => this.onTileSelect(t));
    });

    // Скрыть меню
    document.getElementById('main-menu').classList.add('hidden');
    
    // Обновить UI
    this.updateUI();
    
    window.triggerHaptic('success');
  },

  // Создать ботов
  createBots(count, difficulty) {
    const bots = [];
    const botConfigs = [
      { id: 'bot_easy', name: 'Бот 1', difficulty: 'easy' },
      { id: 'bot_medium', name: 'Бот 2', difficulty: 'medium' },
      { id: 'bot_hard', name: 'Бот 3', difficulty: 'hard' }
    ];

    for (let i = 0; i < count; i++) {
      const config = botConfigs[i % botConfigs.length];
      bots.push({
        id: config.id,
        name: config.name,
        difficulty: difficulty
      });
    }

    return bots;
  },

  // Выбор клетки
  onTileSelect(tile) {
    if (GameStore.getState().gameOver) return;
    if (GameStore.getState().currentPlayer !== 'player') return;

    const state = GameStore.getState();

    // Снять выделение с предыдущей
    if (state.selectedTile) {
      TileRenderer.unhighlight(state.selectedTile);
    }

    // Если кликнули на ту же - снять выделение
    if (state.selectedTile === tile.id) {
      GameStore.setState({ selectedTile: null, attackTarget: null });
      this.hideAttackPanel();
      return;
    }

    // Выделить новую
    GameStore.setState({ selectedTile: tile.id });
    TileRenderer.highlight(tile.id, '#44ff44');

    // Если вражеская и соседняя - показать панель атаки
    if (tile.ownerId && tile.ownerId !== 'player') {
      const selectedTile = GameStore.getTile(state.selectedTile);
      if (selectedTile && selectedTile.neighbors.includes(tile.id)) {
        GameStore.setState({ attackTarget: tile.id });
        this.showAttackPanel(tile);
      }
    } else {
      this.hideAttackPanel();
    }
  },

  // Показать панель атаки
  showAttackPanel(tile) {
    const panel = document.getElementById('attack-panel');
    const slider = document.getElementById('troops-slider');
    const selectedTile = GameStore.getTile(GameStore.getState().selectedTile);

    document.getElementById('target-tile').textContent = `(${tile.x}, ${tile.y})`;
    slider.max = selectedTile ? selectedTile.troops - 1 : 100;
    slider.value = Math.min(10, slider.max);
    
    GameStore.setState({ attackAmount: parseInt(slider.value) });
    document.getElementById('troops-value').textContent = slider.value;

    panel.classList.remove('hidden');
  },

  // Скрыть панель атаки
  hideAttackPanel() {
    document.getElementById('attack-panel').classList.add('hidden');
    GameStore.setState({ attackTarget: null });
  },

  // Выполнить атаку
  performAttack() {
    const state = GameStore.getState();
    if (!state.selectedTile || !state.attackTarget) return;

    const result = Combat.performAttack(state.selectedTile, state.attackTarget, state.attackAmount);

    if (result.success) {
      window.triggerHaptic(result.captured ? 'success' : 'medium');
      
      // Обновить визуал
      const toTile = GameStore.getTile(state.attackTarget);
      if (toTile) TileRenderer.updateTile(toTile);
      
      if (result.captured) {
        TileRenderer.animateCapture(state.attackTarget);
        result.annexed.forEach(id => {
          const tile = GameStore.getTile(id);
          if (tile) TileRenderer.updateTile(tile);
        });
      }

      this.showMessage(result.message);
      this.checkWinCondition();
    } else {
      this.showMessage(result.message);
    }

    this.hideAttackPanel();
    this.updateUI();
  },

  // Завершить ход
  endTurn() {
    const state = GameStore.getState();
    if (state.gameOver || state.currentPlayer !== 'player') return;

    GameStore.setState({ phase: 'resolution' });

    // Ходы ботов
    state.bots.forEach(bot => {
      if (!bot.eliminated) {
        BotAI.makeTurn(bot.id);
        BotAI.regenerateTroops(bot.id);
      }
    });

    // Регенерация игрока
    const playerTiles = GameStore.getPlayerTiles('player');
    playerTiles.forEach(tile => {
      if (tile.troops < tile.maxTroops * 0.5) {
        GameStore.updateTile(tile.id, { troops: tile.troops + 2 });
      }
    });

    // Обновить визуал
    GameStore.getState().map.forEach(tile => {
      TileRenderer.updateTile(tile);
    });

    // Следующий ход
    GameStore.setState({
      turn: state.turn + 1,
      currentPlayer: 'player',
      phase: 'action',
      selectedTile: null,
      attackTarget: null
    });

    this.updateUI();
    this.checkWinCondition();
    window.triggerHaptic('light');
  },

  // Проверка победы
  checkWinCondition() {
    const state = GameStore.getState();
    const totalTiles = Array.from(state.map.values()).filter(t => t.type !== 'water').length;
    const playerTiles = GameStore.countTerritories('player');
    const botTiles = totalTiles - playerTiles;

    if (playerTiles === totalTiles) {
      this.endGame(true);
    } else if (playerTiles === 0) {
      this.endGame(false);
    }
  },

  // Конец игры
  endGame(win) {
    GameStore.setState({ gameOver: true, winner: win ? 'player' : 'bot' });

    const screen = document.getElementById('game-over-screen');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');

    title.textContent = win ? '🏆 Победа!' : '💀 Поражение!';
    title.style.color = win ? '#44ff44' : '#ff4444';
    message.textContent = win 
      ? `Вы захватили все территории за ${GameStore.getState().turn} ходов!`
      : 'Попробуйте ещё раз!';

    screen.classList.remove('hidden');
    window.triggerHaptic(win ? 'success' : 'error');
  },

  // Показать сообщение
  showMessage(text) {
    const box = document.getElementById('message-box');
    document.getElementById('message-text').textContent = text;
    box.classList.remove('hidden');

    setTimeout(() => {
      box.classList.add('hidden');
    }, 2000);
  },

  // Обновить UI
  updateUI() {
    const state = GameStore.getState();
    
    document.getElementById('territories-count').textContent = GameStore.countTerritories('player');
    document.getElementById('troops-count').textContent = GameStore.countTroops('player');
    document.getElementById('turn-count').textContent = state.turn;

    const endBtn = document.getElementById('end-turn-btn');
    endBtn.disabled = state.currentPlayer !== 'player' || state.gameOver;
    endBtn.style.opacity = endBtn.disabled ? 0.5 : 1;
  },

  // Изменение состояния
  onStateChange(state) {
    this.updateUI();
  },

  // Клик по canvas
  onCanvasClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      if (mesh.userData && mesh.userData.tileId) {
        const tile = GameStore.getTile(mesh.userData.tileId);
        if (tile) this.onTileSelect(tile);
      }
    }
  },

  // Ресайз
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  // Анимация
  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  },

  // Показать меню
  showMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    GameStore.reset();
    GameStore.setState({ phase: 'menu' });
    TileRenderer.clear();
  }
};

// Запуск при загрузке
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});