// Ambiance sonore et bruitages, entièrement synthétisés avec la Web Audio API :
// aucun fichier audio, donc aucun droit d'auteur ni licence à gérer, et 0 ko à télécharger.
// Le son démarre au premier geste du joueur (règle des navigateurs) et le choix
// « son coupé » est mémorisé (touche M ou bouton haut-parleur).
import { load, save } from './Storage.js';

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // pentatonique de do (carillon)

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = !!load('muted', false);
    this.last = {};
    this.listeners = new Set();
    this.ambienceOn = false;
    this.duck = 1;
    // Premier geste du joueur : on crée le contexte audio (sinon le navigateur le bloque).
    const unlock = () => { this.unlock(); };
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else if (!this.muted) this.ctx.resume().catch(() => {});
    });
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.muted && !document.hidden) this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(c.destination);
    this.music = c.createGain();
    this.music.gain.value = 0.32;
    this.music.connect(this.master);
    this.sfx = c.createGain();
    this.sfx.gain.value = 0.55;
    this.sfx.connect(this.master);
    this.noise = this.makeNoise();
    if (this.wantAmbience) this.startAmbience();
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  setMuted(m) {
    this.muted = m;
    save('muted', m);
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, t, 0.05);
      if (!m) this.ctx.resume().catch(() => {});
    }
    this.listeners.forEach((fn) => fn(m));
  }

  toggleMute() { this.setMuted(!this.muted); }

  // Bruit brun (vagues, vent), généré une fois puis réutilisé en boucle.
  makeNoise() {
    const c = this.ctx;
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }

  // ---------- Ambiance : ressac + nappe grave + carillon de lanterne ----------
  startAmbience() {
    this.wantAmbience = true;
    if (!this.ctx || this.ambienceOn) return;
    this.ambienceOn = true;
    const c = this.ctx;
    const t = c.currentTime;
    const bus = c.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + 3);
    bus.connect(this.music);
    this.ambBus = bus;
    const nodes = [];

    // Ressac : bruit filtré, dont le volume ondule comme des vagues (LFO lent).
    const src = c.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const sea = c.createGain(); sea.gain.value = 0.35;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
    const lfoAmt = c.createGain(); lfoAmt.gain.value = 0.22;
    lfo.connect(lfoAmt).connect(sea.gain);
    src.connect(lp).connect(sea).connect(bus);
    src.start(); lfo.start();
    nodes.push(src, lfo);

    // Nappe : deux notes graves légèrement désaccordées (la et mi), filtre qui respire.
    const padF = c.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 380; padF.Q.value = 2;
    const padG = c.createGain(); padG.gain.value = 0.11;
    padF.connect(padG).connect(bus);
    [110, 110.6, 164.8].forEach((f) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      o.connect(padF); o.start(); nodes.push(o);
    });
    const fl = c.createOscillator(); fl.frequency.value = 0.05;
    const flAmt = c.createGain(); flAmt.gain.value = 160;
    fl.connect(flAmt).connect(padF.frequency); fl.start(); nodes.push(fl);
    this.ambNodes = nodes;

    // Carillon : une note douce au hasard toutes les 3 à 7 s.
    const chime = () => {
      if (!this.ambienceOn) return;
      this.tone(NOTES[Math.floor(Math.random() * NOTES.length)] / 2, 1.8, { type: 'sine', vol: 0.05, out: bus, attack: 0.3 });
      this.chimeTimer = setTimeout(chime, 3000 + Math.random() * 4000);
    };
    this.chimeTimer = setTimeout(chime, 2000);
  }

  stopAmbience(fade = 1.5) {
    this.wantAmbience = false;
    if (!this.ambienceOn) return;
    this.ambienceOn = false;
    clearTimeout(this.chimeTimer);
    const c = this.ctx; const t = c.currentTime;
    const bus = this.ambBus; const nodes = this.ambNodes;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } }); bus.disconnect(); }, fade * 1000 + 100);
  }

  // Baisse la musique (pause, choix de carte) sans la couper.
  setDucked(on) {
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(on ? 0.12 : 0.32, this.ctx.currentTime, 0.15);
  }

  // ---------- Briques de bruitage ----------
  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.005, out = this.sfx, delay = 0 } = {}) {
    const c = this.ctx; const t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  puff(dur, { freq = 1200, vol = 0.25, type = 'bandpass', delay = 0 } = {}) {
    const c = this.ctx; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 3, dur + 0.05);
  }

  // Bruitages nommés. minGap évite la bouillie sonore quand 30 créatures meurent d'un coup.
  play(name) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const gaps = { kill: 0.07, pickup: 0.05, hurt: 0.25 };
    const now = this.ctx.currentTime;
    if (gaps[name] && now - (this.last[name] ?? -1) < gaps[name]) return;
    this.last[name] = now;
    switch (name) {
      case 'kill': this.puff(0.18, { freq: 700 + Math.random() * 500, vol: 0.18 }); break;
      case 'pickup': this.tone(1300 + Math.random() * 300, 0.09, { type: 'sine', vol: 0.12, slide: 1.4 }); break;
      case 'hurt':
        this.tone(160, 0.22, { type: 'sawtooth', vol: 0.18, slide: 0.5 });
        this.puff(0.12, { freq: 300, vol: 0.25, type: 'lowpass' });
        break;
      case 'levelup': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.07 })); break;
      case 'chime': [880, 1318.5].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', vol: 0.14, delay: i * 0.08 })); break;
      case 'boss':
        this.tone(73.4, 1.4, { type: 'sawtooth', vol: 0.2, attack: 0.25, slide: 0.9 });
        this.tone(110, 1.4, { type: 'triangle', vol: 0.15, attack: 0.3 });
        break;
      case 'victory': [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.9, { type: 'triangle', vol: 0.16, delay: i * 0.12 })); break;
      case 'death': [392, 329.6, 261.6, 196].forEach((f, i) => this.tone(f, 0.6, { type: 'triangle', vol: 0.15, delay: i * 0.16 })); break;
      case 'click': this.tone(900, 0.05, { type: 'square', vol: 0.05 }); break;
      default: break;
    }
  }
}

export const SFX = new SoundSystem();
// Exposé pour les tests automatisés.
window.__SFX__ = SFX;
