(function (CD) {
  // A computer opponent is just another Controller: it looks at the match
  // and presses the same virtual buttons a player would. It only sees what
  // has already happened, delayed by its reaction time.
  //
  // Chances are per decision (block, dodge, guard, approach) or per tick
  // (attack, punish, special, cite). Punches come out faster than anyone can
  // react, so blocking them at close range relies on `guard`: anticipating
  // an attack by holding back, the way players do.
  const LEVELS = {
    easy: { reaction: 30, block: 0.1, guard: 0.05, dodge: 0, attack: 0.04, punish: 0.02, special: 0.004, cite: 0.003, approach: 0.55 },
    medium: { reaction: 14, block: 0.5, guard: 0.4, dodge: 0.35, attack: 0.1, punish: 0.1, special: 0.015, cite: 0.02, approach: 0.85 },
    hard: { reaction: 4, block: 0.9, guard: 0.8, dodge: 0.75, attack: 0.2, punish: 0.35, special: 0.03, cite: 0.06, approach: 1 },
  };
  const GUARD_RANGE = 160;
  const BLOCK_HOLD = 20;
  const MOVE_RETHINK = 20;
  const MELEE_RANGE = 105;

  // mulberry32: small seeded RNG so a given seed always plays the same way.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function incomingEffect(e, me) {
    const cx = e.x + e.w / 2;
    if (e.vx !== 0) return Math.sign(me.x - cx) === Math.sign(e.vx) && Math.abs(me.x - cx) < 300;
    return Math.abs(me.x - cx) < e.w / 2 + 60;
  }

  // What the AI can see this tick: threats that have already started.
  function observe(m, player) {
    const me = m.fighters[player], opp = m.fighters[1 - player];
    const dist = Math.abs(opp.x - me.x);
    let melee = false;
    if (opp.attack && opp.attack.key !== 'special' && dist < 170) {
      const mv = opp.def.moves[opp.attack.key];
      melee = opp.attack.frame <= mv.startup + mv.active;
    }
    let effect = false, projectile = false;
    for (const e of m.effects) {
      if (e.owner === player || e.hasHit || !incomingEffect(e, me)) continue;
      effect = true;
      if (e.vx !== 0) projectile = true;
    }
    return { threat: melee || effect, projectile };
  }

  function createAI(getMatch, player, level, seed) {
    const cfg = LEVELS[level];
    const rng = makeRng(seed);
    let history = [];
    let tick = 0, blockUntil = 0, moveDir = 0, moveUntil = 0, guarding = false;
    let prevThreat = false, prevProjectile = false;
    let prevButtons = {};

    function decide(m) {
      const out = CD.idleInput();
      const me = m.fighters[player], opp = m.fighters[1 - player];
      const toward = opp.x >= me.x ? 1 : -1;
      const dist = Math.abs(opp.x - me.x);
      const hold = (dir) => { if (dir > 0) out.right = true; else if (dir < 0) out.left = true; };

      history.push(observe(m, player));
      if (history.length > cfg.reaction + 1) history.shift();
      const seen = history.length > cfg.reaction ? history[0] : { threat: false, projectile: false };

      // React to threats once, when they first come into view.
      if (seen.projectile && !prevProjectile && me.onGround && rng() < cfg.dodge) {
        prevProjectile = true;
        prevThreat = seen.threat;
        out.jump = true;
        hold(toward);
        return out;
      }
      if (seen.threat && !prevThreat && rng() < cfg.block) blockUntil = tick + BLOCK_HOLD;
      prevThreat = seen.threat;
      prevProjectile = seen.projectile;
      if (tick < blockUntil) {
        hold(-toward);
        return out;
      }

      // Movement: guard (hold back), approach, or stand. Rethought every so often.
      if (tick >= moveUntil) {
        moveUntil = tick + MOVE_RETHINK;
        guarding = dist < GUARD_RANGE && rng() < cfg.guard;
        if (guarding) moveDir = 0;
        else if (dist > MELEE_RANGE - 10) moveDir = rng() < cfg.approach ? 1 : 0;
        else moveDir = 0;
      }

      if (CD.isActionable(me)) {
        const sp = me.def.special;
        const spInRange = sp.kind === 'burst' ? dist < 170 : dist > 120;
        const oppMove = opp.attack && opp.attack.key !== 'special' ? opp.def.moves[opp.attack.key] : null;
        const oppRecovering = oppMove && opp.attack.frame > oppMove.startup + oppMove.active;
        // A guarding fighter only lets go of block to punish an opening.
        if (oppRecovering && dist < MELEE_RANGE + 15 && rng() < cfg.punish) out.punch = true;
        else if (!guarding && dist < MELEE_RANGE && rng() < cfg.attack) out[rng() < 0.6 ? 'punch' : 'kick'] = true;
        else if (!guarding && spInRange && rng() < cfg.special) out.special = true;
        else if (m.cites[player].cooldown === 0 && rng() < cfg.cite) out.cite = true;
      }

      hold(guarding ? -toward : moveDir * toward);
      return out;
    }

    return {
      read() {
        tick++;
        const m = getMatch();
        if (!m || m.phase !== 'fight') {
          history = [];
          prevButtons = {};
          return CD.idleInput();
        }
        const out = decide(m);
        // Buttons are presses: never report the same button two ticks running.
        for (const b of ['jump', 'punch', 'kick', 'special', 'cite']) {
          const pressed = out[b];
          if (pressed && prevButtons[b]) out[b] = false;
          prevButtons[b] = pressed;
        }
        return out;
      },
    };
  }

  Object.assign(CD, { createAI });
})(globalThis.CD = globalThis.CD || {});
