const TileRenderer = {
  scene: null,
  tiles: new Map(),
  materials: {},

  init(scene) {
    this.scene = scene;
    this.createMaterials();
  },

  createMaterials() {
    // Создаём переиспользуемые материалы для производительности
    Object.keys(MapGenerator.tileColors).forEach(type => {
      this.materials[type] = new THREE.MeshStandardMaterial({
        color: MapGenerator.tileColors[type],
        roughness: 0.7,
        metalness: 0.3,
        flatShading: false
      });
    });

    Object.keys(MapGenerator.ownerColors).forEach(owner => {
      this.materials[`owner_${owner}`] = new THREE.MeshStandardMaterial({
        color: MapGenerator.ownerColors[owner],
        roughness: 0.5,
        metalness: 0.5,
        emissive: MapGenerator.ownerColors[owner],
        emissiveIntensity: 0.2
      });
    });
  },

  clear() {
    this.tiles.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.tiles.clear();
  },

  createTile(tile, onSelect) {
    if (tile.type === 'water') return null;

    const height = 0.08;
    const geometry = new THREE.BoxGeometry(1, height, 1);
    
    let material;
    if (tile.ownerId && this.materials[`owner_${tile.ownerId}`]) {
      material = this.materials[`owner_${tile.ownerId}`];
    } else {
      material = this.materials[tile.type] || this.materials.grass;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(tile.x * 1.1, tile.elevation, tile.y * 1.1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = { tileId: tile.id, tile: tile };
    mesh.onClick = () => onSelect(tile);

    this.scene.add(mesh);
    this.tiles.set(tile.id, mesh);

    return mesh;
  },

  updateTile(tile) {
    const mesh = this.tiles.get(tile.id);
    if (!mesh) return;

    let material;
    if (tile.ownerId && this.materials[`owner_${tile.ownerId}`]) {
      material = this.materials[`owner_${tile.ownerId}`];
    } else {
      material = this.materials[tile.type] || this.materials.grass;
    }
    
    mesh.material = material;
    mesh.position.y = tile.elevation;
    mesh.userData.tile = tile;
  },

  highlight(tileId, color = '#ffffff') {
    const mesh = this.tiles.get(tileId);
    if (mesh) {
      mesh.material.emissive.set(color);
      mesh.material.emissiveIntensity = 0.5;
    }
  },

  unhighlight(tileId) {
    const mesh = this.tiles.get(tileId);
    if (mesh) {
      mesh.material.emissive.set('#000000');
      mesh.material.emissiveIntensity = 0.2;
    }
  },

  animateCapture(tileId) {
    const mesh = this.tiles.get(tileId);
    if (!mesh) return;

    let scale = 1;
    let growing = true;
    let frames = 0;

    const animate = () => {
      frames++;
      if (growing) {
        scale += 0.05;
        if (scale >= 1.3) growing = false;
      } else {
        scale -= 0.05;
        if (scale <= 1) {
          mesh.scale.set(1, 1, 1);
          return;
        }
      }
      mesh.scale.set(scale, 1, scale);
      
      if (frames < 40) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
};

window.TileRenderer = TileRenderer;
