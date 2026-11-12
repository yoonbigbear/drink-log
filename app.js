// 술로그 — Firebase(Auth + Firestore) 기반.
// 데이터 위치: drinks/{OWNER_UID}/logs/{id}    기록 한 건 (사진은 썸네일만 함께 저장)
//             drinks/{OWNER_UID}/photos/{id}  원본 사진 (JPEG data URL, 문서 1 MiB 제한 안쪽으로 줄여서 저장)
// Firebase Storage 는 요금제(Blaze)가 필요해서 사진도 Firestore 에 넣는다.
// 읽기는 누구나, 쓰기는 소유자(OWNER_UID)만 — firestore.rules 참고.
const SDK = "https://www.gstatic.com/firebasejs/11.0.2/";
const [{ initializeApp }, A, FS] = await Promise.all([
  import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")
]);

const OWNER = window.OWNER_UID;
const app = initializeApp(window.FIREBASE_CONFIG);
const auth = A.getAuth(app);
let fdb;
try { fdb = FS.initializeFirestore(app, { localCache: FS.persistentLocalCache({ tabManager: FS.persistentMultipleTabManager() }) }); }
catch (e) { fdb = FS.getFirestore(app); }
const logsCol = FS.collection(fdb, "drinks", OWNER, "logs");
const photosCol = FS.collection(fdb, "drinks", OWNER, "photos");

