/**
 * FoodMaxx Loud Notification Tones Studio
 * Pure Web Audio API synthesized audio profiles (zero external audio file dependencies)
 * Optimized to cut through noisy kitchen, POS, and busy outdoor environments.
 */

let sharedAudioCtx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// -------------------------------------------------------------
// 22 DISTINCT LOUD NOTIFICATION TONES
// -------------------------------------------------------------
export const NOTIFICATION_TONES = [
  {
    id: 'kitchen_bell',
    name: 'Kitchen Master Bell',
    category: 'Kitchen & POS',
    emoji: '🛎️',
    description: 'Resonant multi-harmonic brass chime (G5 -> C6 -> E6)',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const notes = [
        { freq: 783.99, delay: 0, dur: 0.6, v: 0.28 },
        { freq: 1046.50, delay: 0.13, dur: 0.75, v: 0.35 },
        { freq: 1318.51, delay: 0.26, dur: 0.9, v: 0.32 },
        { freq: 2093.00, delay: 0.30, dur: 0.6, v: 0.15 }
      ];
      notes.forEach(({ freq, delay, dur, v }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(v * vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    }
  },
  {
    id: 'pos_chime',
    name: 'POS Register Chime',
    category: 'Kitchen & POS',
    emoji: '📟',
    description: 'Crisp dual-frequency counter register ping',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [1174.66, 1760.00].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.35 * vol, now + idx * 0.1 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    }
  },
  {
    id: 'cash_register',
    name: 'Cha-Ching Register',
    category: 'Kitchen & POS',
    emoji: '💰',
    description: 'Metallic coins rattle followed by crisp bell ring',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      // Coin clatter
      [2400, 3100, 2800, 3600].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.2 * vol, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.08);
      });
      // High bell ring
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2093, now + 0.18);
      gain.gain.setValueAtTime(0.001, now + 0.18);
      gain.gain.linearRampToValueAtTime(0.38 * vol, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.18);
      osc.stop(now + 0.9);
    }
  },
  {
    id: 'air_horn',
    name: 'Stadium Air Horn',
    category: 'Sirens & Horns',
    emoji: '📯',
    description: 'Loud punchy double airhorn blast for noisy environments',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.22].forEach(blastDelay => {
        [466.16, 587.33, 739.99].forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + blastDelay);
          gain.gain.setValueAtTime(0.001, now + blastDelay);
          gain.gain.linearRampToValueAtTime(0.22 * vol, now + blastDelay + 0.02);
          gain.gain.setValueAtTime(0.20 * vol, now + blastDelay + 0.14);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + blastDelay + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + blastDelay);
          osc.stop(now + blastDelay + 0.18);
        });
      });
    }
  },
  {
    id: 'siren_pulse',
    name: 'Emergency Siren',
    category: 'Sirens & Horns',
    emoji: '🚨',
    description: 'Urgent dual frequency-sweep emergency siren',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(980, now + 0.18);
      osc.frequency.linearRampToValueAtTime(650, now + 0.36);
      osc.frequency.linearRampToValueAtTime(1050, now + 0.54);
      osc.frequency.linearRampToValueAtTime(700, now + 0.72);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3 * vol, now + 0.04);
      gain.gain.setValueAtTime(0.3 * vol, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.76);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.76);
    }
  },
  {
    id: 'dispatch_horn',
    name: 'Heavy Dispatch Horn',
    category: 'Sirens & Horns',
    emoji: '🚚',
    description: 'Resonant deep courier truck horn alert',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [220, 277.18, 329.63].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25 * vol, now + 0.03);
        gain.gain.setValueAtTime(0.22 * vol, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      });
    }
  },
  {
    id: 'radar_ping',
    name: 'Tactical Radar Ping',
    category: 'Digital & Tech',
    emoji: '📡',
    description: 'Piercing supersonic acoustic radar pulse with echo',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.22].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now + delay);
        osc.frequency.exponentialRampToValueAtTime(1200, now + delay + 0.2);
        gain.gain.setValueAtTime((idx === 0 ? 0.4 : 0.2) * vol, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.25);
      });
    }
  },
  {
    id: 'digital_beeps',
    name: 'Quad Digital Alarm',
    category: 'Digital & Tech',
    emoji: '⏰',
    description: '4 rapid high-frequency digital watch pulses',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.1, 0.2, 0.3].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2048, now + delay);
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.24 * vol, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.06);
      });
    }
  },
  {
    id: 'laser_strike',
    name: 'Sci-Fi Laser Strike',
    category: 'Digital & Tech',
    emoji: '⚡',
    description: 'Punchy retro laser zap with crisp acoustic impact',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.22);
      gain.gain.setValueAtTime(0.35 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  },
  {
    id: 'bike_bell',
    name: 'Courier Bike Bell',
    category: 'Bells & Chimes',
    emoji: '🚲',
    description: 'Double metallic courier bicycle bell ding-ding',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.12].forEach(delay => {
        [2093, 3135.96].forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.001, now + delay);
          gain.gain.linearRampToValueAtTime(0.25 * vol, now + delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.35);
        });
      });
    }
  },
  {
    id: 'boxing_gong',
    name: 'Boxing Ring Gong',
    category: 'Bells & Chimes',
    emoji: '🥊',
    description: 'Heavy resonant brass gong with deep acoustic decay',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [349.23, 440, 523.25, 698.46].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime((0.35 / (i + 1)) * vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    }
  },
  {
    id: 'marimba_rush',
    name: 'Marimba Arpeggio',
    category: 'Melodic & Musical',
    emoji: '🎶',
    description: 'Fast 5-note cheerful ascending wooden marimba run',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50]; // C5, E5, G5, B5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.32 * vol, now + idx * 0.07 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    }
  },
  {
    id: 'retro_arcade',
    name: '8-Bit Power-Up',
    category: 'Digital & Tech',
    emoji: '🕹️',
    description: 'Vintage arcade coin pickup fanfare',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const freqs = [440, 554.37, 659.25, 880];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.2 * vol, now + idx * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    }
  },
  {
    id: 'sonar_sweep',
    name: 'Submarine Sonar',
    category: 'Digital & Tech',
    emoji: '🌊',
    description: 'Deep resonant underwater acoustic pulse',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.5);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.38 * vol, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    }
  },
  {
    id: 'urgent_whistle',
    name: 'Referee Whistle',
    category: 'Sirens & Horns',
    emoji: '🎺',
    description: 'Sharp modulated dual-tone athletic whistle',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [2400, 2650].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.03);
        gain.gain.setValueAtTime(0.18 * vol, now + 0.28);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    }
  },
  {
    id: 'electric_fanfare',
    name: 'Royal Brass Fanfare',
    category: 'Melodic & Musical',
    emoji: '👑',
    description: 'Triumphant 4-note royal brass entrance fanfare',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      const fanfare = [
        { freq: 587.33, delay: 0, dur: 0.12 },     // D5
        { freq: 587.33, delay: 0.12, dur: 0.12 },  // D5
        { freq: 587.33, delay: 0.24, dur: 0.12 },  // D5
        { freq: 880.00, delay: 0.36, dur: 0.45 }   // A5
      ];
      fanfare.forEach(({ freq, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.24 * vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    }
  },
  {
    id: 'crystal_glass',
    name: 'Crystal Sparkle',
    category: 'Bells & Chimes',
    emoji: '💎',
    description: 'High-frequency glistening crystal glass chime',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [2793.83, 3135.96, 3520.00, 4186.01].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.28 * vol, now + idx * 0.05 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.6);
      });
    }
  },
  {
    id: 'nuclear_buzz',
    name: 'Industrial Buzzer',
    category: 'Sirens & Horns',
    emoji: '⚠️',
    description: 'Heavy square-wave industrial warehouse alert',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.18].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now + delay);
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.35 * vol, now + delay + 0.02);
        gain.gain.setValueAtTime(0.32 * vol, now + delay + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
    }
  },
  {
    id: 'doorbell_dingdong',
    name: 'Westminster Ding-Dong',
    category: 'Bells & Chimes',
    emoji: '🚪',
    description: 'Pleasant and loud classic dual-harmonic doorbell',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [
        { freq: 659.25, delay: 0, dur: 0.6 },     // E5 Ding
        { freq: 523.25, delay: 0.32, dur: 0.8 }   // C5 Dong
      ].forEach(({ freq, delay, dur }) => {
        [freq, freq * 2].forEach((f, fi) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + delay);
          gain.gain.setValueAtTime(0.001, now + delay);
          gain.gain.linearRampToValueAtTime((fi === 0 ? 0.35 : 0.12) * vol, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + dur);
        });
      });
    }
  },
  {
    id: 'space_invader',
    name: 'Space Warp Alert',
    category: 'Digital & Tech',
    emoji: '👾',
    description: 'Fast alternating twin sci-fi frequency pulses',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.08, 0.16, 0.24].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 980 : 1480, now + delay);
        gain.gain.setValueAtTime(0.28 * vol, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.07);
      });
    }
  },
  {
    id: 'megaphone_chirp',
    name: 'Megaphone Chirp',
    category: 'Sirens & Horns',
    emoji: '📢',
    description: 'Ultra high-penetration piercing outdoor chirp',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      [0, 0.14].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now + delay);
        osc.frequency.linearRampToValueAtTime(3200, now + delay + 0.08);
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.38 * vol, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    }
  },
  {
    id: 'staccato_alarm',
    name: 'Emergency Staccato',
    category: 'Sirens & Horns',
    emoji: '🔊',
    description: 'Rapid 6-strike urgent high-pitch dispatch burst',
    play: (ctx, vol = 1) => {
      const now = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const delay = i * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1760, now + delay);
        gain.gain.setValueAtTime(0.22 * vol, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.045);
      }
    }
  }
];

