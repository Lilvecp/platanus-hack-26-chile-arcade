// CUMA DRIFT — Platanus Hack 26 Arcade
// Drift nocturno de Maipú al cerro. Todo generado por código.

const W = 800, H = 600;

// Arcade cabinet button → keyboard key mapping.
// DO NOT modify this mapping — it matches the real arcade cabinet wiring.
const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u'], P1_2: ['i'], P1_3: ['o'],
  P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'],
  P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter'], START2: ['2'],
};

const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) KEY_TO_ARCADE[key.length === 1 ? key.toLowerCase() : key] = code;
}

const held = Object.create(null);
let hit = Object.create(null);
let idle = 0;

window.addEventListener('keydown', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) {
    if (!held[code]) hit[code] = 1;
    held[code] = 1;
    idle = 0;
    e.preventDefault();
  }
  if (AC && AC.state === 'suspended') AC.resume();
});
window.addEventListener('keyup', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) held[code] = 0;
});

const pk = (p, k) => held['P' + p + '_' + k];
const btn = (p, a) => (a ? pk(p, 2) || pk(p, 5) : pk(p, 1) || pk(p, 4));
const gas = (p) => pk(p, 'U') || pk(p, 3);
const tap = (p, k) => hit['P' + p + '_' + k];
function okHit(p) {
  for (let i = 1; i < 7; i++) if (hit['P' + p + '_' + i]) return 1;
  return hit['START' + p];
}

// ---------- storage ----------
function store() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) {
      try {
        const r = window.localStorage.getItem(k);
        return r === null ? { found: false, value: null } : { found: true, value: JSON.parse(r) };
      } catch (e) { return { found: false, value: null }; }
    },
    async set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sandbox */ } },
  };
}
const SK = 'cumadrift-1';
const fresh = () => ({ car: 0, own: [1, 0, 0, 0], up: [0, 0, 0, 0, 0, 0, 0], cash: 0, prog: 0, best: [0, 0, 0, 0, 0], bug: 0, on: 0 });
let SV = fresh();
function save() { try { store().set(SK, SV).catch(() => {}); } catch (e) { /* ignore */ } }
function load() {
  try {
    store().get(SK).then((r) => {
      const v = r && r.found && r.value;
      const arr = (a, n) => Array.isArray(a) && a.length === n && a.every((x) => typeof x === 'number');
      if (v && arr(v.own, 4) && arr(v.up, 7) && arr(v.best, 5) && typeof v.cash === 'number') {
        SV = Object.assign(fresh(), v);
        SV.car = Math.max(0, Math.min(3, SV.car | 0));
        SV.prog = Math.max(0, Math.min(5, SV.prog | 0));
      }
    }).catch(() => {});
  } catch (e) { /* ignore */ }
}

