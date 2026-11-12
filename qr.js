// 작은 QR 코드 생성기 (바이트 모드, 오류정정 M, 버전 1~5 → 최대 84바이트).
// 외부 라이브러리 없이 앱 주소 같은 짧은 문자열만 만든다. 너무 길면 null 을 돌려준다.
const VER = [null, { data: 16, ec: 10, blocks: 1 }, { data: 28, ec: 16, blocks: 1 }, { data: 44, ec: 26, blocks: 1 }, { data: 64, ec: 18, blocks: 2 }, { data: 86, ec: 24, blocks: 2 }];

// GF(256) 계산 표 (다항식 0x11d)
const EXP = new Array(512), LOG = new Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function rsRemainder(data, n) {
  let gen = [1];
  for (let i = 0; i < n; i++) { const next = new Array(gen.length + 1).fill(0); gen.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); }); gen = next; }
  const rem = new Array(n).fill(0);
  for (const d of data) { const f = d ^ rem.shift(); rem.push(0); gen.slice(1).forEach((c, j) => { rem[j] ^= mul(c, f); }); }
  return rem;
}

function dataCodewords(bytes, v) {
  const cap = VER[v].data * 8; const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const out = []; for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xEC; out.length < VER[v].data; pad ^= 0xEC ^ 0x11) out.push(pad);
  return out;
}
function interleave(data, v) {
  const { blocks, ec } = VER[v]; const per = data.length / blocks;
  const d = [], e = [];
  for (let b = 0; b < blocks; b++) { const blk = data.slice(b * per, (b + 1) * per); d.push(blk); e.push(rsRemainder(blk, ec)); }
  const out = [];
  for (let i = 0; i < per; i++) d.forEach(blk => out.push(blk[i]));
  for (let i = 0; i < ec; i++) e.forEach(blk => out.push(blk[i]));
  return out;
}

const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
  (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];

function penalty(m) {
  const n = m.length; let p = 0;
  const lines = []; for (let i = 0; i < n; i++) { lines.push(m[i]); lines.push(m.map(r => r[i])); }
  for (const l of lines) {
    let run = 1;
    for (let i = 1; i < n; i++) { if (l[i] === l[i - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
    const s = l.map(b => (b ? 1 : 0)).join("");
    for (const pat of ["10111010000", "00001011101"]) { let k = -1; while ((k = s.indexOf(pat, k + 1)) >= 0) p += 40; }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  const dark = m.flat().filter(Boolean).length; p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return p;
}

// 문자열 → 불리언 2차원 배열 (true = 검은 칸). 담을 수 없으면 null.
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1; while (v <= 5 && bytes.length + 2 > VER[v].data) v++;
  if (v > 5) return null;
  const size = 17 + 4 * v; const cw = interleave(dataCodewords(bytes, v), v);
  const mod = Array.from({ length: size }, () => new Array(size).fill(false)), fn = Array.from({ length: size }, () => new Array(size).fill(false));
  let T = mod; const set = (x, y, dark) => { if (x >= 0 && y >= 0 && x < size && y < size) { T[y][x] = dark; fn[y][x] = true; } };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); }
  if (v >= 2) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(size - 7 + dx, size - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  const drawFormat = (mask) => {
    const data = (0 << 3) | mask; let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412; const bit = i => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i)); set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  const bits = []; cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >>> i) & 1); });
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && k < bits.length) mod[y][x] = bits[k++] === 1;
    }
  }
  let best = null, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = mod.map(r => r.slice());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
    T = m; drawFormat(mask); T = mod;
    const sc = penalty(m);
    if (sc < bestScore) { bestScore = sc; best = m; }
  }
  return best;
}

// 흰 바탕 + 여백 4칸을 포함한 캔버스. scale = 한 칸의 픽셀 수.
export function qrCanvas(text, scale = 8) {
  const m = qrMatrix(text); if (!m) return null;
  const n = m.length, q = 4, c = document.createElement("canvas"); c.width = c.height = (n + q * 2) * scale;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#000";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) g.fillRect((x + q) * scale, (y + q) * scale, scale, scale);
  return c;
}
