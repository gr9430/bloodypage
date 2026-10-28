const test = require('node:test'); const assert = require('node:assert');
const { load, fakeCtx } = require('./helpers');
const CD = load('config', 'roster', 'input', 'fighter', 'combat', 'effects', 'citations', 'match', 'menu', 'render');

const POSES = ['idle', 'walk', 'jump', 'crouch', 'punch', 'kick', 'special', 'block', 'hurt', 'ko', 'win', 'sweep', 'airPunch', 'diveKick', 'crouchBlock', 'dash', 'backdash'];
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
  for (const l of ['F', 'G', 'H', 'K', 'L', ';', '←', 'W A S D']) assert.ok(all.includes(l), l);
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
test('menus show the game title and tagline', () => {
  const ctx = fakeCtx();
  CD.renderMenu(ctx, CD.createMenuState(), 1);
  const all = ctx.texts.join('|');
  assert.ok(all.includes('BLOODY PAGE'));
  assert.ok(all.includes('SCHOLARLY DEATHMATCH'));
  assert.ok(all.includes('Settle it with your fists and NOT your sources.'));
  assert.ok(!all.includes('CITATION DEATHMATCH'));
});

test('poseFor covers the new moves', () => {
  const f = CD.createFighter(CD.FIGHTERS.foucault, 0, false);
  f.state = 'attack';
  for (const k of ['sweep', 'airPunch', 'diveKick']) { f.attack = { key: k, frame: 1 }; assert.strictEqual(CD.poseFor(f), k); }
  f.attack = null; f.state = 'crouch'; f.crouching = true; f.blocking = true;
  assert.strictEqual(CD.poseFor(f), 'crouchBlock');
  f.blocking = false; f.state = 'dash'; f.dashDir = 1; f.facing = 1;
  assert.strictEqual(CD.poseFor(f), 'dash');
  f.dashDir = -1;
  assert.strictEqual(CD.poseFor(f), 'backdash');
});
test('renderPause draws PAUSED and every option over the match', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  const ctx = fakeCtx();
  CD.renderPause(ctx, m, { cursor: 1 }, 1);
  const all = ctx.texts.join('|');
  assert.ok(all.includes('PAUSED'));
  for (const o of CD.PAUSE_OPTIONS) assert.ok(all.includes(o), o);
  assert.ok(all.includes('MICHEL FOUCAULT'), 'match drawn underneath');
});
test('controls list dash, low and air attacks, and pause', () => {
  const ctx = fakeCtx();
  CD.renderSelect(ctx, { cursor: [0, 1], locked: [false, false] }, 1);
  const all = ctx.texts.join('|');
  for (const t of ['Attack', 'D + F', 'S + F', 'In air', 'Dash', 'double-tap', 'Esc / P']) assert.ok(all.includes(t), t);
});
test('HUD shows each specialty bar, and READY when full', () => {
  const m = CD.createMatch('foucault', 'chomsky');
  m.fighters[0].meter = 40; m.fighters[1].meter = 100;
  const ctx = fakeCtx();
  CD.renderMatch(ctx, m, 1);
  const all = ctx.texts.join('|');
  assert.ok(all.includes('SPECIAL'));
  assert.ok(all.includes('SPECIAL READY [L]'), all);
  assert.ok(!all.includes('SPECIAL READY [G]'));
});
test('critical hits and fizzled specials show text', () => {
  CD.clearRenderEvents();
  const m = CD.createMatch('foucault', 'chomsky');
  CD.pushRenderEvents([{ type: 'hit', crit: true, player: 0, x: 500, y: 300 }, { type: 'fizzle', player: 1 }]);
  const ctx = fakeCtx();
  CD.renderMatch(ctx, m, 1);
  const all = ctx.texts.join('|');
  assert.ok(all.includes('CRITICAL!'));
  assert.ok(all.includes('NOT YET!'));
});