const CATS = window.CATEGORIES;
const CAT = Object.fromEntries(CATS.map(c => [c.key, c]));
const UNITS = ["잔", "병", "보틀", "캔", "글라스", "30ml", "15ml", "45ml", "플라이트", "주전자"];
const S = { items: [], q: "", cat: "", view: "list", user: null, canEdit: false, loaded: false, openId: null };
let F = null;

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const won = n => "₩" + Math.round(n).toLocaleString("ko-KR");
const icon = it => (CAT[it.category] || CAT["기타"]).icon;
function nowLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function fmtWhen(w) { if (!w) return ""; const d = new Date(w); if (isNaN(d)) return w; const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + "년 " : ""}${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`; }
function fmtDay(w) { if (!w) return ""; const d = new Date(w); return isNaN(d) ? w : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; }
function stars(r) { r = Math.round(r || 0); return r ? `<span class="stars">${"★".repeat(r)}<span class="off">${"★".repeat(5 - r)}</span></span>` : ""; }
const setStatus = t => { $("#status").textContent = t || ""; };
let toastT; function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2400); }
function ask(msg, yes = "확인") { return new Promise(res => { $("#m-msg").textContent = msg; $("#m-yes").textContent = yes; const m = $("#modal"); m.classList.add("open");
  const done = v => { m.classList.remove("open"); $("#m-yes").onclick = $("#m-no").onclick = null; res(v); };
  $("#m-yes").onclick = () => done(true); $("#m-no").onclick = () => done(false); }); }
function mapLinks(it) {
  const nm = it.place || it.name || ""; const has = it.lat != null && it.lng != null; const L = [];
  if (has) { L.push(["카카오맵", `https://map.kakao.com/link/map/${encodeURIComponent(nm || "위치")},${it.lat},${it.lng}`]); L.push(["구글맵", `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`]); }
  else if (nm) { const q = encodeURIComponent((nm + " " + (it.address || "")).trim()); L.push(["카카오맵 검색", `https://map.kakao.com/link/search/${q}`]); L.push(["네이버지도 검색", `https://map.naver.com/p/search/${q}`]); }
  if (it.mapLink && /^https?:\/\//i.test(it.mapLink)) L.push(["저장한 링크", it.mapLink]);
  return L.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${t} ↗</a>`).join("");
}
function parseCoord(s) {
  if (!s) return null; try { s = decodeURIComponent(String(s)); } catch (e) { s = String(s); }
  const m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (!m) return null; const la = +m[1], lo = +m[2];
  return Math.abs(la) > 90 || Math.abs(lo) > 180 ? null : { lat: la, lng: lo };
}
const TILE = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';
function makeMap(el, opts = {}) { const m = L.map(el, Object.assign({ zoomControl: true, attributionControl: true }, opts)); L.tileLayer(TILE, { attribution: TILE_ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(m); return m; }
const dot = ll => L.circleMarker(ll, { radius: 8, color: "#1a120b", weight: 2, fillColor: "#f2bd66", fillOpacity: 1 });

/* ---------- auth ---------- */
A.onAuthStateChanged(auth, u => {
  S.user = u; S.canEdit = !!u && u.uid === OWNER;
  $("#account").textContent = u ? (S.canEdit ? "로그아웃" : "읽기 전용 · 로그아웃") : "로그인";
  $("#fab").classList.toggle("hide", !S.canEdit);
  if (S.openId && !F) { const it = S.items.find(x => x.id === S.openId); if (it) renderDetail(it); }
});
$("#account").onclick = async () => {
  try { if (S.user) { await A.signOut(auth); toast("로그아웃했어요"); } else { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); } }
  catch (e) { if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") toast("로그인 실패: " + (e.code || e.message)); }
};

/* ---------- data ---------- */
const loadT = setTimeout(() => { if (!S.loaded) setStatus("서버에 아직 연결되지 않았어요. 인터넷 연결을 확인해 주세요."); }, 10000);
FS.onSnapshot(FS.query(logsCol, FS.orderBy("when", "desc")), { includeMetadataChanges: false }, snap => {
  S.items = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  if (!snap.metadata.fromCache) { S.loaded = true; clearTimeout(loadT); setStatus(""); }
  render();
  if (S.openId && !F && $("#sheet").classList.contains("open")) { const it = S.items.find(x => x.id === S.openId); if (it) renderDetail(it); }
}, e => { clearTimeout(loadT); setStatus("불러오지 못했어요: " + (e.code || e.message)); });

/* ---------- list ---------- */
function render() {
  const all = S.items;
  $("#s-total").textContent = all.length;
  $("#s-places").textContent = new Set(all.map(i => (i.place || "").trim()).filter(Boolean)).size;
  const ym = nowLocal().slice(0, 7);
  $("#s-month").textContent = won(all.filter(i => (i.when || "").startsWith(ym)).reduce((a, i) => a + (+i.price || 0), 0));
  const present = CATS.filter(c => all.some(i => i.category === c.key));
  if (S.cat && !present.some(c => c.key === S.cat)) S.cat = "";
  $("#catfilter").innerHTML = present.length > 1 ? `<button class="chip ${S.cat ? "" : "on"}" data-c="">전체</button>` + present.map(c => `<button class="chip ${S.cat === c.key ? "on" : ""}" data-c="${esc(c.key)}">${c.icon} ${esc(c.key)} ${all.filter(i => i.category === c.key).length}</button>`).join("") : "";
  const q = S.q.trim().toLowerCase();
  const items = all.filter(i => (!S.cat || i.category === S.cat) && (!q || [i.name, i.producer, i.place, i.category, i.subtype, i.origin, i.detail, i.nose, i.palate, i.finish, i.note, i.address, (i.tags || []).join(" ")].join(" ").toLowerCase().includes(q)));
  const L_ = $("#list");
  if (!all.length) L_.innerHTML = S.loaded || all.length ? `<div class="empty"><div class="big">🍶</div>아직 기록이 없어요.${S.canEdit ? "<br>아래 <b>+</b> 버튼으로 첫 잔을 남겨 보세요." : S.user ? "" : "<br>기록하려면 오른쪽 위에서 로그인하세요."}</div>` : "";
  else if (!items.length) L_.innerHTML = `<div class="empty">조건에 맞는 기록이 없어요.</div>`;
  else L_.innerHTML = items.map(i => {
    const th = (i.photos || [])[0];
    return `<button class="card" data-id="${esc(i.id)}">
      <div class="thumb">${th && th.thumb ? `<img src="${th.thumb}" alt="">` : icon(i)}</div>
      <div class="cbody">
        <div class="cname">${esc(i.name)}</div>
        <div class="cmeta">${icon(i)} ${esc([i.subtype || i.category, i.producer, i.aging].filter(Boolean).join(" · "))}</div>
        <div class="cmeta">📍 ${esc(i.place || "장소 미입력")} · ${esc(fmtDay(i.when))}</div>
        <div class="crow">${stars(i.rating) || "<span></span>"}<span class="price">${i.price ? won(i.price) + `<i> / ${esc(i.priceUnit || "잔")}</i>` : ""}</span></div>
        ${(i.tags || []).length ? `<div class="tags">${i.tags.slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      </div></button>`;
  }).join("");
  if (S.view === "places") renderPlaces();
}
$("#list").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) { const it = S.items.find(x => x.id === c.dataset.id); if (it) openDetail(it); } });
$("#catfilter").addEventListener("click", e => { const c = e.target.closest("[data-c]"); if (c) { S.cat = c.dataset.c; render(); } });
$("#q").addEventListener("input", e => { S.q = e.target.value; $("#qclear").classList.toggle("hide", !S.q); render(); });
$("#qclear").onclick = () => { S.q = ""; $("#q").value = ""; $("#qclear").classList.add("hide"); render(); };

