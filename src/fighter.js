(function (CD) {
  const { CONFIG } = CD;
  const STAND_H = 160, CROUCH_H = 100, BODY_W = 70;
  const BACKSTEP = 0.6; // fraction of walk speed while backing off (and blocking)
  const DASH_TICKS = 22, DASH_MOVING = 16; // the last few dash ticks are recovery
  const DASH_SPEED = 15, BACKDASH_SPEED = 12;
  const DIVE_VY = 12, DIVE_VX = 9;
  const LOW_MOVES = { sweep: true };

  function createFighter(def, player, useAlt) {
    return {
      def,
      player,
      look: useAlt ? def.altLook : def.look,
      x: player === 0 ? 300 : 660,
      y: CONFIG.floorY,
      vx: 0,
      vy: 0,
      facing: player === 0 ? 1 : -1,
      hp: CONFIG.maxHp,
      state: 'idle',
      stateTimer: 0,
      attack: null,
      kb: 0,
      stunImmune: 0,
      blocking: false,
      blockCrouch: false,
      crouching: false,
      onGround: true,
      dashDir: 0,
      meter: 0,
    };
  }

  function isActionable(f) {
    return f.state === 'idle' || f.state === 'walk' || f.state === 'jump' || f.state === 'crouch';
  }

  function hurtbox(f) {
    const h = f.crouching ? CROUCH_H : STAND_H;
    return { x: f.x - BODY_W / 2, y: f.y - h, w: BODY_W, h };
  }

  function moveFor(f) {
    return f.attack ? f.def.moves[f.attack.key] || null : null;
  }

  function attackDuration(f) {
    const m = f.attack.key === 'special' ? f.def.special : f.def.moves[f.attack.key];
    return m.startup + (m.active || 0) + m.recovery;
  }

  // World-space hitbox of a normal attack, only during its active frames.
  function attackHitbox(f) {
    const m = moveFor(f);
    if (!m || f.attack.hasHit) return null;
    const fr = f.attack.frame;
    if (fr <= m.startup || fr > m.startup + m.active) return null;
    const hb = m.hitbox;
    const x = f.facing === 1 ? f.x + hb.x : f.x - hb.x - hb.w;
    return { x, y: f.y + hb.y, w: hb.w, h: hb.h };
  }

  // One Attack button; the direction held picks the move. In the air it
  // swings upward, or dives with down. On the ground, down sweeps and
  // toward the opponent kicks.
  function chooseAttack(f, input) {
    if (input.special && f.meter >= CONFIG.meterMax) return 'special';
    if (!f.onGround) return input.down ? 'diveKick' : 'airPunch';
    if (input.down) return 'sweep';
    const toward = f.facing === 1 ? input.right : input.left;
    return toward ? 'kick' : 'punch';
  }

  function clampToStage(f) {
    f.x = Math.max(CONFIG.stageLeft, Math.min(CONFIG.stageRight, f.x));
  }

  // Advances one tick of movement and state. Damage is applied elsewhere.
  function updateFighter(f, input, opponent) {
    const events = [];

    if (f.stunImmune > 0) f.stunImmune--;
    if (f.state === 'hitstun' || f.state === 'blockstun' || f.state === 'stunned') {
      f.stateTimer--;
      if (f.stateTimer <= 0) f.state = f.onGround ? 'idle' : 'jump';
    }

    if (f.state === 'dash') {
      f.stateTimer--;
      const speed = f.dashDir === f.facing ? DASH_SPEED : BACKDASH_SPEED;
      f.vx = f.stateTimer >= DASH_TICKS - DASH_MOVING ? f.dashDir * speed : 0;
      if (f.stateTimer <= 0) { f.state = 'idle'; f.vx = 0; }
    }

    if (f.onGround && f.state !== 'ko' && f.state !== 'dash') f.facing = opponent.x >= f.x ? 1 : -1;

    f.blocking = f.state === 'blockstun';
    f.crouching = f.state === 'blockstun' && f.blockCrouch;

    const specialReady = f.meter >= CONFIG.meterMax;
    if (isActionable(f) && input.special && !specialReady) events.push({ type: 'fizzle', player: f.player });
    if (isActionable(f) && (input.attack || (input.special && specialReady))) {
      const key = chooseAttack(f, input);
      if (key === 'special') f.meter = 0;
      f.attack = { key, frame: 0, hasHit: false };
      f.state = 'attack';
      events.push({ type: 'whoosh', player: f.player });
    } else if (isActionable(f) && f.onGround && (input.dashLeft || input.dashRight)) {
      f.dashDir = input.dashRight ? 1 : -1;
      f.state = 'dash';
      f.stateTimer = DASH_TICKS;
      f.vx = f.dashDir * (f.dashDir === f.facing ? DASH_SPEED : BACKDASH_SPEED);
      events.push({ type: 'whoosh', player: f.player });
    }
    if (f.attack && LOW_MOVES[f.attack.key]) f.crouching = true;

    if (f.onGround && isActionable(f)) {
      const away = f.facing === 1 ? input.left : input.right;
      const toward = f.facing === 1 ? input.right : input.left;
      if (input.jump) {
        f.vy = CONFIG.jumpVel;
        f.onGround = false;
        f.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * CONFIG.walkSpeed;
        f.state = 'jump';
      } else if (input.down) {
        f.crouching = true;
        f.blocking = away;
        f.vx = 0;
        f.state = 'crouch';
      } else if (away) {
        f.blocking = true;
        f.vx = -f.facing * CONFIG.walkSpeed * BACKSTEP;
        f.state = 'walk';
      } else if (toward) {
        f.vx = f.facing * CONFIG.walkSpeed;
        f.state = 'walk';
      } else {
        f.vx = 0;
        f.state = 'idle';
      }
    } else if (f.onGround && f.state !== 'dash') {
      f.vx = 0;
    }

    if (f.attack) {
      f.attack.frame++;
      if (f.attack.key === 'diveKick' && f.attack.frame >= f.def.moves.diveKick.startup && !f.onGround) {
        f.vy = DIVE_VY;
        f.vx = f.facing * DIVE_VX;
      }
      if (f.attack.key === 'special' && f.attack.frame === f.def.special.startup) {
        events.push({ type: 'special', player: f.player });
      }
      if (f.attack.frame >= attackDuration(f)) {
        f.attack = null;
        if (f.state === 'attack') f.state = f.onGround ? 'idle' : 'jump';
      }
    }

    f.x += f.vx + f.kb;
    f.kb *= 0.8;
    if (Math.abs(f.kb) < 0.3) f.kb = 0;
    if (!f.onGround) {
      const diving = f.attack && f.attack.key === 'diveKick' && f.attack.frame >= f.def.moves.diveKick.startup;
      if (!diving) f.vy += CONFIG.gravity;
      f.y += f.vy;
      if (f.y >= CONFIG.floorY) {
        f.y = CONFIG.floorY;
        f.vy = 0;
        f.vx = 0;
        f.onGround = true;
        if (f.state === 'jump') f.state = 'idle';
        // A dive kick goes straight into its recovery when it lands.
        if (f.attack && f.attack.key === 'diveKick') {
          const m = f.def.moves.diveKick;
          f.attack.frame = Math.max(f.attack.frame, m.startup + m.active);
        }
      }
    }
    clampToStage(f);
    return events;
  }

  Object.assign(CD, { createFighter, isActionable, hurtbox, attackHitbox, updateFighter, clampToStage });
})(globalThis.CD = globalThis.CD || {});
