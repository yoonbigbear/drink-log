// 화면과 상관없는 도우미 모음.
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const won = n => "₩" + Math.round(n).toLocaleString("ko-KR");
export const initial = s => (String(s || "?").trim()[0] || "?").toUpperCase();
export const rid = () => Math.random().toString(36).slice(2, 12);

export function nowLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
export function fmtWhen(w) {
  if (!w) return ""; const d = new Date(w); if (isNaN(d)) return w; const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + "년 " : ""}${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fmtDay(w) { if (!w) return ""; const d = new Date(w); return isNaN(d) ? w : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; }
export function ago(w) {
  const d = new Date(w); if (isNaN(d)) return ""; const s = (Date.now() - d) / 1000;
  if (s < 0) return fmtDay(w); if (s < 3600) return Math.max(1, Math.round(s / 60)) + "분 전";
  if (s < 86400) return Math.round(s / 3600) + "시간 전"; if (s < 86400 * 7) return Math.round(s / 86400) + "일 전"; return fmtDay(w);
}
export function stars(r) { r = Math.round(r || 0); return r ? `<span class="stars">${"★".repeat(r)}<span class="off">${"★".repeat(5 - r)}</span></span>` : ""; }

let toastT;
export function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600); }
export function ask(msg, yes = "확인") {
  return new Promise(res => {
    $("#m-msg").textContent = msg; $("#m-yes").textContent = yes; const m = $("#modal"); m.classList.add("open");
    const done = v => { m.classList.remove("open"); $("#m-yes").onclick = $("#m-no").onclick = null; res(v); };
    $("#m-yes").onclick = () => done(true); $("#m-no").onclick = () => done(false);
  });
}

export function parseCoord(s) {
  if (!s) return null; try { s = decodeURIComponent(String(s)); } catch (e) { s = String(s); }
  const m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (!m) return null; const la = +m[1], lo = +m[2];
  return Math.abs(la) > 90 || Math.abs(lo) > 180 ? null : { lat: la, lng: lo };
}
export function mapLinks(it) {
  const nm = it.place || it.name || ""; const has = it.lat != null && it.lng != null; const L = [];
  if (has) { L.push(["카카오맵", `https://map.kakao.com/link/map/${encodeURIComponent(nm || "위치")},${it.lat},${it.lng}`]); L.push(["구글맵", `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`]); }
  else if (it.place) { const q = encodeURIComponent((it.place + " " + (it.address || "")).trim()); L.push(["카카오맵 검색", `https://map.kakao.com/link/search/${q}`]); L.push(["네이버지도 검색", `https://map.naver.com/p/search/${q}`]); }
  if (it.mapLink && /^https?:\/\//i.test(it.mapLink)) L.push(["저장한 링크", it.mapLink]);
  return L.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${t} ↗</a>`).join("");
}

// 지도 (Leaflet 전역 L)
const TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';
export function makeMap(el, opts = {}) { const m = L.map(el, Object.assign({ zoomControl: true, attributionControl: true }, opts)); L.tileLayer(TILE, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(m); return m; }
export const dot = ll => L.circleMarker(ll, { radius: 8, color: "#1a120b", weight: 2, fillColor: "#f2bd66", fillOpacity: 1 });

// 이미지
export function loadImg(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("decode")); }; img.src = u; });
}
// 긴 변을 max 로 줄여 JPEG data URL 로. limit(문자 수)을 넘으면 품질·크기를 낮춰 다시 만든다.
export function toDataUrl(img, max, q, limit) {
  let size = max, out = "";
  for (let i = 0; i < 8; i++) {
    const k = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length <= limit) return out;
    if (q > 0.5) q -= 0.1; else size = Math.round(size * 0.8);
  }
  return out;
}
export const THUMB = [320, 0.65, 26000], FULL = [1280, 0.8, 380000];
export function thumbFromData(dataUrl) {
  return new Promise(res => { const img = new Image(); img.onload = () => res(toDataUrl(img, ...THUMB)); img.onerror = () => res(""); img.src = dataUrl; });
}

// EXIF (JPEG) — 촬영 시간·GPS
export function readExif(buf) {
  const v = new DataView(buf); if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
  let o = 2; while (o < v.byteLength - 10) { const m = v.getUint16(o); if ((m & 0xFF00) !== 0xFF00) return null; const len = v.getUint16(o + 2);
    if (m === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return parseTiff(v, o + 10);
    if (m === 0xFFDA) return null; o += 2 + len; }
  return null;
}
function parseTiff(v, t) {
  const le = v.getUint16(t) === 0x4949; const u16 = p => v.getUint16(p, le), u32 = p => v.getUint32(p, le);
  const ifd = off => { const p = t + off; const n = u16(p); const tags = {}; for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; tags[u16(e)] = { type: u16(e + 2), count: u32(e + 4), vo: e + 8 }; } return tags; };
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const val = en => { const sz = (SZ[en.type] || 1) * en.count; const p = sz > 4 ? t + u32(en.vo) : en.vo;
    if (en.type === 2) { let s = ""; for (let i = 0; i < en.count; i++) { const ch = v.getUint8(p + i); if (!ch) break; s += String.fromCharCode(ch); } return s; }
    if (en.type === 5) { const a = []; for (let i = 0; i < en.count; i++) a.push(u32(p + i * 8) / u32(p + i * 8 + 4)); return a; }
    if (en.type === 3) return u16(p); if (en.type === 4) return u32(p); return null; };
  const toDate = s => { const m = s && String(s).match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null; };
  const out = {}; const i0 = ifd(u32(t + 4));
  if (i0[0x8769]) { try { const ex = ifd(val(i0[0x8769])); if (ex[0x9003]) out.date = toDate(val(ex[0x9003])); } catch (e) {} }
  if (!out.date && i0[0x0132]) out.date = toDate(val(i0[0x0132]));
  if (i0[0x8825]) { try { const g = ifd(val(i0[0x8825]));
    if (g[2] && g[4]) { const dm = a => a[0] + a[1] / 60 + a[2] / 3600; let la = dm(val(g[2])), lo = dm(val(g[4]));
      if (g[1] && val(g[1]) === "S") la = -la; if (g[3] && val(g[3]) === "W") lo = -lo;
      if (isFinite(la) && isFinite(lo) && (la || lo)) { out.lat = +la.toFixed(6); out.lng = +lo.toFixed(6); } } } catch (e) {} }
  return out;
}
