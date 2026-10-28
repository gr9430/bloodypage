(function (CD) {
  const { CONFIG } = CD;

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // Pushes overlapping grounded fighters apart; a fighter pinned to a wall
  // stays put and the other takes the whole push.
  function separateFighters(a, b) {
    if (!a.onGround || !b.onGround) return;
    const ha = CD.hurtbox(a), hb = CD.hurtbox(b);
    const minGap = (ha.w + hb.w) / 2;
    const dx = b.x - a.x;
    if (Math.abs(dx) >= minGap) return;
    const dir = dx !== 0 ? Math.sign(dx) : (a.player === 0 ? 1 : -1);
    const push = (minGap - Math.abs(dx)) / 2;
    a.x -= dir * push;
    b.x += dir * push;
    CD.clampToStage(a);
    CD.clampToStage(b);
    const gap = Math.abs(b.x - a.x);
    if (gap < minGap) {
      const short = minGap - gap;
      if (a.x === CONFIG.stageLeft || a.x === CONFIG.stageRight) b.x += dir * short;
      else a.x -= dir * short;
    }
  }

  // After a stun, a fighter can't be stunned again for a while, so stun
  // specials can't be chained into an infinite.
  const STUN_IMMUNITY_EXTRA = 60;

  // Applies one hit to a defender and returns 'hit', 'crit', 'block', or
  // 'ignored'. Blocking only works against hits coming from the side the
  // defender faces. A hit is critical if it catches the defender mid-attack
  // (a counter-hit) or if the caller rolled it lucky.
  function applyHit(defender, hit) {
    if (defender.state === 'ko') return 'ignored';
    const away = Math.sign(defender.x - hit.fromX) || -defender.facing;
    const fromFront = (hit.fromX - defender.x) * defender.facing >= 0;
    const level = hit.level || 'mid';
    const rightStance = level === 'mid' || (level === 'low') === defender.crouching;
    if (defender.blocking && fromFront && rightStance) {
      defender.blockCrouch = defender.crouching;
      defender.state = 'blockstun';
      defender.stateTimer = Math.ceil(hit.hitstun / 2);
      defender.kb = away * hit.knockback / 2;
      return 'block';
    }
    const crit = defender.state === 'attack' || !!hit.lucky;
    const damage = crit ? Math.round(hit.damage * CONFIG.critMultiplier) : hit.damage;
    defender.hp = Math.max(0, defender.hp - damage);
    defender.kb = away * hit.knockback;
    defender.attack = null;
    defender.blocking = false;
    if (defender.hp === 0) {
      defender.state = 'ko';
      defender.stateTimer = 0;
    } else if (hit.stunTicks && defender.stunImmune === 0) {
      defender.state = 'stunned';
      defender.stateTimer = hit.stunTicks;
      defender.stunImmune = hit.stunTicks + STUN_IMMUNITY_EXTRA;
    } else {
      defender.state = 'hitstun';
      defender.stateTimer = hit.hitstun;
    }
    return crit ? 'crit' : 'hit';
  }

  function luckyRoll(rng) {
    return rng ? rng() < CONFIG.critChance : false;
  }

  function hitEvent(result, player, x, y, extra) {
    return { type: result === 'block' ? 'block' : 'hit', crit: result === 'crit', player, x, y, ...extra };
  }

  // Finds a connecting normal attack without applying it yet.
  function pendingHit(attacker, defender) {
    const hb = CD.attackHitbox(attacker);
    if (!hb || !rectsOverlap(hb, CD.hurtbox(defender))) return null;
    return { attacker, defender, hb, move: attacker.def.moves[attacker.attack.key] };
  }

  function applyPending(p, rng) {
    if (p.attacker.attack) p.attacker.attack.hasHit = true;
    const { move, hb } = p;
    const result = applyHit(p.defender, { damage: move.damage, knockback: move.knockback, hitstun: move.hitstun, level: move.level, fromX: p.attacker.x, lucky: luckyRoll(rng) });
    if (result === 'ignored') return [];
    return [hitEvent(result, p.attacker.player, hb.x + hb.w / 2, hb.y + hb.h / 2)];
  }

  function resolveFighterHits(attacker, defender) {
    const p = pendingHit(attacker, defender);
    return p ? applyPending(p) : [];
  }

  // Both fighters' hits are found before any hit lands (including effects,
  // which the match applies in between), so a same-tick trade hits both
  // ways and a double KO is possible.
  function findHits(a, b) {
    return [pendingHit(a, b), pendingHit(b, a)].filter(Boolean);
  }

  // rng (optional) rolls random critical hits.
  function applyHits(pending, rng) {
    return pending.flatMap((p) => applyPending(p, rng));
  }

  function resolveTrade(a, b) {
    return applyHits(findHits(a, b));
  }

  Object.assign(CD, { rectsOverlap, separateFighters, applyHit, luckyRoll, hitEvent, resolveFighterHits, findHits, applyHits, resolveTrade });
})(globalThis.CD = globalThis.CD || {});
