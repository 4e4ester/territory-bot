// ===== ИНИЦИАЛИЗАЦИЯ ИГРЫ =====

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎮 Territory War 2D - Starting...');
  
  // Прогресс загрузки
  const loadingProgress = document.getElementById('loading-progress');
  const loadingText = document.getElementById('loading-text');
  const loadingTip = document.getElementById('loading-tip');
  
  const tips = [
    'Окружите территорию врага для мгновенного захвата!',
    'Горы дают бонус к защите +50%',
    'Захватывайте города для большего дохода войск',
    'Не оставляйте границы без защиты!',
    'Атакуйте слабых соседей первыми!'
  ];
  
  let progress = 0;
  
  const updateProgress = (value, text) => {
    progress = value;
    loadingProgress.style.width = progress + '%';
    if (text) loadingText.textContent = text;
    if (tips[Math.floor(progress / 20)]) {
      loadingTip.textContent = tips[Math.floor(progress / 20)];
    }
  };
  
  try {
    // 1. Инициализация Telegram
    updateProgress(10, 'Подключение Telegram...');
    TelegramAPI.init();
    await sleep(200);
    
    // 2. Загрузка звуков
    updateProgress(30, 'Загрузка звуков...');
    SoundSystem.init();
    await sleep(200);
    
    // 3. Загрузка сохранений
    updateProgress(50, 'Загрузка прогресса...');
    GameStore.load();
    await sleep(200);
    
    // 4. Инициализация игры
    updateProgress(70, 'Подготовка игры...');
    Game.init();
    await sleep(200);
    
    // 5. Готово
    updateProgress(100, 'Готово!');
    await sleep(300);
    
    // Скрыть экран загрузки
    document.getElementById('loading-screen').classList.add('hidden');
    
    // Обновить статистику в меню
    updateStatsUI();
    
    console.log('✅ Game fully loaded!');
    
  } catch (error) {
    console.error('❌ Load error:', error);
    loadingText.textContent = 'Ошибка загрузки!';
    loadingTip.textContent = 'Перезагрузите страницу';
  }
});

// ===== UI ОБРАБОТЧИКИ МЕНЮ =====

document.addEventListener('DOMContentLoaded', () => {
  // Настройки
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      SoundSystem.play('click');
      TelegramAPI.haptic('selection');
      
      const parent = e.target.parentElement;
      parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const option = e.target.dataset.option;
      const value = e.target.dataset.value;
      
      if (option === 'size') {
        GameStore.setState({ 
          settings: { ...GameStore.getState().settings, mapSize: value } 
        });
      } else if (option === 'bots') {
        GameStore.setState({ 
          settings: { ...GameStore.getState().settings, botCount: parseInt(value) } 
        });
      } else if (option === 'diff') {
        GameStore.setState({ 
          settings: { ...GameStore.getState().settings, difficulty: value } 
        });
      } else if (option === 'style') {
        GameStore.setState({ 
          settings: { ...GameStore.getState().settings, style: value } 
        });
      }
    });
  });
  
  // Старт игры
  document.getElementById('start-game-btn')?.addEventListener('click', () => {
    SoundSystem.play('click');
    TelegramAPI.haptic('success');
    Game.startGame();
  });
  
  // Как играть
  document.getElementById('how-to-play-btn')?.addEventListener('click', () => {
    SoundSystem.play('click');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('how-to-play-screen').classList.remove('hidden');
  });
  
  // Статистика
  document.getElementById('stats-btn')?.addEventListener('click', () => {
    SoundSystem.play('click');
    updateStatsUI();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('stats-screen').classList.remove('hidden');
  });
  
  // Назад в меню
  document.getElementById('back-to-menu-btn')?.addEventListener('click', () => {
    SoundSystem.play('click');
    document.getElementById('how-to-play-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });
  
  document.getElementById('back-to-menu-btn-2')?.addEventListener('click', () => {
    SoundSystem.play('click');
    document.getElementById('stats-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });
  
  // Очистить статистику
  document.getElementById('clear-stats-btn')?.addEventListener('click', () => {
    SoundSystem.play('click');
    TelegramAPI.confirm('Очистить всю статистику?', (confirmed) => {
      if (confirmed) {
        GameStore.clearStats();
        updateStatsUI();
        SoundSystem.play('success');
      }
    });
  });
});

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatsUI() {
  const stats = GameStore.getState().stats;
  document.getElementById('stat-wins').textContent = stats.wins;
  document.getElementById('stat-losses').textContent = stats.losses;
  document.getElementById('stat-games').textContent = stats.gamesPlayed;
  document.getElementById('stat-turns').textContent = GameStore.getAverageTurns();
}

// ===== TELEGRAM MAIN BUTTON =====

GameStore.subscribe(state => {
  if (state.phase === 'action' && !state.gameOver) {
    TelegramAPI.showMainButton('✅ Завершить ход', () => {
      Game.endTurn();
    });
  } else {
    TelegramAPI.hideMainButton();
  }
});

// ===== ОБРАБОТКА ОШИБОК =====

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise:', e.reason);
});

console.log('🎮 Territory War 2D - Ready!');