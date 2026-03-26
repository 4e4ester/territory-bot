const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Элементы интерфейса
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const playBtn = document.getElementById('play-btn');
const backBtn = document.getElementById('back-to-menu');

// Переключение экранов
playBtn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startGame();
});

backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
});

// ----- Игровая логика -----
let gameState = {
    map: [],          // двумерный массив клеток
    mapWidth: 8,
    mapHeight: 8,
    playerId: 0,      // 0 — игрок
    bots: [1]         // пока один бот с id = 1
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const cellSize = 50; // размер клетки в пикселях

function initGame() {
    // Создаём пустую карту (все клетки нейтральные)
    const w = gameState.mapWidth;
    const h = gameState.mapHeight;
    const map = Array(h).fill().map(() => Array(w).fill().map(() => ({ owner: -1, troops: 0 })));

    // Старт игрока (клетка в центре)
    const startX = Math.floor(w/2);
    const startY = Math.floor(h/2);
    map[startY][startX] = { owner: gameState.playerId, troops: 100 };

    // Старт бота (случайная свободная клетка)
    let botPlaced = false;
    while (!botPlaced) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        if (map[y][x].owner === -1) {
            map[y][x] = { owner: gameState.bots[0], troops: 80 };
            botPlaced = true;
        }
    }

    gameState.map = map;
}

function renderMap() {
    const w = gameState.mapWidth;
    const h = gameState.mapHeight;
    canvas.width = w * cellSize;
    canvas.height = h * cellSize;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = gameState.map[y][x];
            let color;
            if (cell.owner === gameState.playerId) color = '#4caf50';      // зелёный — игрок
            else if (cell.owner === -1) color = '#9e9e9e';                 // серый — нейтральная
            else color = '#f44336';                                        // красный — бот
            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
            ctx.fillStyle = '#000';
            ctx.font = '14px sans-serif';
            ctx.fillText(cell.troops, x * cellSize + 5, y * cellSize + 20);
        }
    }
}

function startGame() {
    initGame();
    renderMap();
}
