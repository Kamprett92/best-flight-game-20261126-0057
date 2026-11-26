// audio.js — a tiny WebAudio engine: no audio files, just oscillators.
// A low hum whose pitch follows throttle and speed, a rising chime when a
// ring or beacon is collected, and a dull thud on a hard landing. Everything
// is guarded: audio only starts after the pilot presses a key or clicks,
// and the game plays fine muted or in a browser with no audio at all.

export function createAudio() {
  const api = {
    ctx: null,
    engine: null,
    engineGain: null,
    started: false,
    muted: false,
  };

  api.ensure = () => {
    if (api.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      api.ctx = new Ctx();
      // Engine hum: two detuned sawtooths through a low-pass filter.
      api.engine = api.ctx.createOscillator();
      api.engine.type = 'sawtooth';
      api.engine.frequency.value = 55;
      const osc2 = api.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 55 * 1.5;
      const filter = api.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      api.engineGain = api.ctx.createGain();
      api.engineGain.gain.value = 0;
      api.engine.connect(filter);
      osc2.connect(filter);
      filter.connect(api.engineGain);
      api.engineGain.connect(api.ctx.destination);
      api.engine.start();
      osc2.start();
      api._osc2 = osc2;
      api.started = true;
    } catch {
      api.started = false;
    }
  };

  api.update = (throttle, speed) => {
    if (!api.started || api.muted || !api.ctx) return;
    try {
      if (api.ctx.state === 'suspended') void api.ctx.resume();
      const f = 42 + throttle * 70 + speed * 0.35;
      api.engine.frequency.setTargetAtTime(f, api.ctx.currentTime, 0.1);
      if (api._osc2) api._osc2.frequency.setTargetAtTime(f * 1.5, api.ctx.currentTime, 0.1);
      api.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05, api.ctx.currentTime, 0.1);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  };

  api.beep = (freq = 880, dur = 0.18, type = 'sine', vol = 0.16) => {
    if (!api.started || api.muted || !api.ctx) return;
    try {
      const o = api.ctx.createOscillator();
      const g = api.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, api.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, api.ctx.currentTime + dur);
      o.connect(g);
      g.connect(api.ctx.destination);
      o.start();
      o.stop(api.ctx.currentTime + dur);
    } catch {
      // Ignore.
    }
  };

  api.chime = () => {
    api.beep(660, 0.12, 'sine', 0.14);
    setTimeout(() => api.beep(990, 0.2, 'sine', 0.14), 90);
  };

  // A short double-beep for warnings (stall, low fuel): distinct from the
  // cheerful chime so the pilot learns the difference by ear.
  api.warn = () => {
    api.beep(220, 0.12, 'square', 0.08);
    setTimeout(() => api.beep(220, 0.12, 'square', 0.08), 160);
  };

  api.thud = () => {
    api.beep(70, 0.3, 'triangle', 0.25);
  };

  return api;
}
