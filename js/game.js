const Game = {
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouse: null,
  isInitialized: false,
  cameraTarget: new THREE.Vector3(0, 0, 0),
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },

  init() {
    // Показываем экран загрузки
    this.updateLoadingText('Инициализация...');
    
    // Инициализация звуков
    SoundSystem.init();
    this.updateLoadingText('Загрузка звуков...');

    // Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    this.updateLoadingText('Создание 3D сцены...');
    setTimeout(() => {
      this.init3D();
      this.initUI();
      GameStore.subscribe(state => this.onStateChange(state));
      
      // Скрываем экран загрузки
      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        this.isInitialized = true;
      }, 500);
    }, 300);
  },

  updateLoadingText(text) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = text;
  },

  init3D() {
    const canvas = document.getElementById('game-canvas');
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);
    this.scene.fog = new THREE.Fog(0x0f0f1a, 10, 50);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(5, 10, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Улучшенное освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    // Дополнительный свет
    const pointLight = new THREE.PointLight(0x3b82f6, 0.5, 50);
    pointLight.position.set(0, 10, 0);
    this.scene.add(pointLight);

    // Сетка
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.1;
    this.scene.add(gridHelper);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), {passive: false});
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), {passive: false});
    canvas.addEventListener('touchend', () => this.onMouseUp());
    
    window.addEventListener('resize', () => this.onResize());

    TileRenderer.init(this.scene);
    this.animate();
  },

  initUI() {
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        SoundSystem.play('click');
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        GameStore.setState({
          settings: { ...GameStore.getState().settings, mapSize: e.target.dataset.size }
        });
      });
    });

    document.querySelectorAll('.bot-count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        SoundSystem.play('click');
        document.querySelectorAll('.bot-count-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        GameStore.setState({
          settings: { ...GameStore.getState().settings, botCount: parseInt(e.target.dataset.count) }
        });
      });
    });

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        SoundSystem.play('click');
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        GameStore.setState({
          settings: { ...GameStore.getState().settings, difficulty: e.target.dataset.difficulty }
        });
      });
    });

    document.getElementById('start-game-btn').addEventListener('click', () => {
      SoundSystem.play('click');
      this.startGame();
    });

    document.getElementById('end-turn-btn').addEventListener('click', () => {
      SoundSystem.play('click');
      this.endTurn();
    });

    document.getElementById('attack-btn').addEventListener('click', () => {
      SoundSystem.play('attack');
      this.performAttack();
    });

    document.getElementById('cancel-attack-btn').addEventListener('click', () => {
      SoundSystem.play('click');
      this.hideAttackPanel();
    });

    document.getElementById('troops-slider').addEventListener('input', (e) => {
      GameStore.setState({ attackAmount: parseInt(e.target.value) });
      document.getElementById('troops-value').textContent = e.target.value;
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      SoundSystem.play('click');
      this.showMenu();
    });

    window.triggerHaptic = (type = 'light') => {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback[`${type}Occurred`]();
      }
    };
  },

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

    TileRenderer.clear();
    GameStore.getState().map.forEach(tile => {
      TileRenderer.createTile(tile, (t) => this.onTileSelect(t));
    });

    // Центрируем камеру
    const centerX = (size.width - 1) * 1.1 / 2;
    const centerZ = (size.height - 1) * 1.1 / 2;
    this.cameraTarget.set(centerX, 10, centerZ);
    this.camera.position.set(centerX + 5, 12, centerZ + 8);
    this.camera.lookAt(centerX, 0, centerZ);

    document.getElementById('main-menu').classList.add('hidden');
    this.updateUI();
    window.triggerHaptic('success');
    SoundSystem.play('turn');
  },

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

  onTileSelect(tile) {
    if (GameStore.getState().gameOver) return;
    if (GameStore.getState().currentPlayer !== 'player') return;

    const state = GameStore.getState();

    if (state.selectedTile) {
      TileRenderer.unhighlight(state.selectedTile);
    }

    if (state.selectedTile === tile.id) {
      GameStore.setState({ selectedTile: null, attackTarget: null });
      this.hideAttackPanel();
      return;
    }

    GameStore.setState({ selectedTile: tile.id });
    TileRenderer.highlight(tile.id, '#44ff44');
    SoundSystem.play('select');

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

  hideAttackPanel() {
    document.getElementById('attack-panel').classList.add('hidden');
    GameStore.setState({ attackTarget: null });
  },

  performAttack() {
    const state = GameStore.getState();
    if (!state.selectedTile || !state.attackTarget) return;

    const result = Combat.performAttack(state.selectedTile, state.attackTarget, state.attackAmount);

    if (result.success) {
      window.triggerHaptic(result.captured ? 'success' : 'medium');
      
      const toTile = GameStore.getTile(state.attackTarget);
      if (toTile) TileRenderer.updateTile(toTile);
      
      if (result.captured) {
        TileRenderer.animateCapture(state.attackTarget);
        SoundSystem.play('capture');
        result.annexed.forEach(id => {
          const tile = GameStore.getTile(id);
          if (tile) {
            TileRenderer.updateTile(tile);
            SoundSystem.play('annex');
          }
        });
      }

      this.showMessage(result.message);
      this.checkWinCondition();
    } else {
      SoundSystem.play('error');
      this.showMessage(result.message);
    }

    this.hideAttackPanel();
    this.updateUI();
  },

  endTurn() {
    const state = GameStore.getState();
    if (state.gameOver || state.currentPlayer !== 'player') return;

    GameStore.setState({ phase: 'resolution' });

    state.bots.forEach(bot => {
      if (!bot.eliminated) {
        BotAI.makeTurn(bot.id);
        BotAI.regenerateTroops(bot.id);
      }
    });

    const playerTiles = GameStore.getPlayerTiles('player');
    playerTiles.forEach(tile => {
      if (tile.troops < tile.maxTroops * 0.5) {
        GameStore.updateTile(tile.id, { troops: tile.troops + 2 });
      }
    });

    GameStore.getState().map.forEach(tile => {
      TileRenderer.updateTile(tile);
    });

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
    SoundSystem.play('turn');
  },

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
    SoundSystem.play(win ? 'win' : 'lose');
  },

  showMessage(text) {
    const box = document.getElementById('message-box');
    document.getElementById('message-text').textContent = text;
    box.classList.remove('hidden');

    setTimeout(() => {
      box.classList.add('hidden');
    }, 2000);
  },

  updateUI() {
    const state = GameStore.getState();
    
    document.getElementById('territories-count').textContent = GameStore.countTerritories('player');
    document.getElementById('troops-count').textContent = GameStore.countTroops('player');
    document.getElementById('turn-count').textContent = state.turn;

    const endBtn = document.getElementById('end-turn-btn');
    endBtn.disabled = state.currentPlayer !== 'player' || state.gameOver;
    endBtn.style.opacity = endBtn.disabled ? 0.5 : 1;
  },

  onStateChange(state) {
    this.updateUI();
  },

  onCanvasClick(event) {
    if (this.isDragging) return;

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

  onMouseDown(event) {
    this.isDragging = false;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  },

  onMouseMove(event) {
    if (!this.previousMousePosition) return;

    const deltaMove = {
      x: event.clientX - this.previousMousePosition.x,
      y: event.clientY - this.previousMousePosition.y
    };

    if (Math.abs(deltaMove.x) > 5 || Math.abs(deltaMove.y) > 5) {
      this.isDragging = true;
    }

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  },

  onMouseUp() {
    this.isDragging = false;
    this.previousMousePosition = null;
  },

  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.isDragging = false;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  },

  onTouchMove(event) {
    event.preventDefault();
    if (!this.previousMousePosition || event.touches.length !== 1) return;

    const deltaMove = {
      x: event.touches[0].clientX - this.previousMousePosition.x,
      y: event.touches[0].clientY - this.previousMousePosition.y
    };

    if (Math.abs(deltaMove.x) > 5 || Math.abs(deltaMove.y) > 5) {
      this.isDragging = true;
    }

    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  },

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Плавное движение камеры
    if (this.camera) {
      this.camera.position.lerp(this.cameraTarget.clone().add(new THREE.Vector3(5, 12, 8)), 0.05);
      this.camera.lookAt(this.cameraTarget);
    }
    
    this.renderer.render(this.scene, this.camera);
  },

  showMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    GameStore.reset();
    GameStore.setState({ phase: 'menu' });
    TileRenderer.clear();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