// ---------- helpers ----------
const abs = Math.abs, sin = Math.sin, min = Math.min, max = Math.max, rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sgn = (v) => (v < 0 ? -1 : 1);
function mix(a, b, t) {
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), l = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (r << 16) | (g << 8) | l;
}
function rng(s) {
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fmt = (n) => '$' + String(max(0, n | 0)).replace(/\B(?=(\d{3})+$)/g, '.');
const tm = (t) => (t / 60 | 0) + ':' + ('0' + (t % 60).toFixed(2)).slice(-5);

// ---------- data ----------
const F = 460, M = 0.005;
let RW = 1000;

// pw: drive accel m/s2, vm: top speed m/s, mu: tyre grip, dr: 0 front / 1 rear / 2 all wheel drive
const CARS = [
  { n: 'PEJÓ 206', pw: 3.8, vm: 38, mu: 1, dr: 0, p: 0 },
  { n: "CHEVETE '85", pw: 4.3, vm: 40, mu: 1, dr: 1, p: 4000 },
  { n: 'SUBARO 4X4', pw: 5.6, vm: 48, mu: 1.12, dr: 2, p: 9000 },
  { n: 'BMV 320 ZORRÓN', pw: 7, vm: 54, mu: 1.1, dr: 1, p: 18000 },
];
// w, hb(body), hc(cabin), l(lift), c(color), t(shape 0 hatch 1 sedan 2 box 3 beetle)
const CT = [
  { w: 370, hb: 150, hc: 120, l: 55, c: 0x9aa3ad, t: 0, L: 880 },
  { w: 390, hb: 140, hc: 105, l: 55, c: 0xe6dfc4, t: 1, L: 900 },
  { w: 385, hb: 145, hc: 108, l: 48, c: 0x1c4fd8, t: 1, L: 900 },
  { w: 430, hb: 135, hc: 100, l: 32, c: 0x24143a, t: 1, L: 900 },
  { w: 640, hb: 600, hc: 0, l: 70, c: 0xf2c21a, t: 2, L: 2300 },
  { w: 620, hb: 680, hc: 0, l: 90, c: 0x8d97a3, t: 2, L: 2500 },
  { w: 390, hb: 140, hc: 105, l: 55, c: 0x151515, t: 1, L: 900 },
  { w: 380, hb: 145, hc: 110, l: 55, c: 0x3b6ea8, t: 0, L: 880 },
  { w: 400, hb: 140, hc: 105, l: 55, c: 0xf4f4f4, t: 1, L: 900 },
  { w: 370, hb: 170, hc: 110, l: 50, c: 0x7fc6d9, t: 3, L: 820 },
];
const UPS = [
  { n: 'MOTOR', m: 3, p: 800 }, { n: 'NEUMÁTICOS', m: 3, p: 600 }, { n: 'TURBO', m: 3, p: 700 },
  { n: 'NEÓN', m: 1, p: 500 }, { n: 'ALERÓN', m: 1, p: 700 }, { n: 'ESCAPE LIBRE', m: 1, p: 600 }, { n: 'PARLANTES', m: 1, p: 900 },
];
// sky[top,horizon], grass, road, rumble, fog, rail, side objects, lamps every
const TH = [
  { sky: [0x05061a, 0x3a1f4a], gr: [0x23221f, 0x1d1c1a], rd: [0x2e2e34, 0x29292f], rm: [0x8a8a8a, 0x4a4a4a], fog: 0x120d1c, side: 'hhthk', ev: 7, lamp: 14 },
  { sky: [0x06041a, 0x70264f], gr: [0x2a2a30, 0x242429], rd: [0x33333a, 0x2d2d33], rm: [0xe8c21a, 0x33333a], fog: 0x1f0d1c, side: 'bbbs', ev: 6, lamp: 11 },
  { sky: [0x03051a, 0x53245a], gr: [0x1f2a22, 0x1a241d], rd: [0x303036, 0x2a2a30], rm: [0xdddddd, 0x33333a], fog: 0x170d20, side: 'btbt', ev: 7, lamp: 12, tw: 1 },
  { sky: [0x02030f, 0x2a3a6a], gr: [0x20262c, 0x1b2026], rd: [0x2f2f35, 0x29292f], rm: [0xcc2222, 0xdddddd], fog: 0x0c0f1c, side: 'bbtb', ev: 7, lamp: 10 },
  { sky: [0x01020c, 0x1a2a5a], gr: [0xc8d4e4, 0xb2c0d6], rd: [0x33343c, 0x2c2d35], rm: [0xcc2222, 0xeeeeee], fog: 0x0a1026, side: 'ppqp', ev: 8, lamp: 0 },
];
const RT = [
  { n: 'MAIPÚ', s: 'LAS POBLAS', th: 0, two: 1, seed: 7, pts: [0, 0, 0, 90, 30, 130, 90, 140, 130, 170, 130, 230, 90, 260, 20, 250, -20, 210, -70, 200, -110, 160, -110, 80, -70, 40, -60, -20, -30, -50, 0, -40], tr: 8, trT: [7, 6, 7, 4], hz: { y: 4, m: 3, d: 2 }, rv: { n: 'EL BRAYAN', q: '¿Con el auto de tu papi? JAJAJA.\nTe espero en la plaza, longi.', car: 1, col: 0xe6dfc4, vm: 26, al: 5 }, win: 1500 },
  { n: 'SANTIAGO CENTRO', s: 'ALAMEDA Y CALLES CHICAS', th: 1, seed: 21, sc: 0.76, pts: [0, 0, 0, 160, 20, 200, 80, 200, 100, 180, 100, 120, 120, 100, 200, 100, 220, 120, 220, 220, 200, 240, 60, 260, 20, 300, -60, 300, -80, 280, -80, 200, -140, 180, -160, 140, -160, 20, -140, -20, -40, -40, -10, -30], tr: 14, trT: [4, 4, 6, 6, 7, 7], hz: { y: 5, P: 2 }, rv: { n: 'LA YESSENIA', q: 'En el centro mando yo, perrito.\nNo me vas a ver ni las luces.', car: 2, col: 0xff5fb0, vm: 28, al: 5.4 }, win: 2500 },
  { n: 'PROVIDENCIA', s: 'COSTANERA CENTER', th: 2, seed: 33, sc: 0.7, pts: [0, 0, 10, 120, 60, 200, 150, 230, 230, 200, 260, 120, 320, 80, 400, 110, 420, 200, 380, 280, 280, 320, 160, 330, 60, 380, -40, 360, -90, 280, -60, 200, -110, 120, -100, 20, -50, -40, -10, -50], tr: 16, trT: [4, 6, 6, 7, 7, 5], hz: { y: 4, g: 2, P: 2 }, rv: { n: 'EL TÍO LUCHO', q: 'Yo cruzo Provi en 4 minutos.\nCon pasajeros y dando vuelto.', car: 6, col: 0x151515, vm: 31, al: 6 }, win: 3500 },
  { n: 'LAS CONDES', s: 'EL GOLF Y APOQUINDO', th: 3, two: 1, seed: 48, sc: 0.7, pts: [0, 0, 0, 140, 40, 190, 110, 190, 150, 150, 150, 60, 190, 20, 260, 20, 300, 60, 300, 160, 340, 210, 340, 300, 290, 350, 200, 340, 150, 290, 90, 290, 40, 340, -40, 340, -90, 290, -90, 210, -140, 160, -140, 40, -100, -20, -30, -30], tr: 12, trT: [7, 7, 7, 6, 4], hz: { y: 4, P: 2, g: 2 }, rv: { n: 'EL MATI', q: 'Mi papá es dueño de esta comuna.\nLiteral. Córrete.', car: 7, col: 0xf2f2f2, vm: 35, al: 6.8 }, win: 5000 },
  { n: 'FARELLONES', s: 'LAS 40 CURVAS', th: 4, two: 1, seed: 64, hw: 4.6, slope: 0.05, tr: 5, trT: [7, 7, 4], rv: { n: 'EL REY DEL CERRO', q: 'Nadie ha pasado la curva 40\ndelante mío. Nadie.', car: 3, col: 0x24143a, vm: 40, al: 7.6 }, win: 9000 },
  { n: 'PISTA LIBRE', s: 'ESTACIONAMIENTO DEL MALL', th: 0, seed: 9, hw: 7, lot: [-80, -120, 190, 160], pts: [0, 0, 0, 60, 30, 90, 80, 90, 110, 60, 110, -20, 80, -50, 30, -50] },
];

// ---------- globals ----------
let G, g0, g1, gu, cam0, cam1, AC, MF, MU, BS, NB;
let S = 'boot', st = 0, sel = 0, now = 0, R = null, page = 0, rsel = 0;
let VS = { c: [0, 3], r: [0, 0], rt: 0 };
const STARS = [], MTN = [], CITY = [];

// ---------- audio ----------
function initAudio() {
  try { AC = G.sound.context || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const cp = AC.createDynamicsCompressor(), mg = AC.createGain();
  mg.gain.value = 0.55;
  MF = AC.createGain(); MF.connect(cp); cp.connect(mg); mg.connect(AC.destination);
  MU = AC.createBiquadFilter(); MU.type = 'lowpass'; MU.frequency.value = 16000; MU.connect(MF);
  BS = AC.createBiquadFilter(); BS.type = 'lowpass'; BS.frequency.value = 650; BS.connect(MU);
  for (const du of [0.25, 0.125]) {
    const re = new Float32Array(32), im = new Float32Array(32);
    for (let k = 1; k < 32; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * du);
    PW.push(AC.createPeriodicWave(re, im));
  }
  NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = NB.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
}
function tone(f, d, ty, v, f2, t, dst) {
  if (!AC) return;
  t = t || AC.currentTime;
  const o = AC.createOscillator(), a = AC.createGain();
  if (typeof ty === 'string') o.type = ty; else o.setPeriodicWave(ty);
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(a); a.connect(dst || MF); o.start(t); o.stop(t + d + 0.02);
}
function nz(d, v, fq, ty, t, dst) {
  if (!AC) return;
  t = t || AC.currentTime;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), a = AC.createGain();
  s.buffer = NB; f.type = ty; f.frequency.value = fq;
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(a); a.connect(dst || MF); s.start(t, rnd() * 0.5); s.stop(t + d + 0.02);
}
const PW = [];
const SC = [0, 2, 3, 5, 7, 8, 10];
const deg = (d) => SC[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SONG = [
  { k: 45, b: 155, o: 'AABCC', s: [['00553344', '7-.7-9-87-4-.-4-5-.5-7-98-7-5---a-.a-9-89-7-.-7-8-.8-9-bb---8-9-'], ['55665564', '5-7-9-7-9-a-9-7-6-8-a-8-a-b-a-8-7-9-c-9-c-b-a-9-8-a-d-a-b-b-b.b.'], ['56005640', 'e---c-b-d---b-a-b-9-b-e-b---.-9-e---c-b-d---b-d-d-b-d-b-e-------']] },
  { k: 43, b: 150, o: 'AABCC', s: [['06560634', '7-7-9-b-a---8-6-7-7-9-c-a---.-8-7-7-9-b-d-b-a-8-a-8-a-c-b---b-.-'], ['33445566', 'a.a.a-c-a-8-a---b.b.b-d-b-8-b---c.c.c-e-c-9-c---d-d-f-d-f---d-b-'], ['05640560', 'e-b-e-g-e---c-9-d-a-d-f-d---b-8-e-b-e-g-h---g-e-f-d-f-d-e-------']] },
  { k: 40, b: 162, o: 'AABCC', s: [['00665544', 'b-.b-9-79-b-.-b-a-.a-8-68-a-.-a-9-.9-7-57-9-c-9-8-.8-b-8b-d-b---'], ['56563444', 'c-9-c-9-d-a-d-a-c-9-c-e-d---a-d-a-c-a-c-b-d-b-d-b-d-f-d-f.f.f-f-'], ['06540650', 'g---e-b-f---d-a-e-c-e-g-f-d-b---g---e-b-f---d-f-g-e-c-e-e-------']] },
];
const mu = { s: -1, l: 0, st: 0, t: 0, q: 0, hot: 0 };
function music(s, l) {
  if (mu.s !== s) { mu.s = s; mu.st = 0; mu.t = 0; mu.q = 0; }
  mu.l = l;
}
function muffle(f) {
  if (!AC) return;
  const t = AC.currentTime;
  MU.frequency.cancelScheduledValues(t);
  MU.frequency.setValueAtTime(f, t);
}
function thud() {
  if (!AC) return;
  const t = AC.currentTime;
  MU.frequency.cancelScheduledValues(t);
  MU.frequency.setValueAtTime(350, t);
  MU.frequency.exponentialRampToValueAtTime(16000, t + 1.1);
}
function mtick() {
  if (!AC || mu.s < 0 || AC.state !== 'running') return;
  const so = SONG[mu.s], sp = 60 / so.b / 4;
  if (mu.t < AC.currentTime) mu.t = AC.currentTime + 0.03;
  while (mu.t < AC.currentTime + 0.14) {
    const s = mu.st % 128, q = s % 16, bar = s >> 4, t = mu.t, l = mu.l;
    if (!s && mu.st) mu.q = mu.hot && l > 2 ? so.o.length - 1 : (mu.q + 1) % so.o.length;
    const si = so.o.charCodeAt(mu.q) - 65, sec = so.s[si], d = +sec[0][bar], root = so.k + deg(d), ch = si === 2;
    if (l > 1 && q % 4 === 0) tone(170, 0.12, 'sine', 0.85, 45, t, MU);
    if (l > 1 && (q % 8 === 4 || (ch && bar % 4 === 3 && q > 11))) nz(0.12, 0.26, 1700, 'bandpass', t, MU);
    if (q % 4 === 2) nz(0.05, 0.1, 7000, 'highpass', t, MU);
    else if (l > 2 && (q % 2 || ch)) nz(0.02, 0.04, 9000, 'highpass', t, MU);
    if (q % 4) tone(hz(root + (q % 4 === 2 ? 12 : 0)), sp * 0.9, 'triangle', SV.up[6] ? 0.55 : 0.4, 0, t, MU);
    if (l > 0) tone(hz(so.k + 24 + deg(d + [0, 2, 4, 7][(q + (ch ? q >> 2 : bar)) % 4])), sp * 0.7, PW[1], ch ? 0.05 : 0.035, 0, t, MU);
    if (l > 2 && q % 2 === 0) {
      const i = bar * 8 + q / 2, c = sec[1][i];
      if (c !== '-' && c !== '.') {
        let n = 1;
        while (n < 8 && sec[1][(i + n) % 64] === '-') n++;
        const dg = parseInt(c, 36), du = sp * 2 * n * 0.92;
        tone(hz(so.k + 12 + deg(dg)), du, PW[0], 0.1, 0, t, MU);
        tone(hz(so.k + 12 + deg(dg)) * 1.006, du, PW[1], 0.05, 0, t, MU);
        if (ch) tone(hz(so.k + 12 + deg(dg + 2)), du, PW[1], 0.045, 0, t, MU);
      }
    }
    mu.t += sp; mu.st++;
  }
}
const sSel = () => tone(660, 0.05, 'square', 0.1);
const sOk = () => { tone(880, 0.08, 'square', 0.12); if (AC) tone(1320, 0.14, 'square', 0.1, 0, AC.currentTime + 0.07); };
const sNo = () => tone(160, 0.15, 'square', 0.12, 110);
const sCrash = () => { nz(0.3, 0.5, 500, 'lowpass'); tone(90, 0.25, 'square', 0.25, 40); thud(); };
function engOn(n) {
  engOff();
  if (!AC) return;
  for (let i = 0; i < n; i++) {
    const o = AC.createOscillator(), f = AC.createBiquadFilter(), a = AC.createGain();
    const s = AC.createBufferSource(), sf = AC.createBiquadFilter(), sa = AC.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 520; a.gain.value = 0;
    o.connect(f); f.connect(a); a.connect(MF); o.start();
    s.buffer = NB; s.loop = true; sf.type = 'bandpass'; sf.frequency.value = 2300; sf.Q.value = 2; sa.gain.value = 0;
    s.connect(sf); sf.connect(sa); sa.connect(MF); s.start();
    ENG.push({ o, a, s, sa });
  }
}
const ENG = [];
function engOff() {
  while (ENG.length) {
    const e = ENG.pop();
    try { e.o.stop(); e.s.stop(); } catch (x) { /* already stopped */ }
  }
}

// ---------- text ----------
const TX = {}, TU = {};
function T(k, x, y, s, z, c, ox, oy) {
  let t = TX[k];
  if (!t) {
    t = TX[k] = G.add.text(0, 0, '', { fontFamily: 'Arial Black,Impact,sans-serif', fontStyle: 'italic', align: 'center', padding: { x: 8, y: 2 } }).setDepth(10);
    cam0.ignore(t); cam1.ignore(t);
  }
  if (t.z_ !== z) { t.z_ = z; t.setFontSize(z); t.setStroke('#000', z > 22 ? 6 : 4); }
  if (t.c_ !== c) { t.c_ = c; t.setColor(c); }
  t.setText(s).setPosition(x, y).setOrigin(ox == null ? 0.5 : ox, oy == null ? 0.5 : oy).setAlpha(1).setScale(1).setVisible(true);
  TU[k] = 1;
  return t;
}

// ---------- world ----------
// Real 2D world in metres. A track is a spline resampled every ~4 m.
let TR = null;
const wrapA = (a) => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
function mkTrack(ri) {
  const r = RT[ri], rn = rng(r.seed), hw = r.hw || 5;
  let p = r.pts && r.pts.map((v) => v * (r.sc || 1)), loop = 1;
  if (!p) {
    p = [-150, 0]; loop = 0;
    for (let k = 0; k < 8; k++) { const a = k & 1 ? -1 : 1, z = k * 30; p.push(-a * 32, z, a * 32, z, a * 48, z + 15); }
    p.push(-32, 240, -150, 240);
  }
  const n = p.length / 2, D = [], gp = (i) => (loop ? (i + n) % n : clamp(i, 0, n - 1)) * 2;
  for (let j = 0; j < (loop ? n : n - 1); j++) {
    const a = gp(j - 1), b = gp(j), c = gp(j + 1), d = gp(j + 2);
    for (let t = 0; t < 1; t += 0.0625) {
      const t2 = t * t, t3 = t2 * t;
      for (let q = 0; q < 2; q++) D.push(0.5 * (2 * p[b + q] + (p[c + q] - p[a + q]) * t + (2 * p[a + q] - 5 * p[b + q] + 4 * p[c + q] - p[d + q]) * t2 + (3 * p[b + q] - p[a + q] - 3 * p[c + q] + p[d + q]) * t3));
    }
  }
  const m = D.length / 2, cum = [0];
  for (let i = 1; i <= (loop ? m : m - 1); i++) { const a = (i % m) * 2, b = (i - 1) * 2; cum.push(cum[i - 1] + Math.hypot(D[a] - D[b], D[a + 1] - D[b + 1])); }
  const len = cum[cum.length - 1], N = Math.round(len / 4), ds = len / N;
  const ix = (i) => (loop ? (i % N + N) % N : clamp(i, 0, N - 1));
  const tk = { N, ds, len, hw, loop, ix, x: [], z: [], y: [], tx: [], tz: [], k: [], o: [], hm: {}, lot: r.lot, fin: loop ? 0 : N - 10 };
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = i * ds;
    while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j]), a = j * 2, b = ((j + 1) % m) * 2;
    tk.x.push(D[a] + (D[b] - D[a]) * f); tk.z.push(D[a + 1] + (D[b + 1] - D[a + 1]) * f); tk.y.push(-s * (r.slope || 0));
  }
  for (let i = 0; i < N; i++) {
    const a = ix(i - 1), b = ix(i + 1), dx = tk.x[b] - tk.x[a], dz = tk.z[b] - tk.z[a], l = Math.hypot(dx, dz) || 1;
    tk.tx.push(dx / l); tk.tz.push(dz / l);
  }
  for (let i = 0; i < N; i++) { const a = ix(i - 1), b = ix(i + 1); tk.k.push(wrapA(Math.atan2(tk.tx[b], tk.tz[b]) - Math.atan2(tk.tx[a], tk.tz[a])) / (2 * ds)); }
  // scenery and hazards
  const th = TH[r.th];
  const put = (i, lat, o) => {
    o.i = i; o.lat = lat; o.x = tk.x[i] + tk.tz[i] * lat; o.z = tk.z[i] - tk.tx[i] * lat; o.y = tk.y[i]; o.sd = sgn(lat); o.yw = Math.atan2(tk.tx[i], tk.tz[i]);
    tk.o.push(o);
    if (o.hz) (tk.hm[i] || (tk.hm[i] = [])).push(o);
  };
  for (let i = 0; i < N; i++) {
    const k = tk.k[i];
    if (th.lamp && !r.lot && i % 9 === 0) put(i, ((i / 9) & 1 ? 1 : -1) * (hw + 1.8), { t: 'l' });
    if (!r.lot && i % 4 === 0) {
      const sd = rn() < 0.5 ? -1 : 1;
      put(i, sd * (hw + 7 + rn() * 5), { t: th.side[rn() * th.side.length | 0], c: rn() });
      if (rn() < 0.7) put(i, -sd * (hw + 7 + rn() * 7), { t: th.side[rn() * th.side.length | 0], c: rn() });
    }
    if (abs(k) > 0.024 && i % 2 === 0 && !r.lot) put(i, -sgn(k) * (hw + 2.6), { t: 'c', d: sgn(k) });
    if (r.lot && i % 4 === 0) put(i, -(hw + 0.6), { t: 'n' });
  }
  const hz = r.hz || {};
  for (const t in hz) for (let q = 0; q < hz[t]; q++) {
    const i = 25 + (rn() * (N - 50) | 0);
    put(i, t === 'y' ? (rn() < 0.5 ? -1 : 1) * hw * 0.5 : t === 'P' ? (hw + 2.4) * (rn() < 0.5 ? -1 : 1) : 0, { t, p: rn() * 6, hz: 1 });
  }
  tk.cars = [];
  for (let i = 0; i < (r.tr || 0); i++) {
    const ty = r.trT[rn() * r.trT.length | 0], on = r.two && rn() < 0.45, la = hw * 0.5 * (r.two ? (on ? -1 : 1) : rn() < 0.5 ? -1 : 1);
    tk.cars.push({ s: (25 + rn() * (N - 35)) * ds, lat: la, lx: la, sp: (7 + rn() * 5) * (on ? -1 : 1), ty, w: CT[ty].w * M / 2, col: ty === 7 ? [0x3b6ea8, 0x8a2be2, 0x2f9e5b, 0xc9c9c9][rn() * 4 | 0] : 0, on, bk: 0, lt: r.two ? 1e9 : 2 + rn() * 7, fl: 0 });
  }
  return tk;
}
// place a path follower (s, lat) into the world
function pth(c) {
  const tk = TR, f = c.s / tk.ds, fi = Math.floor(f), i = tk.ix(fi), j = tk.ix(fi + 1), t = f - fi;
  const tx = tk.tx[i] + (tk.tx[j] - tk.tx[i]) * t, tz = tk.tz[i] + (tk.tz[j] - tk.tz[i]) * t;
  c.x = tk.x[i] + (tk.x[j] - tk.x[i]) * t + tz * c.lat; c.z = tk.z[i] + (tk.z[j] - tk.z[i]) * t - tx * c.lat; c.y = tk.y[i];
  c.yaw = Math.atan2(tx, tz) + (c.on ? Math.PI : 0) + c.fl;
}
// locate a free body on the track: nearest sample, lateral offset, distance along
function loc(P) {
  const tk = TR;
  let b = P.si, bd = 1e9;
  for (let d = -5; d <= 9; d++) { const i = tk.ix(P.si + d), q = (P.x - tk.x[i]) ** 2 + (P.z - tk.z[i]) ** 2; if (q < bd) { bd = q; b = i; } }
  if (bd > 900) for (let i = 0; i < tk.N; i++) { const q = (P.x - tk.x[i]) ** 2 + (P.z - tk.z[i]) ** 2; if (q < bd) { bd = q; b = i; } }
  const d0 = b - P.si;
  if (tk.loop && bd <= 900) { if (d0 < -tk.N / 2) P.lap++; else if (d0 > tk.N / 2) P.lap--; }
  P.si = b;
  const dx = P.x - tk.x[b], dz = P.z - tk.z[b];
  P.lat = dx * tk.tz[b] - dz * tk.tx[b]; P.s = b * tk.ds + dx * tk.tx[b] + dz * tk.tz[b]; P.y = tk.y[b];
  P.prog = P.lap * tk.N + b;
}

