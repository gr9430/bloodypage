const test = require('node:test'); const assert = require('node:assert');
const { load, fakeTarget, fakeCtx } = require('./helpers');

// Boots the real page script against fake browser globals and drives it
// frame by frame with synthetic key presses.
const ctx = fakeCtx();
let frameCb = null, now = 0;
globalThis.window = fakeTarget();
globalThis.document = { getElementById: () => ({ getContext: () => ctx }) };
globalThis.requestAnimationFrame = (cb) => { frameCb = cb; };
globalThis.performance = { now: () => now };
load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match', 'ai', 'menu', 'render', 'audio', 'main');

function frames(n) {
  for (let i = 0; i < n; i++) { ctx.texts.length = 0; now += 1000 / 60; frameCb(now); }
}
function tap(code) {
  window.dispatch('keydown', { code }); frames(1); window.dispatch('keyup', { code }); frames(1);
}
const screenText = () => ctx.texts.join('|');

test('play a full match against the computer from the main menu', () => {
  frames(2);
  assert.ok(screenText().includes('1 PLAYER VS COMPUTER'));
  tap('KeyF');                       // vs computer
  assert.ok(screenText().includes('MEDIUM'));
  tap('KeyS'); tap('KeyF');          // hard
  assert.ok(screenText().includes('COMPUTER · HARD'));
  tap('KeyF'); tap('KeyF'); // P1 Foucault, CPU Chomsky (its cursor starts there)
  frames(40);
  assert.ok(screenText().includes('CPU · HARD'), 'fight HUD shows the CPU');
  // P1 stands still; the hard computer should win the match on its own.
  let won = false;
  for (let i = 0; i < 20000 && !won; i++) { frames(1); won = screenText().includes('NOAM CHOMSKY WINS THE ARGUMENT'); }
  assert.ok(won, 'computer won the match');
  frames(200);
  assert.ok(screenText().includes('Esc: main menu'));
  tap('Escape');
  assert.ok(screenText().includes('1 PLAYER VS COMPUTER'));
});
