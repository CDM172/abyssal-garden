// ============================================================================
// the game: air, health and the sharks
// ============================================================================
// You are a diver. Air runs down under water and comes back at the surface. Sharks patrol the world; one that sees
// you (close enough, with no rock in between) hunts you until it loses you. Rock breaks their line of sight, and
// they will not follow into tight spaces, so canyons, arches and tunnels are where you hide.
const NSH = 5; // sharks
// per shark: 0-2 position, 3 yaw, 4 pitch, 5 speed, 6 state, 7 timer, 8-10 target, 11 swim phase, 12 bite cooldown,
// 13 length (m), 14 how long it still remembers where you are, 15 sees you
const SHK = new Float32Array(NSH * 16), SHI = new Float32Array(NSH * 8);
const PATROL = 0, CHASE = 1, SEARCH = 2, LEAVE = 3;
const AIRT = 80; // seconds of air at rest
// play: 0 before the first dive, 1 diving, 2 dead
let play = 0, air = 100, hp = 100, surv = 0, danger = 0, hidden = false, hurtT = 0, gHud = 0, gUp = false, gRun = false, losI = 0, losT = 0, GX = 0, GY = 0, GZ = 0, thump = null;
const gEl = (id) => document.getElementById(id);
const E_AIR = gEl('ga'), E_HP = gEl('gh'), E_ST = gEl('gs'), E_RED = gEl('gr'), E_MSG = gEl('x'), E_T = gEl('gt');