// ---------- drawing primitives ----------
let cg, cx, by, cs, ca = 1;
function B(ox, oy, w, h, c, a) {
  cg.fillStyle(c, (a == null ? 1 : a) * ca);
  cg.fillRect(cx + (ox - w / 2) * cs, by - (oy + h) * cs, w * cs, h * cs);
}
function C(ox, oy, r, c, a) {
  cg.fillStyle(c, (a == null ? 1 : a) * ca);
  cg.fillCircle(cx + ox * cs, by - oy * cs, r * cs);
}
function t4(x1, y1, x2, y2, x3, y3, x4, y4) {
  cg.fillTriangle(x1, y1, x2, y2, x3, y3);
  cg.fillTriangle(x1, y1, x3, y3, x4, y4);
}
function Q(g, x1, y1, w1, x2, y2, w2, c) {
  g.fillStyle(c, 1);
  g.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
  g.fillTriangle(x1 - w1, y1, x2 + w2, y2, x2 - w2, y2);
}

let FV = F, ZC = 0, vcam = 650, CO = 1, SI = 0, RL = 0, ZP = 900, HY = 0;
const FQ = [];
function fc(v, a, b, c, d, col, sh, al) {
  a *= 3; b *= 3; c *= 3; d *= 3;
  if ((v[b] - v[a]) * (v[d + 1] - v[a + 1]) - (v[b + 1] - v[a + 1]) * (v[d] - v[a]) >= 0) return;
  FQ.push([v[a + 2] + v[b + 2] + v[c + 2] + v[d + 2], v[a], v[a + 1], v[b], v[b + 1], v[c], v[c + 1], v[d], v[d + 1], mix(col, 0, 1 - sh), al || 1]);
}
// frustum: bottom half-width xb, top xt, heights y0..y1, bottom z range, top z range
function fr(xb, xt, y0, y1, zb0, zb1, zt0, zt1, c, ct, xo, al) {
  const v = [];
  for (let i = 0; i < 8; i++) {
    const t = i > 3, k = i & 3, xx = (xo || 0) + (k === 0 || k === 3 ? -1 : 1) * (t ? xt : xb), zz = (k < 2 ? (t ? zt0 : zb0) : (t ? zt1 : zb1)) - ZC;
    const Z = max(80 - ZP, -xx * SI + zz * CO), sc = FV / (ZP + Z);
    v.push(cx + (xx * CO + zz * SI) * sc, HY + (vcam - (t ? y1 : y0) - xx * RL) * sc, Z);
  }
  fc(v, 0, 1, 5, 4, c, 0.82, al); fc(v, 2, 3, 7, 6, c, 0.72, al); fc(v, 3, 0, 4, 7, c, 0.58, al); fc(v, 1, 2, 6, 5, c, 0.58, al);
  fc(v, 4, 5, 6, 7, ct == null ? c : ct, 1, al);
}
const bx = (hw, y0, y1, z0, z1, c, xo, al) => fr(hw, hw, y0, y1, z0, z1, z0, z1, c, null, xo, al);
function fl() {
  FQ.sort((a, b) => b[0] - a[0]);
  for (const q of FQ) { cg.fillStyle(q[9], q[10] * ca); t4(q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]); }
  FQ.length = 0;
}
function car(ty, a, o) {
  const d = CT[ty], w = d.w / 2, l = d.l, hb = d.hb, hc = d.hc, L = d.L, col = o.col || d.c, dk = mix(col, 0, 0.5), far = cs < 0.07, GL = 0x0c1420;
  const yt = l + hb, lc = o.brake ? 0xff5050 : 0xc01818, sd = d.t === 1;
  CO = Math.cos(a); SI = sin(a); RL = -SI * 0.06; ZP = FV / cs; HY = by - vcam * cs; ZC = L * 0.45;
  if (o.beam) bx(w * 1.25, 1, 2, L, L + 2800, 0xfff0b0, 0, 0.07);
  fl();
  if (o.neon) { bx(w * 1.4, 1, 2, -170, L + 110, o.neon, 0, 0.22); fl(); }
  bx(w * 1.04, 1, 2, -70, L + 10, 0, 0, 0.5);
  fl();
  if (!far) for (let k = -1; k < 2; k += 2) for (const z of [100, L - 190]) {
    fr(36, 36, 0, 126, z - 64, z + 64, z - 52, z + 52, 0x0b0b0b, null, k * (w - 22));
    if (d.t === 3) fr(54, 40, l - 6, l + 112, z - 112, z + 112, z - 70, z + 70, col, null, k * (w - 40));
  }
  if (d.t === 2) {
    if (ty === 4) {
      bx(w, l, yt, -80, L, col); bx(w + 3, l + hb * 0.3, l + hb * 0.36, -83, L + 3, 0x222222);
      bx(w + 3, l + hb * 0.5, l + hb * 0.84, -83, L - 160, GL); bx(w * 0.9, l + hb * 0.4, l + hb * 0.86, L + 3, L + 3, GL);
      bx(w * 0.5, l + hb * 0.88, l + hb * 0.96, -84, -84, 0xffffff);
    } else {
      bx(w, l + 120, yt, -80, L * 0.7, col); bx(w * 0.5, l, l + 120, -80, L * 0.72, 0x222222);
      fr(w * 0.92, w * 0.88, l, l + hb * 0.62, L * 0.72, L, L * 0.72, L * 0.96, 0x2a5a9a);
      bx(w * 0.8, l + hb * 0.34, l + hb * 0.56, L + 3, L + 3, GL); bx(8, l + 160, yt - 40, -84, -84, dk);
    }
  } else if (d.t === 3) {
    fr(w * 0.82, w * 0.66, l, yt, -70, L * 0.98, -10, L * 0.86, col);
    fr(w * 0.7, w * 0.46, yt, yt + hc, L * 0.1, L * 0.64, L * 0.26, L * 0.5, GL, col);
    bx(w * 0.84, l - 6, l + 22, -84, -70, 0xcfcfcf);
  } else {
    fr(w, w * 0.93, l, yt, -80, L, -72, L - 40, col); bx(w * 1.02, l, l + hb * 0.28, -88, L + 8, dk);
    if (sd) fr(w * 0.9, w * 0.7, yt, yt + hc, L * 0.15, L * 0.64, L * 0.28, L * 0.5, GL, col);
    else fr(w * 0.9, w * 0.72, yt, yt + hc, -66, L * 0.62, 20, L * 0.42, GL, col);
    if (ty === 6) bx(55, yt + hc, yt + hc + 55, L * 0.36, L * 0.44, 0xffd400);
    if (ty === 8) {
      const b = (now * 6 | 0) % 2;
      bx(w + 3, l + hb * 0.5, l + hb * 0.72, -83, L + 3, 0x1c7a3c);
      bx(60, yt + hc, yt + hc + 45, L * 0.36, L * 0.43, b ? 0xff2020 : 0x501010, -62); bx(60, yt + hc, yt + hc + 45, L * 0.36, L * 0.43, b ? 0x102050 : 0x3070ff, 62);
    }
  }
  if (!far) {
    const ly = l + hb * (d.t === 2 ? 0.12 : 0.5), lh = hb * (d.t === 2 ? 0.08 : 0.28);
    bx(w * 0.2, ly, ly + lh, -85, -85, ty === 0 ? 0x5a1010 : lc, -w * 0.72); bx(w * 0.2, ly, ly + lh, -85, -85, lc, w * 0.72);
    bx(w * 0.18, ly, ly + lh, L + 9, L + 9, 0xfff2c0, -w * 0.7); bx(w * 0.18, ly, ly + lh, L + 9, L + 9, 0xfff2c0, w * 0.7);
    bx(w * 0.24, ly - lh * 0.9, ly - lh * 0.15, -90, -90, 0xe8e8e8);
    if (o.bk && (now * 5 | 0) & 1) bx(w * 0.12, ly, ly + lh, -86, -86, 0xffa020, o.bk * w * 0.9);
    if (ty === 3) bx(w * 0.92, yt - hb * 0.14, yt - hb * 0.06, -86, -86, 0xff2020);
    if (ty === 0) { bx(w * 0.14, l + hb * 0.3, l + hb * 0.46, -86, -86, 0x6b3a1e, -w * 0.5); bx(w * 0.1, l + hb * 0.74, l + hb * 0.86, -86, -86, 0x6b3a1e, w * 0.3); }
    if (o.wing) {
      const wy = sd ? yt + hc * 0.75 : yt + hc + 30, wz = sd ? -50 : 30, y0 = sd ? yt : yt + hc;
      bx(8, y0, wy, wz - 10, wz + 10, 0x151515, -w * 0.6); bx(8, y0, wy, wz - 10, wz + 10, 0x151515, w * 0.6);
      bx(w * 1.06, wy, wy + 24, wz - 45, wz + 55, 0x151515);
    }
    bx(o.exh ? 32 : 16, l - 16, l + (o.exh ? 30 : 8), -106, -86, 0x9a9a9a, w * 0.55);
  }
  fl();
  if (o.boost) {
    const pj = (z, k) => { const x = w * 0.55, Z = -x * SI + z * CO, sc = FV / (ZP + Z); return k ? cx + (x * CO + z * SI) * sc : HY + (vcam - l) * sc; };
    const x0 = pj(-110, 1), y0 = pj(-110), z1 = -330 - rnd() * 260;
    cg.fillStyle(0x40c8ff, 0.85 * ca); cg.fillTriangle(x0 - 14, y0 - 8, x0 + 14, y0 + 8, pj(z1, 1), pj(z1));
    cg.fillStyle(0xfff0a0, 0.9 * ca); cg.fillTriangle(x0 - 7, y0 - 4, x0 + 7, y0 + 4, pj(z1 * 0.55, 1), pj(z1 * 0.55));
  }
}

function ob(o) {
  const t = o.t;
  if (t === 'l') {
    const d = o.sd > 0 ? -1 : 1;
    B(0, 0, 55, 1900, 0x4a4a52); B(d * 250, 1880, 520, 40, 0x4a4a52); B(d * 480, 1835, 170, 50, 0xfff2a0);
    C(d * 480, 1800, 300, 0xffd070, 0.13);
  } else if (t === 'h') {
    const c = [0xb8734a, 0x6f8fa8, 0xa8a06f, 0x8a6fa8][o.c * 4 | 0];
    B(0, 0, 1500, 760, c); B(0, 760, 1650, 120, 0x5a2a22); B(0, 880, 1250, 110, 0x5a2a22); B(0, 990, 800, 90, 0x5a2a22);
    B(-380, 300, 330, 260, o.c > 0.4 ? 0xffd870 : 0x1a1a22); B(330, 0, 260, 520, 0x3a2418);
    B(0, 0, 1900, 200, 0x1a1a1a, 0.75);
  } else if (t === 't') {
    B(0, 0, 90, 520, 0x3a2a1a); C(0, 820, 430, 0x12381c); C(-230, 620, 300, 0x0e2c16); C(230, 640, 310, 0x164222);
  } else if (t === 'p') {
    B(0, 0, 90, 300, 0x2a1c12);
    for (let i = 0; i < 4; i++) { B(0, 260 + i * 290, 760 - i * 170, 300, 0x0f3320); B(0, 500 + i * 290, 700 - i * 170, 60, 0xe8eef8); }
  } else if (t === 'q') {
    C(0, 150, 330, 0x4a4238); C(260, 110, 220, 0x3a332b); C(-230, 220, 200, 0x5a5146);
  } else if (t === 'b') {
    const h = 1800 + o.c * 3200, n = h / 420 | 0;
    B(0, 0, 1300, h, 0x12152a);
    for (let i = 0; i < n; i++) for (let j = -1; j < 2; j++) if (((i * 7 + j * 3 + (o.c * 97 | 0)) % 5) < 2) B(j * 380, 220 + i * 400, 220, 190, 0xffd870, 0.85);
  } else if (t === 's') {
    B(-380, 0, 45, 1500, 0x666666); B(380, 0, 45, 1500, 0x666666); B(0, 1000, 1050, 560, 0x0c6b3a); B(0, 1260, 820, 50, 0xffffff); B(0, 1120, 560, 40, 0xffffff);
  } else if (t === 'c') {
    B(0, 0, 40, 330, 0x555555); B(0, 300, 520, 420, 0xf2c21a);
    const x = cx, y = by - 510 * cs, d = o.d;
    cg.fillStyle(0x111111, ca); cg.fillTriangle(x - d * 170 * cs, y - 150 * cs, x - d * 170 * cs, y + 150 * cs, x + d * 170 * cs, y);
  } else if (t === 'a') {
    B(0, 0, 330, 300, 0xeeeeee); B(0, 300, 400, 60, 0x4a6fd0); B(0, 360, 30, 190, 0xeeeeee); B(0, 460, 130, 30, 0xeeeeee);
    B(-90, 0, 24, 60, 0xffd040); B(80, 0, 24, 60, 0xffd040); C(0, 60, 260, 0xffc050, 0.12);
  } else if (t === 'k') {
    B(0, 60, 620, 330, 0xe0e0e0); B(-230, 0, 90, 90, 0x111111); B(230, 0, 90, 90, 0x111111); B(0, 390, 30, 520, 0x777777);
    B(0, 880, 900, 110, 0xd82020); B(-300, 880, 150, 110, 0xffffff); B(300, 880, 150, 110, 0xffffff); C(0, 520, 330, 0xffc050, 0.14);
  } else if (t === 'g') {
    B(-RW * 1.3, 0, 130, 2400, 0x4a4f5a); B(RW * 1.3, 0, 130, 2400, 0x4a4f5a); B(0, 2150, RW * 2.7, 280, 0x2a2f3a);
    B(0, 2110, 1500, 360, 0x0a4fa8); B(0, 2240, 900, 60, 0xffffff);
    for (let i = -2; i < 3; i++) if (i) B(i * RW * 0.45, 2060, 90, 70, (now * 3 | 0) % 2 ? 0xff3030 : 0x30ff60);
  } else if (t === 'y') {
    cg.fillStyle(0x060606, ca); cg.fillEllipse(cx, by, 330 * cs, max(2, 70 * cs));
    cg.fillStyle(0x4a4a4a, 0.6 * ca); cg.fillEllipse(cx, by - 12 * cs, 250 * cs, max(1, 30 * cs));
  } else if (t === 'm') {
    const h = max(2, 80 * cs);
    for (let i = -6; i < 6; i++) { cg.fillStyle(i & 1 ? 0x151515 : 0xf2c21a, ca); cg.fillRect(cx + i * RW / 6 * cs, by - h, RW / 6 * cs, h); }
  } else if (t === 'd') {
    const hop = abs(sin(now * 9)) * 30, d = Math.cos(now * 0.7 + o.p) > 0 ? 1 : -1;
    B(0, 60 + hop, 210, 100, 0x8a5a2a); B(d * 130, 130 + hop, 90, 90, 0x8a5a2a); B(d * 170, 120 + hop, 50, 36, 0x3a2412);
    B(-d * 110, 150 + hop, 30, 70, 0x8a5a2a); B(-70, hop, 28, 70, 0x6a4420); B(70, hop, 28, 70, 0x6a4420);
  } else if (t === 'P') car(8, o.yw - CYAW, {});
  else if (t === 'n') { B(0, 0, 70, 14, 0x222222); B(0, 14, 46, 60, 0xff7a1a); B(0, 40, 34, 14, 0xffffff); }
}

