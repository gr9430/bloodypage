const path = require('node:path');

// Loads src files (in dependency order) into globalThis.CD, the same way
// the browser's <script> tags do, and returns the namespace.
function load(...files) {
  for (const f of files) require(path.join(__dirname, '..', 'src', f + '.js'));
  return globalThis.CD;
}

module.exports = { load };

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
  return new Proxy(store, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'measureText') return (s) => ({ width: String(s).length * 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'fillText' || prop === 'strokeText') return (s) => { t.calls++; t.texts.push(String(s)); };
      return () => { t.calls++; };
    },
    set(t, prop, v) { t[prop] = v; return true; },
  });
}

module.exports.fakeCtx = fakeCtx;
