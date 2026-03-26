const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const playBtn = document.getElementById('play-btn');
const backBtn = document.getElementById('back-to-menu');

playBtn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    // Пока просто заглушка
    console.log('Запуск игры');
});

backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
});