function bg(g, P, VH, hy, th) {
  const sk = th.sky;
  for (let i = 0; i < 10; i++) { g.fillStyle(mix(sk[0], sk[1], Math.pow(i / 9, 1.7)), 1); g.fillRect(0, hy * i / 10 - 1, W, hy / 10 + 2); }
  for (const s of STARS) { g.fillStyle(0xffffff, 0.35 + 0.4 * sin(now * 2 + s.p)); g.fillRect(s.x, s.y * hy * 0.75, 2, 2); }
  g.fillStyle(0xfff4d6, 0.1); g.fillCircle(640, hy * 0.24, 42);
  g.fillStyle(0xfff4d6, 1); g.fillCircle(640, hy * 0.24, 22);
  g.fillStyle(sk[0], 1); g.fillCircle(631, hy * 0.22, 19);
  const mc = mix(sk[1], 0, 0.6), off = ((P.bgx * 0.3) % 1600 + 1600) % 1600;
  for (let i = 0; i < 100; i++) {
    const h = MTN[((i * 8 + off) / 8 | 0) % 200] * hy * 0.5;
    g.fillStyle(mc, 1); g.fillRect(i * 8, hy - h, 8, h + 1);
    if (h > hy * 0.3) { g.fillStyle(0x9aa8c8, 0.5); g.fillRect(i * 8, hy - h, 8, 5); }
  }
  if (th.tw) {
    const tx = ((520 - P.bgx * 0.45) % 1600 + 1600) % 1600 - 200, h = hy * 0.72;
    g.fillStyle(0x10142a, 1); g.fillTriangle(tx - 26, hy, tx + 26, hy, tx + 10, hy - h); g.fillTriangle(tx - 26, hy, tx + 10, hy - h, tx - 10, hy - h);
    for (let i = 1; i < 12; i++) { g.fillStyle(0x9fd0ff, 0.25 + 0.2 * (i & 1)); g.fillRect(tx - 20 + i, hy - h * i / 12, 40 - i * 2, 2); }
    g.fillStyle(0xff3030, (now * 2 | 0) & 1 ? 1 : 0.2); g.fillRect(tx - 2, hy - h - 6, 4, 6);
  }
  g.fillStyle(mix(th.gr[0], th.fog, 0.45), 1); g.fillRect(0, hy, W, VH - hy);
  const o2 = ((P.bgx * 0.6) % 1600 + 1600) % 1600, k = VH / 600;
  for (const c of CITY) {
    const x = (c.x - o2 + 1600) % 1600;
    if (x < W) {
      g.fillStyle(c.c, 0.5 + 0.5 * sin(now * 3 + c.x));
      if (c.i < 110) g.fillRect(x, hy - 2 - c.y * 16, 2, 2);
    }
  }
}

// ---------- 3D view ----------
let VX = 0, VZ = 0, VY = 0, VSN = 0, VCS = 1, VHY = 0, CYAW = 0;
// world quad → camera space, clip against the near plane, project, fill
function q3(g, col, al, w) {
  const c = [], o = [];
  for (let i = 0; i < 12; i += 3) { const dx = w[i] - VX, dz = w[i + 2] - VZ; c.push(dx * VCS - dz * VSN, w[i + 1], dx * VSN + dz * VCS); }
  for (let i = 0; i < 4; i++) {
    const a = i * 3, b = ((i + 1) % 4) * 3, za = c[a + 2], zb = c[b + 2];
    if (za >= 0.6) o.push(W / 2 + F * c[a] / za, VHY + F * (VY - c[a + 1]) / za);
    if ((za >= 0.6) !== (zb >= 0.6)) {
      const t = (0.6 - za) / (zb - za);
      o.push(W / 2 + F * (c[a] + (c[b] - c[a]) * t) / 0.6, VHY + F * (VY - c[a + 1] - (c[b + 1] - c[a + 1]) * t) / 0.6);
    }
  }
  if (o.length < 6) return;
  g.fillStyle(col, al);
  for (let i = 2; i < o.length - 2; i += 2) g.fillTriangle(o[0], o[1], o[i], o[i + 1], o[i + 2], o[i + 3]);
}
// strip of road between samples i and j, from lateral offset a to b
function strip(g, i, j, a, b, col) {
  const tk = TR;
  q3(g, col, 1, [tk.x[i] + tk.tz[i] * a, tk.y[i], tk.z[i] - tk.tx[i] * a, tk.x[i] + tk.tz[i] * b, tk.y[i], tk.z[i] - tk.tx[i] * b,
    tk.x[j] + tk.tz[j] * b, tk.y[j], tk.z[j] - tk.tx[j] * b, tk.x[j] + tk.tz[j] * a, tk.y[j], tk.z[j] - tk.tx[j] * a]);
}

function view(P, g, VH) {
  const tk = TR, rt = RT[R.ri], th = TH[rt.th], hy = P.hy, sn = sin(P.cyaw), cn = Math.cos(P.cyaw), D = P.camD + P.sp * 0.035;
  const sx = P.shk > 0 ? (rnd() - 0.5) * P.shk * 0.5 : 0;
  VX = P.x - sn * D + cn * sx; VZ = P.z - cn * D - sn * sx; VY = P.y + P.camH + (P.bnc > 0 ? sin(P.bnc * 3.14) * 0.25 : 0); VSN = sn; VCS = cn; VHY = hy; CYAW = P.cyaw;
  P.bgx = P.cyaw * 848.8;
  bg(g, P, VH, hy, th);
  if (tk.lot) { const l = tk.lot; q3(g, 0x25252b, 1, [l[0], 0, l[1], l[2], 0, l[1], l[2], 0, l[3], l[0], 0, l[3]]); }
  // road, far to near
  const L = [];
  for (let i = 0; i < tk.N; i++) {
    const dx = tk.x[i] - VX, dz = tk.z[i] - VZ, Z = dx * sn + dz * cn;
    if (Z > -12 && Z < 230 && abs(dx * cn - dz * sn) < Z * 1.3 + 45) L.push(((Z + 16) * 8 | 0) * 1024 + i);
  }
  L.sort((a, b) => b - a);
  const hw = tk.hw;
  for (const key of L) {
    const i = key & 1023, j = tk.ix(i + 1);
    if (j === i) continue;
    const f = Math.pow(clamp(((key >> 10) / 8 - 16) / 230, 0, 1), 1.3), alt = (i >> 1) & 1, fc_ = (c) => mix(c, th.fog, f);
    if (!tk.lot) { strip(g, i, j, -hw - 4.6, hw + 4.6, fc_(th.sw || 0x34343a)); strip(g, i, j, -hw - 1, hw + 1, fc_(th.rm[alt])); }
    strip(g, i, j, -hw, hw, fc_(i === tk.fin ? 0xeeeeee : th.rd[alt]));
    const lc = fc_(0xe8e8e8);
    strip(g, i, j, -hw + 0.25, -hw + 0.42, lc); strip(g, i, j, hw - 0.42, hw - 0.25, lc);
    if (rt.two) strip(g, i, j, -0.1, 0.1, fc_(0xe8b800));
    else if (alt) strip(g, i, j, -0.09, 0.09, lc);
  }
  for (const m of R.sk) if (abs(m[0] - P.x) + abs(m[2] - P.z) < 140) q3(g, 0x08080a, 0.55, m);
  // sprites: scenery, cars, smoke — far to near
  const Sp = [];
  const add = (o, k) => {
    const dx = o.x - VX, dz = o.z - VZ, Z = dx * sn + dz * cn;
    if (Z > (k ? 1.3 : 5) && Z < 230) { const X = dx * cn - dz * sn; if (abs(X) < Z * 1.4 + 14) Sp.push([Z, X, o, k]); }
  };
  for (const o of tk.o) add(o, 0);
  for (const c of R.cars) add(c, 1);
  for (const p of R.P) add(p, 1);
  for (const p of R.pt) add(p, 2);
  Sp.sort((a, b) => b[0] - a[0]);
  cg = g;
  for (const s of Sp) {
    const Z = s[0], o = s[2];
    cx = W / 2 + F * s[1] / Z; by = hy + F * (VY - o.y) / Z; cs = F / Z * M; ca = clamp((230 - Z) / 60, 0, 1); vcam = (VY - o.y) / M;
    if (s[3] === 0) ob(o);
    else if (s[3] === 2) { g.fillStyle(o.c, o.l / o.m * o.a); g.fillCircle(cx, by - o.h * F / Z, o.r * F / Z * (1.8 - o.l / o.m)); }
    else car(o.ty, o.yaw - P.cyaw, o.o || o);
  }
  ca = 1;
  if (P.bo || P.slp > 0.5) {
    g.lineStyle(2, P.bo ? 0xffffff : 0x40e0ff, 0.35);
    for (let i = 0; i < 12; i++) {
      const a = rnd() * 6.28, r = 220 + rnd() * 200;
      g.lineBetween(W / 2 + Math.cos(a) * r, hy + sin(a) * r * 0.7, W / 2 + Math.cos(a) * (r + 130), hy + sin(a) * (r + 130) * 0.7);
    }
  }
  if (P.cop > 0) {
    const b = (now * 5 | 0) % 2;
    g.fillStyle(b ? 0xff2020 : 0x2060ff, 0.22); g.fillRect(0, 0, 70, VH);
    g.fillStyle(b ? 0x2060ff : 0xff2020, 0.22); g.fillRect(W - 70, 0, 70, VH);
  }
}

// ---------- race ----------
function mkP(i, ci, up, bug, VH) {
  const b = CARS[ci], v = VH > 400, bt = ci === 0 && bug;
  return {
    i, ci, ty: bt ? 9 : ci, up,
    c: { pw: (bt ? 3.6 : b.pw) * (1 + 0.08 * up[0]), vm: b.vm * (1 + 0.03 * up[0]), mu: b.mu * (1 + 0.04 * up[1]), dr: bt ? 1 : b.dr },
    tb: 1 + 0.2 * up[2], hy: VH * (v ? 0.4 : 0.36), camH: v ? 2.5 : 2.1, camD: v ? 6.4 : 7.4,
    x: 0, z: 0, y: 0, yaw: 0, vx: 0, vz: 0, w: 0, de: 0, vf: 0, vl: 0, sp: 0, be: 0, cyaw: 0, si: 0, lap: 0, prog: 0, lat: 0, s: 0, fl: 0,
    dr: 0, dT: 0, ch: 0, ni: 1, bo: 0, pts: 0, cmb: 1, cmbT: 0, inv: 0, cop: 0, sir: 0, fine: 0, fin: 0, bgx: 0, bnc: 0, shk: 0, pop: null,
    ov: 0, slp: 0, dk: 0, zm: 1.04, pre: 0, st0: 0, ww: 0, rw: null, edg: 0, wb: 0, gu: 0,
    o: { neon: ci === 3 ? 0xb040ff : up[3] ? 0x30ff90 : 0, wing: up[4] || ci === 3, exh: up[5], boost: 0, brake: 0, beam: 1 },
  };
}
function pop(P, s, c) { P.pop = { s, c: c || '#ffe600', t: 0 }; }