// a new place to swim to: somewhere along the camera path, which the world generator keeps clear of rock
function sharkGoal(o) {
  const p = flyPts[rnd() * flyPts.length | 0];
  SHK[o + 8] = p[0] + rr(-8, 8); SHK[o + 9] = clamp(p[1] + rr(3, 14), -48, -6); SHK[o + 10] = p[2] + rr(-8, 8); SHK[o + 7] = 45;
}
function gameReset() {
  air = 100; hp = 100; surv = 0; danger = 0; hurtT = 0;
  for (let i = 0; i < NSH; i++) {
    const o = i * 16;
    for (let k = 0; k < 40; k++) { sharkGoal(o); if (hypot(SHK[o + 8] - F[CX], SHK[o + 10] - F[CZ]) > 95) break; }
    SHK[o] = SHK[o + 8]; SHK[o + 1] = SHK[o + 9]; SHK[o + 2] = SHK[o + 10];
    SHK[o + 3] = rnd() * TAU; SHK[o + 4] = 0; SHK[o + 5] = 3; SHK[o + 6] = PATROL; SHK[o + 11] = rnd() * TAU; SHK[o + 12] = 0;
    SHK[o + 13] = 4 + i * 0.4; SHK[o + 14] = 0; SHK[o + 15] = 0;
    sharkGoal(o);
  }
}
// GX, GY, GZ = direction out of the rock at a point (zero where no rock is within a metre)
function gradAt(x, y, z) {
  GX = sdAt(x + 0.6, y, z) - sdAt(x - 0.6, y, z); GY = sdAt(x, y + 0.6, z) - sdAt(x, y - 0.6, z); GZ = sdAt(x, y, z + 0.6) - sdAt(x, y, z - 0.6);
  const l = sqrt(GX * GX + GY * GY + GZ * GZ); if (l > 0.02) { GX /= -l; GY /= -l; GZ /= -l; } else GX = GY = GZ = 0;
}
// is the water between a point and the diver free of rock?
function sees(x, y, z) {
  const dx = F[CX] - x, dy = F[CY] - y, dz = F[CZ] - z, n = Math.ceil(sqrt(dx * dx + dy * dy + dz * dz) / 1.5);
  for (let k = 1; k < n; k++) if (sdAt(x + dx * k / n, y + dy * k / n, z + dz * k / n) > 0.15) return 0;
  return 1;
}
function gameOver(why) {
  play = 2; danger = 0;
  const s = surv | 0; let best = 0; try { best = +localStorage.abyssalBest || 0; } catch {}
  if (s > best) keep('abyssalBest', best = s);
  const tm = (v) => (v / 60 | 0) + ':' + String(v % 60).padStart(2, '0');
  E_MSG.textContent = `${why} You lasted ${tm(s)}. Best: ${tm(best)}.`;
  gEl('d').textContent = 'Dive again';
  if (document.pointerLockElement) document.exitPointerLock(); else ui(true);
}
function gameStep(dt, sprint) {
  const px = F[CX], py = F[CY], pz = F[CZ], live = play === 1;
  // tucked in: rock close by on at least three of the six sides
  let cov = 0;
  if (sdAt(px + 2.6, py, pz) > -0.5) cov++; if (sdAt(px - 2.6, py, pz) > -0.5) cov++; if (sdAt(px, py + 2.6, pz) > -0.5) cov++;
  if (sdAt(px, py - 2.6, pz) > -0.5) cov++; if (sdAt(px, py, pz + 2.6) > -0.5) cov++; if (sdAt(px, py, pz - 2.6) > -0.5) cov++;
  hidden = cov > 2;
  const up = gUp = py > -1.9; gRun = !!sprint;
  const range = hidden ? 11 : sprint ? 50 : 34;
  losT += dt; let check = -1; if (losT > 0.06) { losT = 0; check = losI; losI = (losI + 1) % NSH; }
  let dg = 0, hunt = 0, nearD = 1e9;
  for (let i = 0; i < NSH; i++) {
    const o = i * 16; let x = SHK[o], y = SHK[o + 1], z = SHK[o + 2], st = SHK[o + 6];
    const ex = px - x, ey = py - y, ez = pz - z, dist = sqrt(ex * ex + ey * ey + ez * ez);
    if (dist < nearD) nearD = dist;
    // it notices you ahead of it or to the side (or right next to it), not behind its tail
    if (i === check) SHK[o + 15] = live && dist < range && (dist < 9 || (ex * sin(SHK[o + 3]) - ez * cos(SHK[o + 3])) > dist * -0.15) && sees(x, y, z) ? 1 : 0;
    const see = live && SHK[o + 15] > 0;
    SHK[o + 7] -= dt; SHK[o + 12] -= dt;
    if (see && st !== LEAVE) { st = CHASE; SHK[o + 14] = 2.5; }
    if (st === CHASE) {
      if (SHK[o + 14] > 0) { SHK[o + 8] = px; SHK[o + 9] = py; SHK[o + 10] = pz; } // still knows where you are
      if (!see && (SHK[o + 14] -= dt) < -6) { st = SEARCH; SHK[o + 7] = 12; }
      if (!live) st = PATROL;
      else if (dist < 2.3 && SHK[o + 12] < 0) { // bite, then swim off and come round again
        hp -= 25; hurtT = 1; if (thump) thump(); st = LEAVE; SHK[o + 7] = 4.5; SHK[o + 12] = 6;
        SHK[o + 8] = x - ex * 14 + rr(-8, 8); SHK[o + 9] = clamp(y + rr(2, 10), -48, -6); SHK[o + 10] = z - ez * 14 + rr(-8, 8);
      }
    } else if (st === SEARCH) {
      const tx = SHK[o + 8] - x, tz = SHK[o + 10] - z;
      if (tx * tx + tz * tz < 30) { SHK[o + 8] += rr(-14, 14); SHK[o + 9] = clamp(SHK[o + 9] + rr(-4, 6), -48, -6); SHK[o + 10] += rr(-14, 14); }
      if (SHK[o + 7] < 0) { st = PATROL; sharkGoal(o); }
    } else {
      const tx = SHK[o + 8] - x, ty = SHK[o + 9] - y, tz = SHK[o + 10] - z;
      if (SHK[o + 7] < 0 || tx * tx + ty * ty + tz * tz < 40) { st = PATROL; sharkGoal(o); }
    }
    // steer: towards the target, away from rock ahead
    let wx = SHK[o + 8] - x, wy = SHK[o + 9] - y, wz = SHK[o + 10] - z; const wl = sqrt(wx * wx + wy * wy + wz * wz) || 1; wx /= wl; wy /= wl; wz /= wl;
    const yaw = SHK[o + 3], pit = SHK[o + 4], cp = cos(pit), fx = sin(yaw) * cp, fy = sin(pit), fz = -cos(yaw) * cp;
    let tight = 0;
    for (let k = 1; k < 3; k++) {
      const ax = x + fx * 3.6 * k, ay = y + fy * 3.6 * k, az = z + fz * 3.6 * k;
      if (sdAt(ax, ay, az) > -0.95) { gradAt(ax, ay, az); const w = 2.4 / k; wx += GX * w; wy += GY * w + 0.25; wz += GZ * w; }
      if (k === 1) { // a gap too narrow for a shark: rock on two sides of the water ahead
        if (sdAt(ax + fz * 2.3, ay, az - fx * 2.3) > -0.6) tight++; if (sdAt(ax - fz * 2.3, ay, az + fx * 2.3) > -0.6) tight++;
        if (sdAt(ax, ay + 2.3, az) > -0.6) tight++; if (sdAt(ax, ay - 2.3, az) > -0.6) tight++;
      }
    }
    if (tight > 1) { wx -= fx * 2; wz -= fz * 2; wy += 0.5; if (st === CHASE) { st = SEARCH; SHK[o + 7] = 10; SHK[o + 8] = x - fx * 12; SHK[o + 9] = clamp(y + 4, -48, -6); SHK[o + 10] = z - fz * 12; } }
    if (y > -5) wy -= 0.5; if (y < -47) wy += 0.5;
    const hl = sqrt(wx * wx + wz * wz), turn = (st === CHASE ? 1.7 : 0.9) * dt;
    let dy = atan2(wx, -wz) - yaw; dy -= round(dy / TAU) * TAU; dy = dy > turn ? turn : dy < -turn ? -turn : dy;
    let dp = clamp(atan2(wy, hl), -0.75, 0.75) - pit; dp = dp > turn * 0.7 ? turn * 0.7 : dp < -turn * 0.7 ? -turn * 0.7 : dp;
    SHK[o + 3] = yaw + dy; SHK[o + 4] = pit + dp;
    const want = st === CHASE ? (dist < 12 ? 10.5 : 8.6) : st === SEARCH ? 4.6 : st === LEAVE ? 7 : 3, sp = SHK[o + 5] += (want - SHK[o + 5]) * (1 - exp(-dt * 1.6));
    x += fx * sp * dt; y += fy * sp * dt; z += fz * sp * dt;
    // keep out of the rock and inside the world
    const s = sdAt(x, y, z) + 0.9; if (s > 0) { gradAt(x, y, z); x += GX * s; y += GY * s; z += GZ * s; }
    const r = sqrt(x * x + z * z); if (r > 138) { x *= 138 / r; z *= 138 / r; }
    y = y < -50 ? -50 : y > -3 ? -3 : y;
    SHK[o] = x; SHK[o + 1] = y; SHK[o + 2] = z; SHK[o + 6] = st; SHK[o + 11] += dt * (2.2 + sp * 0.75);
    const q = i * 8; SHI[q] = x; SHI[q + 1] = y; SHI[q + 2] = z; SHI[q + 3] = SHK[o + 13]; SHI[q + 4] = SHK[o + 3]; SHI[q + 5] = SHK[o + 4]; SHI[q + 6] = SHK[o + 11]; SHI[q + 7] = dy / (dt + 1e-4);
    if (st === CHASE) { hunt++; dg = 1; } else if (live) dg = max(dg, 0.6 * (1 - dist / 45));
  }
  danger += (dg - danger) * (1 - exp(-dt * 2));
  if (!live) return;
  surv += dt;
  if (up) air = min(100, air + 34 * dt); else air -= 100 / AIRT * (sprint ? 2.6 : 1) * dt;
  if (air <= 0) { air = 0; hp -= 14 * dt; hurtT = max(hurtT, 0.5); }
  hurtT -= dt * 0.9;
  if (hp <= 0) { hp = 0; gameOver(air <= 0 ? 'You ran out of air.' : 'The sharks got you.'); }
  if ((gHud += dt) > 0.1 || play !== 1) {
    gHud = 0;
    E_AIR.style.transform = `scaleX(${air / 100})`; E_HP.style.transform = `scaleX(${hp / 100})`;
    E_AIR.className = air < 25 ? 'w' : '';
    E_RED.style.opacity = clamp(max(hurtT, air < 25 && !up ? 0.25 + 0.2 * sin(surv * 6) : 0), 0, 1);
    const tx = hunt ? (hidden ? 'Hunted · stay out of sight' : 'Hunted · get behind rock') : air <= 0 ? 'No air · surface now' : up ? 'Breathing' : air < 25 ? 'Low air · surface' : hidden ? 'Hidden' : nearD < 45 ? 'Shark nearby' : '';
    if (E_ST.textContent !== tx) { E_ST.textContent = tx; E_ST.className = hunt || air < 25 && !up ? 'w' : ''; }
    const s = surv | 0, t = (s / 60 | 0) + ':' + (s % 60 < 10 ? '0' : '') + s % 60; if (E_T.textContent !== t) E_T.textContent = t;
  }
}