/* ---------- places ---------- */
function placeIndex() {
  const m = new Map();
  for (const i of S.items) {
    const k = (i.place || "").trim(); if (!k) continue;
    let b = m.get(k); if (!b) { b = { place: k, n: 0, last: "", sum: 0, pc: 0, best: null, cats: new Set() }; m.set(k, b); }
    b.n++; b.cats.add(i.category); if ((i.when || "") > b.last) b.last = i.when || "";
    if (+i.price) { b.sum += +i.price; b.pc++; }
    if (b.lat == null && i.lat != null) { b.lat = i.lat; b.lng = i.lng; }
    if (!b.address && i.address) b.address = i.address;
    if (!b.mapLink && i.mapLink) b.mapLink = i.mapLink;
    if (i.rating && (!b.best || i.rating > b.best.rating)) b.best = i;
  }
  return [...m.values()].sort((a, b) => b.last.localeCompare(a.last));
}
let bigMap, bigLayer;
function renderPlaces() {
  const P = placeIndex();
  const withLL = P.filter(p => p.lat != null);
  $("#map").classList.toggle("hide", !withLL.length);
  if (withLL.length) {
    if (!bigMap) { bigMap = makeMap($("#map")); bigLayer = L.layerGroup().addTo(bigMap); }
    bigLayer.clearLayers();
    withLL.forEach(p => dot([p.lat, p.lng]).bindPopup(`<b>${esc(p.place)}</b><br>${p.n}잔 · ${[...p.cats].map(c => (CAT[c] || CAT["기타"]).icon).join("")}<br><a href="#" data-pf="${esc(p.place)}">기록 보기 →</a>`).addTo(bigLayer));
    setTimeout(() => { bigMap.invalidateSize(); bigMap.fitBounds(L.latLngBounds(withLL.map(p => [p.lat, p.lng])).pad(0.3), { maxZoom: 15 }); }, 50);
  }
  $("#places").innerHTML = P.length ? P.map(p => `<div class="place">
    <div class="pn">${esc(p.place)}<span>${p.n}잔 ${[...p.cats].map(c => (CAT[c] || CAT["기타"]).icon).join("")}</span></div>
    <div class="pm">마지막 방문 ${esc(fmtDay(p.last))}${p.pc ? " · 평균 " + won(p.sum / p.pc) : ""}${p.address ? " · " + esc(p.address) : ""}</div>
    ${p.best ? `<div class="pm">최고 평점: ${esc(p.best.name)} ${stars(p.best.rating)}</div>` : ""}
    <div class="maps">${mapLinks(p)}</div>
    <button class="linkbtn" data-pf="${esc(p.place)}">이곳의 기록 보기 →</button></div>`).join("")
    : `<div class="empty"><div class="big">📍</div>기록에 장소를 넣으면 여기와 지도에 모여요.</div>`;
}
document.addEventListener("click", e => { const b = e.target.closest("[data-pf]"); if (!b) return; e.preventDefault();
  S.q = b.dataset.pf; S.cat = ""; $("#q").value = S.q; $("#qclear").classList.remove("hide"); setView("list"); render(); });
function setView(v) { S.view = v; $("#v-list").classList.toggle("hide", v !== "list"); $("#v-places").classList.toggle("hide", v !== "places");
  document.querySelectorAll("nav .tab").forEach(t => t.classList.toggle("on", t.dataset.v === v)); window.scrollTo(0, 0); if (v === "places") renderPlaces(); }
document.querySelectorAll("nav .tab").forEach(t => t.onclick = () => setView(t.dataset.v));