function startRace(ri, mode) {
  TR = mkTrack(ri); RW = TR.hw / M;
  const tk = TR, vs = mode === 'vs', VH = vs ? 300 : 600, rt = RT[ri];
  R = { ri, mode, cars: tk.cars, t: 0, go: 0, cdn: 4, P: [], end: 0, rv: null, q: 0, pt: [], sk: [], laps: tk.loop ? max(1, Math.round(1150 / tk.len)) : 1 };
  cam0.setViewport(0, 0, W, VH); cam1.setVisible(vs);
  const grid = (o, i, lat) => { o.x = tk.x[i] + tk.tz[i] * lat; o.z = tk.z[i] - tk.tx[i] * lat; o.y = tk.y[i]; o.yaw = o.cyaw = Math.atan2(tk.tx[i], tk.tz[i]); o.si = i; };
  if (vs) for (let i = 0; i < 2; i++) { const P = mkP(i, VS.c[i], [2, 2, 2, 1, 1, 1, 1], 0, VH); grid(P, 3, i ? 1.7 : -1.7); R.P.push(P); }
  else {
    const dm = mode === 'demo', P = mkP(0, dm ? 3 : SV.car, dm ? [1, 1, 1, 1, 1, 1, 1] : SV.up, SV.bug, VH);
    grid(P, 3, mode === 'free' ? 0 : -1.7); R.P.push(P);
    if (dm) { P.demo = 1; P.s = 12; P.lat = 0; P.spd = 0; }
    else if (mode === 'story') {
      const rv = rt.rv;
      R.rv = { ai: 1, s: 8 * tk.ds, lat: 1.7, sp: 0, ty: rv.car, w: 0.95, vmx: rv.vm, al: rv.al, col: rv.col, fin: 0, lapc: 0, prog: 0, fl: 0, o: { col: rv.col, neon: ri > 2 ? 0xff3060 : 0, wing: ri > 0, beam: 1 } };
      R.cars.push(R.rv);
    }
  }
  for (const c of R.cars) pth(c);
  R.dogs = tk.o.filter((o) => o.t === 'd');
  if (mode !== 'demo') { engOn(R.P.length); music([0, 1, 1, 0, 2, 1][ri], 3); muffle(16000); }
  S = mode === 'demo' ? 'title' : 'race'; st = 0;
}

function crash(P, k) {
  if (P.inv > 0) return;
  P.vx *= k; P.vz *= k; P.w *= 0.4; P.inv = 0.7; P.shk = 0.5; P.cmb = 1; P.ch = 0; P.dr = 0;
  sCrash();
  if (P.cop > 0) bust(P);
}
function bust(P) {
  P.cop = 0; P.fine += 800; P.vx = P.vz = 0; P.inv = 1;
  pop(P, 'PARTE: -$800', '#ff4040'); sNo();
}

// Simcade bicycle model. Each axle has a grip budget shared between driving/braking
// and cornering (friction circle); tyres saturate past ~14° of slip and keep ~70%.
function phys(P, U, D, hb, sr, dt, surf) {
  const cc = P.c, sn = sin(P.yaw), cn = Math.cos(P.yaw);
  let vf = P.vx * sn + P.vz * cn, vl = P.vx * cn - P.vz * sn;
  const sp = Math.hypot(vf, vl), g = 9.8 * cc.mu * surf, wt = clamp(P.ax || 0, -4, 4) * 0.022, capF = g * (0.52 - wt), capR = g * (0.48 + wt), fw = vf >= 0 ? 1 : -1;
  // steering: speed sensitive, plus countersteer assist that points the fronts along the slide
  const as = sp > 3 && vf > 0 ? Math.atan2(vl + P.w * 1.2, vf + 2) * 0.8 : 0;
  const tg = clamp(sr * (0.2 + 0.4 / (1 + sp / 16)) + as, -0.65, 0.65);
  P.de += clamp(tg - P.de, -dt * 3.5, dt * 3.5);
  let drv = 0, brk = 0;
  if (U) drv = cc.pw * max(0, 1 - Math.pow(max(0, vf) / (cc.vm * (P.bo ? 1.2 : 1)), 2)) + (P.bo ? 4.5 : 0);
  if (D) { if (vf > 1) brk = 10; else drv = vf > -7 ? -3.5 : 0; }
  const fs = cc.dr === 0 ? 1 : cc.dr === 1 ? 0 : 0.45;
  let fxF = clamp(drv * fs - brk * 0.62, -capF, capF * 0.85), fxR = clamp(drv * (1 - fs) - brk * 0.38, -capR, capR * 0.85);
  if (hb && abs(vf) > 1) fxR = -fw * capR * 0.55;
  const uF = min(0.92, abs(fxF) / capF * 0.9), uR = min(P.dk > 0 ? 0.85 : 0.5, abs(fxR) / capR * 1.15);
  const lF = capF * Math.sqrt(1 - uF * uF), lR = capR * Math.sqrt(1 - uR * uR) * (hb ? 0.5 : 1);
  const tire = (a) => sin(1.5 * Math.atan(7 * a));
  const FyF = -lF * tire(Math.atan2(vl + P.w * 1.2, abs(vf) + 0.6) - P.de * fw), FyR = -lR * tire(Math.atan2(vl - P.w * 1.3, abs(vf) + 0.6));
  const cd = Math.cos(P.de), sd = sin(P.de);
  const aF = fxF * cd - FyF * sd + fxR - 0.0009 * vf * abs(vf) - (U || D ? 0.15 : 1.1) * clamp(vf, -1, 1) - (surf < 1 ? 2.5 * clamp(vf * 0.2, -1, 1) : 0);
  const aL = FyF * cd + fxF * sd + FyR;
  vf += (aF + vl * P.w) * dt; vl += (aL - vf * P.w) * dt;
  P.w += ((1.2 * (FyF * cd + fxF * sd) - 1.3 * FyR) / 1.7 - P.w * (0.3 + 0.9 * min(1, 4 * vl * vl / (sp * sp + 1)))) * dt;
  P.ax = aF;
  if (sp < 2.5) { P.w *= 1 - 5 * dt; vl *= 1 - 5 * dt; }
  P.yaw += P.w * dt;
  const s2 = sin(P.yaw), c2 = Math.cos(P.yaw);
  P.vx = vf * s2 + vl * c2; P.vz = vf * c2 - vl * s2;
  P.x += P.vx * dt; P.z += P.vz * dt;
  P.vf = vf; P.vl = vl;
}

function puff(P, c, a, r, n) {
  const sn = sin(P.yaw), cn = Math.cos(P.yaw);
  for (let k = -1; k < 2; k += 2) for (let i = 0; i < n; i++) if (R.pt.length < 150) R.pt.push({ x: P.x - sn * 1.5 + cn * k * 0.75 + (rnd() - 0.5), z: P.z - cn * 1.5 - sn * k * 0.75 + (rnd() - 0.5), y: P.y, h: 0.25, c, a, r, l: 0.6, m: 0.6 });
}