// shark: 1 unit long, nose +z, back +y; aux = 1 on the pale belly
function meshShark() {
  const m = new Mesh(), M = 14, rings = [];
  // z, half width, half height, centre height
  const B = [[0.5, 0.004, 0.004, 0.005], [0.47, 0.03, 0.022, 0.0], [0.42, 0.052, 0.042, 0.0], [0.34, 0.072, 0.066, 0.004], [0.22, 0.09, 0.09, 0.006], [0.08, 0.094, 0.1, 0.006], [-0.06, 0.084, 0.094, 0.004],
    [-0.2, 0.062, 0.074, 0.002], [-0.32, 0.036, 0.048, 0.002], [-0.41, 0.018, 0.03, 0.004], [-0.47, 0.01, 0.022, 0.008]];
  for (const b of B) { const r = []; for (let k = 0; k < M; k++) { const a = k / M * TAU, s = sin(a); r.push(m.v(cos(a) * b[1], b[3] + s * b[2] * (s < 0 ? 0.8 : 1), b[0], s < -0.25 ? 1 : 0)); } rings.push(r); }
  for (let i = 0; i < B.length - 1; i++) for (let k = 0; k < M; k++) { const k2 = (k + 1) % M; m.quad(rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]); }
  // fins: thin wedges (a front and a back sheet around a thicker root)
  const fin = (a, b, c, t, aux = 0) => { const A1 = m.v(a[0] + t[0], a[1] + t[1], a[2] + t[2], aux), A2 = m.v(a[0] - t[0], a[1] - t[1], a[2] - t[2], aux), B1 = m.v(b[0] + t[0], b[1] + t[1], b[2] + t[2], aux), B2 = m.v(b[0] - t[0], b[1] - t[1], b[2] - t[2], aux), C = m.v(c[0], c[1], c[2], aux); m.tri(A1, B1, C); m.tri(B2, A2, C); m.tri(A1, C, A2); m.tri(B1, B2, C); };
  fin([0, 0.09, 0.12], [0, 0.085, -0.07], [0, 0.25, -0.1], [0.012, 0, 0]);                     // dorsal
  fin([0, 0.05, -0.27], [0, 0.045, -0.33], [0, 0.085, -0.35], [0.006, 0, 0]);                  // second dorsal
  fin([0, 0.01, -0.42], [0, 0.03, -0.5], [0, 0.23, -0.62], [0.008, 0, 0]);                     // tail, upper lobe
  fin([0, 0.0, -0.42], [0, -0.01, -0.49], [0, -0.13, -0.56], [0.008, 0, 0]);                   // tail, lower lobe
  for (const s of [-1, 1]) {
    fin([s * 0.07, -0.035, 0.24], [s * 0.07, -0.04, 0.1], [s * 0.3, -0.1, 0.04], [0, 0.01, 0]);  // pectoral
    fin([s * 0.04, -0.05, -0.2], [s * 0.04, -0.05, -0.27], [s * 0.1, -0.09, -0.3], [0, 0.005, 0], 1); // pelvic
  }
  return m;
}
