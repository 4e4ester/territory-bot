// Генерация карты

const MapGenerator = {
  // Типы местности
  tileTypes: ['grass', 'mountain', 'water', 'city', 'forest'],

  // Цвета для типов
  tileColors: {
    grass: '#22c55e',
    mountain: '#6b7280',
    water: '#3b82f6',
    city: '#fbbf24',
    forest: '#15803d'
  },

  // Цвета владельцев
  ownerColors: {
    player: '#3b82f6',
    bot_easy: '#ef4444',
    bot_medium: '#f97316',
    bot_hard: '#a855f7'
  },

  // Создать карту
  generate(width, height) {
    const map = new Map();

    // 1. Создаём сетку
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
          isEncircled: false
        });
      }
    }

    // 2. Прописываем соседей
    map.forEach(tile => {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      directions.forEach(([dx, dy]) => {
        const neighborId = `${tile.x + dx}_${tile.y + dy}`;
        if (map.has(neighborId)) {
          tile.neighbors.push(neighborId);
        }
      });
    });

    // 3. Размещаем стартовые города
    this.placeStartPositions(map, width, height);

    return map;
  },

  // Определить тип клетки
  getTileType(x, y, width, height) {
    // Края - вода
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      return 'water';
    }

    const rand = Math.random();
    if (rand < 0.08) return 'mountain';
    if (rand < 0.12) return 'forest';
    if (rand < 0.15) return 'city';

    return 'grass';
  },

  // Высота клетки
  getElevation(type) {
    const elevations = {
      mountain: 0.6,
      city: 0.3,
      forest: 0.15,
      grass: 0.1,
      water: -0.2
    };
    return elevations[type] || 0.1;
  },

  // Максимум войск
  getMaxTroops(type) {
    const maxTroops = {
      city: 200,
      mountain: 150,
      forest: 100,
      grass: 100,
      water: 0
    };
    return maxTroops[type] || 100;
  },

  // Стартовые позиции
  placeStartPositions(map, width, height) {
    const corners = [
      { x: 2, y: 2, owner: 'player' },
      { x: width - 3, y: 2, owner: 'bot_easy' },
      { x: 2, y: height - 3, owner: 'bot_medium' },
      { x: width - 3, y: height - 3, owner: 'bot_hard' }
    ];

    corners.forEach(({ x, y, owner }) => {
      const tile = map.get(`${x}_${y}`);
      if (tile && tile.type !== 'water') {
        tile.type = 'city';
        tile.ownerId = owner;
        tile.troops = 100;
        tile.elevation = this.getElevation('city');
      }
    });
  },

  // Получить размеры по названию
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