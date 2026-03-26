// ===== ИНИЦИАЛИЗАЦИЯ =====
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== ЗВУКОВОЙ ДВИЖОК (MP3 файлы из папки sounds/) =====
class SoundManager {
    constructor() {
        this.enabled = true;
        this.sounds = {};
        this.preload();
    }

    preload() {
        const soundFiles = {
            card: 'sounds/card.mp3',
            chip: 'sounds/chip.mp3',
            win: 'sounds/win.mp3',
            lose: 'sounds/lose.mp3',
            click: 'sounds/click.mp3'
        };

        for (const [name, src] of Object.entries(soundFiles)) {
            this.sounds[name] = new Audio(src);
            this.sounds[name].volume = 0.4;
            this.sounds[name].preload = 'auto';
            this.sounds[name].load();
            
            this.sounds[name].addEventListener('canplaythrough', () => {
                console.log(`Звук загружен: ${name}`);
            });
            
            this.sounds[name].addEventListener('error', (e) => {
                console.warn(`Звук не загружен: ${name}`, e);
            });
        }
    }

    play(name) {
        if (!this.enabled) return;
        
        const sound = this.sounds[name];
        if (sound) {
            const clone = sound.cloneNode();
            clone.volume = sound.volume;
            clone.play().catch(() => {});
        }
    }

    playCardDeal() {
        this.play('card');
    }

    playCardFlip() {
        this.play('card');
    }

    playChip() {
        this.play('chip');
    }

    playWin() {
        this.play('win');
    }

    playLose() {
        this.play('lose');
    }

    playButtonClick() {
        this.play('click');
    }

