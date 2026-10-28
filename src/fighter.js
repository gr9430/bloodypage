(function (CD) {
  const { CONFIG } = CD;
  const STAND_H = 160, CROUCH_H = 100, BODY_W = 70;
  const BACKSTEP = 0.6; // fraction of walk speed while backing off (and blocking)

  function idleInput() {
    return { left: false, right: false, down: false, jump: false, punch: false, kick: false, special: false, cite: false };
  }

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
      blocking: false,
      crouching: false,
      onGround: true,
    };
  }

  function isActionable(f) {
    return f.state === 'idle' || f.state === 'walk' || f.state === 'jump' || f.state === 'crouch';
  }

  function hurtbox(f) {
    const h = f.crouching ? CROUCH_H : STAND_H;
    return { x: f.x - BODY_W / 2, y: f.y - h, w: BODY_W, h };
  }

  function clampToStage(f) {
    f.x = Math.max(CONFIG.stageLeft, Math.min(CONFIG.stageRight, f.x));
  }

  // Advances one tick of movement and state. Damage is applied elsewhere.
  function updateFighter(f, input, opponent) {
    const events = [];

    if (f.onGround && f.state !== 'ko') f.facing = opponent.x >= f.x ? 1 : -1;

    f.blocking = false;
    f.crouching = false;

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
    } else if (f.onGround) {
      f.vx = 0;
    }

    f.x += f.vx;
    if (!f.onGround) {
      f.vy += CONFIG.gravity;
      f.y += f.vy;
      if (f.y >= CONFIG.floorY) {
        f.y = CONFIG.floorY;
        f.vy = 0;
        f.vx = 0;
        f.onGround = true;
        if (f.state === 'jump') f.state = 'idle';
      }
    }
    clampToStage(f);
    return events;
  }

  Object.assign(CD, { idleInput, createFighter, isActionable, hurtbox, updateFighter, clampToStage });
})(globalThis.CD = globalThis.CD || {});