// -------------------------------------------------------------
// PLAYBACK & PREFERENCE HELPERS
// -------------------------------------------------------------
export function getSelectedToneId() {
  if (typeof window === 'undefined') return 'kitchen_bell';
  try {
    return localStorage.getItem('fmx_notification_tone') || 'kitchen_bell';
  } catch {
    return 'kitchen_bell';
  }
}

export function setSelectedToneId(toneId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('fmx_notification_tone', toneId);
    window.dispatchEvent(new CustomEvent('fmx_notification_tone_changed', { detail: toneId }));
  } catch {}
}

export function getToneVolumeMultiplier() {
  if (typeof window === 'undefined') return 1.0;
  try {
    const saved = localStorage.getItem('fmx_tone_volume');
    return saved ? Number(saved) : 1.0;
  } catch {
    return 1.0;
  }
}

export function setToneVolumeMultiplier(vol) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('fmx_tone_volume', String(vol));
  } catch {}
}

export function playToneById(toneId, customVol = null) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const tone = NOTIFICATION_TONES.find(t => t.id === toneId) || NOTIFICATION_TONES[0];
  const vol = customVol !== null ? customVol : getToneVolumeMultiplier();
  try {
    tone.play(ctx, vol);
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

export function playActiveNotificationTone() {
  if (typeof window === 'undefined') return;
  const soundEnabled = localStorage.getItem('fmx_admin_order_sound') !== 'false';
  if (!soundEnabled) return;
  const toneId = getSelectedToneId();
  playToneById(toneId);
}