    playRaise() {
        this.play('chip');
        setTimeout(() => this.play('click'), 100);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// ===== МЕНЕДЖЕР ВИБРАЦИИ =====
class VibrationManager {
    constructor() {
        this.enabled = true;
    }

    light() {
        if (this.enabled && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    medium() {
        if (this.enabled && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    heavy() {
        if (this.enabled && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('heavy');
        }
    }

    success() {
        if (this.enabled && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    error() {
        if (this.enabled && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// ===== УМНЫЙ ИИ БОТ =====
class BotAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.aggression = { easy: 0.3, medium: 0.5, hard: 0.7, expert: 0.85 };
        this.bluffChance = { easy: 0.1, medium: 0.2, hard: 0.35, expert: 0.5 };
        this.memory = { playerFolds: 0, playerRaises: 0, totalRounds: 0 };
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    evaluateHandStrength(handCards, communityCards) {
        const allCards = [...handCards, ...communityCards];
        const evaluation = evaluateHand(handCards, communityCards);
        let baseScore = evaluation.score / 900;
        const highCards = allCards.filter(c => c.numericValue >= 9).length;
        baseScore += highCards * 0.03;
        if (handCards.length === 2) {
            if (handCards[0].value === handCards[1].value) baseScore += 0.15;
            if (handCards.some(c => c.numericValue >= 10)) baseScore += 0.1;
        }
        return Math.min(baseScore, 1);
    }

    analyzePlayer(action) {
        this.memory.totalRounds++;
        if (action === 'fold') this.memory.playerFolds++;
        else if (action === 'raise') this.memory.playerRaises++;
    }

    getPlayerTendency() {
        if (this.memory.totalRounds < 3) return 'unknown';
        const foldRate = this.memory.playerFolds / this.memory.totalRounds;
        if (foldRate > 0.4) return 'passive';
        if (foldRate < 0.2) return 'aggressive';
        return 'normal';
    }

    decide(handCards, communityCards, gameState) {
        const handStrength = this.evaluateHandStrength(handCards, communityCards);
        const aggression = this.aggression[this.difficulty];
        const bluffChance = this.bluffChance[this.difficulty];
        const playerTendency = this.getPlayerTendency();
        const callAmount = gameState.currentBet - gameState.botBet;
        const random = Math.random();
        const shouldBluff = random < bluffChance && handStrength < 0.4;
        const effectiveStrength = shouldBluff ? 0.7 : handStrength;
        let adjustedAggression = aggression;
        if (playerTendency === 'passive') adjustedAggression += 0.15;
        else if (playerTendency === 'aggressive') adjustedAggression -= 0.1;

        let action = 'fold';
        if (effectiveStrength > 0.75) action = random > 0.3 ? 'raise' : 'call';
        else if (effectiveStrength > 0.55) action = random > (1 - adjustedAggression) ? 'raise' : 'call';
        else if (effectiveStrength > 0.35) {
            if (callAmount === 0) action = 'check';
            else if (random > (1 - adjustedAggression * 0.5)) action = 'call';
        } else {
            if (callAmount === 0) action = 'check';
            else if (shouldBluff && random > 0.5) action = 'raise';
            else if (callAmount < 20 && random > 0.7) action = 'call';
        }

        if (this.difficulty === 'expert' && gameState.pot > 500 && effectiveStrength > 0.5) action = 'raise';
        return { action, confidence: handStrength, handStrength };
    }

    calculateRaiseAmount(gameState, handStrength) {
        const baseRaise = Math.floor(gameState.pot * 0.5);
        const strengthMultiplier = handStrength * 2;
        const randomFactor = 0.8 + Math.random() * 0.4;
        let raise = Math.floor(baseRaise * strengthMultiplier * randomFactor);
        return Math.max(20, Math.min(raise, gameState.botBalance));
    }
}

// ===== МЕНЕДЖЕР СТАТИСТИКИ =====
class StatsManager {
    constructor() {
        this.data = this.load();
    }

    load() {
        const saved = localStorage.getItem('pokerProStats');
        return saved ? JSON.parse(saved) : {
            games: 0, wins: 0, losses: 0, draws: 0,
            biggestWin: 0, totalWon: 0, totalLost: 0,
            balance: 1000, xp: 0, level: 1, bestHand: '-',
            achievements: [],
            dailyBonus: { lastClaim: 0, streak: 0 }
        };
    }

    save() {
        localStorage.setItem('pokerProStats', JSON.stringify(this.data));
    }

    addGame(won, amount, handName) {
        this.data.games++;
        if (won > 0) {
            this.data.wins++;
            this.data.totalWon += amount;
            if (amount > this.data.biggestWin) this.data.biggestWin = amount;
            this.addXP(50);
        } else if (won < 0) {
            this.data.losses++;
            this.data.totalLost += Math.abs(amount);
        } else {
            this.data.draws++;
        }
        if (handName && this.data.bestHand === '-') this.data.bestHand = handName;
        this.checkAchievements();
        this.save();
    }

    addXP(amount) {
        this.data.xp += amount;
        const xpNeeded = this.data.level * 100;
        if (this.data.xp >= xpNeeded) {
            this.data.xp -= xpNeeded;
            this.data.level++;
            return true;
        }
        return false;
    }

    getWinRate() {
        if (this.data.games === 0) return 0;
        return Math.round((this.data.wins / this.data.games) * 100);
    }

    getProfit() {
        return this.data.totalWon - this.data.totalLost;
    }

    updateBalance(balance) {
        this.data.balance = balance;
        this.save();
    }

    checkAchievements() {
        const achievements = [
            { id: 'first_win', name: 'Первая победа', condition: () => this.data.wins >= 1, reward: 100 },
            { id: 'win_10', name: 'Десять побед', condition: () => this.data.wins >= 10, reward: 500 },
            { id: 'win_50', name: 'Пятидесяти побед', condition: () => this.data.wins >= 50, reward: 2000 },
            { id: 'big_win', name: 'Крупный выигрыш', condition: () => this.data.biggestWin >= 500, reward: 300 },
            { id: 'games_100', name: 'Опытный игрок', condition: () => this.data.games >= 100, reward: 1000 }
        ];
        achievements.forEach(ach => {
            if (!this.data.achievements.includes(ach.id) && ach.condition()) {
                this.data.achievements.push(ach.id);
                this.data.balance += ach.reward;
                showToast(`🏆 Достижение: ${ach.name}! +${ach.reward}$`, 'success');
            }
        });
    }

    checkDailyBonus() {
        const now = Date.now();
        const lastDay = this.data.dailyBonus.lastClaim;
        const dayMs = 24 * 60 * 60 * 1000;
        return now - lastDay >= dayMs;
    }

    claimDailyBonus() {
        const now = Date.now();
        const lastDay = this.data.dailyBonus.lastClaim;
        const dayMs = 24 * 60 * 60 * 1000;
        if (now - lastDay >= dayMs) {
            this.data.dailyBonus.streak++;
            this.data.dailyBonus.lastClaim = now;
            const bonus = 100 * this.data.dailyBonus.streak;
            this.data.balance += bonus;
            this.save();
            return bonus;
        }
        return 0;
    }
}

// ===== МЕНЕДЖЕР АНИМАЦИИ ФОНА =====
class BackgroundAnimation {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        this.init();
        this.animate();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        const particleCount = Math.floor(window.innerWidth / 15);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
            this.ctx.fill();
        });
        this.particles.forEach((p1, i) => {
            this.particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - dist / 100)})`;
                    this.ctx.stroke();
                }
            });
        });
        requestAnimationFrame(() => this.animate());
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МЕНЕДЖЕРОВ =====
const soundManager = new SoundManager();
const vibrationManager = new VibrationManager();
const statsManager = new StatsManager();
const botAI = new BotAI('medium');
let bgAnimation = null;

// ===== СОСТОЯНИЕ ИГРЫ =====
const gameState = {
    balance: statsManager.data.balance,
    botBalance: 1000,
    pot: 0,
    currentBet: 0,
    playerBet: 0,
    botBet: 0,
    playerCards: [],
    botCards: [],
    communityCards: [],
    stage: 'preflop',
    playerFolded: false,
    botFolded: false,
    deck: [],
    lastBetter: 'player',
    fastMode: false
};

// ===== КАРТЫ =====
const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ 
                suit, 
                value, 
                color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
                numericValue: valueOrder.indexOf(value)
            });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCard(deck) {
    return deck.pop();
}

// ===== ОТРИСОВКА =====
function renderCard(card, container, hidden = false, delay = 0) {
    const el = document.createElement('div');
    el.className = `card ${hidden ? 'card-back' : card.color} dealing`;
    if (!hidden) el.innerText = `${card.value}${card.suit}`;
    el.style.animationDelay = `${delay}ms`;
    container.appendChild(el);
    if (!hidden) setTimeout(() => soundManager.playCardDeal(), delay);
}

function renderPlayerCards() {
    const container = document.getElementById('player-cards');
    container.innerHTML = '';
    gameState.playerCards.forEach((card, i) => renderCard(card, container, false, i * 150));
}

function renderBotCards(hidden = true) {
    const container = document.getElementById('bot-cards');
    container.innerHTML = '';
    gameState.botCards.forEach((card, i) => renderCard(card, container, hidden, i * 150));
}

function renderCommunityCards() {
    const container = document.getElementById('community-cards');
    container.innerHTML = '';
    gameState.communityCards.forEach((card, i) => renderCard(card, container, false, i * 100));
}

// ===== УПРАВЛЕНИЕ ИГРОЙ =====
function startGame() {
    soundManager.playButtonClick();
    vibrationManager.light();
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-table').classList.add('active');
    document.getElementById('loading-screen').classList.remove('active');
    if (!bgAnimation) bgAnimation = new BackgroundAnimation();
    updateStatsDisplay();
    startNewRound();
}

function exitGame() {
    soundManager.playButtonClick();
    vibrationManager.light();
    document.getElementById('game-table').classList.remove('active');
    document.getElementById('main-menu').classList.add('active');
    statsManager.updateBalance(gameState.balance);
    updateStatsDisplay();
}

function startNewRound() {
    gameState.deck = shuffleDeck(createDeck());
    gameState.playerCards = [dealCard(gameState.deck), dealCard(gameState.deck)];
    gameState.botCards = [dealCard(gameState.deck), dealCard(gameState.deck)];
    gameState.communityCards = [];
    gameState.stage = 'preflop';
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.playerBet = 0;
    gameState.botBet = 0;
    gameState.playerFolded = false;
    gameState.botFolded = false;
    gameState.lastBetter = 'player';

    const smallBlind = 10, bigBlind = 20;
    gameState.balance -= smallBlind;
    gameState.botBalance -= bigBlind;
    gameState.playerBet = smallBlind;
    gameState.botBet = bigBlind;
    gameState.pot = smallBlind + bigBlind;
    gameState.currentBet = bigBlind;

    renderPlayerCards();
    renderBotCards(true);
    renderCommunityCards();
    updateUI();
    updateStage('preflop');
    document.getElementById('hand-name').innerText = '';
    document.getElementById('strength-fill').style.width = '0%';
    document.getElementById('strength-value').innerText = '0%';
    hideActionBubbles();
    clearActionLog();
    enableControls(true);
    addToLog('Новая раздача. Ваши карты сданы.');
    showToast('Новая раздача!', 'info');
}

function updateStage(stage) {
    const stages = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const names = ['ПРЕФЛОП', 'ФЛОП', 'ТЁРН', 'РИВЕР', 'ВСКРЫТИЕ'];
    document.querySelectorAll('.stage-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (stages.indexOf(stage) > i) dot.classList.add('completed');
        else if (stages.indexOf(stage) === i) dot.classList.add('active');
    });
    document.getElementById('stage-name').innerText = names[stages.indexOf(stage)];
}

function updateUI() {
    document.getElementById('pot-value').innerText = `${gameState.pot} $`;
    document.getElementById('player-chips').innerText = gameState.balance;
    document.getElementById('bot-chips').innerText = gameState.botBalance;
    const slider = document.getElementById('bet-slider');
    const maxBet = Math.min(gameState.balance, gameState.pot * 2 || 500);
    slider.max = maxBet;
    slider.value = Math.min(50, maxBet);
    document.getElementById('bet-max-value').innerText = maxBet;
    document.getElementById('bet-current-amount').innerText = `${slider.value} $`;
    document.getElementById('confirm-amount').innerText = slider.value;
    updateHandEvaluation();
}

function updateHandEvaluation() {
    if (gameState.communityCards.length >= 3) {
        const eval = evaluateHand(gameState.playerCards, gameState.communityCards);
        const strength = Math.min((eval.score / 900) * 100, 100);
        document.getElementById('hand-name').innerText = eval.name;
        document.getElementById('strength-fill').style.width = `${strength}%`;
        document.getElementById('strength-value').innerText = `${Math.round(strength)}%`;
        document.getElementById('hand-evaluation').classList.add('active');
    } else {
        document.getElementById('hand-evaluation').classList.remove('active');
    }
}

function updateStatsDisplay() {
    document.getElementById('menu-balance').innerText = statsManager.data.balance;
    document.getElementById('menu-wins').innerText = statsManager.data.wins;
    document.getElementById('menu-winrate').innerText = statsManager.getWinRate() + '%';
    document.getElementById('player-level').innerText = statsManager.data.level;
    document.getElementById('xp-current').innerText = statsManager.data.xp;
    document.getElementById('xp-max').innerText = statsManager.data.level * 100;
    document.getElementById('xp-fill').style.width = `${(statsManager.data.xp / (statsManager.data.level * 100)) * 100}%`;
}

function enableControls(enabled) {
    document.querySelectorAll('#action-buttons .action-btn').forEach(btn => btn.disabled = !enabled);
}

// ===== ДЕЙСТВИЯ ИГРОКА =====
function playerAction(action) {
    if (gameState.playerFolded) return;
    soundManager.playButtonClick();
    vibrationManager.light();
    showActionBubble('player', action.toUpperCase());
    botAI.analyzePlayer(action);

    switch(action) {
        case 'fold':
            gameState.playerFolded = true;
            vibrationManager.error();
            addToLog('Вы сбросили карты');
            setTimeout(() => {
                gameState.botBalance += gameState.pot;
                statsManager.addGame(-1, 0, null);
                showResult(false, 0, 'Сброс');
            }, gameState.fastMode ? 500 : 1000);
            break;
        case 'check':
            if (gameState.currentBet > gameState.playerBet) { playerAction('call'); return; }
            addToLog('Вы сделали чек');
            setTimeout(() => botTurn(), gameState.fastMode ? 300 : 800);
            break;
        case 'call':
            const callAmount = gameState.currentBet - gameState.playerBet;
            if (gameState.balance >= callAmount) {
                soundManager.playChip();
                gameState.balance -= callAmount;
                gameState.playerBet += callAmount;
                gameState.pot += callAmount;
                addToLog(`Вы уравняли ${callAmount}$`);
                updateUI();
                setTimeout(() => botTurn(), gameState.fastMode ? 300 : 800);
            }
            break;
    }
}

function showBetPanel() {
    soundManager.playButtonClick();
    document.getElementById('bet-panel').classList.add('active');
    document.getElementById('action-buttons').style.display = 'none';
    document.getElementById('confirm-bet').classList.add('active');
    document.getElementById('bet-slider').addEventListener('input', (e) => {
        document.getElementById('bet-current-amount').innerText = `${e.target.value} $`;
        document.getElementById('confirm-amount').innerText = e.target.value;
    });
}

function placeBet() {
    const betAmount = parseInt(document.getElementById('bet-slider').value);
    const totalBet = gameState.currentBet + betAmount;
    const toAdd = totalBet - gameState.playerBet;
    if (toAdd > gameState.balance) {
        showToast('Недостаточно средств!', 'error');
        vibrationManager.error();
        return;
    }
    soundManager.playChip();
    vibrationManager.medium();
    gameState.balance -= toAdd;
    gameState.playerBet += toAdd;
    gameState.pot += toAdd;
    gameState.currentBet = gameState.playerBet;
    updateUI();
    document.getElementById('bet-panel').classList.remove('active');
    document.getElementById('action-buttons').style.display = 'grid';
    document.getElementById('confirm-bet').classList.remove('active');
    showActionBubble('player', `RAISE ${betAmount}$`);
    addToLog(`Вы подняли до ${gameState.currentBet}$`);
    setTimeout(() => botTurn(), gameState.fastMode ? 300 : 800);
}

// ===== ХОД БОТА =====
function botTurn() {
    enableControls(false);
    showActionBubble('bot', 'Думает...');
    document.getElementById('bot-status').classList.add('thinking');
    const thinkTime = gameState.fastMode ? 500 : (1000 + Math.random() * 1000);

    setTimeout(() => {
        document.getElementById('bot-status').classList.remove('thinking');
        hideActionBubble('bot');
        const decision = botAI.decide(gameState.botCards, gameState.communityCards, gameState);
        const { action } = decision;

        switch(action) {
            case 'fold':
                gameState.botFolded = true;
                showActionBubble('bot', 'FOLD');
                vibrationManager.success();
                addToLog('Бот сбросил карты');
                setTimeout(() => {
                    gameState.balance += gameState.pot;
                    statsManager.addGame(1, gameState.pot, null);
                    showResult(true, gameState.pot, 'Бот сбросил');
                }, gameState.fastMode ? 500 : 1000);
                return;
            case 'check':
                soundManager.playChip();
                showActionBubble('bot', 'CHECK');
                addToLog('Бот сделал чек');
                nextStage();
                break;
            case 'call':
                const callAmount = gameState.currentBet - gameState.botBet;
                soundManager.playChip();
                gameState.botBalance -= callAmount;
                gameState.botBet += callAmount;
                gameState.pot += callAmount;
                showActionBubble('bot', `CALL ${callAmount}$`);
                addToLog(`Бот уравнял ${callAmount}$`);
                updateUI();
                nextStage();
                break;
            case 'raise':
                soundManager.playChip();
                vibrationManager.medium();
                const raiseAmount = botAI.calculateRaiseAmount(gameState, decision.handStrength);
                const totalRaise = gameState.currentBet + raiseAmount;
                const toAdd = totalRaise - gameState.botBet;
                if (gameState.botBalance >= toAdd) {
                    gameState.botBalance -= toAdd;
                    gameState.botBet += toAdd;
                    gameState.pot += toAdd;
                    gameState.currentBet = gameState.botBet;
                    showActionBubble('bot', `RAISE ${raiseAmount}$`);
                    addToLog(`Бот поднял до ${gameState.currentBet}$`);
                    updateUI();
                    enableControls(true);
                    showToast(`Бот поднял до ${gameState.currentBet}$!`, 'warning');
                } else {
                    gameState.pot += gameState.botBalance;
                    gameState.currentBet = gameState.botBet + gameState.botBalance;
                    gameState.botBalance = 0;
                    showActionBubble('bot', 'ALL-IN!');
                    addToLog('Бот идёт ALL-IN!');
                    updateUI();
                    enableControls(true);
                }
                break;
        }
    }, thinkTime);
}

// ===== ЭТАПЫ ИГРЫ =====
function nextStage() {
    switch(gameState.stage) {
        case 'preflop':
            gameState.stage = 'flop';
            gameState.communityCards.push(dealCard(gameState.deck));
            gameState.communityCards.push(dealCard(gameState.deck));
            gameState.communityCards.push(dealCard(gameState.deck));
            updateStage('flop');
            soundManager.playCardDeal();
            addToLog('Флоп: 3 карты на столе');
            break;
        case 'flop':
            gameState.stage = 'turn';
            gameState.communityCards.push(dealCard(gameState.deck));
            updateStage('turn');
            soundManager.playCardDeal();
            addToLog('Тёрн: 4 карта');
            break;
        case 'turn':
            gameState.stage = 'river';
            gameState.communityCards.push(dealCard(gameState.deck));
            updateStage('river');
            soundManager.playCardDeal();
            addToLog('Ривер: 5 карта');
            break;
        case 'river':
            gameState.stage = 'showdown';
            updateStage('showdown');
            showdown();
            return;
    }
    renderCommunityCards();
    gameState.playerBet = 0;
    gameState.botBet = 0;
    gameState.currentBet = 0;
    updateUI();
    enableControls(true);
}

// ===== ВСКРЫТИЕ =====
function showdown() {
    renderBotCards(false);
    soundManager.playCardFlip();
    vibrationManager.medium();
    addToLog('Вскрытие!');
    const playerRank = evaluateHand(gameState.playerCards, gameState.communityCards);
    const botRank = evaluateHand(gameState.botCards, gameState.communityCards);

    setTimeout(() => {
        let won = 0, amount = 0, title = '', subtitle = playerRank.name;
        if (playerRank.score > botRank.score) {
            won = 1; amount = gameState.pot; gameState.balance += gameState.pot;
            title = 'ПОБЕДА!';
            soundManager.playWin();
            vibrationManager.success();
            addToLog(`Вы выиграли с ${playerRank.name}!`);
        } else if (playerRank.score < botRank.score) {
            won = -1; amount = 0;
            title = 'ПОРАЖЕНИЕ'; subtitle = botRank.name;
            soundManager.playLose();
            vibrationManager.error();
            addToLog(`Бот выиграл с ${botRank.name}`);
        } else {
            won = 0; amount = Math.floor(gameState.pot / 2);
            gameState.balance += amount;
            title = 'НИЧЬЯ!'; subtitle = 'Разделен банк';
            soundManager.playChip();
            addToLog('Ничья! Банк разделён');
        }
        statsManager.addGame(won, won === 1 ? amount : -gameState.playerBet, playerRank.name);
        updateUI();
        updateStatsDisplay();
        showResult(won >= 0, won === 1 ? amount : 0, subtitle, title);
    }, gameState.fastMode ? 1000 : 2000);
}

// ===== ОЦЕНКА КОМБИНАЦИЙ =====
function evaluateHand(handCards, communityCards) {
    const allCards = [...handCards, ...communityCards];
    const values = allCards.map(c => c.value);
    const suits = allCards.map(c => c.suit);
    const numericValues = allCards.map(c => c.numericValue).sort((a, b) => b - a);
    const valueCount = {};
    values.forEach(v => valueCount[v] = (valueCount[v] || 0) + 1);
    const suitCount = {};
    suits.forEach(s => suitCount[s] = (suitCount[s] || 0) + 1);
    const counts = Object.values(valueCount).sort((a, b) => b - a);
    const maxCount = counts[0] || 0;
    const hasFlush = Object.values(suitCount).some(count => count >= 5);
    const uniqueValues = [...new Set(numericValues)];
    let hasStraight = false;
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i] - uniqueValues[i + 4] === 4) { hasStraight = true; break; }
    }
    if (uniqueValues.includes(12) && uniqueValues.includes(0) && uniqueValues.includes(1) && 
        uniqueValues.includes(2) && uniqueValues.includes(3)) hasStraight = true;

    let score = 0, name = 'Старшая карта';
    if (hasFlush && hasStraight && maxCount >= 4) { score = 900; name = 'Стрит Флеш'; }
    else if (maxCount === 4) { score = 800; name = 'Каре'; }
    else if (maxCount === 3 && counts[1] >= 2) { score = 700; name = 'Фулл Хаус'; }
    else if (hasFlush) { score = 600; name = 'Флеш'; }
    else if (hasStraight) { score = 500; name = 'Стрит'; }
    else if (maxCount === 3) { score = 400; name = 'Сет'; }
    else if (counts[0] === 2 && counts[1] === 2) { score = 300; name = 'Две пары'; }
    else if (maxCount === 2) { score = 200; name = 'Пара'; }
    score += numericValues.filter(v => v >= 10).length * 5;
    return { score, name };
}

// ===== РЕЗУЛЬТАТ =====
function showResult(won, amount, subtitle, title = null) {
    const modal = document.getElementById('result-modal');
    const icon = modal.querySelector('.trophy-icon');
    const resultTitle = document.getElementById('result-title');
    modal.classList.add('active', won ? 'win' : 'lose');
    icon.innerText = won ? '🏆' : '💔';
    resultTitle.innerText = title || (won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ');
    document.getElementById('result-hand').innerText = subtitle;
    document.getElementById('result-amount').innerText = won ? `+${amount} $` : `-${Math.abs(amount)} $`;
    document.getElementById('result-xp').innerText = won ? '+50 XP' : '+10 XP';
    if (won) createConfetti();
}

function closeResult() {
    document.getElementById('result-modal').classList.remove('active', 'win', 'lose');
    soundManager.playButtonClick();
    if (gameState.balance <= 0) {
        showToast('Баланс пуст! Восстанавливаем...', 'info');
        gameState.balance = 1000; gameState.botBalance = 1000;
    }
    if (gameState.botBalance <= 0) {
        showToast('Бот банкрот! Начинаем заново...', 'info');
        gameState.balance = 1000; gameState.botBalance = 1000;
    }
    startNewRound();
}

function createConfetti() {
    const container = document.getElementById('confetti');
    container.innerHTML = '';
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `position:absolute;width:10px;height:10px;background:hsl(${Math.random()*360},100%,50%);left:${Math.random()*100}%;top:-10px;animation:confettiFall ${1+Math.random()*2}s linear forwards;`;
        container.appendChild(confetti);
    }
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function showSettings() { soundManager.playButtonClick(); document.getElementById('settings-modal').classList.add('active'); }
function hideSettings() { document.getElementById('settings-modal').classList.remove('active'); }
function showStats() {
    soundManager.playButtonClick();
    document.getElementById('stats-games').innerText = statsManager.data.games;
    document.getElementById('stats-wins').innerText = statsManager.data.wins;
    document.getElementById('stats-winrate').innerText = statsManager.getWinRate() + '%';
    document.getElementById('stats-profit').innerText = (statsManager.getProfit() >= 0 ? '+' : '') + statsManager.getProfit() + '$';
    document.getElementById('stats-biggest-win').innerText = statsManager.data.biggestWin + '$';
    document.getElementById('stats-total-won').innerText = statsManager.data.totalWon + '$';
    document.getElementById('stats-total-lost').innerText = statsManager.data.totalLost + '$';
    document.getElementById('stats-best-hand').innerText = statsManager.data.bestHand;
    document.getElementById('stats-modal').classList.add('active');
}
function hideStats() { document.getElementById('stats-modal').classList.remove('active'); }

function showAchievements() {
    soundManager.playButtonClick();
    const achievements = [
        { id: 'first_win', name: 'Первая победа', desc: 'Выиграть 1 игру', icon: '🥉' },
        { id: 'win_10', name: 'Десять побед', desc: 'Выиграть 10 игр', icon: '🥈' },
        { id: 'win_50', name: 'Пятидесяти побед', desc: 'Выиграть 50 игр', icon: '🥇' },
        { id: 'big_win', name: 'Крупный выигрыш', desc: 'Выиграть 500$ за раз', icon: '💰' },
        { id: 'games_100', name: 'Опытный игрок', desc: 'Сыграть 100 игр', icon: '🎯' }
    ];
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    let unlocked = 0;
    achievements.forEach(ach => {
        const isUnlocked = statsManager.data.achievements.includes(ach.id);
        if (isUnlocked) unlocked++;
        list.innerHTML += `<div class="achievement-item"><div class="achievement-icon">${ach.icon}</div><div class="achievement-info"><div class="achievement-name">${ach.name}</div><div class="achievement-desc">${ach.desc}</div></div><div class="achievement-status ${isUnlocked ? 'unlocked' : 'locked'}">${isUnlocked ? '✓' : '🔒'}</div></div>`;
    });
    document.getElementById('achievements-percent').innerText = Math.round((unlocked / achievements.length) * 100) + '%';
    document.getElementById('achievements-fill').style.width = `${(unlocked / achievements.length) * 100}%`;
    document.getElementById('achievements-modal').classList.add('active');
}
function hideAchievements() { document.getElementById('achievements-modal').classList.remove('active'); }

function showDailyBonus() {
    soundManager.playButtonClick();
    if (statsManager.checkDailyBonus()) document.getElementById('bonus-modal').classList.add('active');
    else showToast('Бонус уже получен сегодня!', 'info');
}
function hideDailyBonus() { document.getElementById('bonus-modal').classList.remove('active'); }
function claimBonus() {
    const bonus = statsManager.claimDailyBonus();
    soundManager.playWin();
    vibrationManager.success();
    showToast(`Получено ${bonus}$ бонуса!`, 'success');
    hideDailyBonus();
    updateStatsDisplay();
}

function showHelp() { soundManager.playButtonClick(); document.getElementById('help-modal').classList.add('active'); }
function hideHelp() { document.getElementById('help-modal').classList.remove('active'); }

// ===== НАСТРОЙКИ =====
function toggleSound() {
    const enabled = soundManager.toggle();
    const icon = document.querySelector('#sound-btn i');
    icon.className = enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    showToast(enabled ? 'Звук включён' : 'Звук выключен', 'info');
}

// ===== УТИЛИТЫ =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showActionBubble(who, text) {
    const id = who === 'player' ? 'player-action' : 'bot-action';
    const bubble = document.getElementById(id);
    bubble.innerText = text;
    bubble.className = `player-action show ${text.toLowerCase()}`;
}
function hideActionBubble(who) { document.getElementById(who === 'player' ? 'player-action' : 'bot-action').classList.remove('show'); }
function hideActionBubbles() { hideActionBubble('player'); hideActionBubble('bot'); }

function addToLog(message) {
    const log = document.getElementById('action-log');
    const entry = document.createElement('div');
    entry.innerText = message;
    log.prepend(entry);
    if (log.children.length > 3) log.removeChild(log.lastChild);
}
function clearActionLog() { document.getElementById('action-log').innerHTML = ''; }

function joinTournament() { showToast('Турниры скоро будут доступны!', 'info'); }

// ===== ЗАКРЫТИЕ МОДАЛОК =====
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => { e.target.closest('.modal').classList.remove('active'); });
});

// ===== НАСТРОЙКИ ИЗ МОДАЛКИ =====
document.getElementById('sound-toggle').addEventListener('change', (e) => { soundManager.enabled = e.target.checked; });
document.getElementById('vibration-toggle').addEventListener('change', (e) => { vibrationManager.enabled = e.target.checked; });
document.getElementById('theme-select').addEventListener('change', (e) => { document.body.className = 'theme-' + e.target.value; showToast('Тема изменена', 'info'); });
document.getElementById('difficulty-select').addEventListener('change', (e) => { botAI.setDifficulty(e.target.value); showToast(`Сложность: ${e.target.options[e.target.selectedIndex].text}`, 'info'); });
document.getElementById('fast-mode-toggle').addEventListener('change', (e) => { gameState.fastMode = e.target.checked; showToast(e.target.checked ? 'Быстрый режим включён' : 'Быстрый режим выключен', 'info'); });

// ===== БЫСТРЫЕ СТАВКИ =====
document.querySelectorAll('.quick-bet').forEach(btn => {
    btn.addEventListener('click', () => {
        const slider = document.getElementById('bet-slider');
        const percent = parseFloat(btn.dataset.percent);
        slider.value = Math.floor(parseInt(slider.max) * percent);
        document.getElementById('bet-current-amount').innerText = `${slider.value} $`;
        document.getElementById('confirm-amount').innerText = slider.value;
        soundManager.playButtonClick();
    });
});

// ===== ОНЛАЙН СТАТУС =====
setInterval(() => {
    const count = document.getElementById('online-count');
    if (count) {
        const current = parseInt(count.innerText.replace(',', ''));
        const change = Math.floor(Math.random() * 50) - 25;
        count.innerText = (current + change).toLocaleString();
    }
}, 5000);

// ===== ТАЙМЕР ТУРНИРА =====
function updateTournamentTimer() {
    const timer = document.getElementById('tournament-timer');
    if (!timer) return;
    let [hours, minutes, seconds] = timer.innerText.split(':').map(Number);
    seconds--;
    if (seconds < 0) { seconds = 59; minutes--; }
    if (minutes < 0) { minutes = 59; hours--; }
    if (hours < 0) { hours = 23; }
    timer.innerText = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}
setInterval(updateTournamentTimer, 1000);

// ===== ЗАГРУЗКА =====
window.addEventListener('load', () => {
    let progress = 0;
    const progressBar = document.getElementById('loading-bar');
    const percentText = document.getElementById('loading-percent');
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = `${progress}%`;
        percentText.innerText = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('loading-screen').classList.remove('active');
                document.getElementById('main-menu').classList.add('active');
                bgAnimation = new BackgroundAnimation();
                showToast('Добро пожаловать в Poker Pro!', 'success');
            }, 500);
        }
    }, 100);
    updateStatsDisplay();
});
