const test = require('node:test'); const assert = require('node:assert');
const { load, input } = require('./helpers');
const CD = load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations');

const pair = () => [CD.createFighter(CD.FIGHTERS.foucault, 0, false), CD.createFighter(CD.FIGHTERS.chomsky, 1, false)];
const cs = () => CD.createCitationState(CD.FIGHTERS.foucault.citations);

test('cite cycles through list in order and wraps', () => {
  const [a] = pair(); const c = cs();
  const got = [];
  for (let i = 0; i < 4; i++) { got.push(CD.tryCite(c, a, input({ cite: true }))); c.cooldown = 0; }
  assert.deepStrictEqual(got, ['Gilles Deleuze', 'Friedrich Nietzsche', 'Judith Butler', 'Gilles Deleuze']);
});
test('nextCitation shows who is up', () => {
  const [a] = pair(); const c = cs();
  assert.strictEqual(CD.nextCitation(c), 'Gilles Deleuze');
  CD.tryCite(c, a, input({ cite: true }));
  assert.strictEqual(CD.nextCitation(c), 'Friedrich Nietzsche');
});
test('no cite without the button', () => {
  const [a] = pair();
  assert.strictEqual(CD.tryCite(cs(), a, input()), null);
});
test('cooldown blocks a second cite for 480 ticks', () => {
  const [a] = pair(); const c = cs();
  CD.tryCite(c, a, input({ cite: true }));
  assert.strictEqual(c.cooldown, 480);
  for (let i = 0; i < 479; i++) CD.tickCitation(c);
  assert.strictEqual(CD.tryCite(c, a, input({ cite: true })), null);
  CD.tickCitation(c);
  assert.strictEqual(CD.tryCite(c, a, input({ cite: true })), 'Friedrich Nietzsche');
});
test('cite cannot fire again while held during cooldown', () => {
  const [a] = pair(); const c = cs();
  let n = 0;
  for (let i = 0; i < 479; i++) { if (CD.tryCite(c, a, input({ cite: true }))) n++; CD.tickCitation(c); }
  assert.strictEqual(n, 1);
});
test('cannot cite while in hitstun or KO', () => {
  const [a] = pair();
  a.state = 'hitstun';
  assert.strictEqual(CD.tryCite(cs(), a, input({ cite: true })), null);
  a.state = 'ko';
  assert.strictEqual(CD.tryCite(cs(), a, input({ cite: true })), null);
});
test('cite text', () => {
  assert.strictEqual(CD.citeText('Gilles Deleuze'), 'See Gilles Deleuze!');
});
function runAssists(assists, fighters, ticks) {
  let effects = []; const events = [];
  for (let i = 0; i < ticks; i++) {
    const r = CD.updateAssists(assists, fighters);
    assists = r.assists; effects.push(...r.newEffects); events.push(...r.events);
  }
  return { assists, effects, events };
}
test('assist enters, spawns exactly one effect, exits, and is removed', () => {
  const [a, b] = pair();
  const as = CD.createAssist('Gilles Deleuze', 0, a);
  assert.ok(as.x < 0, 'enters from off-screen behind owner');
  assert.strictEqual(as.phase, 'enter');
  let r = runAssists([as], [a, b], 40);
  assert.strictEqual(r.effects.length, 1);
  assert.strictEqual(r.assists.length, 1);
  r = runAssists(r.assists, [a, b], 200);
  assert.strictEqual(r.effects.length, 0);
  assert.strictEqual(r.assists.length, 0);
});
test('assist effect can be blocked', () => {
  const [a, b] = pair();
  let assists = [CD.createAssist('Gilles Deleuze', 0, a)];
  let effects = []; const events = [];
  for (let i = 0; i < 200; i++) {
    CD.updateFighter(b, input({ right: true }), a);
    const r = CD.updateAssists(assists, [a, b]); assists = r.assists; effects.push(...r.newEffects);
    const e = CD.updateEffects(effects, [a, b]); effects = e.effects; events.push(...e.events);
  }
  assert.strictEqual(b.hp, 100);
  assert.ok(events.some(e => e.type === 'block'));
});
test('generic-name citation still produces a rush effect', () => {
  const [a, b] = pair();
  const r = runAssists([CD.createAssist('Eve Tuck', 0, a)], [a, b], 60);
  assert.strictEqual(r.effects.length, 1);
  assert.strictEqual(r.effects[0].kind, 'rush');
});
