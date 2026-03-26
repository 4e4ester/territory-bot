const Game = {
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouse: null,
  isInitialized: false,
  
  // Управление камерой
  cameraAngle: 0,
  cameraDistance: 15,
  cameraHeight: 12,
  cameraTarget: new THREE.Vector3(0, 0, 0),
  isDragging: false,
  isPinching: false,
  previousMousePosition: { x: 0, y: 0 },
  previousPinchDistance: 0,
  clickStartTime: 0,
  
  // Для кликов
  tilesGroup: null,
  selectedMesh: null,

  init() {
    console.log('🎮 Game initializing...');
    
    // Таймер безопасности
    setTimeout(() => {
      this.hideLoadingScreen();
    }, 3000);
    
    this.updateLoadingText('Инициализация...');
    
    try {
      if (typeof THREE === 'undefined') {
        throw new Error('Three.js не загрузился!');
      }
      console.log('✅ Three.js loaded');
      
      this.updateLoadingText('Загрузка звуков...');
      SoundSystem.init();
      
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        console.log('✅ Telegram WebApp ready');
      }
      
      this.updateLoadingText('Создание сцены...');
      setTimeout(() => {
        this.init3D();
        this.initUI();
        GameStore.subscribe(state => this.onStateChange(state));
        
        console.log('✅ Game initialized successfully');
        this.hideLoadingScreen();
      }, 500);
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      this.showLoadingError(error.message);
      this.hideLoadingScreen();
    }
  },

  hideLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => { screen.style.display = 'none'; }, 500);
    }
  },

  showLoadingError(message) {
    const errorEl = document.getElementById('loading-error');
    if (errorEl) {
      errorEl.textContent = 'Ошибка: ' + message;
      errorEl.classList.remove('hidden');
    }
  },

  updateLoadingText(text) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = text;
    console.log('📝 Loading:', text);
  },

  init3D() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);
    this.scene.fog = new THREE.Fog(0x0f0f1a, 20, 60);

    // Камера
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.updateCameraPosition();

    // Рендерер
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Группа для клеток
    this.tilesGroup = new THREE.Group();
    this.scene.add(this.tilesGroup);

    // Сетка
    const gridHelper = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.2;
    this.scene.add(gridHelper);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // События - мышь
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
    canvas.addEventListener('click', (e) => this.onClick(e), false);
    canvas.addEventListener('wheel', (e) => this.onWheel(e), false);

    // События - тач
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

    window.addEventListener('resize', () => this.onResize(), false);

    TileRenderer.init(this.scene);
    
    console.log('✅ 3D Scene initialized');
    
    this.animate();
  },

  updateCameraPosition() {
    const x = this.cameraTarget.x + Math.cos(this.cameraAngle) * this.cameraDistance;
    const z = this.cameraTarget.z + Math.sin(this.cameraAngle) * this.cameraDistance;
    this.camera.position.set(x, this.cameraHeight, z);
    this.camera.lookAt(this.cameraTarget.x, 0, this.cameraTarget.z);
  },

  initUI() {
    // Кнопки меню
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
    
    console.log('✅ UI initialized');
  },

  startGame() {
    try {
      const settings = GameStore.getState().settings;
      const size = MapGenerator.getSizeByName(settings.mapSize);
      
      GameStore.reset();
      GameStore.setState({
        map: MapGenerator.generate(size.width, size.height),
        mapSize: size,
        phase: 'action',
        bots: this.createBots(settings.botCount, settings.difficulty)
      });

      // Очистка и создание клеток
      TileRenderer.clear();
      this.tilesGroup.clear();
      
      GameStore.getState().map.forEach(tile => {
        const mesh = TileRenderer.createTile(tile, null);
        if (mesh) {
          mesh.name = tile.id;
          mesh.userData.tileId = tile.id;
          this.tilesGroup.add(mesh);
        }
      });

      // Центрируем камеру
      const centerX = (size.width - 1) * 1.1 / 2;
      const centerZ = (size.height - 1) * 1.1 / 2;
      this.cameraTarget.set(centerX, 0, centerZ);
      this.updateCameraPosition();

      document.getElementById('main-menu').classList.add('hidden');
      document.getElementById('top-bar').classList.remove('hidden');
      document.getElementById('controls-hint').classList.remove('hidden');
      
      this.updateUI();
      window.triggerHaptic('success');
      SoundSystem.play('turn');
      
      console.log('✅ Game started');
    } catch (error) {
      console.error('Start game error:', error);
      alert('Ошибка запуска игры: ' + error.message);
    }
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

  // ===== УПРАВЛЕНИЕ КАМЕРОЙ =====

  onMouseDown(event) {
    if (event.button === 0) { // Левая кнопка
      this.isDragging = true;
      this.clickStartTime = Date.now();
      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    }
  },

  onMouseMove(event) {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    // Вращение камеры
    this.cameraAngle -= deltaX * 0.005;
    
    // Наклон камеры
    this.cameraHeight = Math.max(5, Math.min(25, this.cameraHeight - deltaY * 0.1));

    this.updateCameraPosition();

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  },

  onMouseUp(event) {
    this.isDragging = false;
  },

  onClick(event) {
    // Если было перетаскивание - не обрабатываем клик
    const clickDuration = Date.now() - this.clickStartTime;
    if (clickDuration > 200) return;

    this.handleTileClick(event);
  },

  onWheel(event) {
    event.preventDefault();
    
    // Зум колёсиком
    this.cameraDistance += event.deltaY * 0.01;
    this.cameraDistance = Math.max(8, Math.min(30, this.cameraDistance));
    
    this.updateCameraPosition();
  },

  // ===== ТАЧ УПРАВЛЕНИЕ =====

  onTouchStart(event) {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.clickStartTime = Date.now();
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.touches.length === 2) {
      this.isPinching = true;
      this.previousPinchDistance = this.getPinchDistance(event.touches);
    }
  },

  onTouchMove(event) {
    event.preventDefault();
    
    if (this.isPinching && event.touches.length === 2) {
      // Зум щипком
      const distance = this.getPinchDistance(event.touches);
      const delta = this.previousPinchDistance - distance;
      
      this.cameraDistance += delta * 0.05;
      this.cameraDistance = Math.max(8, Math.min(30, this.cameraDistance));
      
      this.previousPinchDistance = distance;
      this.updateCameraPosition();
    } else if (this.isDragging && event.touches.length === 1) {
      // Вращение камеры
      const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

      this.cameraAngle -= deltaX * 0.005;
      this.cameraHeight = Math.max(5, Math.min(25, this.cameraHeight - deltaY * 0.1));

      this.updateCameraPosition();

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  },

  onTouchEnd(event) {
    if (event.touches.length === 0) {
      this.isDragging = false;
      this.isPinching = false;
      
      // Если это был короткий тап - обрабатываем клик
      const clickDuration = Date.now() - this.clickStartTime;
      if (clickDuration < 200 && !this.isPinching) {
        this.handleTileClick(event.changedTouches[0]);
      }
    }
  },

  getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // ===== КЛИКИ ПО КЛЕТКАМ =====

  handleTileClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    const clientX = event.clientX || event.pageX;
    const clientY = event.clientY || event.pageY;
    
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Ищем пересечения с клетками
    const intersects = this.raycaster.intersectObjects(this.tilesGroup.children);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const tileId = mesh.userData.tileId;
      
      if (tileId) {
        const tile = GameStore.getTile(tileId);
        if (tile) {
          console.log('🎯 Clicked tile:', tileId, tile);
          this.onTileSelect(tile);
        }
      }
    }
  },

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
    SoundSystem.play('select');

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
      SoundSystem.play('lose');
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

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  },

  showMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById
