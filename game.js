// ===== ИНИЦИАЛИЗАЦИЯ =====
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== СОСТОЯНИЕ ИГРЫ =====
const gameState = {
    balance: 1000,
    botBalance: 1000,
    pot: 0,
    currentBet: 0,
    playerCards: [],
    botCards: [],
    communityCards: [],
    stage: 'preflop',
    playerFolded: false,
    botFolded: false,
    deck: []
};

// ===== КАРТЫ =====
const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ 
                suit, 
                value, 
                color: (suit === '♥' || suit === '♦') ? 'red' : 'black' 
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
function renderCard(card, container, hidden = false) {
    const el = document.createElement('div');
    if (hidden) {
        el.className = 'card back';
    } else {
        el.className = `card ${card.color}`;
        el.innerText = `${card.value}${card.suit}`;
    }
    container.appendChild(el);
}

function renderPlayerCards() {
    const container = document.getElementById('player-cards');
    container.innerHTML = '';
    gameState.playerCards.forEach(card => renderCard(card, container));
}

function renderBotCards(hidden = true) {
    const container = document.getElementById('opponent-cards');
    container.innerHTML = '';
    gameState.botCards.forEach(card => renderCard(card, container, hidden));
}

function renderCommunityCards() {
    const container = document.getElementById('community-cards');
    container.innerHTML = '';
    gameState.communityCards.forEach(card => renderCard(card, container));
}

// ===== УПРАВЛЕНИЕ ИГРОЙ =====
function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-table').style.display = 'flex';
    startNewRound();
}

function exitGame() {
    document.getElementById('game-table').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
    updateBalanceDisplay();
}

function startNewRound() {
    gameState.deck = shuffleDeck(createDeck());
    gameState.playerCards = [dealCard(gameState.deck), dealCard(gameState.deck)];
    gameState.botCards = [dealCard(gameState.deck), dealCard(gameState.deck)];
    gameState.communityCards = [];
    gameState.stage = 'preflop';
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.playerFolded = false;
    gameState.botFolded = false;

    // Блайнды
    const smallBlind = 10;
    const bigBlind = 20;
    gameState.balance -= smallBlind;
    gameState.botBalance -= bigBlind;
    gameState.pot = smallBlind + bigBlind;
    gameState.currentBet = bigBlind;

    renderPlayerCards();
    renderBotCards(true);
    renderCommunityCards();
    updateUI();
    
    document.getElementById('stage-display').innerText = 'Префлоп';
    document.getElementById('hand-rank').innerText = '';
    
    enableControls(true);
}

function updateUI() {
    document.getElementById('pot').innerText = gameState.pot;
    document.getElementById('player-balance').innerText = gameState.balance;
    document.getElementById('bot-balance').innerText = gameState.botBalance;
    document.getElementById('menu-balance').innerText = gameState.balance;
}

function updateBalanceDisplay() {
    document.getElementById('menu-balance').innerText = gameState.balance;
}

function enableControls(enabled) {
    const buttons = document.querySelectorAll('.control-btn');
    buttons.forEach(btn => btn.disabled = !enabled);
}

// ===== ДЕЙСТВИЯ ИГРОКА =====
function playerAction(action) {
    if (gameState.playerFolded) return;

    tg.HapticFeedback.impactOccurred('light');

    switch(action) {
        case 'fold':
            gameState.playerFolded = true;
            showMessage('Вы сбросили карты', 'lose');
            setTimeout(() => {
                gameState.botBalance += gameState.pot;
                endRound();
            }, 1500);
            break;

        case 'check':
            if (gameState.currentBet > 0) {
                playerAction('call');
                return;
            }
            botTurn();
            break;

        case 'call':
            const callAmount = gameState.currentBet;
            if (gameState.balance >= callAmount) {
                gameState.balance -= callAmount;
                gameState.pot += callAmount;
                updateUI();
                botTurn();
            }
            break;
    }
}

function showBetControls() {
    document.getElementById('bet-controls').style.display = 'flex';
    document.getElementById('game-controls').style.display = 'none';
}

function placeBet() {
    const betAmount = parseInt(document.getElementById('bet-amount').value);
    if (betAmount > gameState.balance) {
        tg.showAlert('Недостаточно средств!');
        return;
    }

    gameState.balance -= betAmount;
    gameState.pot += betAmount;
    gameState.currentBet = betAmount;
    updateUI();

    document.getElementById('bet-controls').style.display = 'none';
    document.getElementById('game-controls').style.display = 'flex';

    botTurn();
}

// ===== ХОД БОТА =====
function botTurn() {
    enableControls(false);

    setTimeout(() => {
        const random = Math.random();
        
        if (random < 0.2 && gameState.currentBet > 0) {
            gameState.botFolded = true;
            showMessage('Бот сбросил карты! Вы выиграли!', 'win');
            setTimeout(() => {
                gameState.balance += gameState.pot;
                endRound();
            }, 1500);
            return;
        } else if (random < 0.7) {
            if (gameState.currentBet > 0) {
                gameState.botBalance -= gameState.currentBet;
                gameState.pot += gameState.currentBet;
            }
        } else {
            const raiseAmount = Math.floor(Math.random() * 50) + 20;
            if (gameState.botBalance >= raiseAmount) {
                gameState.botBalance -= raiseAmount;
                gameState.pot += raiseAmount;
                gameState.currentBet = raiseAmount;
            }
        }

        updateUI();
        nextStage();
    }, 1000);
}

