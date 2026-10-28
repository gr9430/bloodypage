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

  Object.assign(CD, { rectsOverlap, separateFighters });
})(globalThis.CD = globalThis.CD || {});
