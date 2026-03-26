const SoundSystem = {
  ctx: null,
  enabled: true,
  initialized: false,
  
  init() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (window.AudioContext) {
        this.ctx = new AudioContext();
        this.initialized = true;
        console.log('✅ Sound system initialized');
      } else {
        console.warn('⚠️ Web Audio API not supported');
        this.enabled = false;
      }
    } catch (e) {
      console.error('❌ Sound error:', e);
      this.enabled = false;
    }
  },
  
  play(type) {
    if (!this.enabled || !this.ctx || !this.initialized) return;
    
    try {
      const oscillator = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      const now = this.ctx.currentTime;
      
      switch(type) {
        case 'click':
          oscillator.frequency.setValueAtTime(800, now);
          oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          break;
          
        case 'select':
          oscillator.frequency.setValueAtTime(600, now);
          oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
          
        case 'attack':
          oscillator.frequency.setValueAtTime(200, now);
          oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;
          
        case 'capture':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523.25, now);
          oscillator.frequency.setValueAtTime(659.25, now + 0.1);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          oscillator.start(now);
          oscillator.stop(now + 0.4);
          break;
          
        case 'win':
          this.playWinSound();
          break;
          
        case 'lose':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(300, now);
          oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.5);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;
          
        case 'turn':
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.15);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
      }
    } catch (e) {
      console.error('Sound play error:', e);
    }
  },
  
  playWinSound() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;
    
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
      
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }
};

window.SoundSystem = SoundSystem;