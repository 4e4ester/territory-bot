const Renderer = {
  canvas: null,
  ctx: null,
  tiles: new Map(),
  
  // Камера
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2
  },
  
  // Анимации
  animations: [],
  
  // Стили
  style: 'modern',
  
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  
  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  },
  
  setStyle(style) {
    this.style = style;
  },
  
  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.tiles.clear();
    this.animations = [];
  },
  
  renderMap(map, selectedTile, hoverTile) {
    if (!this.ctx || !map) return;
    
    const state = GameStore.getState();
    const settings = state.settings;
    const cellSize = 50 * this.camera.zoom;
    const gap = 2 * this.camera.zoom;
    
    // Очистка
    this.ctx.fillStyle = '#0f0f1a';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    // Рисуем сетку
    this.renderGrid(map, cellSize, gap);
    
    // Рисуем клетки
    map.forEach(tile => {
      this.renderTile(tile, cellSize, gap, selectedTile, hoverTile);
    });
    
    // Рисуем анимации
    this.renderAnimations(cellSize, gap);
    
    // Рисуем UI на карте (цифры войск)
    map.forEach(tile => {
      this.renderTileUI(tile, cellSize, gap);
    });
  },
  
  renderGrid(map, cellSize, gap) {
    const state = GameStore.getState();
    if (!state.mapSize) return;
    
    const { width, height } = state.mapSize;
    const totalWidth = width * (cellSize + gap);
    const totalHeight = height * (cellSize + gap);
    
    const offsetX = (window.innerWidth - totalWidth) / 2 + this.camera.x;
    const offsetY = (window.innerHeight - totalHeight) / 2 + this.camera.y;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x <= width; x++) {
      const px = offsetX + x * (cellSize + gap);
      this.ctx.beginPath();
      this.ctx.moveTo(px, offsetY);
      this.ctx.lineTo(px, offsetY + totalHeight);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= height; y++) {
      const py = offsetY + y * (cellSize + gap);
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, py);
      this.ctx.lineTo(offsetX + totalWidth, py);
      this.ctx.stroke();
    }
  },
  
  renderTile(tile, cellSize, gap, selectedTile, hoverTile) {
    const state = GameStore.getState();
    const { width } = state.mapSize;
    
    const px = (window.innerWidth - width * (cellSize + gap)) / 2 + this.camera.x;
    const py = (window.innerHeight - width * (cellSize + gap)) / 2 + this.camera.y;
    
    const x = px + tile.x * (cellSize + gap);
    const y = py + tile.y * (cellSize + gap);
    
    // Сохраняем позицию для кликов
    this.tiles.set(tile.id, { x, y, size: cellSize });
    
    // Цвет клетки
    let color = MapGenerator.getTileColor(tile, this.style);
    
    // Выделение
    if (tile.id === selectedTile) {
      color = this.brightenColor(color, 40);
    } else if (tile.id === hoverTile) {
      color = this.brightenColor(color, 20);
    }
    
    // Рисуем клетку
    this.roundRect(x, y, cellSize, cellSize, 8 * this.camera.zoom, color, true);
    
    // Граница
    if (tile.ownerId) {
      this.ctx.strokeStyle = MapGenerator.ownerColors[tile.ownerId];
      this.ctx.lineWidth = 3 * this.camera.zoom;
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 1 * this.camera.zoom;
      this.ctx.stroke();
    }
    
    // Тип местности (иконка)
    this.renderTileIcon(tile, x, y, cellSize);
  },
  
  renderTileIcon(tile, x, y, size) {
    const icons = {
      mountain: '⛰️',
      forest: '🌲',
      city: '🏰',
      desert: '🏜️',
      grass: '',
      water: ''
    };
    
    const icon = icons[tile.type];
    if (icon) {
      this.ctx.font = `${size * 0.4}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(icon, x + size / 2, y + size / 2);
    }
  },
  
  renderTileUI(tile, cellSize, gap) {
    const state = GameStore.getState();
    const { width } = state.mapSize;
    
    const px = (window.innerWidth - width * (cellSize + gap)) / 2 + this.camera.x;
    const py = (window.innerHeight - width * (cellSize + gap)) / 2 + this.camera.y;
    
    const x = px + tile.x * (cellSize + gap);
    const y = py + tile.y * (cellSize + gap);
    
    // Количество войск
    if (tile.troops > 0 && tile.type !== 'water') {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${size * 0.25}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(tile.troops.toString(), x + cellSize / 2, y + cellSize * 0.7);
    }
    
    // Индикатор владельца
    if (tile.ownerId) {
      const indicatorSize = 6 * this.camera.zoom;
      this.ctx.fillStyle = MapGenerator.ownerColors[tile.ownerId];
      this.ctx.beginPath();
      this.ctx.arc(x + cellSize - indicatorSize - 2, y + indicatorSize + 2, indicatorSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
  },
  
  renderAnimations(cellSize, gap) {
    const now = Date.now();
    
    this.animations = this.animations.filter(anim => {
      const progress = (now - anim.startTime) / anim.duration;
      
      if (progress >= 1) {
        return false;
      }
      
      const tile = this.tiles.get(anim.tileId);
      if (!tile) return false;
      
      if (anim.type === 'capture') {
        const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
        const newSize = tile.size * scale;
        const offsetX = (tile.size - newSize) / 2;
        const offsetY = (tile.size - newSize) / 2;
        
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
        this.ctx.fillRect(
          tile.x + offsetX,
          tile.y + offsetY,
          newSize,
          newSize
        );
      }
      
      return true;
    });
  },
  
  addAnimation(tileId, type, duration = 500) {
    this.animations.push({
      tileId,
      type,
      startTime: Date.now(),
      duration
    });
  },
  
  roundRect(x, y, width, height, radius, color, fill) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
  },
  
  brightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  },
  
  screenToWorld(screenX, screenY) {
    const state = GameStore.getState();
    if (!state.mapSize) return null;
    
    const { width } = state.mapSize;
    const cellSize = 50 * this.camera.zoom;
    const gap = 2 * this.camera.zoom;
    
    const px = (window.innerWidth - width * (cellSize + gap)) / 2 + this.camera.x;
    const py = (window.innerHeight - width * (cellSize + gap)) / 2 + this.camera.y;
    
    for (const [tileId, pos] of this.tiles.entries()) {
      if (
        screenX >= pos.x &&
        screenX <= pos.x + pos.size &&
        screenY >= pos.y &&
        screenY <= pos.y + pos.size
      ) {
        return tileId;
      }
    }
    
    return null;
  },
  
  setCamera(x, y, zoom) {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoom));
  },
  
  zoomCamera(delta) {
    this.camera.zoom = Math.max(
      this.camera.minZoom,
      Math.min(this.camera.maxZoom, this.camera.zoom + delta)
    );
  }
};

window.Renderer = Renderer;