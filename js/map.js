const MapGenerator = {
  tileColors: {
    grass: '#22c55e',
    mountain: '#6b7280',
    water: '#1e40af',
    city: '#fbbf24',
    forest: '#15803d'
  },

  ownerColors: {
    player: '#3b82f6',
    bot_easy: '#ef4444',
    bot_medium: '#f97316',
    bot_hard: '#a855f7'
  },

  generate(width, height) {
    const map = new Map();
    
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
          neighbors: []
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
    
    return map;
  },

  getTileType(x, y, w, h) {
    if (x === 0 || x === w-1 || y === 0 || y === h-1) {
      return 'water';
    }
    
    const r = Math.random();
    if (r < 0.08) return 'mountain';
    if (r < 0.12) return 'forest';
    if (r < 0.15) return 'city';
    return 'grass';
  },

  getElevation(type) {
    const elev = {
      mountain: 0.4,
      city: 0.2,
      forest: 0.1,
      grass: 0.06,
      water: -0.1
    };
    return elev[type] || 0.06;
  },

  getMaxTroops(type) {
    const max = {
      city: 200,
      mountain: 150,
      forest: 100,
      grass: 100,
      water: 0
    };
    return max[type] || 100;
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
        tile.troops = 100;
        tile.elevation = this.getElevation('city');
      }
    });
  },

  getSizeByName(name) {
    const sizes = {
      small: { width: 8, height: 8 },
      medium: { width: 12, height: 12 },
      large: { width: 16, height: 16 }
    };
    return sizes[name] || sizes.small;
  }
};

window.MapGenerator = MapGenerator;
