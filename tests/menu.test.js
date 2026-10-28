const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster', 'input', 'menu');

// pressed() helper: the set of codes pressed this tick.
const press = (...codes) => (c) => codes.includes(c);
const none = press();
function step(st, ...codes) { return CD.stepMenu(st, press(...codes)); }

test('starts on mode screen with two options', () => {
  const st = CD.createMenuState();
  assert.strictEqual(st.screen, 'mode');
  assert.deepStrictEqual(CD.MODE_OPTIONS, ['1 PLAYER VS COMPUTER', '2 PLAYERS']);
});
test('2 players goes straight to character select', () => {
  const st = CD.createMenuState();
  step(st, 'KeyS'); step(st, 'KeyF');
  assert.strictEqual(st.screen, 'select');
  assert.strictEqual(st.cpu, null);
});
test('vs computer asks for difficulty, default medium', () => {
  const st = CD.createMenuState();
  step(st, 'Enter');
  assert.strictEqual(st.screen, 'difficulty');
  assert.strictEqual(CD.aiLevels[st.diffCursor], 'medium');
  step(st, 'KeyW'); step(st, 'KeyF');
  assert.strictEqual(st.cpu, 'easy');
  assert.strictEqual(st.screen, 'select');
});
test('Esc goes back a screen', () => {
  const st = CD.createMenuState();
  step(st, 'KeyF'); step(st, 'Escape');
  assert.strictEqual(st.screen, 'mode');
  step(st, 'KeyF'); step(st, 'KeyF'); step(st, 'Escape');
  assert.strictEqual(st.screen, 'difficulty');
});
test('vs computer: P1 picks own fighter, then the computer\'s', () => {
  const st = CD.createMenuState();
  step(st, 'KeyF'); step(st, 'ArrowDown'); step(st, 'KeyF'); // hard
  assert.strictEqual(st.cpu, 'hard');
  step(st, 'KeyD'); step(st, 'KeyD'); step(st, 'KeyF'); // P1: mcluhan
  assert.deepStrictEqual(st.sel.locked, [true, false]);
  step(st, 'KeyD'); step(st, 'KeyD'); // CPU cursor 1 -> 3 (ong)
  step(st, 'KeyK'); // P2 keys do nothing in cpu mode
  assert.deepStrictEqual(st.sel.locked, [true, false]);
  let start = step(st, 'KeyF');
  for (let i = 0; i < 40 && !start; i++) start = step(st);
  assert.deepStrictEqual(start, { p1: 'mcluhan', p2: 'ong', cpu: 'hard' });
});
test('vs computer: the special key undoes the last pick', () => {
  const st = CD.createMenuState();
  step(st, 'KeyF'); step(st, 'KeyF');
  step(st, 'KeyF'); step(st, 'KeyF');
  step(st, 'KeyG');
  assert.deepStrictEqual(st.sel.locked, [true, false]);
  step(st, 'KeyG');
  assert.deepStrictEqual(st.sel.locked, [false, false]);
});
test('2 players: each player locks their own pick', () => {
  const st = CD.createMenuState();
  step(st, 'KeyS'); step(st, 'Enter');
  step(st, 'KeyF'); step(st, 'ArrowRight'); step(st, 'KeyK');
  let start = null;
  for (let i = 0; i < 40 && !start; i++) start = step(st);
  assert.deepStrictEqual(start, { p1: 'foucault', p2: 'mcluhan', cpu: null });
});
test('Enter starts immediately once both are locked', () => {
  const st = CD.createMenuState();
  step(st, 'KeyS'); step(st, 'Enter');
  step(st, 'KeyF', 'KeyK');
  assert.ok(step(st, 'Enter'));
});
test('backToSelect unlocks picks but keeps mode and difficulty', () => {
  const st = CD.createMenuState();
  step(st, 'KeyF'); step(st, 'KeyF'); step(st, 'KeyF'); step(st, 'KeyF');
  CD.backToSelect(st);
  assert.strictEqual(st.screen, 'select');
  assert.strictEqual(st.cpu, 'medium');
  assert.deepStrictEqual(st.sel.locked, [false, false]);
});

test('pause menu options and navigation', () => {
  assert.deepStrictEqual(CD.PAUSE_OPTIONS, ['RESUME', 'RESTART MATCH', 'CHARACTER SELECT', 'MAIN MENU']);
  const p = CD.createPauseState();
  assert.strictEqual(CD.stepPause(p, press('KeyS')), null);
  assert.strictEqual(CD.stepPause(p, press('KeyF')), 'restart');
  const q = CD.createPauseState();
  CD.stepPause(q, press('ArrowUp'));
  assert.strictEqual(CD.stepPause(q, press('Enter')), 'main');
});
test('Escape or P resumes from the pause menu', () => {
  assert.strictEqual(CD.stepPause(CD.createPauseState(), press('Escape')), 'resume');
  assert.strictEqual(CD.stepPause(CD.createPauseState(), press('KeyP')), 'resume');
  const p = CD.createPauseState(); CD.stepPause(p, press('KeyS'));
  assert.strictEqual(CD.stepPause(p, press('KeyK')), 'restart');
});
