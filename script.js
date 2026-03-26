// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Получаем элементы
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const playBtn = document.getElementById('play-btn');
const backBtn = document.getElementById('back-to-menu');
const botCountSlider = document.getElementById('bot-count');
const botCountSpan = document.getElementById('bot-count-value');
const soundToggle = document.getElementById('sound-toggle');
const mapSizeSelect = document.getElementById('map-size');
const difficultySelect = document.getElementById('difficulty');

// Звук (создаём аудиоконтекст по требованию)
let soundEnabled = true;
let clickSound = null;
let isAudioInitialized = false;

// Функция инициализации звука (вызывается при первом взаимодействии)
function initAudio() {
    if (isAudioInitialized) return;
    clickSound = new Audio();
    // Можно использовать короткий beep или создать через Web Audio
    // Простой вариант: создать звук через генератор
    try {
        // Создаём короткий "клик" с помощью Web Audio API
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
            oscillator.stop(audioCtx.currentTime + 0.1);
            // Сохраняем функцию для воспроизведения
            clickSound = () => {
                const newOsc = audioCtx.createOscillator();
                const newGain = audioCtx.createGain();
                newOsc.connect(newGain);
                newGain.connect(audioCtx.destination);
                newOsc.type = 'sine';
                newOsc.frequency.value = 880;
                newGain.gain.value = 0.1;
                newOsc.start();
                newGain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
                newOsc.stop(audioCtx.currentTime + 0.1);
            };
        } else {
            // Fallback: просто пустая функция
            clickSound = () => {};
        }
    } catch(e) {
        console.log('Audio not supported');
        clickSound = () => {};
    }
    isAudioInitialized = true;
}

// Воспроизведение клика (если звук включён)
function playClick() {
    if (soundEnabled && clickSound) {
        clickSound();
    }
}

// Обновление значения ползунка
botCountSlider.addEventListener('input', () => {
    botCountSpan.textContent = botCountSlider.value;
});

// Кнопка звука
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    playClick();
});

// Кнопка "Играть"
playBtn.addEventListener('click', () => {
    playClick();
    // Получаем настройки (пока только выводим в консоль, позже используем)
    const botCount = parseInt(botCountSlider.value);
    const mapSize = parseInt(mapSizeSelect.value);
    const difficulty = difficultySelect.value;
    console.log(`Запуск игры: ботов=${botCount}, карта=${mapSize}, сложность=${difficulty}`);
    
    // Переключаем экран на игровой (заглушка)
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
});

// Кнопка "Вернуться в меню"
backBtn.addEventListener('click', () => {
    playClick();
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
});

// Инициализация звука при первом клике на любую кнопку
document.body.addEventListener('click', (e) => {
    if (!isAudioInitialized && e.target.closest('button')) {
        initAudio();
    }
}, { once: true });

// Дополнительно: если пользователь тапнул где-то ещё, тоже можно инициализировать
document.body.addEventListener('touchstart', () => {
    if (!isAudioInitialized) initAudio();
}, { once: true });