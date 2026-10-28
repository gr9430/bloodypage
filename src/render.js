(function (CD) {
  const { CONFIG } = CD;
  const W = CONFIG.width, H = CONFIG.height, FLOOR = CONFIG.floorY;
  const INK = '#151515';
  const LOUD = 'Impact, "Arial Black", sans-serif';
  const CRUDE = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive';
  const HIT_WORDS = ['POW!', 'BONK!', 'WHAP!', 'THWACK!', 'ZING!', 'OOF!'];

  // Transient visuals (sparks, bubbles, callouts), fed from simulation events.
  let fx = [];
  let hitCount = 0;
  let frameTick = 0;

  function pushRenderEvents(events) {
    for (const e of events) {
      if (e.type === 'hit') fx.push({ type: 'spark', x: e.x, y: e.y, ttl: 22, max: 22, word: HIT_WORDS[hitCount++ % HIT_WORDS.length], color: '#ffe14d' });
      else if (e.type === 'block') fx.push({ type: 'spark', x: e.x, y: e.y, ttl: 18, max: 18, word: 'BLOCKED', color: '#7fd3ff' });
      else if (e.type === 'cite') fx.push({ type: 'bubble', player: e.player, text: e.text, ttl: 70, max: 70 });
      else if (e.type === 'special') fx.push({ type: 'callout', player: e.player, ttl: 50, max: 50 });
    }
  }

  function clearRenderEvents() {
    fx = [];
  }

  function tickFx() {
    for (const f of fx) f.ttl--;
    fx = fx.filter((f) => f.ttl > 0);
  }

  // Deliberately shaky lines: a small deterministic per-frame jitter.
  function wob(i) {
    return Math.sin(frameTick * 0.35 + i * 1.7) * 1.1;
  }

  function keyLabel(code) {
    const arrows = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
    if (arrows[code]) return arrows[code];
    if (code === 'Semicolon') return ';';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  }

  function outlinedText(ctx, text, x, y, size, fill, opts = {}) {
    ctx.save();
    ctx.font = `${size}px ${opts.font || LOUD}`;
    const maxW = opts.maxWidth || W - 40;
    const measured = ctx.measureText(text).width;
    if (measured > maxW) {
      size = Math.floor(size * maxW / measured);
      ctx.font = `${size}px ${opts.font || LOUD}`;
    }
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = opts.stroke || INK;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function plainText(ctx, text, x, y, size, color, align = 'center', font = CRUDE) {
    ctx.save();
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function blob(ctx, x, y, rx, ry, fill, i = 0) {
    ctx.beginPath();
    ctx.ellipse(x + wob(i), y + wob(i + 1), rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  function limb(ctx, x1, y1, x2, y2, width, color, i = 0) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = width + 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + wob(i), y2 + wob(i + 2));
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function quad(ctx, pts, fill, i = 0) {
    ctx.beginPath();
    pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + wob(i + k), py + wob(i + k + 3)) : ctx.moveTo(px + wob(i), py)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  // ---------- Character rig ----------

  // Poses as joint targets, in a right-facing local space with feet at y=0.
  function poseJoints(pose) {
    const t = frameTick;
    const j = {
      hip: -48, shoulder: -96, lean: 0,
      backFoot: [-14, 0], frontFoot: [14, 0],
      backHand: [-26, -60], frontHand: [26, -60],
      face: 'grin',
    };
    switch (pose) {
      case 'idle':
        j.shoulder += Math.sin(t * 0.12) * 2;
        break;
      case 'walk': {
        const s = Math.sin(t * 0.35) * 14;
        j.backFoot = [-10 - s, 0];
        j.frontFoot = [10 + s, 0];
        j.backHand = [-22 + s, -62];
        j.frontHand = [22 - s, -62];
        break;
      }
      case 'jump':
        j.backFoot = [-18, -20];
        j.frontFoot = [20, -26];
        j.backHand = [-34, -110];
        j.frontHand = [34, -110];
        j.face = 'o';
        break;
      case 'crouch':
        j.hip = -28;
        j.shoulder = -66;
        j.backFoot = [-24, 0];
        j.frontFoot = [24, 0];
        j.backHand = [-10, -38];
        j.frontHand = [30, -40];
        break;
      case 'punch':
        j.lean = 6;
        j.frontHand = [78, -98];
        j.backHand = [-10, -70];
        j.backFoot = [-22, 0];
        j.frontFoot = [22, 0];
        j.face = 'yell';
        break;
      case 'kick':
        j.lean = -8;
        j.frontFoot = [86, -52];
        j.backFoot = [-8, 0];
        j.backHand = [-40, -82];
        j.frontHand = [10, -88];
        j.face = 'yell';
        break;
      case 'special':
        j.backHand = [-30, -150];
        j.frontHand = [36, -152];
        j.backFoot = [-22, 0];
        j.frontFoot = [22, 0];
        j.face = 'yell';
        break;
      case 'block':
        j.lean = -4;
        j.frontHand = [26, -120];
        j.backHand = [18, -104];
        j.face = 'wince';
        break;
      case 'hurt':
        j.lean = -14;
        j.backHand = [-44, -110];
        j.frontHand = [40, -40];
        j.face = 'x';
        break;
      case 'ko':
        j.face = 'x';
        j.backHand = [-30, -150];
        j.frontHand = [30, -150];
        break;
      case 'win':
        j.backHand = [-48, -158];
        j.frontHand = [56, -158];
        j.face = 'smile';
        j.shoulder += Math.sin(t * 0.25) * 3;
        break;
    }
    return j;
  }

  function drawHair(ctx, look, r) {
    const c = look.hairColor;
    switch (look.hair) {
      case 'bald':
        // shine on the dome
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-4, -6, r * 0.7, -2.4, -1.6);
        ctx.stroke();
        break;
      case 'swept':
        quad(ctx, [[-r * 0.95, -r * 0.1], [-r * 1.05, -r * 0.8], [-r * 0.4, -r * 1.25], [r * 0.5, -r * 1.15], [r * 0.85, -r * 0.6], [r * 0.2, -r * 0.75], [-r * 0.5, -r * 0.45]], c, 11);
        break;
      case 'slick':
        quad(ctx, [[-r * 1.0, -r * 0.05], [-r * 0.9, -r * 0.85], [0, -r * 1.08], [r * 0.85, -r * 0.75], [r * 0.95, -r * 0.4], [r * 0.15, -r * 0.62], [-r * 0.6, -r * 0.4]], c, 12);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r * 0.15, -r * 1.02);
        ctx.lineTo(r * 0.3, -r * 0.66);
        ctx.stroke();
        break;
      case 'white':
        for (const [hx, hy, hr] of [[-r * 0.85, -r * 0.35, r * 0.38], [-r * 0.55, -r * 0.85, r * 0.42], [0, -r * 1.0, r * 0.4], [r * 0.5, -r * 0.88, r * 0.36], [-r * 0.95, r * 0.15, r * 0.3]]) {
          blob(ctx, hx, hy, hr, hr * 0.85, c, hx);
        }
        break;
    }
  }

  function drawFace(ctx, look, r, face) {
    const ex = r * 0.18, ey = -r * 0.08, ex2 = r * 0.62;
    // ear on the back of the head
    blob(ctx, -r * 0.82, r * 0.05, r * 0.18, r * 0.26, look.skin, 30);
    // eyes
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    if (face === 'x') {
      for (const cx of [ex, ex2]) {
        ctx.beginPath();
        ctx.moveTo(cx - 6, ey - 6); ctx.lineTo(cx + 6, ey + 6);
        ctx.moveTo(cx + 6, ey - 6); ctx.lineTo(cx - 6, ey + 6);
        ctx.stroke();
      }
    } else if (face === 'wince') {
      for (const cx of [ex, ex2]) {
        ctx.beginPath(); ctx.moveTo(cx - 6, ey); ctx.lineTo(cx + 6, ey); ctx.stroke();
      }
    } else {
      for (const cx of [ex, ex2]) { ctx.beginPath(); ctx.arc(cx, ey, 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // eyebrows: angry when yelling
    ctx.beginPath();
    const tilt = face === 'yell' ? 6 : 0;
    ctx.moveTo(ex - 8, ey - 14 - tilt); ctx.lineTo(ex + 8, ey - 14 + tilt);
    ctx.moveTo(ex2 - 8, ey - 14 + tilt); ctx.lineTo(ex2 + 8, ey - 14 - tilt);
    ctx.stroke();
    // glasses
    if (look.glasses === 'round') {
      ctx.lineWidth = 3;
      for (const cx of [ex, ex2]) { ctx.beginPath(); ctx.arc(cx, ey, 11, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(ex + 11, ey); ctx.lineTo(ex2 - 11, ey); ctx.moveTo(ex - 11, ey); ctx.lineTo(-r * 0.7, ey - 4); ctx.stroke();
    } else if (look.glasses === 'big') {
      ctx.lineWidth = 4;
      for (const cx of [ex, ex2]) { ctx.beginPath(); ctx.rect(cx - 14, ey - 12, 28, 24); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(ex - 14, ey - 4); ctx.lineTo(-r * 0.75, ey - 6); ctx.stroke();
    }
    // nose, sticking out the front
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.82, -r * 0.05);
    ctx.lineTo(r * 1.12, r * 0.22);
    ctx.lineTo(r * 0.85, r * 0.3);
    ctx.stroke();
    // mouth
    const mx = r * 0.45, my = r * 0.5;
    ctx.beginPath();
    if (face === 'o' || face === 'x') {
      ctx.ellipse(mx, my, 6, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5a1a1a'; ctx.fill(); ctx.stroke();
    } else if (face === 'yell') {
      ctx.moveTo(mx - 12, my - 4); ctx.lineTo(mx + 12, my - 4); ctx.lineTo(mx, my + 10); ctx.closePath();
      ctx.fillStyle = '#5a1a1a'; ctx.fill(); ctx.stroke();
    } else if (face === 'wince') {
      ctx.moveTo(mx - 10, my); ctx.lineTo(mx - 4, my - 4); ctx.lineTo(mx + 2, my); ctx.lineTo(mx + 10, my - 4); ctx.stroke();
    } else {
      // grin: a big toothy arc
      ctx.arc(mx, my - 6, 13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    }
  }

  function drawTorso(ctx, look, hipY, shY, lean) {
    const top = shY, bot = hipY;
    const tw = 30;
    quad(ctx, [[-tw + lean, top], [tw + lean, top], [tw - 4, bot], [-tw + 4, bot]], look.outfitColor, 40);
    ctx.lineWidth = 3;
    switch (look.outfit) {
      case 'turtleneck':
        quad(ctx, [[-13 + lean, top - 12], [13 + lean, top - 12], [15 + lean, top + 2], [-15 + lean, top + 2]], look.outfitColor, 41);
        break;
      case 'sweater':
        ctx.strokeStyle = look.accentColor;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.moveTo(-tw + 7, bot - 6 - k * 5); ctx.lineTo(tw - 7, bot - 6 - k * 5); ctx.stroke();
        }
        quad(ctx, [[-10 + lean, top], [10 + lean, top], [lean, top + 14]], '#f4f0e6', 42);
        break;
      case 'suit':
        quad(ctx, [[-12 + lean, top], [12 + lean, top], [lean, top + 26]], '#f6f6f6', 43);
        quad(ctx, [[-4 + lean, top + 4], [4 + lean, top + 4], [3 + lean * 0.5, top + 32], [-3 + lean * 0.5, top + 32]], look.accentColor, 44);
        break;
      case 'scarf':
        quad(ctx, [[-20 + lean, top - 4], [20 + lean, top - 4], [18 + lean, top + 10], [-18 + lean, top + 10]], look.accentColor, 45);
        quad(ctx, [[6 + lean, top + 6], [16 + lean, top + 6], [14 + lean, top + 40], [4 + lean, top + 40]], look.accentColor, 46);
        break;
    }
  }

  function drawFighterRig(ctx, look, x, y, facing, pose, scale = 1) {
    const j = poseJoints(pose);
    const r = 32 * (look.headScale || 1.2);
    const pants = '#2b2b30';
    ctx.save();
    ctx.translate(x, y);
    if (pose === 'ko') {
      ctx.translate(-facing * 20, -10);
      ctx.rotate(-facing * Math.PI / 2);
    }
    ctx.scale(facing * scale, scale);
    ctx.lineJoin = 'round';

    // legs
    limb(ctx, -8, j.hip, j.backFoot[0], j.backFoot[1], 12, pants, 1);
    limb(ctx, 8, j.hip, j.frontFoot[0], j.frontFoot[1], 12, pants, 2);
    blob(ctx, j.backFoot[0] + 4, j.backFoot[1] - 2, 12, 6, INK, 3);
    blob(ctx, j.frontFoot[0] + 4, j.frontFoot[1] - 2, 12, 6, INK, 4);

    // back arm behind the body
    limb(ctx, -14 + j.lean, j.shoulder + 8, j.backHand[0], j.backHand[1], 10, look.outfitColor, 5);
    blob(ctx, j.backHand[0], j.backHand[1], 8, 8, look.skin, 6);

    drawTorso(ctx, look, j.hip, j.shoulder, j.lean);

    // A raised front arm goes behind the head so it doesn't cover the face.
    const raised = j.frontHand[1] < j.shoulder - 30;
    if (raised) frontArm(ctx, look, j);

    // head
    ctx.save();
    ctx.translate(j.lean + 4, j.shoulder - r * 0.85);
    if (pose === 'hurt') ctx.rotate(-0.25);
    blob(ctx, 0, 0, r, r * 1.08, look.skin, 7);
    drawHair(ctx, look, r);
    drawFace(ctx, look, r, j.face);
    ctx.restore();

    if (!raised) frontArm(ctx, look, j);

    ctx.restore();

    if (pose === 'ko') drawDizzyStars(ctx, x - facing * 110, y - 40);
  }

  function frontArm(ctx, look, j) {
    limb(ctx, 14 + j.lean, j.shoulder + 8, j.frontHand[0], j.frontHand[1], 10, look.outfitColor, 8);
    blob(ctx, j.frontHand[0], j.frontHand[1], 9, 9, look.skin, 9);
  }

  function drawDizzyStars(ctx, x, y) {
    for (let k = 0; k < 3; k++) {
      const a = frameTick * 0.12 + k * (Math.PI * 2 / 3);
      star(ctx, x + Math.cos(a) * 30, y + Math.sin(a) * 10, 8, '#ffe14d');
    }
  }

  function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  function poseFor(f) {
    if (f.state === 'ko') return 'ko';
    if (f.state === 'hitstun' || f.state === 'stunned') return 'hurt';
    if (f.state === 'blockstun' || f.blocking) return 'block';
    if (f.attack) return f.attack.key;
    if (f.state === 'crouch') return 'crouch';
    if (!f.onGround) return 'jump';
    if (f.state === 'walk') return 'walk';
    return 'idle';
  }

  // ---------- Stage ----------

  function drawStage(ctx) {
    // wood-panel back wall
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
    g.addColorStop(0, '#3b2414');
    g.addColorStop(1, '#7a4a22');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, FLOOR);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, FLOOR); ctx.stroke(); }

    // orange 70s backdrop with the show title
    ctx.fillStyle = '#d9761c';
    ctx.fillRect(140, 130, W - 280, 150);
    ctx.fillStyle = '#f2a33a';
    for (let k = 0; k < 5; k++) ctx.fillRect(140, 140 + k * 28, W - 280, 10);
    outlinedText(ctx, 'HUMAN NATURE:', W / 2, 180, 34, '#fff3d6');
    outlinedText(ctx, 'JUSTICE vs. POWER', W / 2, 228, 34, '#fff3d6');

    // studio lights and their beams
    for (const lx of [120, W / 2, W - 120]) {
      ctx.fillStyle = 'rgba(255,240,200,0.07)';
      ctx.beginPath(); ctx.moveTo(lx - 14, 50); ctx.lineTo(lx + 14, 50); ctx.lineTo(lx + 150, FLOOR); ctx.lineTo(lx - 150, FLOOR); ctx.closePath(); ctx.fill();
      blob(ctx, lx, 40, 26, 20, '#444', lx);
      blob(ctx, lx, 48, 16, 8, '#fff6c8', lx + 1);
      ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 22); ctx.stroke();
    }

    // moderator desk
    quad(ctx, [[W / 2 - 110, FLOOR - 120], [W / 2 + 110, FLOOR - 120], [W / 2 + 95, FLOOR - 40], [W / 2 - 95, FLOOR - 40]], '#5a3a1e', 60);
    quad(ctx, [[W / 2 - 120, FLOOR - 128], [W / 2 + 120, FLOOR - 128], [W / 2 + 120, FLOOR - 116], [W / 2 - 120, FLOOR - 116]], '#7a5230', 61);
    // microphone on the desk
    limb(ctx, W / 2, FLOOR - 128, W / 2 + 6, FLOOR - 156, 3, '#888', 62);
    blob(ctx, W / 2 + 6, FLOOR - 160, 6, 8, '#333', 63);

    // two empty swivel chairs
    for (const cx of [190, W - 190]) {
      quad(ctx, [[cx - 34, FLOOR - 150], [cx + 34, FLOOR - 150], [cx + 30, FLOOR - 80], [cx - 30, FLOOR - 80]], '#e0702a', cx);
      quad(ctx, [[cx - 40, FLOOR - 84], [cx + 40, FLOOR - 84], [cx + 36, FLOOR - 66], [cx - 36, FLOOR - 66]], '#c85a1c', cx + 1);
      limb(ctx, cx, FLOOR - 66, cx, FLOOR - 40, 6, '#777', cx + 2);
    }

    // carpet
    ctx.fillStyle = '#4a2a3a';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(W, FLOOR); ctx.stroke();
  }

  // ---------- Effects ----------

  function drawEffect(ctx, e) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    switch (e.kind) {
      case 'stunZone': {
        const armed = e.age >= e.armedAt;
        ctx.save();
        ctx.globalAlpha = armed ? 1 : 0.35 + 0.65 * (e.age / e.armedAt);
        // watchtower
        quad(ctx, [[cx - 22, e.y - 40], [cx + 22, e.y - 40], [cx + 30, FLOOR], [cx - 30, FLOOR]], '#9a9a9a', 70);
        quad(ctx, [[cx - 40, e.y - 80], [cx + 40, e.y - 80], [cx + 30, e.y - 40], [cx - 30, e.y - 40]], '#bdbdbd', 71);
        blob(ctx, cx, e.y - 60, 22, 13, '#fff', 72);
        blob(ctx, cx, e.y - 60, 8, 8, '#1a3a8a', 73);
        if (armed) {
          ctx.fillStyle = 'rgba(255,240,120,0.45)';
          ctx.beginPath(); ctx.moveTo(cx - 10, e.y - 52); ctx.lineTo(cx + 10, e.y - 52); ctx.lineTo(cx + 60, FLOOR); ctx.lineTo(cx - 60, FLOOR); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'projectile': {
        // a spinning syntax tree: S -> NP VP
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(e.age * 0.3) * 0.4);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-18, 10); ctx.moveTo(0, -12); ctx.lineTo(18, 10); ctx.stroke();
        for (const [tx, ty, t] of [[0, -16, 'S'], [-20, 14, 'NP'], [20, 14, 'VP']]) {
          blob(ctx, tx, ty, t.length * 8 + 4, 10, '#fffbe8', tx);
          plainText(ctx, t, tx, ty + 1, 13, INK, 'center', LOUD);
        }
        ctx.restore();
        break;
      }
      case 'drop': {
        // a 1960s wooden TV set
        quad(ctx, [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h - 10], [e.x, e.y + e.h - 10]], '#8a5a2a', 80);
        blob(ctx, e.x + e.w * 0.42, e.y + e.h * 0.45, e.w * 0.3, e.h * 0.3, '#9fb7a8', 81);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(e.x + 18, e.y + e.h * 0.45 + k * 6 + wob(k)); ctx.lineTo(e.x + e.w * 0.68, e.y + e.h * 0.45 + k * 6); ctx.stroke(); }
        blob(ctx, e.x + e.w * 0.85, e.y + 20, 5, 5, '#ddd', 82);
        blob(ctx, e.x + e.w * 0.85, e.y + 38, 5, 5, '#ddd', 83);
        limb(ctx, cx, e.y, cx - 28, e.y - 34, 2, '#999', 84);
        limb(ctx, cx, e.y, cx + 26, e.y - 36, 2, '#999', 85);
        limb(ctx, e.x + 10, e.y + e.h - 10, e.x + 4, e.y + e.h, 4, '#5a3a1e', 86);
        limb(ctx, e.x + e.w - 10, e.y + e.h - 10, e.x + e.w - 4, e.y + e.h, 4, '#5a3a1e', 87);
        break;
      }
      case 'burst': {
        // a chain snapping apart
        const spread = (10 - e.ttl) * 6;
        star(ctx, cx, cy, 34 + spread, '#fff6a8');
        for (let k = 0; k < 3; k++) {
          ctx.lineWidth = 5; ctx.strokeStyle = '#888';
          ctx.beginPath(); ctx.ellipse(cx - 40 - spread - k * 20, cy, 12, 8, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(cx + 40 + spread + k * 20, cy, 12, 8, 0, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      }
      case 'rush': {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        const back = -Math.sign(e.vx);
        for (let k = 0; k < 5; k++) {
          const ly = e.y + 20 + k * 25;
          ctx.beginPath(); ctx.moveTo(cx + back * 40, ly); ctx.lineTo(cx + back * (100 + (k % 2) * 30), ly); ctx.stroke();
        }
        if (e.look) {
          drawFighterRig(ctx, e.look, cx, FLOOR, Math.sign(e.vx) || 1, 'punch', 0.9);
          nameTag(ctx, e.label, cx, FLOOR - 200);
        } else {
          blob(ctx, cx, cy, 30, 60, '#ccc', 88);
        }
        break;
      }
    }
  }

  function nameTag(ctx, name, x, y) {
    if (!name) return;
    ctx.save();
    ctx.font = `15px ${CRUDE}`;
    const w = ctx.measureText(name).width + 16;
    x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x));
    ctx.fillStyle = '#fffbe8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(x - w / 2, y - 11, w, 22); ctx.fill(); ctx.stroke();
    ctx.restore();
    plainText(ctx, name, x, y, 15, INK);
  }

  function drawAssist(ctx, a) {
    // A rushing scholar is drawn by its effect once the charge starts.
    if (a.assist.kind === 'rush' && a.phase !== 'enter') return;
    const pose = a.phase === 'attack' ? 'special' : 'walk';
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawFighterRig(ctx, a.look, a.x, a.y, a.facing, pose, 0.85);
    ctx.restore();
    nameTag(ctx, a.name, a.x, a.y - 190);
  }

  // ---------- Transient FX ----------

  function drawFx(ctx, match) {
    for (const f of fx) {
      const life = f.ttl / f.max;
      if (f.type === 'spark') {
        star(ctx, f.x, f.y, 18 + (1 - life) * 22, f.color);
        outlinedText(ctx, f.word, f.x, f.y - 40 - (1 - life) * 20, 28, f.color);
      } else if (f.type === 'bubble' && match) {
        const fighter = match.fighters[f.player];
        speechBubble(ctx, f.text, fighter.x, fighter.y - 205);
      } else if (f.type === 'callout' && match) {
        const fighter = match.fighters[f.player];
        outlinedText(ctx, fighter.def.special.name.toUpperCase() + '!', fighter.x, fighter.y - 250 - (1 - life) * 15, 30, '#ffb3f0');
      }
    }
  }

  function speechBubble(ctx, text, x, y) {
    ctx.save();
    ctx.font = `18px ${CRUDE}`;
    const w = ctx.measureText(text).width + 28;
    const bx = Math.max(10, Math.min(W - w - 10, x - w / 2));
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(bx + w / 2, y, w / 2, 24, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y + 20); ctx.lineTo(x, y + 44); ctx.lineTo(x + 8, y + 20); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    plainText(ctx, text, bx + w / 2, y, 18, INK);
  }

  // ---------- HUD ----------

  function hpColor(ratio) {
    if (ratio > 0.5) return '#5fd35f';
    if (ratio > 0.25) return '#f2c94c';
    return '#ef5a4a';
  }

  function drawHud(ctx, m) {
    const barW = 380, barH = 26, top = 18;
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i];
      const ratio = f.hp / CONFIG.maxHp;
      const x = i === 0 ? 30 : W - 30 - barW;
      ctx.fillStyle = '#222';
      ctx.fillRect(x, top, barW, barH);
      ctx.fillStyle = hpColor(ratio);
      const fillW = barW * ratio;
      ctx.fillRect(i === 0 ? x + barW - fillW : x, top, fillW, barH);
      ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.strokeRect(x, top, barW, barH);
      outlinedText(ctx, f.def.name.toUpperCase(), i === 0 ? x : x + barW, top + barH + 18, 20, '#fff', { align: i === 0 ? 'left' : 'right' });
      // round-win pips next to the timer
      for (let k = 0; k < CONFIG.roundsToWin; k++) {
        const px = i === 0 ? x + barW - 14 - k * 22 : x + 14 + k * 22;
        blob(ctx, px, top + barH + 16, 7, 7, k < m.wins[i] ? '#ffe14d' : '#444', px);
      }
      drawCiteMeter(ctx, m, i);
    }
    // timer
    blob(ctx, W / 2, top + 16, 36, 28, '#222', 90);
    outlinedText(ctx, String(Math.max(0, Math.ceil(m.timer / CONFIG.tickRate))), W / 2, top + 17, 32, '#fff');
  }

  function drawCiteMeter(ctx, m, i) {
    const cs = m.cites[i];
    const ready = cs.cooldown === 0;
    const w = 220, h = 14, y = H - 34;
    const x = i === 0 ? 24 : W - 24 - w;
    const fill = 1 - cs.cooldown / CONFIG.citeCooldownTicks;
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ready ? (frameTick % 30 < 15 ? '#ffb3f0' : '#ff7fe0') : '#8a6a9a';
    ctx.fillRect(x, y, w * fill, h);
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    const key = keyLabel(CD.KEYMAP[i].cite);
    plainText(ctx, (ready ? `CITE [${key}] ` : 'citing… ') + `Next: ${CD.nextCitation(cs)}`, i === 0 ? x : x + w, y - 12, 15, '#fff', i === 0 ? 'left' : 'right');
  }

  function drawBanner(ctx, m) {
    if (!m.banner) return;
    const pulse = 1 + Math.sin(frameTick * 0.2) * 0.04;
    outlinedText(ctx, m.banner, W / 2, H * 0.42, Math.round(64 * pulse), '#ffe14d', { maxWidth: W - 60 });
    if (m.phase === 'roundEnd' && m.banner === 'TIME!' && m.roundResult !== null && m.roundResult !== 'draw') {
      outlinedText(ctx, m.fighters[m.roundResult].def.name.toUpperCase() + ' TAKES THE ROUND', W / 2, H * 0.42 + 56, 28, '#fff');
    }
  }

  function drawFighters(ctx, m) {
    // draw the KO'd / back fighter first so the active one sits on top
    const order = m.fighters.slice().sort((a, b) => (a.state === 'ko') - (b.state === 'ko')).reverse();
    for (const f of order) {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 6, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      if (f.state === 'stunned' && frameTick % 8 < 4) ctx.globalAlpha = 0.7;
      drawFighterRig(ctx, f.look, f.x, f.y, f.facing, poseFor(f), 1);
      ctx.restore();
      if (f.state === 'stunned') drawDizzyStars(ctx, f.x, f.y - 190);
    }
  }

  function renderMatch(ctx, m, tick) {
    frameTick = tick;
    drawStage(ctx);
    for (const a of m.assists) drawAssist(ctx, a);
    drawFighters(ctx, m);
    for (const e of m.effects) drawEffect(ctx, e);
    drawFx(ctx, m);
    drawHud(ctx, m);
    drawBanner(ctx, m);
    tickFx();
  }

  // ---------- Screens ----------

  function renderSelect(ctx, sel, tick) {
    frameTick = tick;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1240');
    g.addColorStop(1, '#7a2a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    outlinedText(ctx, 'CITATION DEATHMATCH', W / 2, 44, 52, '#ffe14d');
    plainText(ctx, 'Settle it with your fists. Cite your sources.', W / 2, 84, 18, '#fff3d6');

    const cardW = 210, gap = 20, x0 = (W - (cardW * 4 + gap * 3)) / 2, cy = 110, cardH = 250;
    CD.fighterIds.forEach((id, k) => {
      const def = CD.FIGHTERS[id];
      const x = x0 + k * (cardW + gap);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, cy, cardW, cardH);
      const p1 = sel.cursor[0] === k, p2 = sel.cursor[1] === k;
      const mirror = p1 && p2;
      const pose = (p1 && sel.locked[0]) || (p2 && sel.locked[1]) ? 'win' : 'idle';
      drawFighterRig(ctx, p2 && !p1 ? def.altLook : def.look, x + cardW / 2, cy + 200, 1, pose, 0.82);
      outlinedText(ctx, def.name.toUpperCase(), x + cardW / 2, cy + 222, 19, '#fff', { maxWidth: cardW - 10 });
      plainText(ctx, def.special.name, x + cardW / 2, cy + 242, 14, '#ffb3f0');
      ctx.lineWidth = 5;
      if (p1) { ctx.strokeStyle = '#ff5a4a'; ctx.strokeRect(x - 2, cy - 2, cardW + 4, cardH + 4); }
      if (p2) { ctx.strokeStyle = '#4ab0ff'; ctx.strokeRect(x + (mirror ? 5 : -2), cy + (mirror ? 5 : -2), cardW - (mirror ? 10 : -4), cardH - (mirror ? 10 : -4)); }
      if (p1) outlinedText(ctx, sel.locked[0] ? 'P1 READY' : 'P1', x + 40, cy + 18, 20, '#ff5a4a', { align: 'center' });
      if (p2) outlinedText(ctx, sel.locked[1] ? 'P2 READY' : 'P2', x + cardW - 40, cy + 18, 20, '#4ab0ff', { align: 'center' });
    });

    // controls table
    const ty = 392;
    for (let i = 0; i < 2; i++) {
      const km = CD.KEYMAP[i];
      const x = i === 0 ? 120 : W / 2 + 70;
      const color = i === 0 ? '#ff5a4a' : '#4ab0ff';
      outlinedText(ctx, `PLAYER ${i + 1}`, x, ty, 22, color, { align: 'left' });
      const rows = [
        ['Move', [km.up, km.left, km.down, km.right].map(keyLabel).join(' ')],
        ['Punch / Kick', `${keyLabel(km.punch)} / ${keyLabel(km.kick)}`],
        ['Special', keyLabel(km.special)],
        ['Cite (summon)', keyLabel(km.cite)],
        ['Block', 'hold away'],
      ];
      rows.forEach(([label, keys], r) => {
        plainText(ctx, label, x, ty + 26 + r * 19, 15, '#fff3d6', 'left');
        plainText(ctx, keys, x + 150, ty + 26 + r * 19, 15, '#fff', 'left', LOUD);
      });
    }
    const p1k = CD.KEYMAP[0], p2k = CD.KEYMAP[1];
    plainText(ctx, `Pick: ${keyLabel(p1k.left)}/${keyLabel(p1k.right)} + ${keyLabel(p1k.punch)}  ·  ${keyLabel(p2k.left)}/${keyLabel(p2k.right)} + ${keyLabel(p2k.punch)}   ·   Enter: start   ·   Esc: back   ·   M: mute`, W / 2, H - 16, 14, '#d8c8ff');
  }

  function renderWinner(ctx, m, tick) {
    frameTick = tick;
    drawStage(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
    const w = m.winner, loser = 1 - w;
    drawFighterRig(ctx, m.fighters[loser].look, W / 2 + 190, FLOOR, -1, 'ko', 1);
    drawFighterRig(ctx, m.fighters[w].look, W / 2 - 60, FLOOR, 1, 'win', 1.5);
    outlinedText(ctx, m.banner || '', W / 2, 70, 46, '#ffe14d', { maxWidth: W - 60 });
    plainText(ctx, `“${m.fighters[w].def.winQuote}”`, W / 2, 120, 22, '#fff3d6');
    plainText(ctx, 'Enter: rematch  ·  Esc: character select', W / 2, H - 18, 16, '#d8c8ff');
  }

  function drawMuteIcon(ctx, muted) {
    plainText(ctx, muted ? '🔇 M' : '🔊 M', W - 12, H - 52, 14, 'rgba(255,255,255,0.6)', 'right');
  }

  Object.assign(CD, { pushRenderEvents, clearRenderEvents, keyLabel, drawFighterRig, poseFor, renderMatch, renderSelect, renderWinner, drawMuteIcon });
})(globalThis.CD = globalThis.CD || {});
