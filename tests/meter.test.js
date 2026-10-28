const test = require('node:test'); const assert = require('node:assert');
const { load, input, toFight } = require('./helpers');
const CD = load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match');
const { CONFIG } = CD;

function pair(gap = 70) {
  const a = CD.createFighter(CD.FIGHTERS.foucault, 0, false), b = CD.createFighter(CD.FIGHTERS.chomsky, 1, false);
  a.x = 400; b.x = 400 + gap;
  return [a, b];
}

test('meter constants', () => {
  assert.strictEqual(CONFIG.meterMax, 100);
  assert.strictEqual(CONFIG.meterHit, 10);
  assert.strictEqual(CONFIG.meterCrit, 30);
});
test('fighters start with an empty special bar', () => {
  assert.strictEqual(CD.createFighter(CD.FIGHTERS.ong, 0, false).meter, 0);
});
test('special with a partly filled bar fizzles', () => {
  const [a, b] = pair(300);
  a.meter = 90;
  const ev = CD.updateFighter(a, input({ special: true }), b);
  assert.strictEqual(a.attack, null);
  assert.strictEqual(a.meter, 90);
  assert.ok(ev.some(e => e.type === 'fizzle' && e.player === 0));
});
test('special with a full bar fires and empties it', () => {
  const [a, b] = pair(300);
  a.meter = CONFIG.meterMax;
  CD.updateFighter(a, input({ special: true }), b);
  assert.strictEqual(a.attack.key, 'special');
  assert.strictEqual(a.meter, 0);
});
test('specials hit about twice as hard as before', () => {
  assert.strictEqual(CD.FIGHTERS.foucault.special.damage, 12);
  assert.strictEqual(CD.FIGHTERS.chomsky.special.damage, 18);
  assert.strictEqual(CD.FIGHTERS.mcluhan.special.damage, 24);
  assert.strictEqual(CD.FIGHTERS.ong.special.damage, 16);
});

// ----- critical hits -----
test('hitting someone mid-attack is a critical counter-hit for 1.5x damage', () => {
  const [a, b] = pair();
  b.state = 'attack'; b.attack = { key: 'kick', frame: 2, hasHit: false };
  assert.strictEqual(CD.applyHit(b, { damage: 6, knockback: 0, hitstun: 10, fromX: a.x }), 'crit');
  assert.strictEqual(b.hp, 91);
});
test('a lucky hit is critical; a blocked hit never is', () => {
  const [a, b] = pair();
  assert.strictEqual(CD.applyHit(b, { damage: 6, knockback: 0, hitstun: 10, fromX: a.x, lucky: true }), 'crit');
  const [c, d] = pair();
  d.blocking = true;
  assert.strictEqual(CD.applyHit(d, { damage: 6, knockback: 0, hitstun: 10, fromX: c.x, lucky: true }), 'block');
});
test('random crits follow the rng', () => {
  const always = () => 0, never = () => 0.99;
  let [a, b] = pair();
  CD.updateFighter(a, input({ attack: true }), b);
  for (let i = 0; i < 10; i++) { CD.updateFighter(a, input(), b); const ev = CD.applyHits(CD.findHits(a, b), always); if (ev.length) assert.strictEqual(ev[0].crit, true); }
  [a, b] = pair();
  CD.updateFighter(a, input({ attack: true }), b);
  for (let i = 0; i < 10; i++) { CD.updateFighter(a, input(), b); const ev = CD.applyHits(CD.findHits(a, b), never); if (ev.length) assert.strictEqual(ev[0].crit, false); }
  assert.ok(CONFIG.critChance > 0 && CONFIG.critChance <= 0.15);
});

// ----- building the bar in a match -----
function landPunch(m, attacker = 0) {
  const inputs = [input(), input()];
  inputs[attacker] = input({ attack: true });
  let ev = CD.stepMatch(m, inputs);
  for (let i = 0; i < 20; i++) ev = ev.concat(CD.stepMatch(m, [input(), input()]));
  return ev;
}
test('a landed hit adds meterHit to the attacker', () => {
  const m = CD.createMatch('foucault', 'chomsky', 1); toFight(m);
  m.fighters[0].x = 450; m.fighters[1].x = 520;
  m.rng = () => 0.99; // no random crits
  landPunch(m);
  assert.strictEqual(m.fighters[0].meter, 10);
  assert.strictEqual(m.fighters[1].meter, 0);
});
test('a blocked or missed attack adds nothing', () => {
  const m = CD.createMatch('foucault', 'chomsky', 1); toFight(m);
  m.fighters[0].x = 200; m.fighters[1].x = 700;
  landPunch(m);
  assert.strictEqual(m.fighters[0].meter, 0);
  m.fighters[0].x = 450; m.fighters[1].x = 520;
  CD.stepMatch(m, [input({ attack: true }), input({ right: true })]);
  for (let i = 0; i < 20; i++) CD.stepMatch(m, [input(), input({ right: true })]);
  assert.strictEqual(m.fighters[1].hp, 100, 'blocked');
  assert.strictEqual(m.fighters[0].meter, 0);
});
test('a critical hit adds meterCrit and the event says so', () => {
  const m = CD.createMatch('foucault', 'chomsky', 1); toFight(m);
  m.fighters[0].x = 450; m.fighters[1].x = 520;
  m.rng = () => 0; // every hit crits
  const ev = landPunch(m);
  assert.ok(ev.some(e => e.type === 'hit' && e.crit));
  assert.strictEqual(m.fighters[0].meter, 30);
});
test('the bar caps at meterMax', () => {
  const m = CD.createMatch('foucault', 'chomsky', 1); toFight(m);
  m.fighters[0].x = 450; m.fighters[1].x = 520; m.fighters[0].meter = 95;
  landPunch(m);
  assert.strictEqual(m.fighters[0].meter, 100);
});
test('special hits do not build meter, assist hits do', () => {
  const m = CD.createMatch('chomsky', 'foucault', 1); toFight(m);
  m.rng = () => 0.99;
  m.fighters[0].meter = 100;
  CD.stepMatch(m, [input({ special: true }), input()]);
  for (let i = 0; i < 80; i++) CD.stepMatch(m, [input(), input()]);
  assert.ok(m.fighters[1].hp < 100, 'special landed');
  assert.strictEqual(m.fighters[0].meter, 0);
  CD.stepMatch(m, [input({ cite: true }), input()]);
  for (let i = 0; i < 200; i++) CD.stepMatch(m, [input(), input()]);
  assert.strictEqual(m.fighters[0].meter, 10);
});
test('the bar carries over to the next round', () => {
  const m = CD.createMatch('foucault', 'chomsky', 1); toFight(m);
  m.fighters[0].meter = 70;
  m.fighters[1].hp = 0; m.fighters[1].state = 'ko';
  while (m.phase !== 'intro') CD.stepMatch(m, [input(), input()]);
  assert.strictEqual(m.round, 2);
  assert.strictEqual(m.fighters[0].meter, 70);
});
test('matches with the same seed play out the same', () => {
  const run = () => {
    const m = CD.createMatch('foucault', 'chomsky', 123); toFight(m);
    m.fighters[0].x = 450; m.fighters[1].x = 520;
    const out = [];
    for (let i = 0; i < 400; i++) for (const e of CD.stepMatch(m, [input({ attack: i % 15 === 0 }), input()])) out.push(e.type + (e.crit ? '!' : ''));
    return out.join(',');
  };
  assert.strictEqual(run(), run());
});