function upP(P, dt) {
  const p = P.i + 1, tk = TR, rail = R.ri === 4;
  if (P.demo) {
    const i = Math.floor(P.s / tk.ds);
    let vt = 30;
    for (let q = 0; q < 12; q++) vt = min(vt, Math.sqrt(9 / (abs(tk.k[tk.ix(i + q)]) + 1e-4) + 14 * q * tk.ds));
    P.spd += clamp(vt - P.spd, -9 * dt, 5 * dt); P.s += P.spd * dt;
    if (P.s > tk.len - 60) P.s = 12;
    P.fl += (clamp(tk.k[tk.ix(i + 2)] * P.spd * 0.9, -0.8, 0.8) - P.fl) * min(1, dt * 5);
    pth(P); P.sp = P.spd; P.be = P.fl;
    P.vx = sin(P.yaw - P.fl) * P.spd; P.vz = Math.cos(P.yaw - P.fl) * P.spd;
    P.cyaw += wrapA(P.yaw - P.fl * 0.75 - P.cyaw) * min(1, dt * 4);
    if (abs(P.fl) > 0.25) puff(P, 0xd8d8e0, 0.35, 0.5, 1);
    return;
  }
  let sr = (pk(p, 'R') ? 1 : 0) - (pk(p, 'L') ? 1 : 0), U = gas(p), D = pk(p, 'D'), hb = btn(p, 0), b2 = btn(p, 1);
  if (!R.go) { if (U && !P.gu) P.pre = R.t; P.gu = U; return; }
  if (!P.st0) {
    P.st0 = 1;
    if (P.pre && R.t - P.pre < 0.3) { const sn = sin(P.yaw), cn = Math.cos(P.yaw); P.vx = sn * 9; P.vz = cn * 9; P.ni = min(3, P.ni + 0.5); pop(P, '¡PIQUE PERFECTO!', '#a0ff40'); nz(0.5, 0.25, 1200, 'bandpass'); }
  }
  if (P.fin) { sr = 0; U = hb = b2 = 0; D = 1; }
  P.inv -= dt; P.shk -= dt; P.bnc -= dt * 2.5;
  if (P.cmbT > 0) { P.cmbT -= dt; if (P.cmbT <= 0 && !P.dr) P.cmb = 1; }
  P.bo = b2 && P.ni > 0 && !D ? 1 : 0;
  if (P.bo) { if (!P.wb) { nz(0.5, 0.25, 1200, 'bandpass'); tone(200, 0.5, 'sawtooth', 0.1, 900); } P.ni -= dt * 0.7; }
  P.wb = P.bo;
  if (P.slp > 0.5 && U) { P.vx *= 1 + 0.06 * dt; P.vz *= 1 + 0.06 * dt; }
  if (hb) P.dk = 1; else if (abs(P.be) < 0.22) P.dk = max(0, P.dk - dt * 2.5);
  const surf = !tk.lot && abs(P.lat) > tk.hw + 1 ? 0.6 : 1;
  for (let q = 0; q < 4; q++) phys(P, U, D, hb, sr, dt / 4, surf);
  const si0 = P.si;
  loc(P);
  // limits: kerb wall on streets, fence around the open lot
  let nx = 0, nz_ = 0, ex = 0;
  if (tk.lot) {
    const l = tk.lot;
    if (P.x < l[0] + 1) { nx = -1; ex = l[0] + 1 - P.x; } else if (P.x > l[2] - 1) { nx = 1; ex = P.x - l[2] + 1; }
    else if (P.z < l[1] + 1) { nz_ = -1; ex = l[1] + 1 - P.z; } else if (P.z > l[3] - 1) { nz_ = 1; ex = P.z - l[3] + 1; }
  } else {
    ex = abs(P.lat) - tk.hw - (rail ? 0.2 : 3.4);
    if (ex > 0) { const s = sgn(P.lat); nx = tk.tz[P.si] * s; nz_ = -tk.tx[P.si] * s; }
  }
  if (ex > 0) {
    const vn = P.vx * nx + P.vz * nz_;
    P.x -= nx * ex; P.z -= nz_ * ex;
    if (vn > 0) {
      P.vx -= nx * vn * 1.3; P.vz -= nz_ * vn * 1.3;
      if (vn > 2.5 && P.inv <= 0) { crash(P, 0.75); pop(P, rail ? '¡BARRERA!' : '¡EL MURO!', '#ff4040'); }
      for (let k = 0; k < 3; k++) R.pt.push({ x: P.x + nx, z: P.z + nz_, y: P.y, h: 0.3 + rnd() * 0.5, c: 0xffc040, a: 1, r: 0.07, l: 0.25, m: 0.25 });
    }
  }
  const sp = Math.hypot(P.vx, P.vz), be = sp > 6 && P.vf > 0 ? Math.atan2(P.vl, P.vf) : 0, ab = abs(be);
  P.sp = sp; P.be = be;
  // chase camera follows where the car is going, not where it points
  const ct = P.vf > 2 ? P.yaw + be * 0.72 : P.yaw;
  P.cyaw += wrapA(ct - P.cyaw) * min(1, dt * 5);
  // drift scoring
  if (ab > 0.2 && sp > 8) {
    const edge = !tk.lot && abs(P.lat) > tk.hw - 1.3, gain = min(ab, 1.1) * sp / 22 * dt * P.tb * (edge ? 1.6 : 1) * 1.6, l0 = P.ch | 0;
    P.dr = 1; P.dT = 0.4;
    P.ch = min(3, P.ch + gain); P.pts += gain * 100 * P.cmb;
    if ((P.ch | 0) > l0) tone(400 + 250 * (P.ch | 0), 0.1, 'square', 0.1);
    if (edge && !P.edg) pop(P, '¡AL FILO!', '#40e0ff');
    P.edg = edge;
    puff(P, 0xd8d8e0, 0.22, 0.3, 1);
    if (P.ch >= 1) puff(P, [0, 0x40c8ff, 0xff9020, 0xff40c0][P.ch | 0], 0.9, 0.08, 1);
    // tyre marks from both rear wheels
    const sn = sin(P.yaw), cn = Math.cos(P.yaw), rw = [];
    for (let k = -1; k < 2; k += 2) rw.push(P.x - sn * 1.3 + cn * k * 0.75, P.z - cn * 1.3 - sn * k * 0.75);
    if (P.rw) for (let k = 0; k < 4; k += 2) {
      R.sk.push([P.rw[k] - cn * 0.12, P.y, P.rw[k + 1] + sn * 0.12, P.rw[k] + cn * 0.12, P.y, P.rw[k + 1] - sn * 0.12, rw[k] + cn * 0.12, P.y, rw[k + 1] - sn * 0.12, rw[k] - cn * 0.12, P.y, rw[k + 1] + sn * 0.12]);
      if (R.sk.length > 220) R.sk.shift();
    }
    P.rw = rw;
  } else {
    P.rw = null;
    if (P.dr) {
      P.dT -= dt;
      if (P.dT <= 0 || P.vf < 0) {
        P.dr = 0;
        const lv = P.ch | 0;
        if (P.vf < 0 || ab > 1.4) { P.cmb = 1; pop(P, '¡TROMPO!', '#ff4040'); }
        else if (lv) {
          P.ni = min(3, P.ni + P.ch * 0.5);
          pop(P, ['', '¡WENA!', '¡LA MEDIA VOLÁ!', '¡¡CUMA DRIFT!!'][lv] + ' x' + P.cmb, ['', '#40c8ff', '#ff9020', '#ff40c0'][lv]);
          tone(500 * lv, 0.25, 'square', 0.12, 1000 * lv); nz(0.4, 0.2, 1200, 'bandpass');
          P.cmb = min(9, P.cmb + 1); P.cmbT = 5;
        }
        P.ch = 0;
      }
    }
  }
  P.o.boost = P.bo; P.o.brake = D || hb;
  // traffic, rival and the other player, compared in track coordinates
  const pdk = 'pd' + P.i;
  let slip = 0;
  for (const t of R.cars) {
    let ds = t.s - P.s;
    if (tk.loop) { if (ds > tk.len / 2) ds -= tk.len; else if (ds < -tk.len / 2) ds += tk.len; }
    const TL = CT[t.ty].L * M / 2 + 2.1, dl = t.lat - P.lat, ov = abs(dl) < t.w + 0.95;
    if (!t.on && ds > 4 && ds < 20 && abs(dl) < 1.2 && t.sp > 11) slip = 1;
    if (abs(ds) < TL && ov && P.inv <= 0) {
      const nxx = tk.tz[P.si] * sgn(dl), nzz = -tk.tx[P.si] * sgn(dl);
      P.vx -= nxx * 3; P.vz -= nzz * 3;
      if (t.on) { crash(P, 0.15); pop(P, '¡DE FRENTE!', '#ff4040'); }
      else if (ds > 1 && sp > t.sp + 1) { crash(P, max(0.4, (t.sp * 0.9) / sp)); pop(P, t.ty === 4 ? '¡LA MICRO!' : t.ai ? '¡TOPÓN!' : '¡CHOQUE!', '#ff4040'); }
      else P.shk = 0.2;
    }
    if (t[pdk] > 0 && ds <= 0 && !ov && !t.ai && sp > abs(t.sp) + 2) {
      const cl = abs(dl) < t.w + 1.8, b = (t.on ? 150 : 40) * (cl ? 2.5 : 1) * P.cmb;
      P.pts += b; P.ov++; P.cmb = min(9, P.cmb + 1); P.cmbT = 3.5;
      if (cl) P.ni = min(3, P.ni + 0.2);
      if (t.on || cl) pop(P, (t.on ? '¡CONTRA EL TRÁNSITO!' : '¡RASPADA!') + ' +' + b, '#a0ff40');
      tone(cl ? 1300 : 900, 0.07, 'square', 0.07);
    }
    t[pdk] = ds;
  }
  for (const q of R.P) if (q !== P) {
    const dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz);
    if (d < 2.3 && d > 0.01) { const k = (2.3 - d) / d * 0.5; P.x += dx * k; P.z += dz * k; P.vx += dx / d * 2; P.vz += dz / d * 2; P.shk = 0.2; }
  }
  const s0 = P.slp > 0.5;
  P.slp = clamp(P.slp + (slip ? dt * 1.2 : -dt * 2), 0, 1.3);
  if (P.slp > 0.5 && !s0) { pop(P, '¡REBUFO!', '#40e0ff'); nz(0.4, 0.12, 900, 'bandpass'); }
  // hazards on samples crossed this frame
  let stp = P.si - si0;
  if (tk.loop) stp = (stp % tk.N + tk.N) % tk.N;
  if (stp > 12 || stp < 0) stp = 0;
  for (let q = 1; q <= stp; q++) {
    const hl = tk.hm[tk.ix(si0 + q)];
    if (hl) for (const o of hl) {
      const t = o.t, d2 = abs(o.lat - P.lat);
      if (t === 'y' && d2 < 1.3) { P.vx *= 0.75; P.vz *= 0.75; P.shk = 0.35; P.bnc = 0.6; pop(P, '¡HOYO!', '#ff9020'); nz(0.2, 0.4, 300, 'lowpass'); }
      else if (t === 'm') {
        P.bnc = 1;
        if (sp > 13) { P.vx *= 0.78; P.vz *= 0.78; P.shk = 0.4; pop(P, '¡LOMO DE TORO!', '#ff9020'); nz(0.25, 0.4, 250, 'lowpass'); }
      } else if (t === 'g') {
        if (P.bo) { P.pts += 300; pop(P, 'TAG EVADIDO +300', '#a0ff40'); }
        else { P.fine += 300; pop(P, 'TAG: -$300', '#ff4040'); tone(1200, 0.08, 'square', 0.1); }
      } else if (t === 'P' && sp > 19 && P.cop <= 0) { P.cop = 6.5; pop(P, '¡CARABINEROS! NO FRENES', '#40a0ff'); }
      else if (t === 'd') {
        if (d2 < 1.2) { P.vx *= 0.3; P.vz *= 0.3; P.shk = 0.3; P.cmb = 1; pop(P, '¡CUIDADO EL QUILTRO!', '#ff9020'); tone(700, 0.08, 'square', 0.15, 500); }
        else if (d2 < 3) { P.pts += 150; pop(P, 'QUILTRO ESQUIVADO +150', '#a0ff40'); }
      }
    }
  }
  if (P.cop > 0) {
    P.cop -= dt; P.sir -= dt;
    if (P.sir <= 0) { P.sir = 0.35; tone((now * 2.8 | 0) % 2 ? 660 : 880, 0.33, 'sine', 0.07); }
    if (sp < 8 && P.inv <= 0) bust(P);
    else if (P.cop <= 0) { P.pts += 500; pop(P, '¡TE ARRANCASTE! +500', '#a0ff40'); }
  }
  // wrong way and respawn
  P.ww = P.vx * tk.tx[P.si] + P.vz * tk.tz[P.si] < -3 && !tk.lot ? P.ww + dt : 0;
  if (tap(p, 6) && !P.fin) { const i = P.si; P.x = tk.x[i]; P.z = tk.z[i]; P.yaw = P.cyaw = Math.atan2(tk.tx[i], tk.tz[i]); P.vx = P.vz = P.w = 0; P.cmb = 1; P.ch = 0; }
  if (!P.fin && R.mode !== 'free' && (tk.loop ? P.lap >= R.laps : P.si >= tk.N - 10)) { P.fin = R.t; sOk(); }
}

function upCars(dt) {
  const tk = TR, P0 = R.P[0];
  for (const o of R.dogs) { o.lat = sin(now * 0.7 + o.p) * tk.hw; o.x = tk.x[o.i] + tk.tz[o.i] * o.lat; o.z = tk.z[o.i] - tk.tx[o.i] * o.lat; }
  for (const c of R.cars) {
    if (c.ai) {
      const i = Math.floor(c.s / tk.ds);
      let vt = c.vmx;
      for (let q = 0; q < 14; q++) vt = min(vt, Math.sqrt(c.al / (abs(tk.k[tk.ix(i + q)]) + 1e-4) + 13 * q * tk.ds));
      vt *= 1 + clamp((P0.prog - c.prog) * tk.ds / 300, -0.07, 0.1);
      let tl = clamp(tk.k[tk.ix(i + 3)] * 60, -1, 1) * (tk.hw - 1.6);
      if (RT[R.ri].two) tl = max(tl, 0.9);
      for (const t of R.cars) {
        if (t === c) continue;
        let d = t.s - c.s;
        if (tk.loop) { if (d > tk.len / 2) d -= tk.len; else if (d < -tk.len / 2) d += tk.len; }
        if (d > -6 && d < (t.on ? 70 : 26) && abs(t.lat - tl) < 2.4) {
          tl = t.lat > 0 ? t.lat - 3.4 : t.lat + 3.4;
          if (d > 0 && d < 12 && abs(t.lat - c.lat) < 2 && !t.on) vt = min(vt, t.sp);
        }
      }
      tl = clamp(tl, -tk.hw + 1.2, tk.hw - 1.2);
      if (c.fin || !R.go) vt = 0;
      c.sp += clamp(vt - c.sp, -10 * dt, 4.2 * dt);
      c.lat += clamp(tl - c.lat, -4 * dt, 4 * dt);
      c.fl += (clamp(tk.k[tk.ix(i + 1)] * c.sp * 0.8, -0.75, 0.75) - c.fl) * min(1, dt * 5);
      c.prog = c.lapc * tk.N + c.s / tk.ds;
      if (!c.fin && (tk.loop ? c.lapc >= R.laps : c.s >= tk.len - 40)) c.fin = R.t;
    } else if (R.go) {
      c.lt -= dt;
      if (c.lt <= 0) {
        if (c.bk) { c.lx = c.nl; c.bk = 0; c.lt = 4 + rnd() * 8; }
        else { c.nl = -c.lx; c.bk = sgn(c.nl - c.lx); c.lt = 1.1; }
      }
      const d = c.lx - c.lat;
      c.lat += d * min(1, dt * 1.6); c.fl = d * 0.1 * (c.on ? -1 : 1);
    }
    if (R.go || c.ai) c.s += c.sp * dt;
    if (c.s >= tk.len) { c.s -= tk.len; if (c.ai) c.lapc++; } else if (c.s < 0) c.s += tk.len;
    pth(c);
  }
  for (let i = R.pt.length - 1; i >= 0; i--) { const p = R.pt[i]; p.l -= dt; p.h += dt * 0.8; if (p.l <= 0) R.pt.splice(i, 1); }
}

function hud(P, oy, VH) {
  const i = P.i, vs = R.mode === 'vs', tk = TR, free = R.mode === 'free';
  T('sp' + i, W - 16, oy + VH - 14, (P.sp * 3.6 | 0) + '', vs ? 34 : 46, P.bo ? '#40e0ff' : '#ffffff', 1, 1);
  T('kh' + i, W - 16, oy + VH - (vs ? 50 : 64), 'KM/H', 12, '#ffe600', 1, 1);
  T('ni' + i, 16, oy + VH - 34, 'PISCOLA', 12, '#ffe600', 0, 1);
  for (let k = 0; k < 3; k++) {
    gu.fillStyle(0x000000, 0.6); gu.fillRect(16 + k * 44, oy + VH - 30, 40, 14);
    gu.fillStyle(P.bo ? 0x40e0ff : 0xff9020, 1); gu.fillRect(18 + k * 44, oy + VH - 28, 36 * clamp(P.ni - k, 0, 1), 10);
  }
  if (P.dr) {
    const col = ['#ffffff', '#40c8ff', '#ff9020', '#ff40c0'][min(3, P.ch | 0)];
    T('an' + i, W / 2, oy + VH - 46, (abs(P.be) * 57.3 | 0) + '°', vs ? 26 : 34, col);
    gu.fillStyle(0x000000, 0.6); gu.fillRect(W / 2 - 92, oy + VH - 26, 184, 12);
    gu.fillStyle(parseInt(col.slice(1), 16), 1); gu.fillRect(W / 2 - 90, oy + VH - 24, 180 * (P.ch / 3), 8);
  }
  T('pt' + i, 16, oy + 12, (P.pts | 0) + (P.cmb > 1 ? '  x' + P.cmb : ''), 22, P.cmb > 1 ? '#ff40c0' : '#ffe600', 0, 0);
  // minimap
  const mx = 16, my = oy + 44, sc = vs ? 0.14 : 0.2;
  gu.lineStyle(3, 0xffffff, 0.5);
  for (let k = 0; k < tk.N; k += 3) { const j = tk.ix(k + 3); if (j > k || tk.loop) gu.lineBetween(mx + 60 + (tk.x[k] - tk.x[0]) * sc, my + 60 - (tk.z[k] - tk.z[0]) * sc, mx + 60 + (tk.x[j] - tk.x[0]) * sc, my + 60 - (tk.z[j] - tk.z[0]) * sc); }
  const dot = (o, c) => { gu.fillStyle(c, 1); gu.fillCircle(mx + 60 + (o.x - tk.x[0]) * sc, my + 60 - (o.z - tk.z[0]) * sc, 4); };
  if (R.rv) dot(R.rv, 0xff3060);
  for (const q of R.P) dot(q, q === P ? 0xffe600 : 0xff3060);
  if (!free) {
    const oth = R.rv || (vs ? R.P[1 - i] : null);
    if (oth) { const gap = (P.prog - oth.prog) * tk.ds | 0; T('gp' + i, W / 2, oy + 20, (gap >= 0 ? '1° +' : '2° ') + gap + ' m', 18, gap >= 0 ? '#a0ff40' : '#ff6060'); }
    T('cv' + i, W - 16, oy + 12, (tk.loop ? 'VUELTA ' + min(R.laps, P.lap + 1) + '/' + R.laps : 'CURVA ' + min(40, 25 + (P.si / tk.N * 16 | 0)) + '/40') + '  ' + tm(max(0, R.t - 4)), 16, '#ffffff', 1, 0);
  } else T('cv' + i, W - 16, oy + 12, ['TRACCIÓN DELANTERA', 'TRACCIÓN TRASERA', '4X4'][P.c.dr] + ' · START x2 SALIR', 14, '#ffffff', 1, 0);
  if (P.ww > 1.2) T('ww' + i, W / 2, oy + VH * 0.4, '¡SENTIDO CONTRARIO!', 30, '#ff4040');
  if (P.pop) {
    const q = P.pop;
    q.t += 0.016;
    if (q.t > 1.3) P.pop = null;
    else T('pop' + i, W / 2, oy + VH * 0.22 - q.t * 12, q.s, vs ? 26 : 34, q.c).setScale(1 + max(0, 0.2 - q.t) * 3).setAlpha(min(1, (1.3 - q.t) * 3));
  }
  if (P.fin) T('fin' + i, W / 2, oy + VH * 0.4, '¡META!  ' + tm(P.fin - 4), vs ? 32 : 44, '#ffe600');
}

