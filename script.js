// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ----- Элементы интерфейса -----
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const playBtn = document.getElementById('play-btn');
const backBtn = document.getElementById('back-to-menu');
const botCountSlider = document.getElementById('bot-count');
const botCountSpan = document.getElementById('bot-count-value');
const soundToggle = document.getElementById('sound-toggle');
const mapSizeSelect = document.getElementById('map-size');
const difficultySelect = document.getElementById('difficulty');
const playerTroopsSpan = document.getElementById('player-troops');
const turnIndicator = document.getElementById('turn-indicator');

// ----- Звук -----
let soundEnabled = true;
let clickSound = null;
let isAudioInitialized = false;

function initAudio() {
    if (isAudioInitialized) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const audioCtx = new AudioContext();
            clickSound = () => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.value = 880;
                gain.gain.value = 0.1;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
                osc.stop(audioCtx.currentTime + 0.1);
            };
        } else {
            clickSound = () => {};
        }
    } catch(e) {
        clickSound = () => {};
    }
    isAudioInitialized = true;
}

function playClick() {
    if (soundEnabled && clickSound) clickSound();
}

// ----- Настройки ползунка -----
botCountSlider.addEventListener('input', () => {
    botCountSpan.textContent = botCountSlider.value;
});

// ----- Звук кнопка -----
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    playClick();
});

// ----- Игровая логика -----
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let cellSize = 40;
let gameInterval = null;

let gameState = {
    map: [],
    mapWidth: 12,
    mapHeight: 12,
    playerId: 0,
    bots: [],
    currentTurn: 'player', // 'player' или 'bot'
    selectedCell: null,
    difficulty: 'medium'
};

// Инициализация игры с параметрами
function initGame(botCount, mapSize, difficulty) {
    gameState.mapWidth = mapSize;
    gameState.mapHeight = mapSize;
    gameState.bots = Array.from({ length: botCount }, (_, i) => i + 1);
    gameState.selectedCell = null;
    gameState.currentTurn = 'player';
    gameState.difficulty = difficulty;

    // Пересчёт размера клетки
    const maxCellSize = Math.min(60, Math.floor(window.innerWidth / gameState.mapWidth) - 2);
    cellSize = Math.max(25, maxCellSize);

    // Создаём карту
    const map = Array(gameState.mapHeight).fill().map(() => Array(gameState.mapWidth).fill().map(() => ({ owner: -1, troops: 0 })));

    // Старт игрока в центре
    const startX = Math.floor(gameState.mapWidth / 2);
    const startY = Math.floor(gameState.mapHeight / 2);
    map[startY][startX] = { owner: gameState.playerId, troops: 100 };

    // Старт ботов на случайных свободных клетках
    for (let botId of gameState.bots) {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * gameState.mapWidth);
            const y = Math.floor(Math.random() * gameState.mapHeight);
            if (map[y][x].owner === -1) {
                map[y][x] = { owner: botId, troops: 80 };
                placed = true;
            }
        }
    }

    gameState.map = map;
    updatePlayerInfo();
}

// Отрисовка карты
function renderMap() {
    const w = gameState.mapWidth;
    const h = gameState.mapHeight;
    canvas.width = w * cellSize;
    canvas.height = h * cellSize;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = gameState.map[y][x];
            let color;
            if (cell.owner === gameState.playerId) color = '#4caf50';
            else if (cell.owner === -1) color = '#9e9e9e';
            else color = '#f44336';
            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
            ctx.fillStyle = '#000';
            ctx.font = `${Math.max(10, Math.floor(cellSize * 0.3))}px sans-serif`;
            ctx.fillText(cell.troops, x * cellSize + 4, y * cellSize + cellSize * 0.6);
        }
    }

    if (gameState.selectedCell) {
        const { x, y } = gameState.selectedCell;
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
    }
}

// Проверка соседства (4 направления)
function isAdjacent(x1, y1, x2, y2) {
    return (Math.abs(x1 - x2) + Math.abs(y1 - y2)) === 1;
}

// Атака из клетки (fromX, fromY) на (toX, toY)
function attack(fromX, fromY, toX, toY) {
    const attacker = gameState.map[fromY][fromX];
    const defender = gameState.map[toY][toX];

    if (attacker.owner !== gameState.playerId) return false;
    if (defender.owner === gameState.playerId) return false;

    const attackingTroops = Math.floor(attacker.troops / 2);
    if (attackingTroops <= 0) return false;

    if (defender.owner === -1) {
        defender.owner = gameState.playerId;
        defender.troops = attackingTroops;
        attacker.troops -= attackingTroops;
    } else {
        if (attackingTroops > defender.troops) {
            defender.owner = gameState.playerId;
            defender.troops = attackingTroops - defender.troops;
            attacker.troops -= attackingTroops;
        } else {
            defender.troops -= attackingTroops;
            attacker.troops -= attackingTroops;
        }
    }

    if (attacker.troops <= 0) {
        attacker.owner = -1;
        attacker.troops = 0;
    }

    updatePlayerInfo();
    renderMap();
    checkGameOver();
    return true;
}

