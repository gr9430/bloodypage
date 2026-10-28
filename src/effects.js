(function (CD) {
  const { CONFIG } = CD;
  const DEFAULT_HITSTUN = 20;

  // Builds one effect. Shared by fighters' specials and summoned assists.
  function spawnEffect(kind, owner, ownerFighter, target, params) {
    const facing = ownerFighter.facing;
    const base = {
      kind, owner, vx: 0, vy: 0, age: 0, armedAt: 0, hasHit: false, landed: false,
      damage: params.damage, knockback: params.knockback,
      hitstun: params.hitstun || DEFAULT_HITSTUN, stunTicks: params.stunTicks,
      label: params.name,
    };
    switch (kind) {
      case 'stunZone':
        return { ...base, x: target.x - 40, y: CONFIG.floorY - 200, w: 80, h: 200, armedAt: 30, ttl: 45 };
      case 'projectile': {
        const w = 50;
        return { ...base, x: ownerFighter.x + facing * 40 - w / 2, y: ownerFighter.y - 125, w, h: 44, vx: (params.speed || 9) * facing, ttl: 240 };
      }
      case 'drop':
        return { ...base, x: target.x - 45, y: -200, w: 90, h: 80, ttl: 240 };
      case 'burst': {
        const w = 120;
        return { ...base, x: facing === 1 ? ownerFighter.x + 20 : ownerFighter.x - 20 - w, y: ownerFighter.y - 140, w, h: 120, ttl: 10 };
      }
      case 'rush': {
        const w = 70;
        // Charges in from behind the owner, across the whole stage.
        return { ...base, x: facing === 1 ? -w : CONFIG.width, y: CONFIG.floorY - 150, w, h: 150, vx: 14 * facing, ttl: 240 };
      }
      default:
        throw new Error('unknown effect kind: ' + kind);
    }
  }

  function spawnSpecial(fighter, opponent) {
    return spawnEffect(fighter.def.special.kind, fighter.player, fighter, opponent, fighter.def.special);
  }

  // Where a hit "comes from", for knockback direction and blocking.
  function hitOrigin(e, owner, target) {
    if (e.vx !== 0) return target.x - Math.sign(e.vx);
    return owner.x;
  }

  function offStage(e) {
    return e.x + e.w < -100 || e.x > CONFIG.width + 100;
  }

  function updateEffects(effects, fighters) {
    const events = [];
    const kept = [];
    for (const e of effects) {
      e.age++;
      e.ttl--;
      e.x += e.vx;
      let falling = false;
      if (e.kind === 'drop' && !e.landed) {
        falling = true;
        e.vy += CONFIG.gravity * 0.7;
        e.y += e.vy;
        if (e.y + e.h >= CONFIG.floorY) {
          e.y = CONFIG.floorY - e.h;
          e.landed = true;
          e.ttl = Math.min(e.ttl, 20);
        }
      }
      const owner = fighters[e.owner], target = fighters[1 - e.owner];
      const canHit = !e.hasHit && e.age >= e.armedAt && (e.kind !== 'drop' || falling);
      if (canHit && CD.rectsOverlap(e, CD.hurtbox(target))) {
        e.hasHit = true;
        const result = CD.applyHit(target, {
          damage: e.damage, knockback: e.knockback, hitstun: e.hitstun, stunTicks: e.stunTicks,
          fromX: hitOrigin(e, owner, target),
        });
        if (result !== 'ignored') events.push({ type: result, player: e.owner, x: e.x + e.w / 2, y: e.y + e.h / 2 });
        if (e.kind === 'projectile') e.ttl = 0;
      }
      if (e.ttl > 0 && !offStage(e)) kept.push(e);
    }
    return { effects: kept, events };
  }

  Object.assign(CD, { spawnEffect, spawnSpecial, updateEffects });
})(globalThis.CD = globalThis.CD || {});
