// ===== ИНИЦИАЛИЗАЦИЯ =====
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== ЗВУКОВОЙ ДВИЖОК =====
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.sounds = {};
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playCardDeal() {
        this.playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(600, 0.1, 'sine', 0.2), 50);
    }

    playCardFlip() {
        this.playTone(1000, 0.15, 'triangle', 0.3);
    }

    playChip() {
        this.playTone(1200, 0.08, 'sine', 0.2);
        setTimeout(() => this.playTone(1400, 0.08, 'sine', 0.2), 40);
    }

    playWin() {
        const notes = [523, 659, 784, 1046];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.3), i * 150);
        });
    }

    playLose() {
        const notes = [784, 659, 523, 392];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.4, 'sine', 0.2), i * 200);
        });
    }

    playButtonClick() {
        this.playTone(800, 0.05, 'sine', 0.15);
    }

    playRaise() {
        this.playTone(1000, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(1500, 0.15, 'square', 0.25), 100);
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

// ===== МЕНЕДЖЕР СТАТИСТИКИ =====
class StatsManager {
    constructor() {
        this.data = this.load();
    }

    load() {
        const saved = localStorage.getItem('pokerStats');
        return saved ? JSON.parse(saved) : {
            games: 0,
            wins: 0,
            losses: 0,
            biggestWin: 0,
            totalWon: 0,
            balance: 1000
        };
    }

    save() {
        localStorage.setItem('pokerStats', JSON.stringify(this.data));
    }

    addGame(won, amount) {
        this.data.games++;
        if (won) {
            this.data.wins++;
            if (amount > this.data.biggestWin) {
                this.data.biggestWin = amount;
            }
            this.data.totalWon += amount;
        } else {
            this.data.losses++;
        }
        this.save();
    }

    updateBalance(balance) {
        this.data.balance = balance;
        this.save();
    }

    getWinRate() {
        if (this.data.games === 0) return 0;
        return Math.round((this.data.wins / this.data.games) * 100);
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МЕНЕДЖЕРОВ =====
const soundManager = new SoundManager();
const vibrationManager = new VibrationManager();
const statsManager = new StatsManager();

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
    lastBetter: 'player'
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
    if (hidden) {
        el.className = 'card back';
    } else {
        el.className = `card ${card.color}`;
        el.innerText = `${card.value}${card.suit}`;
    }
    el.style.animationDelay = `${delay}ms`;
    container.appendChild(el);
    
    if (!hidden) {
        setTimeout(() => soundManager.playCardDeal(), delay);
    }
}

function renderPlayerCards() {
    const container = document.getElementById('player-cards');
    container.innerHTML = '';
    gameState.playerCards.forEach((card, i) => renderCard(card, container, false, i * 150));
}

function renderBotCards(hidden = true) {
    const container = document.getElementById('opponent-cards');
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
    // Сброс
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

    // Блайнды
    const smallBlind = 10;
    const bigBlind = 20;
    
    gameState.balance -= smallBlind;
    gameState.botBalance -= bigBlind;
    gameState.playerBet = smallBlind;
    gameState.botBet = bigBlind;
    gameState.pot = smallBlind + bigBlind;
    gameState.currentBet = bigBlind;

    // UI
    renderPlayerCards();
    renderBotCards(true);
    renderCommunityCards();
    updateUI();
    
    setStage('Префлоп');
    document.getElementById('hand-rank').innerText = '';
    hideActionBubbles();
    
    enableControls(true);
    showToast('Новая раздача!', 'info');
}

function setStage(name) {
    document.getElementById('stage-display').querySelector('.stage-text').innerText = name;
}

function updateUI() {
    document.getElementById('pot').innerText = gameState.pot;
    document.getElementById('player-balance').innerText = gameState.balance;
    document.getElementById('bot-balance').innerText = gameState.botBalance;
    
    // Обновляем слайдер
    const slider = document.getElementById('bet-slider');
    slider.max = Math.min(gameState.balance, gameState.pot * 2);
    slider.value = Math.min(50, slider.max);
    document.getElementById('bet-slider-value').innerText = slider.value;
    document.getElementById('confirm-bet-amount').innerText = slider.value;
}

function updateStatsDisplay() {
    document.getElementById('menu-balance').innerText = gameState.balance;
    document.getElementById('menu-wins').innerText = statsManager.data.wins;
    document.getElementById('menu-games').innerText = statsManager.data.games;
}

function enableControls(enabled) {
    const buttons = document.querySelectorAll('#game-controls .control-btn');
    buttons.forEach(btn => btn.disabled = !enabled);
}

// ===== ДЕЙСТВИЯ ИГРОКА =====
function playerAction(action) {
    if (gameState.playerFolded) return;

    soundManager.playButtonClick();
    vibrationManager.light();

    showActionBubble('player', action.toUpperCase());

    switch(action) {
        case 'fold':
            gameState.playerFolded = true;
            vibrationManager.error();
            setTimeout(() => {
                gameState.botBalance += gameState.pot;
                showResult(false, 0, 'Сброс');
            }, 1000);
            break;

        case 'check':
            if (gameState.currentBet > gameState.playerBet) {
                playerAction('call');
                return;
            }
            setTimeout(() => botTurn(), 800);
            break;

        case 'call':
            const callAmount = gameState.currentBet - gameState.playerBet;
            if (gameState.balance >= callAmount) {
                soundManager.playChip();
                gameState.balance -= callAmount;
                gameState.playerBet += callAmount;
                gameState.pot += callAmount;
                updateUI();
                setTimeout(() => botTurn(), 800);
            }
            break;
    }
}

function showBetSlider() {
    soundManager.playButtonClick();
    document.getElementById('bet-slider-container').style.display = 'block';
    document.getElementById('game-controls').style.display = 'none';
    document.getElementById('confirm-bet-btn').style.display = 'flex';
    
    // Обновляем значение при изменении
    document.getElementById('bet-slider').addEventListener('input', (e) => {
        document.getElementById('bet-slider-value').innerText = e.target.value;
        document.getElementById('confirm-bet-amount').innerText = e.target.value;
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

    soundManager.playRaise();
    vibrationManager.medium();
    
    gameState.balance -= toAdd;
    gameState.playerBet += toAdd;
    gameState.pot += toAdd;
    gameState.currentBet = gameState.playerBet;
    
    updateUI();
    
    document.getElementById('bet-slider-container').style.display = 'none';
    document.getElementById('game-controls').style.display = 'grid';
    document.getElementById('confirm-bet-btn').style.display = 'none';
    
    showActionBubble('player', `RAISE $${betAmount}`);
    
    setTimeout(() => botTurn(), 800);
}

// ===== ХОД БОТА =====
function botTurn() {
    enableControls(false);
    showActionBubble('bot', 'Думает...');

    setTimeout(() => {
        hideActionBubble('bot');
        
        // Умная логика бота
        const botHandStrength = evaluateHandStrength(gameState.botCards, gameState.communityCards);
        const random = Math.random();
        const callAmount = gameState.currentBet - gameState.botBet;
        
        let action = 'fold';
        
        // Сильная рука
        if (botHandStrength > 0.7) {
            if (random > 0.3 && gameState.botBalance >= 50) {
                action = 'raise';
            } else {
                action = 'call';
            }
        }
        // Средняя рука
        else if (botHandStrength > 0.4) {
            if (random > 0.5) {
                action = 'call';
            } else if (callAmount <= 20) {
                action = 'call';
            }
        }
        // Слабая рука
        else {
            if (callAmount <= 10 && random > 0.7) {
                action = 'call';
            }
        }
        
        // Если чек возможен
        if (callAmount === 0 && action !== 'raise') {
            action = 'check';
        }

        // Выполнение действия
        switch(action) {
            case 'fold':
                gameState.botFolded = true;
                showActionBubble('bot', 'FOLD');
                vibrationManager.success();
                setTimeout(() => {
                    gameState.balance += gameState.pot;
                    showResult(true, gameState.pot, 'Бот сбросил');
                }, 1000);
                return;
                
            case 'check':
                soundManager.playChip();
                showActionBubble('bot', 'CHECK');
                nextStage();
                break;
                
            case 'call':
                soundManager.playChip();
                gameState.botBalance -= callAmount;
                gameState.botBet += callAmount;
                gameState.pot += callAmount;
                showActionBubble('bot', `CALL $${callAmount}`);
                updateUI();
                nextStage();
                break;
                
            case 'raise':
                soundManager.playRaise();
                vibrationManager.medium();
                const raiseAmount = Math.floor(Math.random() * 50) + 30;
                const totalRaise = gameState.currentBet + raiseAmount;
                const toAdd = totalRaise - gameState.botBet;
                
                if (gameState.botBalance >= toAdd) {
                    gameState.botBalance -= toAdd;
                    gameState.botBet += toAdd;
                    gameState.pot += toAdd;
                    gameState.currentBet = gameState.botBet;
                    showActionBubble('bot', `RAISE $${raiseAmount}`);
                    updateUI();
                    enableControls(true);
                    showToast(`Бот поднял до $${gameState.currentBet}!`, 'info');
                } else {
                    // Олл-ин
                    gameState.pot += gameState.botBalance;
                    gameState.currentBet = gameState.botBet + gameState.botBalance;
                    gameState.botBalance = 0;
                    showActionBubble('bot', 'ALL-IN!');
                    updateUI();
                    enableControls(true);
                }
                break;
        }
    }, 1000 + Math.random() * 500);
}

// ===== ОЦЕНКА СИЛЫ РУКИ =====
function evaluateHandStrength(handCards, communityCards) {
    const allCards = [...handCards, ...communityCards];
    if (allCards.length < 5) return 0.3;
    
    const evaluation = evaluateHand(handCards, communityCards);
    
    // Нормализуем score к 0-1
    const normalized = Math.min(evaluation.score / 800, 1);
    return normalized;
}

// ===== ЭТАПЫ ИГРЫ =====
function nextStage() {
    switch(gameState.stage) {
        case 'preflop':
            gameState.stage = 'flop';
            gameState.communityCards.push(dealCard(gameState.deck));
            gameState.communityCards.push(dealCard(gameState.deck));
            gameState.communityCards.push(dealCard(gameState.deck));
            setStage('Флоп');
            soundManager.playCardDeal();
            break;

        case 'flop':
            gameState.stage = 'turn';
            gameState.communityCards.push(dealCard(gameState.deck));
            setStage('Тёрн');
            soundManager.playCardDeal();
            break;

        case 'turn':
            gameState.stage = 'river';
            gameState.communityCards.push(dealCard(gameState.deck));
            setStage('Ривер');
            soundManager.playCardDeal();
            break;

        case 'river':
            gameState.stage = 'showdown';
            setStage('Вскрытие');
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

    const playerRank = evaluateHand(gameState.playerCards, gameState.communityCards);
    const botRank = evaluateHand(gameState.botCards, gameState.communityCards);

    document.getElementById('hand-rank').innerText = playerRank.name;

    setTimeout(() => {
        let won = false;
        let amount = 0;
        let title = '';
        let subtitle = playerRank.name;

        if (playerRank.score > botRank.score) {
            won = true;
            amount = gameState.pot;
            gameState.balance += gameState.pot;
            title = 'ПОБЕДА!';
            soundManager.playWin();
            vibrationManager.success();
        } else if (playerRank.score < botRank.score) {
            won = false;
            amount = 0;
            title = 'ПОРАЖЕНИЕ';
            subtitle = botRank.name;
            soundManager.playLose();
            vibrationManager.error();
        } else {
            // Ничья
            won = true;
            amount = Math.floor(gameState.pot / 2);
            gameState.balance += amount;
            title = 'НИЧЬЯ!';
            subtitle = 'Разделен банк';
            soundManager.playChip();
        }

        statsManager.addGame(won && playerRank.score >= botRank.score, amount);
        updateUI();
        updateStatsDisplay();
        
        showResult(won && playerRank.score >= botRank.score, amount, subtitle, title);
    }, 1500);
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
    
    // Проверка стрита
    const uniqueValues = [...new Set(numericValues)];
    let hasStraight = false;
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
            hasStraight = true;
            break;
        }
    }
    // Особый случай: A-2-3-4-5
    if (uniqueValues.includes(12) && uniqueValues.includes(0) && uniqueValues.includes(1) && 
        uniqueValues.includes(2) && uniqueValues.includes(3)) {
        hasStraight = true;
    }

    let score = 0;
    let name = 'Старшая карта';

    if (hasFlush && hasStraight && maxCount >= 4) {
        score = 900;
        name = 'Стрит Флеш';
    } else if (maxCount === 4) {
        score = 800;
        name = 'Каре';
    } else if (maxCount === 3 && counts[1] >= 2) {
        score = 700;
        name = 'Фулл Хаус';
    } else if (hasFlush) {
        score = 600;
        name = 'Флеш';
    } else if (hasStraight) {
        score = 500;
        name = 'Стрит';
    } else if (maxCount === 3) {
        score = 400;
        name = 'Сет';
    } else if (counts[0] === 2 && counts[1] === 2) {
        score = 300;
        name = 'Две пары';
    } else if (maxCount === 2) {
        score = 200;
        name = 'Пара';
    }

    // Бонус за старшие карты
    score += numericValues.filter(v => v >= 10).length * 5;

    return { score, name };
}

// ===== РЕЗУЛЬТАТ =====
function showResult(won, amount, subtitle, title = null) {
    const modal = document.getElementById('result-modal');
    const icon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    
    modal.className = 'result-modal active ' + (won ? 'win' : 'lose');
    icon.innerText = won ? '🏆' : '💔';
    resultTitle.innerText = title || (won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ');
    document.getElementById('result-subtitle').innerText = subtitle;
    document.getElementById('result-amount').innerText = won ? `+$${amount}` : '-$' + (gameState.currentBet || 20);
    
    statsManager.updateBalance(gameState.balance);
}

function closeResult() {
    document.getElementById('result-modal').classList.remove('active');
    soundManager.playButtonClick();
    
    if (gameState.balance <= 0) {
        showToast('Баланс пуст! Восстанавливаем...', 'info');
        gameState.balance = 1000;
        gameState.botBalance = 1000;
    }
    if (gameState.botBalance <= 0) {
        showToast('Бот банкрот! Начинаем заново...', 'info');
        gameState.balance = 1000;
        gameState.botBalance = 1000;
    }
    
    startNewRound();
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function showSettings() {
    soundManager.playButtonClick();
    document.getElementById('settings-modal').classList.add('active');
}

function hideSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function showStats() {
    soundManager.playButtonClick();
    document.getElementById('stats-games').innerText = statsManager.data.games;
    document.getElementById('stats-wins').innerText = statsManager.data.wins;
    document.getElementById('stats-losses').innerText = statsManager.data.losses;
    document.getElementById('stats-winrate').innerText = statsManager.getWinRate() + '%';
    document.getElementById('stats-biggest-win').innerText = '$' + statsManager.data.biggestWin;
    document.getElementById('stats-total-won').innerText = '$' + statsManager.data.totalWon;
    document.getElementById('stats-modal').classList.add('active');
}

function hideStats() {
    document.getElementById('stats-modal').classList.remove('active');
}

function showRules() {
    soundManager.playButtonClick();
    document.getElementById('rules-modal').classList.add('active');
}

function hideRules() {
    document.getElementById('rules-modal').classList.remove('active');
}

// ===== НАСТРОЙКИ =====
function toggleSound() {
    const enabled = soundManager.toggle();
    updateSoundIcon();
    showToast(enabled ? 'Звук включён' : 'Звук выключен', 'info');
}

function toggleSoundSetting() {
    soundManager.enabled = document.getElementById('sound-toggle').checked;
    updateSoundIcon();
}

function updateSoundIcon() {
    const onIcon = document.querySelector('.sound-on');
    const offIcon = document.querySelector('.sound-off');
    if (soundManager.enabled) {
        onIcon.style.display = 'block';
        offIcon.style.display = 'none';
    } else {
        onIcon.style.display = 'none';
        offIcon.style.display = 'block';
    }
}

function toggleVibrationSetting() {
    vibrationManager.enabled = document.getElementById('vibration-toggle').checked;
}

function changeTheme(theme) {
    document.body.className = 'theme-' + theme;
    showToast('Тема изменена', 'info');
}

// ===== УТИЛИТЫ =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerText = message;
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
    bubble.classList.add('show');
}

function hideActionBubble(who) {
    const id = who === 'player' ? 'player-action' : 'bot-action';
    document.getElementById(id).classList.remove('show');
}

function hideActionBubbles() {
    hideActionBubble('player');
    hideActionBubble('bot');
}

// ===== ЗАКРЫТИЕ МОДАЛОК ПО КЛИКУ =====
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ===== ОНЛАЙН СТАТУС (фейк для атмосферы) =====
setInterval(() => {
    const count = document.getElementById('online-count');
    if (count) {
        const current = parseInt(count.innerText.replace(',', ''));
        const change = Math.floor(Math.random() * 50) - 25;
        count.innerText = (current + change).toLocaleString();
    }
}, 5000);

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
window.addEventListener('load', () => {
    updateStatsDisplay();
    updateSoundIcon();
    
    // Показываем приветствие
    setTimeout(() => {
        showToast('Добро пожаловать в Poker Pro!', 'success');
    }, 500);
});