/* ---------- sheet ---------- */
function openSheet() { $("#sheet").classList.add("open"); document.body.style.overflow = "hidden"; }
function closeSheet() { $("#sheet").classList.remove("open"); document.body.style.overflow = ""; F = null; S.openId = null; }
const photoCache = new Map();
async function fullPhoto(id) {
  if (photoCache.has(id)) return photoCache.get(id);
  const s = await FS.getDoc(FS.doc(photosCol, id)); const d = s.exists() ? s.data().data : null; if (d) photoCache.set(id, d); return d;
}

function openDetail(it) { F = null; S.openId = it.id; renderDetail(it); openSheet(); $("#sheet").scrollTop = 0; }
function renderDetail(it) {
  const ph = it.photos || []; const c = CAT[it.category] || CAT["기타"];
  const note = (t, v) => v ? `<div class="note"><h4>${t}</h4><p>${esc(v)}</p></div>` : "";
  $("#sheet").innerHTML = `<div class="sbar"><button class="btn ghost" id="d-close">‹ 닫기</button><h2></h2>${S.canEdit ? `<button class="btn" id="d-edit">수정</button>` : "<span></span>"}</div>
  <div class="sbody">
    ${ph.length ? `<div class="gallery">${ph.map(p => `<img src="${p.thumb || ""}" data-pid="${esc(p.id)}" alt="">`).join("")}</div>` : ""}
    <h3 class="dname">${esc(it.name)}</h3>
    <div class="dsub">${c.icon} ${esc([it.category, it.subtype].filter(Boolean).join(" · "))}</div>
    <div class="dsub">${esc([it.producer, it.origin, it.aging, it.abv ? it.abv + "%" : ""].filter(Boolean).join(" · "))}</div>
    ${it.detail ? `<div class="dsub">${esc(c.detail)}: ${esc(it.detail)}</div>` : ""}
    <dl class="kv">
      ${it.rating ? `<dt>평점</dt><dd>${stars(it.rating)}</dd>` : ""}
      <dt>시간</dt><dd>${esc(fmtWhen(it.when))}</dd>
      ${it.price ? `<dt>가격</dt><dd>${won(it.price)} / ${esc(it.priceUnit || "잔")}</dd>` : ""}
      <dt>장소</dt><dd>${esc(it.place || "–")}${it.address ? `<div class="dsub">${esc(it.address)}</div>` : ""}<div class="maps">${mapLinks(it)}</div></dd>
    </dl>
    ${it.lat != null ? `<div class="minimap" id="d-map"></div>` : ""}
    ${(it.tags || []).length ? `<div class="tags" style="margin:12px 0">${it.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
    ${note("향 (노즈)", it.nose)}${note("맛 (팔레트)", it.palate)}${note("여운 (피니시)", it.finish)}${note("경험 · 메모", it.note)}
    ${S.canEdit ? `<div class="actions"><button class="btn" id="d-again">여기서 한 잔 더</button><button class="btn danger" id="d-del">삭제</button></div>` : ""}
  </div>`;
  $("#d-close").onclick = closeSheet;
  document.querySelectorAll(".gallery img[data-pid]").forEach(async img => { try { const d = await fullPhoto(img.dataset.pid); if (d) img.src = d; } catch (e) {} });
  if (it.lat != null) setTimeout(() => { const el = $("#d-map"); if (!el) return; const m = makeMap(el, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false });
    m.setView([it.lat, it.lng], 16); dot([it.lat, it.lng]).addTo(m); }, 280);
  if (!S.canEdit) return;
  $("#d-edit").onclick = () => openForm(it);
  $("#d-again").onclick = () => openForm(null, { place: it.place, address: it.address, lat: it.lat, lng: it.lng, mapLink: it.mapLink });
  $("#d-del").onclick = async () => {
    if (!await ask(`“${it.name}” 기록을 삭제할까요? 사진도 함께 지워져요.`, "삭제")) return;
    const b = FS.writeBatch(fdb); b.delete(FS.doc(logsCol, it.id)); (it.photos || []).forEach(p => b.delete(FS.doc(photosCol, p.id)));
    b.commit().catch(e => toast("삭제 실패: " + (e.code || e.message)));
    closeSheet(); toast("삭제했어요");
  };
}

/* ---------- form ---------- */
$("#fab").onclick = () => openForm(null);
let pickMap = null;
function openForm(it, pre) {
  if (!S.canEdit) { toast("소유자 계정으로 로그인해야 기록할 수 있어요"); return; }
  const d = Object.assign({}, pre || {}, it || {});
  const lastCat = (S.items[0] && S.items[0].category) || "위스키";
  F = { id: it?.id || null, createdAt: it?.createdAt || null, orig: new Set((it?.photos || []).map(p => p.id)),
    photos: (it?.photos || []).map(p => ({ id: p.id, thumb: p.thumb })), removed: [], tags: new Set(it?.tags || []),
    rating: it?.rating || 0, whenTouched: !!it, cat: d.category || lastCat };
  pickMap = null;
  const coordStr = d.lat != null ? `${d.lat}, ${d.lng}` : "";
  const recent = placeIndex().slice(0, 10);
  $("#sheet").innerHTML = `<div class="sbar"><button class="btn ghost" id="f-cancel">취소</button><h2>${it ? "기록 수정" : "새 기록"}</h2><button class="btn pri" id="f-save">저장</button></div>
  <form class="sbody" id="form" autocomplete="off">
    <fieldset><legend>주종</legend>
      <div class="chips" id="f-cats">${CATS.map(c => `<button type="button" class="chip ${F.cat === c.key ? "on" : ""}" data-k="${esc(c.key)}">${c.icon} ${esc(c.key)}</button>`).join("")}</div>
    </fieldset>
    <fieldset><legend>사진</legend>
      <div class="photos" id="photos"></div>
      <div class="hint">사진에 위치·촬영 시간이 남아 있으면 자동으로 채워져요.</div>
    </fieldset>
    <fieldset><legend>술</legend>
      <label>이름 *</label><input class="inp" id="f-name" value="${esc(d.name)}" placeholder="예: 글렌드로낙 15, 지역 막걸리 이름 등">
      <div class="row"><div><label>세부 종류</label><input class="inp" id="f-subtype" list="dl-sub" value="${esc(d.subtype)}"></div>
        <div><label id="l-producer">생산자</label><input class="inp" id="f-producer" value="${esc(d.producer)}"></div></div>
      <datalist id="dl-sub"></datalist>
      <div class="row"><div><label>산지 · 지역</label><input class="inp" id="f-origin" value="${esc(d.origin)}" placeholder="예: 스페이사이드, 부르고뉴"></div>
        <div><label id="l-aging">빈티지 · 숙성</label><input class="inp" id="f-aging" value="${esc(d.aging)}"></div></div>
      <div class="row"><div><label>도수 (%)</label><input class="inp" id="f-abv" inputmode="decimal" value="${esc(d.abv ?? "")}"></div>
        <div><label id="l-detail">세부 정보</label><input class="inp" id="f-detail" value="${esc(d.detail)}"></div></div>
    </fieldset>
    <fieldset><legend>장소</legend>
      ${recent.length ? `<div class="chips scroll" id="recent" style="margin-bottom:2px">${recent.map((b, i) => `<button type="button" class="chip" data-i="${i}">${esc(b.place)}</button>`).join("")}</div>` : ""}
      <label>장소 이름</label><input class="inp" id="f-place" value="${esc(d.place)}" placeholder="바, 식당, 양조장, 집…">
      <label>주소 (선택)</label><input class="inp" id="f-address" value="${esc(d.address)}">
      <label>좌표 또는 지도 링크</label><input class="inp" id="f-coord" value="${esc(d.mapLink || coordStr)}" placeholder="37.5665, 126.9780 또는 지도 링크">
      <div id="coordmsg"></div>
      <div class="locbtns">
        <button type="button" class="btn" id="f-here">📍 현재 위치</button>
        <button type="button" class="btn" id="f-geocode">🔎 주소·이름으로 찾기</button>
        <button type="button" class="btn" id="f-pick">🗺️ 지도에서 고르기</button>
      </div>
      <div id="pickmap" class="pickmap hide"></div>
    </fieldset>
    <fieldset><legend>시간 · 가격</legend>
      <label>마신 시간</label><input class="inp" type="datetime-local" id="f-when" value="${esc(d.when || nowLocal())}">
      <div class="row"><div><label>가격 (원)</label><input class="inp" id="f-price" inputmode="numeric" value="${esc(d.price ?? "")}" placeholder="25000"></div>
        <div><label>기준</label><select class="inp" id="f-unit">${[...new Set([...(d.priceUnit ? [d.priceUnit] : []), ...UNITS])].map(u => `<option ${(d.priceUnit || "잔") === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div></div>
    </fieldset>
    <fieldset><legend>향 · 맛</legend>
      <div class="chips" id="aromas"></div>
      <div class="row" style="margin-top:6px"><input class="inp" id="f-newtag" placeholder="태그 직접 추가"><button type="button" class="btn" id="f-addtag" style="flex:0 0 auto">추가</button></div>
      <label>향 (노즈)</label><textarea class="inp" id="f-nose">${esc(d.nose)}</textarea>
      <label>맛 (팔레트)</label><textarea class="inp" id="f-palate">${esc(d.palate)}</textarea>
      <label>여운 (피니시)</label><textarea class="inp" id="f-finish">${esc(d.finish)}</textarea>
    </fieldset>
    <fieldset><legend>경험</legend>
      <label>평점</label><div class="ratepick" id="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}">★</button>`).join("")}</div>
      <label>메모 (누구와, 분위기, 페어링, 추천받은 술 등)</label><textarea class="inp" id="f-note" style="min-height:96px">${esc(d.note)}</textarea>
    </fieldset>
    ${it ? `<button type="button" class="btn danger" id="f-del" style="width:100%;padding:11px">이 기록 삭제</button>` : ""}
  </form>`;
  applyCat(); renderPhotos(); renderRate(); updateCoordMsg();
  $("#sheet").scrollTop = 0; openSheet();
  $("#f-cancel").onclick = cancelForm;
  $("#f-save").onclick = save;
  $("#form").onsubmit = e => { e.preventDefault(); save(); };
  $("#f-when").oninput = () => { F.whenTouched = true; };
  $("#f-coord").oninput = () => { updateCoordMsg(); syncPickMarker(); };
  $("#f-cats").onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; F.cat = b.dataset.k;
    document.querySelectorAll("#f-cats .chip").forEach(x => x.classList.toggle("on", x === b)); applyCat(); };
  $("#rate").onclick = e => { const b = e.target.closest("[data-n]"); if (!b) return; const n = +b.dataset.n; F.rating = F.rating === n ? 0 : n; renderRate(); };
  $("#aromas").onclick = e => { const b = e.target.closest("[data-t]"); if (!b) return; const t = b.dataset.t; F.tags.has(t) ? F.tags.delete(t) : F.tags.add(t); b.classList.toggle("on"); };
  const addTag = () => { const v = $("#f-newtag").value.trim(); if (!v) return; $("#f-newtag").value = ""; F.tags.add(v); renderAromas(); };
  $("#f-addtag").onclick = addTag; $("#f-newtag").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } };
  if ($("#recent")) $("#recent").onclick = e => { const c = e.target.closest("[data-i]"); if (!c) return; const b = recent[+c.dataset.i];
    $("#f-place").value = b.place; $("#f-address").value = b.address || ""; $("#f-coord").value = b.mapLink || (b.lat != null ? `${b.lat}, ${b.lng}` : ""); updateCoordMsg(); syncPickMarker(); };
  $("#f-here").onclick = () => {
    if (!navigator.geolocation) return toast("이 브라우저는 위치를 지원하지 않아요");
    toast("현재 위치를 찾는 중…");
    navigator.geolocation.getCurrentPosition(p => { setCoord(p.coords.latitude, p.coords.longitude); toast("현재 위치를 넣었어요"); },
      e => toast(e.code === 1 ? "위치 권한이 거부됐어요" : "위치를 찾지 못했어요"), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  $("#f-geocode").onclick = async () => {
    const q = $("#f-address").value.trim() || $("#f-place").value.trim(); if (!q) return toast("주소나 장소 이름을 먼저 적어 주세요");
    try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=${encodeURIComponent(q)}`);
      const j = await r.json(); if (!j.length) return toast("찾지 못했어요. 지도에서 골라 주세요");
      setCoord(+j[0].lat, +j[0].lon); if (!$("#f-address").value.trim()) $("#f-address").value = j[0].display_name.split(",").slice(0, 4).join(",");
      toast("위치를 찾았어요. 지도에서 확인해 보세요"); showPickMap(); }
    catch (e) { toast("검색 실패"); }
  };
  $("#f-pick").onclick = () => { const el = $("#pickmap"); if (el.classList.contains("hide")) showPickMap(); else el.classList.add("hide"); };
  if ($("#f-del")) $("#f-del").onclick = () => { renderDetail(it); $("#d-del").click(); };
}
function applyCat() {
  const c = CAT[F.cat] || CAT["기타"];
  $("#l-producer").textContent = c.producer || "생산자";
  $("#l-aging").textContent = c.aging || "빈티지 · 숙성";
  $("#l-detail").textContent = c.detail || "세부 정보";
  $("#f-detail").placeholder = c.detailPh || "";
  $("#dl-sub").innerHTML = (c.subs || []).map(s => `<option value="${esc(s)}">`).join("");
  renderAromas();
}
function renderAromas() {
  const c = CAT[F.cat] || CAT["기타"];
  const list = [...new Set([...(c.aromas || []), ...F.tags])];
  $("#aromas").innerHTML = list.map(a => `<button type="button" class="chip ${F.tags.has(a) ? "on" : ""}" data-t="${esc(a)}">${esc(a)}</button>`).join("");
}
function setCoord(la, lo) { la = +la.toFixed(6); lo = +lo.toFixed(6); $("#f-coord").value = `${la}, ${lo}`; updateCoordMsg(); syncPickMarker(true); }
let pickMarker = null;
function showPickMap() {
  const el = $("#pickmap"); el.classList.remove("hide");
  const c = parseCoord($("#f-coord").value);
  if (!pickMap) {
    pickMap = makeMap(el); pickMarker = null;
    pickMap.setView(c ? [c.lat, c.lng] : [37.5665, 126.978], c ? 16 : 12);
    pickMap.on("click", e => setCoord(e.latlng.lat, e.latlng.lng));
  }
  setTimeout(() => { pickMap.invalidateSize(); syncPickMarker(true); }, 50);
}
function syncPickMarker(pan) {
  if (!pickMap) return; const c = parseCoord($("#f-coord").value);
  if (!c) { if (pickMarker) { pickMarker.remove(); pickMarker = null; } return; }
  if (!pickMarker) pickMarker = dot([c.lat, c.lng]).addTo(pickMap); else pickMarker.setLatLng([c.lat, c.lng]);
  if (pan) pickMap.setView([c.lat, c.lng], Math.max(pickMap.getZoom(), 15));
}
function renderRate() { document.querySelectorAll("#rate button").forEach(b => b.classList.toggle("on", +b.dataset.n <= F.rating)); }
function updateCoordMsg() {
  const v = $("#f-coord").value.trim(); const c = parseCoord(v); const m = $("#coordmsg");
  if (!v) m.innerHTML = "";
  else if (c) m.innerHTML = `<div class="ok">✓ 좌표 ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</div>`;
  else if (/^https?:\/\//i.test(v)) m.innerHTML = `<div class="hint">링크로 저장돼요. (단축 링크라 좌표는 읽지 못했어요 — 지도에서 골라도 돼요)</div>`;
  else m.innerHTML = `<div class="err">좌표 형식을 읽지 못했어요. 예: 37.5665, 126.9780</div>`;
}

/* ---------- photos ---------- */
function renderPhotos() {
  const el = $("#photos"); if (!el) return;
  el.innerHTML = F.photos.map((p, i) => `<div class="ph"><img src="${p.thumb || ""}" alt="">${p.busy ? '<div class="up">처리 중…</div>' : ""}<button type="button" class="x" data-i="${i}">✕</button></div>`).join("")
    + (F.photos.length < 6 ? `<div class="addph" id="addph"><span class="ic">📷</span>사진 추가</div>` : "");
  el.querySelectorAll(".x").forEach(b => b.onclick = () => { const p = F.photos[+b.dataset.i]; if (p.busy) return; F.photos.splice(+b.dataset.i, 1); if (F.orig.has(p.id)) F.removed.push(p.id); renderPhotos(); });
  const a = $("#addph"); if (a) a.onclick = () => $("#file").click();
}
$("#file").onchange = async e => { const files = [...e.target.files]; e.target.value = ""; for (const f of files) { if (!F || F.photos.length >= 6) break; await addPhoto(f); } };
async function addPhoto(f) {
  const myF = F;
  try { const ex = readExif(await f.arrayBuffer());
    if (ex) {
      if (ex.lat != null && !$("#f-coord").value.trim()) { setCoord(ex.lat, ex.lng); toast("사진에서 위치를 찾았어요"); }
      if (ex.date && !F.whenTouched) { $("#f-when").value = ex.date; F.whenTouched = true; }
    } } catch (e) {}
  const p = { id: FS.doc(photosCol).id, busy: true, thumb: "" }; F.photos.push(p); renderPhotos();
  try {
    const img = await loadImg(f);
    p.thumb = encode(img, 320, 0.7, 60000);
    p.data = encode(img, 1600, 0.85, 900000);
    p.busy = false;
  } catch (e) { const i = myF.photos.indexOf(p); if (i >= 0) myF.photos.splice(i, 1); toast("이 사진은 열 수 없어요"); }
  if (F === myF) renderPhotos();
}
function loadImg(file) { return new Promise((res, rej) => { const u = URL.createObjectURL(file); const img = new Image();
  img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("decode")); }; img.src = u; }); }
