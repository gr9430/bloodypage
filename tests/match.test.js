const test = require('node:test'); const assert = require('node:assert');
const { load, input, toFight } = require('./helpers');
const CD = load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match');
const { CONFIG } = CD;

const idle2 = () => [input(), input()];
function untilPhase(m, phase, inputsFn = idle2, max = 100000) {
  const events = [];
  for (let i = 0; i < max && m.phase !== phase; i++) events.push(...CD.stepMatch(m, inputsFn(i)));
  return events;
}

test('intro shows ROUND 1 then DEBATE! then fight', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  assert.strictEqual(m.phase, 'intro');
  const ev = toFight(m);
  const texts = ev.filter(e => e.type === 'announce').map(e => e.text);
  assert.deepStrictEqual(texts, ['ROUND 1', 'DEBATE!']);
  assert.strictEqual(m.phase, 'fight');
  assert.strictEqual(m.timer, CONFIG.roundTicks);
});
test('inputs ignored during intro and roundEnd', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  CD.stepMatch(m, [input({ attack: true, cite: true }), input()]);
  assert.strictEqual(m.fighters[0].attack, null);
  assert.strictEqual(m.assists.length, 0);
  toFight(m);
  m.fighters[1].hp = 1;
  m.fighters[1].state = 'ko'; m.fighters[1].hp = 0;
  CD.stepMatch(m, idle2());
  assert.strictEqual(m.phase, 'roundEnd');
  CD.stepMatch(m, [input({ attack: true }), input()]);
  assert.strictEqual(m.fighters[0].attack, null);
});
test('KO ends round and awards win', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  m.fighters[1].hp = 0; m.fighters[1].state = 'ko';
  const ev = CD.stepMatch(m, idle2());
  assert.strictEqual(m.roundResult, 0);
  assert.deepStrictEqual(m.wins, [1, 0]);
  assert.strictEqual(m.banner, 'K.O.');
  assert.ok(ev.some(e => e.type === 'ko'));
});
test('double KO is a draw', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  const [a, b] = m.fighters;
  a.x = 450; b.x = 520; a.hp = 1; b.hp = 1;
  const punch = [input({ attack: true }), input({ attack: true })];
  CD.stepMatch(m, punch);
  for (let i = 0; i < 10 && m.phase === 'fight'; i++) CD.stepMatch(m, idle2());
  assert.strictEqual(a.hp, 0); assert.strictEqual(b.hp, 0);
  assert.strictEqual(m.roundResult, 'draw');
  assert.deepStrictEqual(m.wins, [0, 0]);
  assert.strictEqual(m.banner, 'DRAW');
});
test('time out awards higher hp', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  m.fighters[0].hp = 40; m.fighters[1].hp = 60; m.timer = 1;
  const ev = CD.stepMatch(m, idle2());
  assert.strictEqual(m.roundResult, 1);
  assert.ok(ev.some(e => e.type === 'announce' && e.text === 'TIME!'));
});
test('time out with equal hp is DRAW', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  m.timer = 1;
  CD.stepMatch(m, idle2());
  assert.strictEqual(m.roundResult, 'draw');
  assert.strictEqual(m.banner, 'DRAW');
  assert.deepStrictEqual(m.wins, [0, 0]);
});
test('first to two wins ends match with "<NAME> WINS THE ARGUMENT"', () => {
  const m = CD.createMatch('mcluhan', 'ong');
  for (let r = 0; r < 2; r++) {
    toFight(m);
    m.fighters[0].hp = 0; m.fighters[0].state = 'ko';
    untilPhase(m, r === 0 ? 'intro' : 'matchEnd');
  }
  assert.strictEqual(m.phase, 'matchEnd');
  assert.strictEqual(m.winner, 1);
  assert.strictEqual(m.banner, 'WALTER ONG WINS THE ARGUMENT');
});
test('matchWinner', () => {
  assert.strictEqual(CD.matchWinner([2, 0], 2), 0);
  assert.strictEqual(CD.matchWinner([0, 2], 3), 1);
  assert.strictEqual(CD.matchWinner([1, 0], 3), 0);
  assert.strictEqual(CD.matchWinner([1, 1], 3), null);
  assert.strictEqual(CD.matchWinner([0, 0], 3), null);
  assert.strictEqual(CD.matchWinner([1, 1], 2), null);
  assert.strictEqual(CD.matchWinner([0, 1], 4), 1);
});
test('round 4 is sudden death', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  for (let r = 0; r < 3; r++) { toFight(m); m.timer = 1; untilPhase(m, 'intro'); }
  assert.strictEqual(m.round, 4);
  assert.strictEqual(m.banner, 'SUDDEN DEATH');
  toFight(m);
  m.fighters[0].hp = 0; m.fighters[0].state = 'ko';
  untilPhase(m, 'matchEnd');
  assert.strictEqual(m.winner, 1);
});
test('new round resets fighters, cooldowns, effects; keeps citation index', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  toFight(m);
  CD.stepMatch(m, [input({ cite: true }), input()]);
  assert.strictEqual(m.assists.length, 1);
  assert.ok(m.cites[0].cooldown > 0);
  m.fighters[1].hp = 0; m.fighters[1].state = 'ko';
  untilPhase(m, 'intro');
  assert.strictEqual(m.round, 2);
  assert.strictEqual(m.cites[0].cooldown, 0);
  assert.strictEqual(m.cites[0].index, 1);
  assert.strictEqual(m.assists.length, 0);
  assert.strictEqual(m.effects.length, 0);
  assert.strictEqual(m.fighters[1].hp, 100);
  assert.strictEqual(m.fighters[0].x, 300);
});
test('cite emits event and assist effect lands in the match', () => {
  const m = CD.createMatch('chomsky', 'foucault');
  toFight(m);
  const ev = CD.stepMatch(m, [input({ cite: true }), input()]);
  assert.ok(ev.some(e => e.type === 'cite' && e.text === 'See Edward Herman!'));
  untilPhase(m, 'never', idle2, 200);
  assert.ok(m.fighters[1].hp < 100);
});
test('special spawns its effect in the match', () => {
  const m = CD.createMatch('chomsky', 'foucault');
  toFight(m);
  m.fighters[0].meter = CD.CONFIG.meterMax;
  CD.stepMatch(m, [input({ special: true }), input()]);
  untilPhase(m, 'never', idle2, 100);
  assert.ok(m.fighters[1].hp < 100);
});
test('mirror match gives P2 altLook', () => {
  const m = CD.createMatch('mcluhan', 'mcluhan');
  assert.strictEqual(m.fighters[0].look, CD.FIGHTERS.mcluhan.look);
  assert.strictEqual(m.fighters[1].look, CD.FIGHTERS.mcluhan.altLook);
  assert.strictEqual(CD.createMatch('mcluhan', 'chomsky').fighters[1].look, CD.FIGHTERS.chomsky.look);
});
test('full scripted match completes', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  const max = 5 * (CONFIG.roundTicks + CONFIG.introTicks + CONFIG.roundEndTicks);
  untilPhase(m, 'matchEnd', (i) => [input({ right: true, attack: i % 20 === 0 }), input()], max);
  assert.strictEqual(m.phase, 'matchEnd');
  assert.strictEqual(m.winner, 0);
});