// ===== ЭТАПЫ ИГРЫ =====
function nextStage() {
    switch(gameState.stage) {
        case 'preflop':
            gameState.stage = 'flop';
            gameState.communityCards.push(dealCard(gameState.deck));
            gameState.communityCards.push(dealCard(gameState.deck));
            gameState.communityCards.push(dealCard(gameState.deck));
            document.getElementById('stage-display').innerText = 'Флоп';
            break;

        case 'flop':
            gameState.stage = 'turn';
            gameState.communityCards.push(dealCard(gameState.deck));
            document.getElementById('stage-display').innerText = 'Тёрн';
            break;

        case 'turn':
            gameState.stage = 'river';
            gameState.communityCards.push(dealCard(gameState.deck));
            document.getElementById('stage-display').innerText = 'Ривер';
            break;

        case 'river':
            gameState.stage = 'showdown';
            document.getElementById('stage-display').innerText = 'Вскрытие';
            showdown();
            return;
    }

    renderCommunityCards();
    enableControls(true);
}

// ===== ВСКРЫТИЕ =====
function showdown() {
    renderBotCards(false);

    const playerRank = evaluateHand(gameState.playerCards, gameState.communityCards);
    const botRank = evaluateHand(gameState.botCards, gameState.communityCards);

    document.getElementById('hand-rank').innerText = playerRank.name;

    setTimeout(() => {
        if (playerRank.score > botRank.score) {
            showMessage(`Вы выиграли! ${playerRank.name}`, 'win');
            gameState.balance += gameState.pot;
        } else if (playerRank.score < botRank.score) {
            showMessage(`Бот выиграл! ${botRank.name}`, 'lose');
            gameState.botBalance += gameState.pot;
        } else {
            showMessage('Ничья!', 'win');
            gameState.balance += Math.floor(gameState.pot / 2);
            gameState.botBalance += Math.floor(gameState.pot / 2);
        }

        updateUI();
        setTimeout(endRound, 2000);
    }, 1000);
}

// ===== ОЦЕНКА КОМБИНАЦИЙ =====
function evaluateHand(handCards, communityCards) {
    const allCards = [...handCards, ...communityCards];
    const values = allCards.map(c => c.value);
    const suits = allCards.map(c => c.suit);

    const valueCount = {};
    values.forEach(v => valueCount[v] = (valueCount[v] || 0) + 1);

    const suitCount = {};
    suits.forEach(s => suitCount[s] = (suitCount[s] || 0) + 1);

    const maxCount = Math.max(...Object.values(valueCount));
    const hasFlush = Object.values(suitCount).some(count => count >= 5);

    let score = 0;
    let name = 'Старшая карта';

    if (hasFlush && maxCount >= 4) {
        score = 800;
        name = 'Каре';
    } else if (maxCount === 3 && Object.values(valueCount).includes(2)) {
        score = 700;
        name = 'Фулл Хаус';
    } else if (hasFlush) {
        score = 600;
        name = 'Флеш';
    } else if (maxCount === 4) {
        score = 500;
        name = 'Каре';
    } else if (maxCount === 3) {
        score = 400;
        name = 'Сет';
    } else if (Object.values(valueCount).filter(c => c === 2).length >= 2) {
        score = 300;
        name = 'Две пары';
    } else if (maxCount === 2) {
        score = 200;
        name = 'Пара';
    }

    score += values.filter(v => v === 'A').length * 10;
    score += values.filter(v => v === 'K').length * 9;

    return { score, name };
}

function endRound() {
    hideMessage();
    if (gameState.balance <= 0) {
        tg.showAlert('Игра окончена! Ваш баланс пуст.');
        gameState.balance = 1000;
        gameState.botBalance = 1000;
    }
    if (gameState.botBalance <= 0) {
        tg.showAlert('Вы обыграли бота! Начинаем заново.');
        gameState.balance = 1000;
        gameState.botBalance = 1000;
    }
    startNewRound();
}

// ===== СООБЩЕНИЯ =====
function showMessage(text, type = '') {
    const msg = document.getElementById('game-message');
    msg.innerText = text;
    msg.className = 'game-message ' + type;
    msg.style.display = 'block';
}

function hideMessage() {
    document.getElementById('game-message').style.display = 'none';
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function showRules() {
    document.getElementById('rules-modal').style.display = 'block';
}

function hideRules() {
    document.getElementById('rules-modal').style.display = 'none';
}

function showProfile() {
    tg.showAlert(`Ваш баланс: ${gameState.balance} $\nИгр сыграно: 0\nПобед: 0`);
}

// Закрытие модального окна по клику вне
document.getElementById('rules-modal').addEventListener('click', function(e) {
    if (e.target === this) hideRules();
});