function race(dt) {
  R.t += dt;
  const cd = Math.ceil(4 - R.t), dm = R.mode === 'demo', free = R.mode === 'free';
  if (dm || free) R.go = 1;
  else if (cd !== R.cdn) {
    R.cdn = cd;
    if (cd > 0 && cd < 4) tone(440, 0.15, 'square', 0.2);
    if (cd === 0) { tone(880, 0.5, 'square', 0.2); R.go = 1; }
  }
  upCars(dt);
  for (const P of R.P) upP(P, dt);
  const vs = R.mode === 'vs', VH = vs ? 300 : 600;
  view(R.P[0], g0, VH);
  if (vs) view(R.P[1], g1, VH);
  for (const P of R.P) P.zm += ((P.bo ? 1.12 : 1.04) - P.zm) * min(1, dt * 5);
  cam0.setRotation(clamp(-R.P[0].w * 0.02, -0.05, 0.05)); cam0.setZoom(R.P[0].zm);
  if (vs) { cam1.setRotation(clamp(-R.P[1].w * 0.02, -0.05, 0.05)); cam1.setZoom(R.P[1].zm); }
  if (dm) return;
  mu.hot = R.P.some((P) => P.cmb > 2);
  for (let i = 0; i < ENG.length; i++) {
    const P = R.P[i], e = ENG[i], n = P.sp / P.c.vm, t = AC.currentTime, gr = n * 5;
    e.o.frequency.setTargetAtTime(52 + (n >= 1 ? 1 : 0.35 + (gr % 1) * 0.65) * 105 + (gr | 0) * 9 + (gas(i + 1) ? 12 : 0), t, 0.05);
    e.a.gain.setTargetAtTime(P.fin ? 0 : 0.04 + 0.05 * n + (gas(i + 1) ? 0.03 : 0) + (P.up[5] ? 0.03 : 0), t, 0.05);
    e.sa.gain.setTargetAtTime(P.dr ? min(0.09, 0.03 + abs(P.be) * 0.07) : 0, t, 0.04);
  }
  hud(R.P[0], 0, VH);
  if (vs) { hud(R.P[1], 300, VH); gu.fillStyle(0x000000, 1); gu.fillRect(0, 297, W, 6); gu.fillStyle(0xffe600, 1); gu.fillRect(0, 299, W, 2); }
  if (!free) {
    if (cd > 0 && cd < 4) {
      T('cdh', W / 2, H / 2 + 60, 'ACELERA JUSTO EN EL ¡DALE! = PIQUE PERFECTO', 14, '#ffffff');
      T('cd', W / 2, H / 2 - 40, cd + '', 110, '#ffe600').setScale(1 + (R.t % 1) * 0.4).setAlpha(1 - (R.t % 1) * 0.6);
    } else if (R.t < 5 && cd <= 0) T('cd', W / 2, H / 2 - 40, '¡DALE!', 90, '#a0ff40');
  } else if (R.t < 6) T('cdh', W / 2, 120, 'PISTA LIBRE\n↑ ACELERA · ↓ FRENA · BOTÓN 1 FRENO DE MANO\nBOTÓN 2 PISCOLA · BOTÓN 6 VOLVER A LA PISTA', 18, '#ffffff');
  if (hit.START1 || hit.START2) {
    if (now - R.q < 1.2) { endRace(); go(vs || free ? 'title' : 'garage'); return; }
    R.q = now;
  }
  if (now - R.q < 1.2) T('quit', W / 2, H - 60, 'START OTRA VEZ PARA SALIR', 16, '#ffffff');
  if (free) return;
  const P0 = R.P[0];
  if (vs) {
    const a = R.P[0].fin, b = R.P[1].fin;
    if ((a || b) && !R.end) R.end = R.t + (a && b ? 2 : 9);
    if (a && b && R.end > R.t + 2) R.end = R.t + 2;
  } else {
    if (R.rv.fin && !P0.fin && !R.lost) { R.lost = 1; pop(P0, 'TE GANÓ ' + RT[R.ri].rv.n, '#ff4040'); R.end = R.t + 12; }
    if (P0.fin && (!R.end || R.end > P0.fin + 2)) R.end = P0.fin + 2;
  }
  if (R.end && R.t > R.end) finish();
}
function endRace() {
  engOff();
  cam0.setViewport(0, 0, W, H); cam0.setRotation(0); cam0.setZoom(1); cam1.setVisible(false); cam1.setRotation(0);
}
const facha = () => 1 + 0.25 * (SV.up[3] + SV.up[4] + SV.up[5] + SV.up[6]) + 0.1 * SV.car;
function finish() {
  endRace();
  if (R.mode === 'vs') {
    const a = R.P[0].fin || 1e9, b = R.P[1].fin || 1e9;
    R.res = { w: a <= b ? 0 : 1 };
    go('vres');
    return;
  }
  const P = R.P[0], win = P.fin && (!R.rv.fin || P.fin <= R.rv.fin), base = win ? RT[R.ri].win : 0, dr = (P.pts * facha() / 20) | 0;
  const earn = max(0, base + dr - P.fine), t = P.fin ? P.fin - 4 : 0;
  let rec = 0;
  if (win && (!SV.best[R.ri] || t < SV.best[R.ri])) { SV.best[R.ri] = t; rec = 1; }
  R.res = { win, base, dr, fine: P.fine, earn, t, rec, first: win && SV.prog === R.ri };
  SV.cash += earn;
  if (R.res.first) SV.prog++;
  if (R.res.first && R.ri === 4) SV.own[3] = 1;
  save();
  go('result');
  if (win) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'square', 0.12, 0, AC ? AC.currentTime + i * 0.11 : 0));
  else sNo();
}

// ---------- screens ----------
function go(s) {
  S = s; st = 0; sel = 0; page = 0; idle = 0;
  if (s === 'title') { music(0, 3); muffle(16000); startRace(4, 'demo'); }
  else if (s === 'garage') { music(1, 1); muffle(900); rsel = min(SV.prog, 4); }
  else if (s === 'vsel') { music(1, 2); muffle(16000); VS.r = [0, 0]; }
  else if (s === 'intro' || s === 'pre' || s === 'end') { music(1, 1); muffle(700); }
}
function panel(x, y, w, h, c) {
  gu.fillStyle(0x000000, 0.72); gu.fillRect(x, y, w, h);
  gu.lineStyle(2, c || 0xffe600, 1); gu.strokeRect(x, y, w, h);
}
function floor() {
  gu.fillStyle(0x08060f, 1); gu.fillRect(0, 0, W, H);
  gu.lineStyle(1, 0xff40c0, 0.25);
  for (let i = 0; i < 12; i++) { const y = 380 + i * i * 2.2; gu.lineBetween(0, y, W, y); }
  for (let i = -10; i < 11; i++) gu.lineBetween(W / 2 + i * 40, 380, W / 2 + i * 190, H);
  gu.fillStyle(0xff40c0, 0.08); gu.fillRect(0, 370, W, 12);
}
function showCar(x, y, sc, ty, a, o) { cg = gu; cx = x; by = y; cs = sc; ca = 1; vcam = 620; FV = 1500; car(ty, a, o); FV = F; }
const myTy = () => (SV.car === 0 && SV.bug ? 9 : SV.car);
const myO = () => ({ neon: SV.car === 3 ? 0xb040ff : SV.up[3] ? 0x30ff90 : 0, wing: SV.up[4] || SV.car === 3, exh: SV.up[5] });

function title(dt) {
  race(dt);
  gu.fillStyle(0x000000, 0.35); gu.fillRect(0, 0, W, H);
  const b = 1 + sin(now * 16.2) * 0.02;
  T('t1s', W / 2 + 6, 136, 'CUMA', 120, '#ff40c0').setScale(b);
  T('t1', W / 2, 130, 'CUMA', 120, '#ffe600').setScale(b);
  T('t2s', W / 2 + 5, 235, 'DRIFT', 92, '#40e0ff').setScale(b).setAngle(-4);
  T('t2', W / 2, 230, 'DRIFT', 92, '#ffffff').setScale(b).setAngle(-4);
  T('t3', W / 2, 300, 'DE MAIPÚ AL CERRO', 20, '#ffe600');
  const it = [SV.on ? 'CONTINUAR HISTORIA' : 'MODO HISTORIA', 'VERSUS 2 JUGADORES', 'PISTA LIBRE'];
  if (tap(1, 'U') || tap(2, 'U')) { sel = (sel + 2) % 3; sSel(); }
  if (tap(1, 'D') || tap(2, 'D')) { sel = (sel + 1) % 3; sSel(); }
  it.forEach((s, i) => T('m' + i, W / 2, 380 + i * 44, (sel === i ? '▶ ' : '') + s, sel === i ? 30 : 24, sel === i ? '#ffe600' : '#ffffff'));
  if ((now * 2 | 0) % 2) T('ps', W / 2, 520, 'APRETA UN BOTÓN', 18, '#a0ff40');
  T('cr', W / 2, 575, 'JOYSTICK ↑ ACELERA ↓ FRENA · BOTÓN 1 FRENO DE MANO · BOTÓN 2 PISCOLA', 12, '#ffffff');
  if (hit.START2 && !okHit(1)) sel = 1;
  if (okHit(1) || okHit(2)) {
    sOk(); endRace();
    if (sel === 2) startRace(5, 'free');
    else if (sel) go('vsel');
    else go(SV.on ? 'garage' : 'intro');
  }
}

const INTRO = [
  ['MAIPÚ. 23:47.', 'Tu papá se quedó dormido\nviendo las noticias.'],
  ['', 'Las llaves del auto\nestán en el mesón.'],
  ['', '«Se lo saco un ratito no más...»'],
];
function intro() {
  gu.fillStyle(0x000000, 1); gu.fillRect(0, 0, W, H);
  if (page < 3) {
    const p = INTRO[page], s = p[1].slice(0, st * 30 | 0);
    T('i0', W / 2, 200, p[0], 40, '#ffe600');
    T('i1', W / 2, 300, s, 28, '#ffffff');
    if (okHit(1)) { if (s.length < p[1].length) st = 9; else { page++; st = 0; sSel(); } }
  } else {
    T('i0', W / 2, 90, '¿QUÉ AUTO TIENE TU PAPÁ?', 34, '#ffe600');
    if (tap(1, 'L') || tap(1, 'R')) { SV.bug = 1 - SV.bug; sSel(); }
    floor(); gu.fillStyle(0x000000, 1); gu.fillRect(0, 0, W, 140);
    showCar(240, 400, SV.bug ? 0.4 : 0.6, 0, sin(now) * 0.4, {});
    showCar(560, 400, SV.bug ? 0.6 : 0.4, 9, sin(now + 2) * 0.4, {});
    T('i2', 240, 440, 'PEJÓ 206', SV.bug ? 20 : 30, SV.bug ? '#888888' : '#ffe600');
    T('i3', 560, 440, "ESCARABAJO '74", SV.bug ? 30 : 20, SV.bug ? '#ffe600' : '#888888');
    T('i4', W / 2, 520, '◀ ▶ ELEGIR · BOTÓN: LLEVÁRSELO', 18, '#ffffff');
    if (okHit(1) && st > 0.3) { SV.on = 1; save(); sOk(); go('garage'); }
  }
}

