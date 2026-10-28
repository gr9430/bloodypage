const path = require('node:path');

// Loads src files (in dependency order) into globalThis.CD, the same way
// the browser's <script> tags do, and returns the namespace.
function load(...files) {
  for (const f of files) require(path.join(__dirname, '..', 'src', f + '.js'));
  return globalThis.CD;
}

// An InputFrame with nothing pressed except the given overrides.
function input(overrides = {}) {
  return { ...globalThis.CD.idleInput(), ...overrides };
}

// Steps a match through its intro so the fight has started; returns the events.
function toFight(m) {
  const events = [];
  while (m.phase === 'intro') events.push(...globalThis.CD.stepMatch(m, [input(), input()]));
  return events;
}

module.exports = { load, input, toFight };

// Minimal EventTarget stand-in for keyboard tests.
function fakeTarget() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter(f => f !== fn); },
    dispatch(type, props = {}) {
      const ev = { type, repeat: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
      for (const fn of listeners[type] || []) fn(ev);
      return ev;
    },
  };
}

module.exports.fakeTarget = fakeTarget;

// Canvas 2D context stand-in: every method is a no-op, properties are
// settable, and fillText/strokeText strings are recorded in ctx.texts.
function fakeCtx() {
  const store = { texts: [], calls: 0 };
  const gradient = { addColorStop() {} };
  // Built once per fake, not per method access.
  const methods = {
    measureText: (s) => ({ width: String(s).length * 10 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillText: (s) => { store.calls++; store.texts.push(String(s)); },
    strokeText: (s) => { store.calls++; store.texts.push(String(s)); },
  };
  const other = () => { store.calls++; };
  return new Proxy(store, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return methods[prop] || other;
    },
    set(t, prop, v) { t[prop] = v; return true; },
  });
}

module.exports.fakeCtx = fakeCtx;
