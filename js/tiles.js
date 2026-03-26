// Работа с клетками (3D рендеринг)

const TileRenderer = {
  scene: null,
  tiles: new Map(),

  // Инициализация
  init(scene) {
    this.scene = scene;
  },

  // Очистка
  clear() {
    this.tiles.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.tiles.clear();
  },

  // Создать клетку
  createTile(tile, onSelect) {
    if (tile.type === 'water') return null;

    const geometry = new THREE.BoxGeometry(1, 0.1, 1);
    const color = this.getTileColor(tile);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(tile.x * 1.1, tile.elevation, tile.y * 1.1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Данные клетки
    mesh.userData = { tileId: tile.id, tile: tile };

    // Клик
    mesh.onClick = () => onSelect(tile);

    this.scene.add(mesh);
    this.tiles.set(tile.id, mesh);

    return mesh;
  },

  // Обновить клетку
  updateTile(tile) {
    const mesh = this.tiles.get(tile.id);
    if (!mesh) return;

    const color = this.getTileColor(tile);
    mesh.material.color.set(color);
    mesh.position.y = tile.elevation;

    // Обновляем userData
    mesh.userData.tile = tile;
  },

  // Получить цвет
  getTileColor(tile) {
    if (tile.ownerId && MapGenerator.ownerColors[tile.ownerId]) {
      return MapGenerator.ownerColors[tile.ownerId];
    }
    return MapGenerator.tileColors[tile.type] || '#888888';
  },

  // Выделить клетку
  highlight(tileId, color = '#ffffff') {
    const mesh = this.tiles.get(tileId);
    if (mesh) {
      mesh.material.emissive.set(color);
      mesh.material.emissiveIntensity = 0.5;
    }
  },

  // Убрать выделение
  unhighlight(tileId) {
    const mesh = this.tiles.get(tileId);
    if (mesh) {
      mesh.material.emissive.set('#000000');
      mesh.material.emissiveIntensity = 0;
    }
  },

  // Анимация захвата
  animateCapture(tileId) {
    const mesh = this.tiles.get(tileId);
    if (!mesh) return;

    let scale = 1;
    let growing = true;

    const animate = () => {
      if (growing) {
        scale += 0.1;
        if (scale >= 1.3) growing = false;
      } else {
        scale -= 0.1;
        if (scale <= 1) {
          mesh.scale.set(1, 1, 1);
          return;
        }
      }
      mesh.scale.set(scale, 1, scale);
      requestAnimationFrame(animate);
    };

    animate();
  }
};

window.TileRenderer = TileRenderer;