// Ход бота (простой случайный)
function botTurn() {
    if (gameState.currentTurn !== 'bot') return;

    // Выбираем случайного бота, у которого есть клетки
    const aliveBots = gameState.bots.filter(botId => {
        for (let y = 0; y < gameState.mapHeight; y++) {
            for (let x = 0; x < gameState.mapWidth; x++) {
                if (gameState.map[y][x].owner === botId) return true;
            }
        }
        return false;
    });
    if (aliveBots.length === 0) {
        gameState.currentTurn = 'player';
        turnIndicator.textContent = 'Ваш ход';
        return;
    }

    const botId = aliveBots[Math.floor(Math.random() * aliveBots.length)];
    // Найти все клетки этого бота
    let botCells = [];
    for (let y = 0; y < gameState.mapHeight; y++) {
        for (let x = 0; x < gameState.mapWidth; x++) {
            if (gameState.map[y][x].owner === botId) {
                botCells.push({x, y});
            }
        }
    }
    if (botCells.length === 0) return;

    const randomCell = botCells[Math.floor(Math.random() * botCells.length)];
    const neighbors = getAdjacent(randomCell.x, randomCell.y).filter(n => {
        const cell = gameState.map[n.y][n.x];
        return cell.owner !== botId;
    });
    if (neighbors.length === 0) return;

    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
    // Атака бота (упрощённая)
    const attacker = gameState.map[randomCell.y][randomCell.x];
    const defender = gameState.map[target.y][target.x];
    const attackingTroops = Math.floor(attacker.troops / 2);
    if (attackingTroops <= 0) return;

    if (defender.owner === -1) {
        defender.owner = botId;
        defender.troops = attackingTroops;
        attacker.troops -= attackingTroops;
    } else if (defender.owner !== botId) {
        if (attackingTroops > defender.troops) {
            defender.owner = botId;
            defender.troops = attackingTroops - defender.troops;
            attacker.troops -= attackingTroops;
        } else {
            defender.troops -= attackingTroops;
            attacker.troops -= attackingTroops;
        }
    }
    if (attacker.troops <= 0) {
        attacker.owner = -1;
        attacker.troops = 0;
    }

    updatePlayerInfo();
    renderMap();
    checkGameOver();

    gameState.currentTurn = 'player';
    turnIndicator.textContent = 'Ваш ход';
    renderMap();
}

function getAdjacent(x, y) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    return dirs.map(d => ({x: x+d[0], y: y+d[1]})).filter(p => p.x>=0 && p.x<gameState.mapWidth && p.y>=0 && p.y<gameState.mapHeight);
}

// Проверка окончания игры
function checkGameOver() {
    const playerCells = countCells(gameState.playerId);
    if (playerCells === 0) {
        alert('💀 Вы проиграли!');
        endGame();
        return;
    }
    let anyBotAlive = false;
    for (let botId of gameState.bots) {
        if (countCells(botId) > 0) {
            anyBotAlive = true;
            break;
        }
    }
    if (!anyBotAlive) {
        alert('🏆 Победа! Вы захватили всю карту!');
        endGame();
        return;
    }
}

function countCells(ownerId) {
    let cnt = 0;
    for (let y = 0; y < gameState.mapHeight; y++) {
        for (let x = 0; x < gameState.mapWidth; x++) {
            if (gameState.map[y][x].owner === ownerId) cnt++;
        }
    }
    return cnt;
}

function updatePlayerInfo() {
    let totalTroops = 0;
    for (let y = 0; y < gameState.mapHeight; y++) {
        for (let x = 0; x < gameState.mapWidth; x++) {
            if (gameState.map[y][x].owner === gameState.playerId) {
                totalTroops += gameState.map[y][x].troops;
            }
        }
    }
    playerTroopsSpan.textContent = totalTroops;
}

// Завершение игры
function endGame() {
    if (gameInterval) clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
}

// Обработка кликов на canvas
canvas.addEventListener('click', (e) => {
    if (gameState.currentTurn !== 'player') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const x = Math.floor(mouseX / cellSize);
    const y = Math.floor(mouseY / cellSize);
    if (x < 0 || x >= gameState.mapWidth || y < 0 || y >= gameState.mapHeight) return;

    const cell = gameState.map[y][x];

    if (gameState.selectedCell === null) {
        if (cell.owner === gameState.playerId) {
            gameState.selectedCell = { x, y };
            renderMap();
        }
    } else {
        const from = gameState.selectedCell;
        if (isAdjacent(from.x, from.y, x, y)) {
            const success = attack(from.x, from.y, x, y);
            if (success) {
                // После атаки передаём ход ботам
                gameState.currentTurn = 'bot';
                turnIndicator.textContent = 'Ход ботов...';
                renderMap();
                setTimeout(() => botTurn(), 300);
            }
        }
        gameState.selectedCell = null;
        renderMap();
    }
});

// Автоматический прирост войск каждые 5 секунд
function growTroops() {
    for (let y = 0; y < gameState.mapHeight; y++) {
        for (let x = 0; x < gameState.mapWidth; x++) {
            const cell = gameState.map[y][x];
            if (cell.owner !== -1) {
                let increase = Math.floor(cell.troops * 0.1);
                if (increase < 5) increase = 5;
                cell.troops += increase;
                if (cell.troops > 500) cell.troops = 500;
            }
        }
    }
    updatePlayerInfo();
    renderMap();
}

// Запуск игры
function startGame() {
    const botCount = parseInt(botCountSlider.value);
    const mapSize = parseInt(mapSizeSelect.value);
    const difficulty = difficultySelect.value;

    initGame(botCount, mapSize, difficulty);
    renderMap();
    updatePlayerInfo();

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        if (gameState.currentTurn === 'player') {
            growTroops();
        } else {
            // Во время хода ботов войска тоже растут, чтобы не было зависания
            growTroops();
        }
    }, 5000);
}

// ----- Управление экранами -----
playBtn.addEventListener('click', () => {
    playClick();
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startGame();
});

backBtn.addEventListener('click', () => {
    playClick();
    if (gameInterval) clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
});

// Инициализация звука при первом клике
document.body.addEventListener('click', (e) => {
    if (!isAudioInitialized && e.target.closest('button')) {
        initAudio();
    }
}, { once: true });
document.body.addEventListener('touchstart', () => {
    if (!isAudioInitialized) initAudio();
}, { once: true });
