(function (CD) {
  // A computer opponent is just another Controller: it looks at the match
  // and presses the same virtual buttons a player would. It only sees what
  // has already happened, delayed by its reaction time.
  //
  // Chances are per decision (block, dodge, guard, guardLow, approach) or per
  // tick (attack, punish, special, cite, dash, jumpIn). Punches come out faster
  // than anyone can react, so blocking them at close range relies on `guard`:
  // anticipating an attack by holding back, the way players do. Once a low or
  // overhead attack is seen, the AI crouches or stands to match it.
  const LEVELS = {
    easy: { reaction: 30, block: 0.1, guard: 0.05, guardLow: 0, dodge: 0, attack: 0.04, punish: 0.02, special: 0.004, cite: 0.003, approach: 0.55, dash: 0, jumpIn: 0.002 },
    medium: { reaction: 14, block: 0.5, guard: 0.55, guardLow: 0.3, dodge: 0.35, attack: 0.1, punish: 0.1, special: 0.015, cite: 0.02, approach: 0.85, dash: 0.03, jumpIn: 0.006 },
    hard: { reaction: 4, block: 0.9, guard: 0.8, guardLow: 0.3, dodge: 0.75, attack: 0.2, punish: 0.35, special: 0.03, cite: 0.06, approach: 1, dash: 0.05, jumpIn: 0.01 },
  };
  const BUTTONS = ['jump', 'attack', 'special', 'cite', 'dashLeft', 'dashRight'];
  const GUARD_RANGE = 160;
  const BLOCK_HOLD = 20;
  const MOVE_RETHINK = 20;
  const MELEE_RANGE = 105;

  function incomingEffect(e, me) {
    const cx = e.x + e.w / 2;
    if (e.vx !== 0) return Math.sign(me.x - cx) === Math.sign(e.vx) && Math.abs(me.x - cx) < 300;
    return Math.abs(me.x - cx) < e.w / 2 + 60;
  }

  // What the AI can see this tick: threats that have already started.
  function observe(m, player) {
    const me = m.fighters[player], opp = m.fighters[1 - player];
    const dist = Math.abs(opp.x - me.x);
    let melee = false, low = false, overhead = false;
    const phase = CD.attackPhase(opp);
    if ((phase === 'startup' || phase === 'active') && dist < 170) {
      melee = true;
      low = opp.attack.move.level === 'low';
      overhead = opp.attack.move.level === 'overhead';
    }
    let effect = false, projectile = false;
    for (const e of m.effects) {
      if (e.owner === player || e.hasHit || !incomingEffect(e, me)) continue;
      effect = true;
      if (e.vx !== 0) projectile = true;
    }
    return { threat: melee || effect, projectile, low, overhead };
  }

  function createAI(getMatch, player, level, seed) {
    const cfg = LEVELS[level];
    const rng = CD.makeRng(seed);
    let history = [];
    let tick = 0, blockUntil = 0, moveDir = 0, moveUntil = 0, guarding = false, guardCrouch = false;
    let prevThreat = false, prevProjectile = false;
    let prevButtons = {};

    function decide(m) {
      const out = CD.idleInput();
      const me = m.fighters[player], opp = m.fighters[1 - player];
      const toward = opp.x >= me.x ? 1 : -1;
      const dist = Math.abs(opp.x - me.x);
      const hold = (dir) => { if (dir > 0) out.right = true; else if (dir < 0) out.left = true; };
      let kickToward = false;

      history.push(observe(m, player));
      if (history.length > cfg.reaction + 1) history.shift();
      const seen = history.length > cfg.reaction ? history[0] : { threat: false, projectile: false, low: false, overhead: false };
      // Block high or low: match a seen low/overhead, otherwise keep the guess.
      const crouchToBlock = seen.low || (!seen.overhead && guardCrouch);

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
        out.down = crouchToBlock;
        return out;
      }

      // Movement: guard (hold back), approach, or stand. Rethought every so often.
      if (tick >= moveUntil) {
        moveUntil = tick + MOVE_RETHINK;
        guarding = dist < GUARD_RANGE && rng() < cfg.guard;
        guardCrouch = rng() < cfg.guardLow;
        if (guarding) moveDir = 0;
        else if (dist > MELEE_RANGE - 10) moveDir = rng() < cfg.approach ? 1 : 0;
        else moveDir = 0;
      }

      if (CD.isActionable(me)) {
        const sp = me.def.special;
        const spInRange = sp.kind === 'burst' ? dist < 170 : dist > 120;
        const oppRecovering = CD.attackPhase(opp) === 'recovery';
        if (!me.onGround) {
          // In the air: punch upward at jumpers, dive-kick grounded opponents.
          if (dist < 140 && rng() < 0.25) {
            out.attack = true;
            out.down = opp.onGround; // dive at grounded opponents, swing up at jumpers
          }
        // A guarding fighter only lets go of block to punish an opening.
        } else if (oppRecovering && dist < MELEE_RANGE + 15 && rng() < cfg.punish) out.attack = true;
        else if (!guarding && dist < MELEE_RANGE && rng() < cfg.attack) {
          // Roughly: 40% punch, 30% kick (attack + toward), 30% sweep (attack + down).
          const r = rng();
          out.attack = true;
          if (r >= 0.7) out.down = true;
          else if (r >= 0.4) kickToward = true;
        } else if (!guarding && spInRange && rng() < cfg.special) out.special = true;
        else if (m.cites[player].cooldown === 0 && rng() < cfg.cite) out.cite = true;
        else if (!guarding && dist > 200 && rng() < cfg.dash) out[toward > 0 ? 'dashRight' : 'dashLeft'] = true;
        else if (!guarding && dist > 140 && dist < 260 && rng() < cfg.jumpIn) { out.jump = true; moveDir = 1; }
      }

      hold(guarding && !out.attack ? -toward : kickToward ? toward : moveDir * toward);
      if (guarding && me.onGround && !out.attack) out.down = crouchToBlock;
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
        for (const b of BUTTONS) {
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
