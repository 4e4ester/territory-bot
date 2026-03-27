const TelegramAPI = {
  webApp: null,
  user: null,
  initialized: false,
  
  init() {
    if (window.Telegram && window.Telegram.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.webApp.ready();
      this.webApp.expand();
      this.webApp.enableClosingConfirmation();
      
      this.user = this.webApp.initDataUnsafe?.user || null;
      this.initialized = true;
      
      this.applyTheme();
      console.log('✅ Telegram API initialized');
      return true;
    }
    console.warn('⚠️ Telegram WebApp not available');
    return false;
  },
  
  applyTheme() {
    if (!this.webApp) return;
    
    const theme = this.webApp.themeParams;
    if (theme) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#0f0f1a');
      document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || 'rgba(15, 15, 30, 0.95)');
      document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#3b82f6');
      document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
    }
  },
  
  haptic(type) {
    if (this.webApp?.HapticFeedback) {
      const methods = {
        light: 'impactOccurred',
        medium: 'impactOccurred',
        heavy: 'impactOccurred',
        success: 'notificationOccurred',
        warning: 'notificationOccurred',
        error: 'notificationOccurred',
        selection: 'selectionChanged'
      };
      
      if (type === 'light' || type === 'medium' || type === 'heavy') {
        this.webApp.HapticFeedback.impactOccurred(type);
      } else if (type === 'success' || type === 'warning' || type === 'error') {
        this.webApp.HapticFeedback.notificationOccurred(type);
      } else if (type === 'selection') {
        this.webApp.HapticFeedback.selectionChanged();
      }
    }
  },
  
  showMainButton(text, callback) {
    if (this.webApp?.MainButton) {
      this.webApp.MainButton.setText(text);
      this.webApp.MainButton.show();
      this.webApp.MainButton.onClick(callback);
    }
  },
  
  hideMainButton() {
    if (this.webApp?.MainButton) {
      this.webApp.MainButton.hide();
      this.webApp.MainButton.offClick();
    }
  },
  
  showAlert(message) {
    if (this.webApp) {
      this.webApp.showAlert(message);
    } else {
      alert(message);
    }
  },
  
  confirm(message, callback) {
    if (this.webApp) {
      this.webApp.showConfirm(message, callback);
    } else {
      callback(confirm(message));
    }
  },
  
  close() {
    if (this.webApp) {
      this.webApp.close();
    }
  },
  
  shareLink(text, url) {
    if (this.webApp) {
      this.webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    }
  }
};

window.TelegramAPI = TelegramAPI;