// 긴 변을 max 로 줄여 JPEG data URL 로. limit(문자 수)을 넘으면 품질·크기를 낮춰 다시.
function encode(img, max, q, limit) {
  let size = max, out = "";
  for (let i = 0; i < 8; i++) {
    const k = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length <= limit) return out;
    if (q > 0.55) q -= 0.1; else size = Math.round(size * 0.8);
  }
  return out;
}

/* ---------- save ---------- */
function cancelForm() { const id = F && F.id; F = null; const it = id && S.items.find(x => x.id === id); if (it) openDetail(it); else closeSheet(); }
const num = s => { const v = String(s ?? "").replace(/[,\s₩원%]/g, ""); if (v === "") return null; const n = parseFloat(v); return isFinite(n) ? n : null; };
function save() {
  if (!F) return;
  if (F.photos.some(p => p.busy)) { toast("사진 처리가 끝나면 저장할 수 있어요"); return; }
  const v = id => $(id).value.trim();
  const name = v("#f-name"); if (!name) { toast("이름을 입력해 주세요"); $("#f-name").focus(); return; }
  const cs = v("#f-coord"); const c = parseCoord(cs);
  const ref = F.id ? FS.doc(logsCol, F.id) : FS.doc(logsCol);
  const data = {
    category: F.cat, name, subtype: v("#f-subtype"), producer: v("#f-producer"), origin: v("#f-origin"), aging: v("#f-aging"),
    abv: num(v("#f-abv")), detail: v("#f-detail"),
    place: v("#f-place"), address: v("#f-address"), lat: c ? c.lat : null, lng: c ? c.lng : null, mapLink: /^https?:\/\//i.test(cs) ? cs : "",
    when: v("#f-when") || nowLocal(), price: num(v("#f-price")), priceUnit: v("#f-unit"),
    tags: [...F.tags], nose: v("#f-nose"), palate: v("#f-palate"), finish: v("#f-finish"), note: v("#f-note"), rating: F.rating || 0,
    photos: F.photos.map(p => ({ id: p.id, thumb: p.thumb })),
    createdAt: F.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  // 사진 문서는 한 번에 여러 MB 가 될 수 있어서 기록과 따로 올린다(한 요청 10 MiB 제한).
  const writes = F.photos.filter(p => p.data).map(p => { photoCache.set(p.id, p.data); return FS.setDoc(FS.doc(photosCol, p.id), { data: p.data, log: ref.id, createdAt: data.updatedAt }); });
  F.removed.forEach(id => writes.push(FS.deleteDoc(FS.doc(photosCol, id))));
  writes.push(FS.setDoc(ref, data));
  Promise.all(writes).catch(e => toast("저장 실패: " + (e.code || e.message)));
  const wasEdit = !!F.id; F = null;
  if (wasEdit) openDetail(Object.assign({ id: ref.id }, data)); else closeSheet();
  toast(navigator.onLine === false ? "오프라인 — 연결되면 올라가요" : "저장했어요 🥂");
}

/* ---------- EXIF (JPEG) ---------- */
function readExif(buf) {
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
render();
