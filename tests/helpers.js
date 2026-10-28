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