function garage() {
  floor();
  const nx = SV.car < 3 && !SV.own[SV.car + 1] ? SV.car + 1 : -1, items = [];
  items.push({ s: 'CORRER: ' + RT[rsel].n, c: '#a0ff40', k: 'go' });
  UPS.forEach((u, i) => {
    const l = SV.up[i], p = u.p * (l + 1);
    items.push({ s: u.n + ' ' + '■'.repeat(l) + '□'.repeat(u.m - l), r: l >= u.m ? 'FULL' : fmt(p), k: 'up', i, p, ok: l < u.m });
  });
  for (let i = 0; i < 4; i++) if (i !== SV.car && (SV.own[i] || i === nx)) items.push({ s: (SV.own[i] ? 'USAR ' : 'COMPRAR ') + CARS[i].n, r: SV.own[i] ? '' : fmt(CARS[i].p), k: 'car', i, p: SV.own[i] ? 0 : CARS[i].p, ok: 1 });
  items.push({ s: 'VOLVER AL MENÚ', k: 'menu' });
  if (tap(1, 'U')) { sel = (sel + items.length - 1) % items.length; sSel(); }
  if (tap(1, 'D')) { sel = (sel + 1) % items.length; sSel(); }
  sel = min(sel, items.length - 1);
  const it = items[sel], mr = min(SV.prog, 4);
  if (it.k === 'go' && (tap(1, 'L') || tap(1, 'R'))) { rsel = (rsel + (tap(1, 'L') ? mr : 1)) % (mr + 1); sSel(); }
  T('gt', 24, 14, 'TALLER DON CUMA', 30, '#ffe600', 0, 0);
  T('gc', W - 24, 14, fmt(SV.cash), 30, '#a0ff40', 1, 0);
  showCar(210, 350, 0.62, myTy(), now * 0.8, myO());
  T('gn', 210, 110, SV.car === 0 && SV.bug ? "ESCARABAJO '74" : CARS[SV.car].n, 24, '#ffffff');
  const cr = CARS[SV.car], stt = [['POTENCIA', cr.pw * (1 + 0.08 * SV.up[0]) / 8], ['AGARRE', cr.mu * (1 + 0.04 * SV.up[1]) - 0.6], ['TURBO', 0.25 + 0.25 * SV.up[2]], ['FACHA', (facha() - 1) / 1.3 + 0.08]];
  T('gd', 210, 136, 'TRACCIÓN ' + ['DELANTERA', 'TRASERA', '4X4'][SV.car === 0 && SV.bug ? 1 : cr.dr], 14, '#40e0ff');
  stt.forEach((s, i) => {
    T('gs' + i, 40, 440 + i * 30, s[0], 14, '#ffffff', 0, 0.5);
    gu.fillStyle(0x222233, 1); gu.fillRect(150, 434 + i * 30, 220, 12);
    gu.fillStyle(i === 3 ? 0xff40c0 : 0xffe600, 1); gu.fillRect(150, 434 + i * 30, 220 * clamp(s[1], 0, 1), 12);
  });
  panel(410, 70, 370, 500);
  items.forEach((m, i) => {
    const y = 96 + i * 36, on = sel === i;
    if (on) { gu.fillStyle(0xffe600, 0.16); gu.fillRect(414, y - 16, 362, 32); }
    T('g' + i, 428, y, (on ? '▶ ' : '') + m.s, 17, on ? (m.c || '#ffe600') : '#ffffff', 0, 0.5);
    if (m.r) T('gr' + i, 768, y, m.r, 17, m.p > SV.cash ? '#ff6060' : '#a0ff40', 1, 0.5);
  });
  const r = RT[rsel];
  T('gi', 595, 500, it.k === 'go' ? '◀ ▶ RUTA · ' + r.s + '\nRIVAL: ' + r.rv.n + (SV.best[rsel] ? ' · RÉCORD ' + tm(SV.best[rsel]) : '') : it.k === 'up' ? ['Más potencia y velocidad', 'Más agarre en curva', 'El derrape carga más piscola', 'Luces bajo el auto. +FACHA', 'No hace nada. +FACHA', 'Suena más fuerte. +FACHA', 'Más bajo en la música. +FACHA'][it.i] : it.k === 'car' ? 'Auto nuevo, más rápido.' : '', 14, '#ffffff');
  T('gh', W / 2, 590, 'FACHA multiplica la plata del derrape', 12, '#ff40c0', 0.5, 1);
  if (okHit(1)) {
    if (it.k === 'go') { sOk(); go('pre'); }
    else if (it.k === 'menu') { sOk(); go('title'); }
    else if (it.k === 'up') {
      if (it.ok && SV.cash >= it.p) { SV.cash -= it.p; SV.up[it.i]++; save(); sOk(); } else sNo();
    } else if (it.k === 'car') {
      if (SV.cash >= it.p) { SV.cash -= it.p; SV.own[it.i] = 1; SV.car = it.i; save(); sOk(); } else sNo();
    }
  }
}

function pre() {
  const r = RT[rsel], rv = r.rv;
  gu.fillStyle(0x000000, 1); gu.fillRect(0, 0, W, H);
  floor(); gu.fillStyle(0x000000, 0.6); gu.fillRect(0, 0, W, H);
  T('p0', W / 2, 60, r.n, 54, '#ffe600');
  T('p1', W / 2, 108, r.s, 18, '#40e0ff');
  showCar(600, 380, 0.6, rv.car, sin(now) * 0.3 - 0.4, { col: rv.col, neon: rsel > 2 ? 0xff3060 : 0, wing: rsel > 0 });
  showCar(200, 380, 0.6, myTy(), sin(now) * 0.3 + 0.4, myO());
  T('p2', 200, 420, 'TÚ', 22, '#ffffff'); T('p3', 600, 420, rv.n, 22, '#ff6060');
  T('pv', W / 2, 300, 'VS', 60, '#ff40c0').setAngle(-8);
  panel(100, 455, 600, 90, 0xff6060);
  const q = rv.q.slice(0, st * 40 | 0);
  T('p4', W / 2, 500, q, 18, '#ffffff');
  if ((now * 2 | 0) % 2) T('p5', W / 2, 572, 'BOTÓN: CORRER', 16, '#a0ff40');
  if (okHit(1) && st > 0.3) { sOk(); startRace(rsel, 'story'); }
}

function result() {
  const r = R.res, rv = RT[R.ri].rv;
  floor();
  T('r0', W / 2, 70, r.win ? '¡GANASTE!' : R.P[0].fin ? 'PERDISTE' : 'NO LLEGASTE', 70, r.win ? '#a0ff40' : '#ff4040');
  T('r1', W / 2, 130, r.win ? rv.n + ': «…no puede ser.»' : rv.n + ': «Vuelve cuando aprendas.»', 18, '#ffffff');
  panel(200, 170, 400, 280);
  const rows = [['TIEMPO', r.t ? tm(r.t) + (r.rec ? '  ¡RÉCORD!' : '') : '--'], ['PREMIO', fmt(r.base)], ['DERRAPE x FACHA', fmt(r.dr)], ['TAG Y PARTES', (r.fine ? '-' : '') + fmt(r.fine)], ['TOTAL', fmt(r.earn)]];
  rows.forEach((x, i) => {
    if (st > i * 0.35) {
      T('ra' + i, 220, 200 + i * 50, x[0], i === 4 ? 24 : 18, i === 4 ? '#ffe600' : '#ffffff', 0, 0.5);
      T('rb' + i, 580, 200 + i * 50, x[1], i === 4 ? 26 : 18, i === 3 ? '#ff6060' : '#a0ff40', 1, 0.5);
    }
  });
  if (r.first && R.ri < 4) T('r2', W / 2, 490, '¡RUTA NUEVA: ' + RT[R.ri + 1].n + '!', 26, '#40e0ff');
  if (st > 2 && (now * 2 | 0) % 2) T('r3', W / 2, 550, 'BOTÓN: AL TALLER', 18, '#a0ff40');
  if (st > 1.2 && okHit(1)) { sOk(); go(r.first && R.ri === 4 ? 'end' : 'garage'); }
}

const ENDT = [
  ['EL REY DEL CERRO', 'te tira las llaves del BMV.\n«Cuídalo. Está zorreado entero.»'],
  ['MAIPÚ. 06:12.', 'Tu papá en la puerta, en pantuflas.\n«¿Y mi auto?... ¿Le pusiste NEÓN?»'],
  ['CUMA DRIFT', 'Ahora el cerro es tuyo.\nEl BMV 320 ZORRÓN te espera en el taller.'],
];
function ending() {
  gu.fillStyle(0x000000, 1); gu.fillRect(0, 0, W, H);
  const p = ENDT[page];
  if (page === 2) { floor(); showCar(W / 2, 470, 0.7, 3, now, { neon: 0xb040ff, wing: 1, exh: 1 }); }
  T('e0', W / 2, 130, p[0], 46, '#ffe600');
  T('e1', W / 2, 250, p[1].slice(0, st * 30 | 0), 24, '#ffffff');
  if (okHit(1) && st > 0.5) { sSel(); if (++page > 2) go('garage'); else st = 0; }
}

function vsel() {
  floor();
  T('v0', W / 2, 40, 'VERSUS', 54, '#ffe600');
  if (!VS.r[0] && (tap(1, 'U') || tap(1, 'D'))) { VS.rt = (VS.rt + (tap(1, 'U') ? 4 : 1)) % 5; sSel(); }
  T('v1', W / 2, 100, '▲▼ RUTA: ' + RT[VS.rt].n + ' · ' + RT[VS.rt].s, 20, '#40e0ff');
  for (let i = 0; i < 2; i++) {
    const p = i + 1, x = 200 + i * 400;
    if (!VS.r[i]) {
      if (tap(p, 'L')) { VS.c[i] = (VS.c[i] + 3) % 4; sSel(); }
      if (tap(p, 'R')) { VS.c[i] = (VS.c[i] + 1) % 4; sSel(); }
      if (okHit(p) && st > 0.3) { VS.r[i] = 1; sOk(); }
    } else if (hit['START' + p] && st > 0.3) VS.r[i] = 0;
    showCar(x, 380, 0.6, VS.c[i], now + i * 2, { neon: VS.c[i] === 3 ? 0xb040ff : i ? 0xff3060 : 0x30ff90, wing: 1, exh: 1 });
    T('vp' + i, x, 160, 'JUGADOR ' + p, 26, i ? '#ff6060' : '#ffe600');
    T('vc' + i, x, 440, '◀ ' + CARS[VS.c[i]].n + ' ▶', 20, '#ffffff');
    T('vr' + i, x, 490, VS.r[i] ? '¡LISTO!' : 'BOTÓN: LISTO', 22, VS.r[i] ? '#a0ff40' : '#888888');
  }
  T('v2', W / 2, 570, 'DERRAPA EN LAS CURVAS PARA CARGAR PISCOLA', 14, '#ffffff');
  if (VS.r[0] && VS.r[1]) { startRace(VS.rt, 'vs'); }
  if (idle > 40) go('title');
}
function vres() {
  floor();
  const w = R.res.w;
  T('w0', W / 2, 120, 'GANA JUGADOR ' + (w + 1), 60, w ? '#ff6060' : '#ffe600');
  showCar(W / 2, 400, 0.8, R.P[w].ty, now * 1.5, R.P[w].o);
  for (let i = 0; i < 2; i++) T('w' + (i + 1), 200 + i * 400, 470, 'J' + (i + 1) + ': ' + (R.P[i].fin ? tm(R.P[i].fin - 4) : 'NO LLEGÓ') + '\nDERRAPE ' + (R.P[i].pts | 0), 20, '#ffffff');
  if (st > 1.5 && (now * 2 | 0) % 2) T('w3', W / 2, 560, 'BOTÓN: REVANCHA · START: MENÚ', 18, '#a0ff40');
  if (st > 1.5) {
    if (hit.START1 || hit.START2) { sOk(); go('title'); }
    else if (okHit(1) || okHit(2)) { sOk(); go('vsel'); }
  }
}

// ---------- phaser ----------
function create() {
  G = this;
  g0 = G.add.graphics(); g1 = G.add.graphics(); gu = G.add.graphics().setDepth(5);
  cam0 = G.cameras.main; cam1 = G.cameras.add(0, 300, W, 300);
  const camU = G.cameras.add(0, 0, W, H);
  const sc = G.add.graphics().setDepth(20);
  sc.fillStyle(0x000000, 0.14);
  for (let y = 0; y < H; y += 3) sc.fillRect(0, y, W, 1);
  cam0.ignore([g1, gu, sc]); cam1.ignore([g0, gu, sc]); camU.ignore([g0, g1]);
  cam1.setVisible(false);
  const rn = rng(5);
  for (let i = 0; i < 70; i++) STARS.push({ x: rn() * W, y: rn(), p: rn() * 6 });
  let h = 0.5;
  for (let i = 0; i < 200; i++) {
    h += (rn() - 0.5) * 0.16; h = clamp(h, 0.15, 0.95);
    MTN.push(h * (0.6 + 0.4 * sin(i / 200 * 6.283 * 3) * sin(i / 200 * 6.283)));
  }
  for (let i = 0; i < 40; i++) MTN[199 - i] += (MTN[0] - MTN[199]) * (1 - i / 40);
  for (let i = 0; i < 230; i++) CITY.push({ i, x: rn() * 1600, y: rn(), c: [0xffd070, 0xff9040, 0xffffff, 0xff5060][rn() * 4 | 0] });
  initAudio();
  load();
  go('title');
}

function update(_, delta) {
  const dt = min(0.05, delta / 1000);
  now += dt; st += dt; idle += dt;
  g0.clear(); g1.clear(); gu.clear();
  mtick();
  if (S === 'title') title(dt);
  else if (S === 'race') race(dt);
  else if (S === 'intro') intro();
  else if (S === 'garage') garage();
  else if (S === 'pre') pre();
  else if (S === 'result') result();
  else if (S === 'end') ending();
  else if (S === 'vsel') vsel();
  else if (S === 'vres') vres();
  if (S !== 'title' && S !== 'race' && idle > 90) go('title');
  for (const k in TX) { TX[k].setVisible(!!TU[k]); TU[k] = 0; }
  hit = Object.create(null);
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { create, update },
});
