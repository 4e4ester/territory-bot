const Game = {
  // Three.js
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouse: null,
  tilesGroup: null,
  
  // Камера
  camDistance: 15,
  camHeight: 12,
  camAngle: 0,
  camTarget: { x: 0, y: 0 },
  
  // Управление
  isDragging: false,
  isPinching: false,
  dragStart: { x: 0, y: 0 },
  pinchStart: 0,
  dragMoved: 0,
  dragThreshold: 10,

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  
  init() {
    console.log('🎮 Game init...');
    
    // Таймер безопасности для загрузки
    setTimeout(() => this.hideLoading(), 3000);
    
    // Проверка Three.js
    if (typeof THREE === 'undefined') {
      document.getElementById('loading-text').textContent = 'Ошибка: Three.js';
      return;
    }
    
    // Звуки
    SoundSystem.init();
    
    // Telegram
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    
    // Запуск
    setTimeout(() => {
      this.init3D();
      this.initUI();
      GameStore.subscribe(() => this.updateUI());
      this.hideLoading();
      console.log('✅ Game ready');
    }, 500);
  },

  hideLoading() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
      screen.classList.add('hidden');
    }
  },

  // ===== 3D =====
  
  init3D() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('No canvas!');
      return;
    }
    
    // Сцена
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f1a);
    this.scene.fog = new THREE.Fog(0x0f0f1a, 20, 50);
    
    // Камера
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCamera();
    
    // Рендерер
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    // Свет
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    this.scene.add(dir);
    
    // Группа для клеток
    this.tilesGroup = new THREE.Group();
    this.scene.add(this.tilesGroup);
    
    // Сетка
    const grid = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1e293b);
    grid.position.y = -0.2;
    this.scene.add(grid);
    
    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // События - Мышь
    canvas.addEventListener('mousedown', e => this.onPointerDown(e), false);
    canvas.addEventListener('mousemove', e => this.onPointerMove(e), false);
    canvas.addEventListener('mouseup', e => this.onPointerUp(e), false);
    canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    
    // События - Тач
    canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', e => this.onTouchEnd(e), { passive: false });
    
    // Ресайз
    window.addEventListener('resize', () => this.onResize(), false);
    
    // TileRenderer
    TileRenderer.init(this.scene);
    
    // Анимация
    this.animate();
    
    console.log('✅ 3D initialized');
  },

  updateCamera() {
    const x = this.camTarget.x + Math.cos(this.camAngle) * this.camDistance;
    const z = this.camTarget.z + Math.sin(this.camAngle) * this.camDistance;
    this.camera.position.set(x, this.camHeight, z);
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z);
  },

  // ===== UI =====
  
  initUI() {
    // Настройки
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        SoundSystem.play('click');
        const parent = e.target.parentElement;
        parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const option = e.target.dataset.option;
        const value = e.target.dataset.value;
        
        if (option === 'size') {
          GameStore.setState({
            settings: { ...GameStore.getState().settings, mapSize: value }
          });
        } else if (option === 'bots') {
          GameStore.setState({
            settings: { ...GameStore.getState().settings, botCount: parseInt(value) }
          });
        } else if (option === 'diff') {
          GameStore.setState({
            settings: { ...GameStore.getState().settings, difficulty: value }
          });
        }
      });
    });
    
    // Кнопки
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
    
    document.getElementById('restart-btn').addEventListener('click', () => {
      SoundSystem.play('click');
      this.showMenu();
    });
    
    // Слайдер
    document.getElementById('troops-slider').addEventListener('input', e => {
      GameStore.setState({ attackAmount: parseInt(e.target.value) });
      document.getElementById('troops-value').textContent = e.target.value;
    });
    
    // Haptic
    window.triggerHaptic = type => {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback[`${type}Occurred`]();
      }
    };
    
    console.log('✅ UI initialized');
  },

  // ===== ИГРА =====
  
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
    
    // Очистка и создание клеток
    TileRenderer.clear();
    this.tilesGroup.clear();
    
    GameStore.getState().map.forEach(tile => {
      const mesh = TileRenderer.createTile(tile);
      if (mesh) {
        mesh.userData.tileId = tile.id;
        this.tilesGroup.add(mesh);
      }
    });
    
    // Центр карты
    const cx = (size.width - 1) * 1.1 / 2;
    const cz = (size.height - 1) * 1.1 / 2;
    this.camTarget = { x: cx, y: cz };
    this.updateCamera();
    
    // UI
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('controls-hint').classList.remove('hidden');
    
    this.updateUI();
    window.triggerHaptic('success');
    SoundSystem.play('turn');
    
    console.log('✅ Game started');
  },

  createBots(count, difficulty) {
    const configs = [
      { id: 'bot_easy', difficulty: 'easy' },
      { id: 'bot_medium', difficulty: 'medium' },
      { id: 'bot_hard', difficulty: 'hard' }
    ];
    
    const bots = [];
    for (let i = 0; i < count; i++) {
      const c = configs[i % configs.length];
      bots.push({ id: c.id, name: `Бот ${i+1}`, difficulty });
    }
    return bots;
  },

  // ===== УПРАВЛЕНИЕ КАМЕРОЙ =====
  
  onPointerDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragMoved = 0;
  },

  onPointerMove(e) {
    if (!this.isDragging) return;
    
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    
    // Вращение
    this.camAngle -= dx * 0.005;
    // Наклон
    this.camHeight = Math.max(5, Math.min(25, this.camHeight - dy * 0.05));
    
    this.updateCamera();
    this.dragStart = { x: e.clientX, y: e.clientY };
  },

  onPointerUp(e) {
    this.isDragging = false;
    
    // Если это был клик (не драг)
    if (this.dragMoved < this.dragThreshold) {
      this.handleTap(e);
    }
  },

  onWheel(e) {
    e.preventDefault();
    this.camDistance += e.deltaY * 0.01;
    this.camDistance = Math.max(8, Math.min(30, this.camDistance));
    this.updateCamera();
  },

  // ===== ТАЧ =====
  
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
      // Зум
      const dist = this.getPinchDistance(e.touches);
      const delta = this.pinchStart - dist;
      this.camDistance += delta * 0.05;
      this.camDistance = Math.max(8, Math.min(30, this.camDistance));
      this.pinchStart = dist;
      this.updateCamera();
    } else if (this.isDragging && e.touches.length === 1) {
      // Вращение
      const dx = e.touches[0].clientX - this.dragStart.x;
      const dy = e.touches[0].clientY - this.dragStart.y;
      this.dragMoved += Math.abs(dx) + Math.abs(dy);
      
      this.camAngle -= dx * 0.005;
      this.camHeight = Math.max(5, Math.min(25, this.camHeight - dy * 0.05));
      
      this.updateCamera();
      this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  },

  onTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.isPinching = false;
      
      if (this.dragMoved < this.dragThreshold) {
        this.handleTap(e.changedTouches[0]);
      }
    }
  },

  getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // ===== КЛИКИ =====
  
  handleTap(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = -(e.clientY - rect.top) / rect.height * 2 + 1;
    
    this.mouse.set(x, y);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.tilesGroup.children);
    
    if (intersects.length > 0) {
      const tileId = intersects[0].object.userData.tileId;
      const tile = GameStore.getTile(tileId);
      if (tile) {
        console.log('🎯 Tap:', tileId);
        this.onTileSelect(tile);
      }
    }
  },

  onTileSelect(tile) {
    const state = GameStore.getState();
    
    if (state.gameOver || state.currentPlayer !== 'player') return;
    
    // Снять выделение
    if (state.selectedTile) {
      TileRenderer.unhighlight(state.selectedTile);
    }
    
    // Если та же клетка - отмена
    if (state.selectedTile === tile.id) {
      GameStore.setState({ selectedTile: null, attackTarget: null });
      this.hideAttackPanel();
      return;
    }
    
    // Выделить новую
    GameStore.setState({ selectedTile: tile.id });
    TileRenderer.highlight(tile.id, '#44ff44');
    SoundSystem.play('select');
    
    // Если враг и сосед - атака
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

  showAttackPanel(tile) {
    const panel = document.getElementById('attack-panel');
    const slider = document.getElementById('troops-slider');
    const selected = GameStore.getTile(GameStore.getState().selectedTile);
    
    document.getElementById('target-tile').textContent = `(${tile.x}, ${tile.y})`;
    slider.max = selected ? selected.troops - 1 : 100;
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
    
    const result = Combat.performAttack(
      state.selectedTile,
      state.attackTarget,
      state.attackAmount
    );
    
    if (result.success) {
      window.triggerHaptic(result.captured ? 'success' : 'medium');
      
      const toTile = GameStore.getTile(state.attackTarget);
      if (toTile) TileRenderer.updateTile(toTile);
      
      if (result.captured) {
        TileRenderer.animateCapture(state.attackTarget);
        SoundSystem.play('capture');
        result.annexed.forEach(id => {
          const t = GameStore.getTile(id);
          if (t) {
            TileRenderer.updateTile(t);
            SoundSystem.play('select');
          }
        });
      }
      
      this.showMessage(result.message);
      this.checkWin();
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
    
    // Ход ботов
    state.bots.forEach(bot => {
      if (!bot.eliminated) {
        BotAI.makeTurn(bot.id);
        BotAI.regenerateTroops(bot.id);
      }
    });
    
    // Реген игрока
    GameStore.getPlayerTiles('player').forEach(t => {
      if (t.troops < t.maxTroops * 0.5) {
        GameStore.updateTile(t.id, { troops: t.troops + 2 });
      }
    });
    
    // Обновить визуал
    GameStore.getState().map.forEach(t => TileRenderer.updateTile(t));
    
    // Следующий ход
    GameStore.setState({
      turn: state.turn + 1,
      currentPlayer: 'player',
      phase: 'action',
      selectedTile: null,
      attackTarget: null
    });
    
    this.updateUI();
    this.checkWin();
    window.triggerHaptic('light');
    SoundSystem.play('turn');
  },

  checkWin() {
    const state = GameStore.getState();
    const total = Array.from(state.map.values()).filter(t => t.type !== 'water').length;
    const player = GameStore.countTerritories('player');
    
    if (player === total) {
      this.endGame(true);
    } else if (player === 0) {
      this.endGame(false);
    }
  },

  endGame(win) {
    GameStore.setState({ gameOver: true, winner: win ? 'player' : 'bot' });
    
    const screen = document.getElementById('game-over-screen');
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-message');
    
    title.textContent = win ? '🏆 Победа!' : '💀 Поражение!';
    title.style.color = win ? '#44ff44' : '#ff4444';
    msg.textContent = win
      ? `За ${GameStore.getState().turn} ходов!`
      : 'Попробуйте ещё раз!';
    
    screen.classList.remove('hidden');
    window.triggerHaptic(win ? 'success' : 'error');
    SoundSystem.play(win ? 'win' : 'lose');
  },

  showMessage(text) {
    const box = document.getElementById('message-box');
    document.getElementById('message-text').textContent = text;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 2000);
  },

  updateUI() {
    const state = GameStore.getState();
    
    document.getElementById('territories-count').textContent = GameStore.countTerritories('player');
    document.getElementById('troops-count').textContent = GameStore.countTroops('player');
    document.getElementById('turn-count').textContent = state.turn;
    
    const btn = document.getElementById('end-turn-btn');
    btn.disabled = state.currentPlayer !== 'player' || state.gameOver;
    btn.style.opacity = btn.disabled ? 0.5 : 1;
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
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('top-bar').classList.add('hidden');
    document.getElementById('controls-hint').classList.add('hidden');
    GameStore.reset();
    GameStore.setState({ phase: 'menu' });
    TileRenderer.clear();
    this.tilesGroup.clear();
  }
};

// Запуск
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM Ready');
  Game.init();
});
