(function (CD) {
  // Synthesized blips only, no audio files. The AudioContext is created on
  // the first keypress because browsers block audio before a user gesture.
  function createAudio() {
    let ac = null;
    const api = { muted: false };

    api.unlock = function () {
      if (ac) return;
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (AC) ac = new AC();
    };

    api.toggleMute = function () {
      api.muted = !api.muted;
      return api.muted;
    };

    function tone(type, f0, f1, dur, vol = 0.15, delay = 0) {
      const t = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    function noise(dur, vol = 0.2, cutoff = 1800) {
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf;
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      g.gain.value = vol;
      src.connect(f).connect(g).connect(ac.destination);
      src.start();
    }

    api.play = function (event) {
      if (api.muted || !ac) return;
      switch (event.type) {
        case 'hit':
          noise(0.12, 0.35, 1400);
          tone('square', 180, 60, 0.12, 0.12);
          if (event.crit) tone('sawtooth', 660, 1320, 0.18, 0.1);
          break;
        case 'fizzle': tone('triangle', 140, 90, 0.15, 0.1); break;
        case 'block': tone('triangle', 900, 600, 0.06, 0.12); break;
        case 'whoosh': noise(0.08, 0.08, 3000); break;
        case 'special': tone('sawtooth', 220, 880, 0.25, 0.08); break;
        case 'cite': tone('sine', 880, 880, 0.1, 0.15); tone('sine', 1320, 1320, 0.15, 0.15, 0.1); break;
        case 'ko': tone('square', 440, 55, 0.8, 0.12); noise(0.3, 0.25, 800); break;
        case 'announce': tone('square', 330, 330, 0.12, 0.07); tone('square', 495, 495, 0.18, 0.07, 0.1); break;
      }
    };

    return api;
  }

  Object.assign(CD, { createAudio });
})(globalThis.CD = globalThis.CD || {});
