const test = require('node:test'); const assert = require('node:assert');
const { load, fakeCtx } = require('./helpers');
const CD = load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match', 'menu', 'render');

const POSES = ['idle', 'walk', 'jump', 'crouch', 'punch', 'kick', 'special', 'block', 'hurt', 'ko', 'win'];
const KINDS = ['stunZone', 'projectile', 'drop', 'burst', 'rush'];

function busyMatch(p1, p2) {
  const m = CD.createMatch(p1, p2);
  const [a, b] = m.fighters;
  for (const k of KINDS) m.effects.push(CD.spawnEffect(k, 0, a, b, { damage: 1, knockback: 1, name: 'X' }));
  m.assists.push(CD.createAssist('Gilles Deleuze', 0, a), CD.createAssist('Eve Tuck', 1, b));
  CD.pushRenderEvents([
    { type: 'hit', player: 0, x: 400, y: 300 }, { type: 'block', player: 1, x: 500, y: 300 },
    { type: 'cite', player: 0, text: 'See Gilles Deleuze!' }, { type: 'special', player: 1 }, { type: 'ko' },
  ]);
  return m;
}

test('renderMatch draws without throwing for every fighter pairing in every phase', () => {
  for (const p1 of CD.fighterIds) for (const p2 of CD.fighterIds) {
    const m = busyMatch(p1, p2);
    for (const phase of ['intro', 'fight', 'roundEnd', 'matchEnd']) {
      m.phase = phase; m.banner = phase === 'fight' ? null : 'ROUND 1';
      const ctx = fakeCtx();
      CD.renderMatch(ctx, m, 7);
      assert.ok(ctx.calls > 50);
    }
  }
});
test('HUD shows names, timer and next citation', () => {
  const m = busyMatch('foucault', 'chomsky');
  m.timer = 59 * 60 + 1;
  const ctx = fakeCtx();
  CD.renderMatch(ctx, m, 1);
  const all = ctx.texts.join('|');
  assert.ok(all.includes('MICHEL FOUCAULT'));
  assert.ok(all.includes('60'));
  assert.ok(all.includes('Next: Gilles Deleuze'));
  assert.ok(all.includes('See Gilles Deleuze!'));
});
test('drawFighterRig handles every pose for every look, including generic scholar looks', () => {
  const looks = CD.fighterIds.flatMap(id => [CD.FIGHTERS[id].look, CD.FIGHTERS[id].altLook]);
  looks.push(CD.resolveScholar('Eve Tuck').look, CD.resolveScholar('Sylvia Wynter').look);
  for (const look of looks) for (const pose of POSES) for (const facing of [1, -1]) {
    const ctx = fakeCtx();
    CD.drawFighterRig(ctx, look, 300, 470, facing, pose, 1);
    assert.ok(ctx.calls > 10, pose);
  }
});
test('poseFor maps fighter state to a pose', () => {
  const f = CD.createFighter(CD.FIGHTERS.foucault, 0, false);
  assert.strictEqual(CD.poseFor(f), 'idle');
  f.state = 'attack'; f.attack = { key: 'kick', frame: 1 };
  assert.strictEqual(CD.poseFor(f), 'kick');
  f.state = 'ko'; f.attack = null;
  assert.strictEqual(CD.poseFor(f), 'ko');
  f.state = 'idle'; f.blocking = true;
  assert.strictEqual(CD.poseFor(f), 'block');
});
test('keyLabel prettifies codes', () => {
  assert.strictEqual(CD.keyLabel('KeyF'), 'F');
  assert.strictEqual(CD.keyLabel('Semicolon'), ';');
  assert.strictEqual(CD.keyLabel('ArrowLeft'), '←');
});
test('renderSelect output includes every fighter and key label', () => {
  const ctx = fakeCtx();
  CD.renderSelect(ctx, { cursor: [0, 1], locked: [true, false] }, 3);
  const all = ctx.texts.join('|');
  for (const l of ['F', ';', '←', 'R', 'O', 'W A S D']) assert.ok(all.includes(l), l);
  for (const id of CD.fighterIds) assert.ok(all.toUpperCase().includes(CD.FIGHTERS[id].name.toUpperCase()));
});
test('renderWinner shows banner and win quote', () => {
  const m = CD.createMatch('ong', 'mcluhan');
  m.phase = 'matchEnd'; m.winner = 0; m.banner = 'WALTER ONG WINS THE ARGUMENT';
  const ctx = fakeCtx();
  CD.renderWinner(ctx, m, 5);
  const all = ctx.texts.join('|');
  assert.ok(all.includes('WALTER ONG WINS THE ARGUMENT'));
  assert.ok(all.includes(CD.FIGHTERS.ong.winQuote));
});

test('renderMenu shows the mode options', () => {
  const ctx = fakeCtx();
  const st = CD.createMenuState();
  CD.renderMenu(ctx, st, 1);
  const all = ctx.texts.join('|');
  for (const o of CD.MODE_OPTIONS) assert.ok(all.includes(o), o);
});
test('renderMenu shows the difficulty levels', () => {
  const ctx = fakeCtx();
  const st = CD.createMenuState(); st.screen = 'difficulty';
  CD.renderMenu(ctx, st, 1);
  const all = ctx.texts.join('|');
  for (const l of ['EASY', 'MEDIUM', 'HARD']) assert.ok(all.includes(l), l);
});
test('renderSelect labels the computer as CPU and shows the difficulty', () => {
  const ctx = fakeCtx();
  CD.renderSelect(ctx, { cursor: [0, 1], locked: [true, false] }, 3, 'hard');
  const all = ctx.texts.join('|');
  assert.ok(all.includes('CPU'));
  assert.ok(all.includes('HARD'));
  assert.ok(!all.includes('PLAYER 2'));
});
test('match HUD marks the computer side', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  m.cpu = 'easy';
  const ctx = fakeCtx();
  CD.renderMatch(ctx, m, 1);
  assert.ok(ctx.texts.join('|').includes('CPU · EASY'));
});
