const test = require('node:test'); const assert = require('node:assert');
const CD = require('./helpers').load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match', 'ai');

const input = (o = {}) => ({ ...CD.idleInput(), ...o });
const BUTTONS = ['jump', 'punch', 'kick', 'special', 'cite'];
function toFight(m) { while (m.phase === 'intro') CD.stepMatch(m, [input(), input()]); }

test('three difficulty levels exist', () => {
  assert.deepStrictEqual(CD.aiLevels, ['easy', 'medium', 'hard']);
});
test('ai returns a full InputFrame', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  const ai = CD.createAI(() => m, 1, 'medium', 1);
  assert.deepStrictEqual(Object.keys(ai.read()).sort(), Object.keys(CD.idleInput()).sort());
});
test('ai is idle outside the fight phase', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  const ai = CD.createAI(() => m, 1, 'hard', 1);
  for (let i = 0; i < 50; i++) assert.deepStrictEqual(ai.read(), CD.idleInput());
});
test('same seed gives the same inputs', () => {
  const run = () => {
    const m = CD.createMatch('foucault', 'chomsky'); toFight(m);
    const ai = CD.createAI(() => m, 1, 'medium', 42);
    const out = [];
    for (let i = 0; i < 300; i++) { const inp = ai.read(); out.push(JSON.stringify(inp)); CD.stepMatch(m, [input(), inp]); }
    return out;
  };
  assert.deepStrictEqual(run(), run());
});
test('ai walks toward a distant opponent', () => {
  for (const level of CD.aiLevels) {
    const m = CD.createMatch('foucault', 'chomsky'); toFight(m);
    const ai = CD.createAI(() => m, 1, level, 7);
    const x0 = m.fighters[1].x;
    for (let i = 0; i < 240; i++) CD.stepMatch(m, [input(), ai.read()]);
    assert.ok(m.fighters[1].x < x0 - 60, `${level} moved from ${x0} to ${m.fighters[1].x}`);
  }
});
test('ai buttons are presses, not holds', () => {
  const m = CD.createMatch('foucault', 'chomsky'); toFight(m);
  const ai = CD.createAI(() => m, 1, 'hard', 3);
  let prev = input();
  for (let i = 0; i < 600; i++) {
    const inp = ai.read();
    for (const b of BUTTONS) assert.ok(!(inp[b] && prev[b]), `${b} held two ticks in a row`);
    prev = inp;
    CD.stepMatch(m, [input(), inp]);
  }
});

// A scripted bully stands next to the AI and punches every 25 ticks.
function blockRate(level, seed) {
  const m = CD.createMatch('foucault', 'chomsky'); toFight(m);
  m.fighters[0].x = 420; m.fighters[1].x = 490;
  const ai = CD.createAI(() => m, 1, level, seed);
  let hits = 0, blocks = 0;
  for (let i = 0; i < 1500 && m.phase === 'fight'; i++) {
    const ev = CD.stepMatch(m, [input({ punch: i % 25 === 0, right: m.fighters[1].x - m.fighters[0].x > 75 }), ai.read()]);
    for (const e of ev) if (e.player === 0) { if (e.type === 'hit') hits++; if (e.type === 'block') blocks++; }
  }
  return blocks / Math.max(1, hits + blocks);
}
test('harder ai blocks more', () => {
  const avg = (level) => [1, 2, 3, 4, 5].reduce((s, seed) => s + blockRate(level, seed), 0) / 5;
  const easy = avg('easy'), medium = avg('medium'), hard = avg('hard');
  assert.ok(easy < 0.3, `easy ${easy}`);
  assert.ok(medium > easy + 0.1, `medium ${medium} vs easy ${easy}`);
  assert.ok(hard > 0.6, `hard ${hard}`);
});

function aiVsAi(l0, l1, seed) {
  const m = CD.createMatch('chomsky', 'chomsky');
  const a0 = CD.createAI(() => m, 0, l0, seed), a1 = CD.createAI(() => m, 1, l1, seed + 1000);
  for (let i = 0; i < 40000 && m.phase !== 'matchEnd'; i++) CD.stepMatch(m, [a0.read(), a1.read()]);
  return m.winner;
}
test('hard ai beats easy ai most of the time', () => {
  let hardWins = 0;
  for (let s = 1; s <= 6; s++) { if (aiVsAi('hard', 'easy', s) === 0) hardWins++; if (aiVsAi('easy', 'hard', s + 50) === 1) hardWins++; }
  assert.ok(hardWins >= 10, `hard won ${hardWins}/12`);
});
test('ai uses specials and citations on medium and hard', () => {
  for (const level of ['medium', 'hard']) {
    const m = CD.createMatch('foucault', 'chomsky'); toFight(m);
    const ai = CD.createAI(() => m, 1, level, 9);
    const types = new Set();
    for (let i = 0; i < 1800 && m.phase === 'fight'; i++) for (const e of CD.stepMatch(m, [input(), ai.read()])) if (e.player === 1) types.add(e.type);
    assert.ok(types.has('special'), level + ' special');
    assert.ok(types.has('cite'), level + ' cite');
  }
});
