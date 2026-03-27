const MapGenerator = {
  tileColors: {
    grass: '#22c55e',
    mountain: '#6b7280',
    water: '#1e40af',
    city: '#fbbf24',
    forest: '#15803d',
    desert: '#d97706'
  },

  ownerColors: {
    player: '#3b82f6',
    bot_easy: '#ef4444',
    bot_medium: '#f97316',
    bot_hard: '#a855f7'
  },

  generate(width, height) {
    const map = new Map();
    
    // Создаём клетки
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const id = `${x}_${y}`;
        const type = this.getTileType(x, y, width, height);
        
        map.set(id, {
          id,
          x,
          y,
          type,
          elevation: this.getElevation(type),
          ownerId: null,
          troops: type === 'city' ? 50 : 10,
          maxTroops: this.getMaxTroops(type),
          neighbors: [],
          defenseBonus: this.getDefenseBonus(type)
        });
      }
    }
    
    // Соседи
    map.forEach(tile => {
      [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dx, dy]) => {
        const nid = `${tile.x + dx}_${tile.y + dy}`;
        if (map.has(nid)) {
          tile.neighbors.push(nid);
        }
      });
    });
    
    // Стартовые позиции
    this.placeStarts(map, width, height);
    
    // Сглаживание местности
    this.smoothTerrain(map, width, height);
    
    return map;
  },

  getTileType(x, y, w, h) {
    // Края - вода
    if (x === 0 || x === w-1 || y === 0 || y === h-1) {
      return 'water';
    }
    
    // Используем простой шум для генерации
    const noise = this.simpleNoise(x, y, w, h);
    
    if (noise < 0.15) return 'water';
    if (noise < 0.25) return 'mountain';
    if (noise < 0.40) return 'forest';
    if (noise < 0.45) return 'city';
    if (noise < 0.55) return 'desert';
    return 'grass';
  },

  simpleNoise(x, y, w, h) {
    const seed = x * 12.9898 + y * 78.233;
    const sin = Math.sin(seed) * 43758.5453;
    return sin - Math.floor(sin);
  },

  getElevation(type) {
    const elev = {
      mountain: 0.5,
      city: 0.25,
      forest: 0.15,
      grass: 0.1,
      desert: 0.08,
      water: -0.1
    };
    return elev[type] || 0.1;
  },

  getMaxTroops(type) {
    const max = {
      city: 250,
      mountain: 150,
      forest: 120,
      grass: 100,
      desert: 80,
      water: 0
    };
    return max[type] || 100;
  },

  getDefenseBonus(type) {
    const bonus = {
      mountain: 1.5,
      city: 1.3,
      forest: 1.2,
      grass: 1.0,
      desert: 0.9,
      water: 0
    };
    return bonus[type] || 1.0;
  },

  placeStarts(map, w, h) {
    const starts = [
      { x: 2, y: 2, owner: 'player' },
      { x: w-3, y: 2, owner: 'bot_easy' },
      { x: 2, y: h-3, owner: 'bot_medium' },
      { x: w-3, y: h-3, owner: 'bot_hard' }
    ];
    
    starts.forEach(({x, y, owner}) => {
      const tile = map.get(`${x}_${y}`);
      if (tile && tile.type !== 'water') {
        tile.type = 'city';
        tile.ownerId = owner;
        tile.troops = 150;
        tile.maxTroops = 250;
        tile.elevation = this.getElevation('city');
        tile.defenseBonus = this.getDefenseBonus('city');
      }
    });
  },

  smoothTerrain(map, w, h) {
    // Простое сглаживание для более естественного вида
    const iterations = 2;
    for (let i = 0; i < iterations; i++) {
      map.forEach(tile => {
        if (tile.type === 'water' || tile.type === 'city') return;
        
        const neighborTypes = tile.neighbors
          .map(id => map.get(id))
          .filter(t => t && t.type !== 'water')
          .map(t => t.type);
        
        if (neighborTypes.length > 0) {
          const counts = {};
          neighborTypes.forEach(t => counts[t] = (counts[t] || 0) + 1);
          const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          
          if (Math.random() < 0.3) {
            tile.type = mostCommon;
            tile.elevation = this.getElevation(mostCommon);
            tile.defenseBonus = this.getDefenseBonus(mostCommon);
          }
        }
      });
    }
  },

  getSizeByName(name) {
    const sizes = {
      small: { width: 8, height: 8 },
      medium: { width: 12, height: 12 },
      large: { width: 16, height: 16 }
    };
    return sizes[name] || sizes.small;
  },

  getTileColor(tile, style) {
    if (tile.ownerId && this.ownerColors[tile.ownerId]) {
      return this.ownerColors[tile.ownerId];
    }
    return this.tileColors[tile.type] || '#888888';
  }
};

window.MapGenerator = MapGenerator;
