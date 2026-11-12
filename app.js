// 술로그 — 초대제 술 기록 SNS. 데이터 모델과 보안 규칙은 firestore.rules 상단 주석 참고.
import { A, FS, auth, db, OWNER } from "./fb.js";
import { qrCanvas } from "./qr.js";
import { $, esc, won, initial, rid, nowLocal, fmtWhen, fmtDay, ago, stars, toast, ask, parseCoord, mapLinks, makeMap, dot, loadImg, toDataUrl, thumbFromData, THUMB, FULL, readExif } from "./util.js";

const CATS = window.CATEGORIES;
const CAT = Object.fromEntries(CATS.map(c => [c.key, c]));
const UNITS = ["잔", "병", "보틀", "캔", "글라스", "30ml", "15ml", "45ml", "플라이트", "주전자"];
const col = (...p) => FS.collection(db, ...p);
const ref = (...p) => FS.doc(db, ...p);
const icon = it => (CAT[it.category] || CAT["기타"]).icon;
const me = () => S.user.uid;

const S = { user: null, member: null, started: false, tab: "feed",
  mine: [], following: new Set(), invitees: [], feed: [], feedState: "idle", reco: false, q: "", cat: "" };
const people = new Map();           // uid -> member 문서 (없으면 null)
let stopFns = [], F = null, D = null, stack = [];
let bigMap = null, bigLayer = null;
const sheet = $("#sheet");

/* ───────────── 공통 ───────────── */
const setStatus = (html) => { $("#status").innerHTML = html || ""; };
function errText(e) {
  const c = e && e.code || "";
  if (c === "permission-denied") return "권한이 없어요. Firestore 규칙을 게시했는지 확인해 주세요.";
  if (c === "failed-precondition") { const m = (e.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s]*/); return m ? `색인이 필요해요. <a href="${esc(m[0])}" target="_blank" rel="noopener">여기를 눌러 만들고</a> 몇 분 뒤 새로고침하세요.` : "색인이 필요해요. README의 색인 설정을 확인해 주세요."; }
  if (c === "resource-exhausted") return "오늘 무료 사용량을 모두 썼어요. 내일 다시 시도해 주세요.";
  if (c === "unavailable") return "서버에 연결할 수 없어요.";
  return (c || e.message || "오류");
}
async function loadPeople(uids) {
  const need = [...new Set(uids)].filter(u => u && !people.has(u));
  await Promise.all(need.map(async u => { try { const s = await FS.getDoc(ref("members", u)); people.set(u, s.exists() ? { uid: u, ...s.data() } : null); } catch (e) { people.set(u, null); } }));
}
const pname = u => people.get(u)?.displayName || "알 수 없음";
const phandle = u => people.get(u)?.handle || "";
const avatar = (u, cls = "") => `<div class="avatar ${cls}">${esc(initial(pname(u)))}</div>`;

/* ───────────── 로그인 · 가입 · 승인 대기 (gate) ───────────── */
const gate = $("#gate");
function showGate(html) { $("#app").classList.add("hide"); closeSheet(); gate.classList.remove("hide"); gate.scrollTop = 0; gate.innerHTML = `<div class="gbox">${html}</div>`; }
const loginBtn = () => $("#g-login").onclick = async () => {
  try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
  catch (e) { if (!/popup-closed|cancelled/.test(e.code || "")) toast("로그인 실패: " + (e.code || e.message)); }
};
const logout = () => A.signOut(auth);

function gateLanding() {
  showGate(`<div class="glogo">🥃</div><h1>술로그</h1>
    <p class="gsub" style="text-align:center">마신 술을 사진·장소·향·가격과 함께 기록하고,<br>취향이 맞는 사람들과 나누는 초대제 모임</p>
    <button class="btn pri big" id="g-login">Google로 시작하기</button>
    <p class="hint" style="margin-top:12px">가입은 기존 멤버의 승인이 필요해요.</p>
    <div class="sec">앱 주소 QR</div>${qrBlock("qr-gate")}`);
  loginBtn(); bindQr($("#gate"), "qr-gate");
}
function gateError(e) {
  showGate(`<div class="glogo">⚠️</div><h2 style="text-align:center">연결에 실패했어요</h2><p class="gsub" style="text-align:center">${errText(e)}</p><button class="btn big" id="g-retry">다시 시도</button><button class="btn ghost" id="g-out">로그아웃</button>`);
  $("#g-retry").onclick = () => location.reload(); $("#g-out").onclick = logout;
}

function gateSignup() {
  const isAdmin = S.user.uid === OWNER;
  showGate(`<h2>가입 신청</h2>
    <p class="gsub">${esc(S.user.displayName || S.user.email || "")} 님, 처음 오셨네요.${isAdmin ? " 첫 멤버(관리자)로 시작해요." : "<br>추천인이 승인하면 가입이 완료돼요."}</p>
    <label>아이디 (영문 소문자·숫자·_ , 3~20자)</label>
    <input class="inp" id="g-handle" autocapitalize="off" autocomplete="off" maxlength="20" placeholder="예: malt_lover">
    <div id="g-hmsg" class="hint"></div>
    <label>닉네임</label><input class="inp" id="g-name" maxlength="20" value="${esc(S.user.displayName || "")}">
    ${isAdmin ? "" : `<label>추천인 아이디</label>
      <div class="row"><input class="inp" id="g-ref" autocapitalize="off" autocomplete="off" placeholder="추천해 줄 멤버의 아이디"><button class="btn" id="g-search" style="flex:0 0 auto">검색</button></div>
      <div id="g-rmsg"></div>`}
    <button class="btn pri big" id="g-submit">${isAdmin ? "시작하기" : "가입 신청"}</button>
    <button class="btn ghost" id="g-out">다른 계정으로</button>`);
  $("#g-out").onclick = logout;
  let refUid = null, hOk = false, hT;
  const HRE = /^[a-z0-9_]{3,20}$/;
  $("#g-handle").oninput = e => {
    const h = e.target.value.trim().toLowerCase(); hOk = false; clearTimeout(hT);
    const m = $("#g-hmsg"); if (!h) { m.className = "hint"; m.textContent = ""; return; }
    if (!HRE.test(h)) { m.className = "err"; m.textContent = "영문 소문자·숫자·_ 3~20자로 적어 주세요"; return; }
    m.className = "hint"; m.textContent = "확인 중…";
    hT = setTimeout(async () => { try { const s = await FS.getDoc(ref("handles", h)); if ($("#g-handle")?.value.trim().toLowerCase() !== h) return;
      if (s.exists()) { m.className = "err"; m.textContent = "이미 쓰고 있는 아이디예요"; } else { hOk = true; m.className = "ok"; m.textContent = "✓ 사용할 수 있어요"; } } catch (er) { m.className = "hint"; m.textContent = ""; hOk = true; } }, 350);
  };
  if (!isAdmin) {
    $("#g-ref").oninput = () => { refUid = null; $("#g-rmsg").innerHTML = ""; };
    const search = async () => {
      const h = $("#g-ref").value.trim().toLowerCase().replace(/^@/, ""); const box = $("#g-rmsg"); refUid = null;
      if (!h) { box.innerHTML = `<div class="err">추천인 아이디를 입력해 주세요</div>`; return; }
      box.innerHTML = `<div class="hint">검색 중…</div>`;
      try {
        const hs = await FS.getDoc(ref("handles", h)); if (!hs.exists()) { box.innerHTML = `<div class="err">그 아이디의 멤버를 찾지 못했어요</div>`; return; }
        const u = hs.data().uid; const ms = await FS.getDoc(ref("members", u));
        if (!ms.exists() || ms.data().status !== "active") { box.innerHTML = `<div class="err">아직 승인된 멤버가 아니라서 추천인이 될 수 없어요</div>`; return; }
        if (u === S.user.uid) { box.innerHTML = `<div class="err">본인은 추천인이 될 수 없어요</div>`; return; }
        refUid = u; people.set(u, { uid: u, ...ms.data() });
        box.innerHTML = `<div class="refcard">${avatar(u)}<div><b>${esc(ms.data().displayName)}</b><div class="dim sm">@${esc(ms.data().handle)} · 추천인으로 선택됨 ✓</div></div></div>`;
      } catch (er) { box.innerHTML = `<div class="err">검색 실패: ${errText(er)}</div>`; }
    };
    $("#g-search").onclick = search; $("#g-ref").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); search(); } };
  }
  $("#g-submit").onclick = async () => {
    const handle = $("#g-handle").value.trim().toLowerCase(), name = $("#g-name").value.trim();
    if (!HRE.test(handle)) return toast("아이디를 형식에 맞게 적어 주세요");
    if (!name) return toast("닉네임을 입력해 주세요");
    if (!isAdmin && !refUid) return toast("추천인을 검색해서 선택해 주세요");
    const btn = $("#g-submit"); btn.disabled = true; btn.textContent = "처리 중…";
    try {
      const b = FS.writeBatch(db); const uid = S.user.uid;
      b.set(ref("handles", handle), { uid, createdAt: FS.serverTimestamp() });
      const m = { handle, displayName: name, status: isAdmin ? "active" : "pending", createdAt: FS.serverTimestamp() };
      if (!isAdmin) m.referrerUid = refUid;
      b.set(ref("members", uid), m);
      await b.commit();      // 이후 members 스냅샷이 화면을 바꿔 준다
    } catch (e) { btn.disabled = false; btn.textContent = isAdmin ? "시작하기" : "가입 신청";
      toast(e.code === "permission-denied" ? "이미 쓰는 아이디이거나 규칙이 아직 게시되지 않았어요" : "실패: " + errText(e)); }
  };
}

async function cancelApplication() {
  const m = S.member; const b = FS.writeBatch(db);
  b.delete(ref("members", me())); b.delete(ref("handles", m.handle)); await b.commit();
}
async function gatePending() {
  const m = S.member; await loadPeople([m.referrerUid]);
  showGate(`<div class="glogo">⏳</div><h2 style="text-align:center">승인을 기다리는 중</h2>
    <p class="gsub" style="text-align:center"><b>${esc(pname(m.referrerUid))}</b> (@${esc(phandle(m.referrerUid))}) 님이 승인하면<br>자동으로 가입이 완료돼요.<br>추천인이 앱을 열어야 요청이 보이니, 따로 알려 주세요.</p>
    <div class="note"><h4>내 신청 정보</h4><p>@${esc(m.handle)} · ${esc(m.displayName)}</p></div>
    <button class="btn big" id="g-copy">추천인에게 보낼 안내 복사</button>
    <button class="btn danger big" id="g-cancel">신청 취소</button>
    <button class="btn ghost" id="g-out">로그아웃</button>`);
  $("#g-out").onclick = logout;
  $("#g-copy").onclick = async () => {
    const t = `술로그 가입 승인 부탁드려요! 앱을 열고 [나] 탭에서 가입 요청을 승인해 주세요. 제 아이디는 @${m.handle} 예요.\n${location.href.split("#")[0]}`;
    try { await navigator.clipboard.writeText(t); toast("복사했어요. 메신저에 붙여 넣으세요"); } catch (e) { toast("복사하지 못했어요"); }
  };
  $("#g-cancel").onclick = async () => { if (await ask("가입 신청을 취소할까요?", "취소하기")) { try { await cancelApplication(); } catch (e) { toast("실패: " + errText(e)); } } };
}
function gateRejected() {
  showGate(`<div class="glogo">🙅</div><h2 style="text-align:center">신청이 거절됐어요</h2>
    <p class="gsub" style="text-align:center">추천인이 요청을 승인하지 않았어요.<br>다른 추천인으로 다시 신청할 수 있어요.</p>
    <button class="btn pri big" id="g-redo">다시 신청하기</button><button class="btn ghost" id="g-out">로그아웃</button>`);
  $("#g-out").onclick = logout;
  $("#g-redo").onclick = async () => { try { await cancelApplication(); } catch (e) { toast("실패: " + errText(e)); } };
}

/* ───────────── 인증 흐름 ───────────── */
let unsubMember = null;
A.onAuthStateChanged(auth, u => {
  S.user = u; stopApp(); if (unsubMember) { unsubMember(); unsubMember = null; }
  if (!u) { S.member = null; return gateLanding(); }
  unsubMember = FS.onSnapshot(ref("members", u.uid), snap => {
    S.member = snap.exists() ? { uid: u.uid, ...snap.data() } : null;
    if (S.member) people.set(u.uid, S.member);
    route();
  }, e => gateError(e));
});
function route() {
  const m = S.member;
  if (!m) { stopApp(); return gateSignup(); }
  if (m.status === "active") return startApp();
  stopApp(); if (m.status === "pending") gatePending(); else gateRejected();
}

/* ───────────── 앱 시작/종료 ───────────── */
function startApp() {
  gate.classList.add("hide"); $("#app").classList.remove("hide");
  if (S.started) { renderMe(); return; }
  S.started = true; const uid = me(); const un = [];
  un.push(FS.onSnapshot(col("private", uid, "logs"), snap => {
    S.mine = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.when || "").localeCompare(a.when || ""));
    renderMine(); if (S.tab === "places") renderPlaces();
    if (stack.length && stack[stack.length - 1].mineId && !F) stack[stack.length - 1].fn();
  }, e => setStatus(errText(e))));
  un.push(FS.onSnapshot(FS.query(col("follows"), FS.where("followerUid", "==", uid)), snap => {
    const next = new Set(snap.docs.map(d => d.data().followeeUid));
    const changed = next.size !== S.following.size || [...next].some(x => !S.following.has(x));
    S.following = next; refreshFollowButtons();
    if (changed || S.feedState === "idle") loadFeed(); renderMe();
  }, e => setStatus(errText(e))));
  un.push(FS.onSnapshot(FS.query(col("members"), FS.where("referrerUid", "==", uid)), snap => {
    S.invitees = snap.docs.map(d => ({ uid: d.id, ...d.data() })); S.invitees.forEach(p => people.set(p.uid, p));
    renderBadge(); renderMe();
  }, e => setStatus(errText(e))));
  stopFns = un; setTab(S.tab);
}
function stopApp() {
  stopFns.forEach(f => f()); stopFns = []; S.started = false; S.mine = []; S.following = new Set(); S.invitees = []; S.feed = []; S.feedState = "idle";
  stack = []; F = null; D = null; S.tab = "feed"; S.q = ""; S.cat = ""; S.reco = false; if (bigMap) { bigMap.remove(); bigMap = null; bigLayer = null; }
}

/* ───────────── 탭 ───────────── */
function setTab(t) {
  S.tab = t;
  ["feed", "mine", "places", "me"].forEach(v => $("#v-" + v).classList.toggle("hide", v !== t));
  document.querySelectorAll("nav .tab").forEach(b => b.classList.toggle("on", b.dataset.v === t));
  window.scrollTo(0, 0);
  if (t === "feed") renderFeed(); if (t === "mine") renderMine(); if (t === "places") renderPlaces(); if (t === "me") renderMe();
}
document.querySelectorAll("nav .tab").forEach(b => b.onclick = () => setTab(b.dataset.v));
$("#fab").onclick = () => openForm(null);
$("#bell").onclick = () => setTab("me");
function pendingList() { return S.invitees.filter(i => i.status === "pending"); }
function renderBadge() {
  const n = pendingList().length; $("#bell").classList.toggle("hide", !n); $("#bellN").textContent = n ? n + "건 승인 대기" : ""; $("#meDot").classList.toggle("hide", !n);
}

/* ───────────── 피드 ───────────── */
async function loadFeed() {
  S.feedState = "loading"; if (S.tab === "feed") renderFeed();
  const uids = [me(), ...S.following]; const chunks = [];
  for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
  try {
    const snaps = await Promise.all(chunks.map(c => FS.getDocs(FS.query(col("posts"), FS.where("ownerUid", "in", c), FS.orderBy("when", "desc"), FS.limit(40)))));
    const items = []; snaps.forEach(s => s.docs.forEach(d => items.push({ id: d.id, ...d.data() })));
    items.sort((a, b) => (b.when || "").localeCompare(a.when || "")); S.feed = items.slice(0, 60);
    await loadPeople(S.feed.map(p => p.ownerUid)); S.feedState = "ready"; setStatus("");
  } catch (e) { S.feedState = "error"; setStatus(errText(e)); }
  if (S.tab === "feed") renderFeed();
}
function postCard(p) {
  const c = CAT[p.category] || CAT["기타"];
  return `<article class="post" data-id="${esc(p.id)}">
    <div class="phead">${avatar(p.ownerUid)}<div style="min-width:0"><b>${esc(pname(p.ownerUid))}</b> <span class="dim sm">@${esc(phandle(p.ownerUid))}</span>
      <div class="dim sm">${esc(ago(p.when))}${p.place ? " · 📍 " + esc(p.place) : ""}</div></div></div>
    ${p.thumb ? `<img class="pimg" src="${esc(p.thumb)}" alt="">` : ""}
    <div class="pbody"><div class="cname" style="white-space:normal">${c.icon} ${esc(p.name)}${p.recommend ? '<span class="reco">👍 추천</span>' : ""}</div>
      <div class="cmeta" style="white-space:normal">${esc([p.subtype || p.category, p.producer, p.aging].filter(Boolean).join(" · "))}</div>
      ${p.recoLine ? `<div style="margin-top:4px;font-size:14px">“${esc(p.recoLine)}”</div>` : ""}
      <div class="crow">${stars(p.rating) || "<span></span>"}<span class="price">${p.price ? won(p.price) + `<i> / ${esc(p.priceUnit || "잔")}</i>` : ""}</span></div>
      ${(p.tags || []).length ? `<div class="tags">${p.tags.slice(0, 5).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}</div>
    <div class="pfoot"><span>♥ ${p.likeCount || 0}</span><span>💬 ${p.commentCount || 0}</span></div></article>`;
}
function renderFeed() {
  const el = $("#feedlist"); document.querySelectorAll("#feedbar [data-f]").forEach(b => b.classList.toggle("on", (b.dataset.f === "reco") === S.reco));
  if (S.feedState === "loading" && !S.feed.length) { el.innerHTML = `<div class="empty">불러오는 중…</div>`; return; }
  const items = S.reco ? S.feed.filter(p => p.recommend) : S.feed;
  if (!items.length) {
    el.innerHTML = S.reco ? `<div class="empty"><div class="big">👍</div>추천이 달린 글이 아직 없어요.</div>`
      : `<div class="empty"><div class="big">🍻</div>피드가 비어 있어요.<br><b>🔎 사람 찾기</b>에서 멤버를 팔로우하거나,<br>내 기록을 멤버에게 공유해 보세요.</div>`;
    return;
  }
  el.innerHTML = items.map(postCard).join("");
}
$("#feedlist").addEventListener("click", e => { const c = e.target.closest(".post"); if (c) openPost(c.dataset.id); });
$("#feedbar").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { S.reco = b.dataset.f === "reco"; renderFeed(); } });
$("#findpeople").onclick = () => nav(renderPeople);
$("#qrchip").onclick = () => nav(renderQr);
$("#refresh").onclick = () => { loadFeed(); toast("새로고침했어요"); };
function openPost(id) { const p = S.feed.find(x => x.id === id); if (p) nav(() => renderDetail(S.feed.find(x => x.id === id) || p, "post"), {}); }

/* ───────────── 내 기록 ───────────── */
function renderMine() {
  const all = S.mine;
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
  if (!all.length) L_.innerHTML = `<div class="empty"><div class="big">🍶</div>아직 기록이 없어요.<br>아래 <b>+</b> 버튼으로 첫 잔을 남겨 보세요.</div>`;
  else if (!items.length) L_.innerHTML = `<div class="empty">조건에 맞는 기록이 없어요.</div>`;
  else L_.innerHTML = items.map(i => {
    return `<button class="card" data-id="${esc(i.id)}">
      <div class="thumb">${i.thumb ? `<img src="${esc(i.thumb)}" alt="">` : icon(i)}</div>
      <div class="cbody">
        <div class="cname">${esc(i.name)}${i.shared ? '<span class="badge">공유 중</span>' : ""}</div>
        <div class="cmeta">${icon(i)} ${esc([i.subtype || i.category, i.producer, i.aging].filter(Boolean).join(" · "))}</div>
        <div class="cmeta">📍 ${esc(i.place || "장소 미입력")} · ${esc(fmtDay(i.when))}</div>
        <div class="crow">${stars(i.rating) || "<span></span>"}<span class="price">${i.price ? won(i.price) + `<i> / ${esc(i.priceUnit || "잔")}</i>` : ""}</span></div>
        ${(i.tags || []).length ? `<div class="tags">${i.tags.slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      </div></button>`;
  }).join("");
}
$("#list").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openMine(c.dataset.id); });
$("#catfilter").addEventListener("click", e => { const c = e.target.closest("[data-c]"); if (c) { S.cat = c.dataset.c; renderMine(); } });
$("#q").addEventListener("input", e => { S.q = e.target.value; $("#qclear").classList.toggle("hide", !S.q); renderMine(); });
$("#qclear").onclick = () => { S.q = ""; $("#q").value = ""; $("#qclear").classList.add("hide"); renderMine(); };
function openMine(id) { nav(() => { const it = S.mine.find(x => x.id === id); if (!it) return back(); renderDetail(it, "mine"); }, { mineId: id }); }

/* ───────────── 장소 ───────────── */
function placeIndex() {
  const m = new Map();
  for (const i of S.mine) {
    const k = (i.place || "").trim(); if (!k) continue;
    let b = m.get(k); if (!b) { b = { place: k, n: 0, last: "", sum: 0, pc: 0, best: null, cats: new Set() }; m.set(k, b); }
    b.n++; b.cats.add(i.category); if ((i.when || "") > b.last) b.last = i.when || "";
    if (+i.price) { b.sum += +i.price; b.pc++; }
    if (b.lat == null && i.lat != null) { b.lat = i.lat; b.lng = i.lng; }
    if (!b.address && i.address) b.address = i.address; if (!b.mapLink && i.mapLink) b.mapLink = i.mapLink;
    if (i.rating && (!b.best || i.rating > b.best.rating)) b.best = i;
  }
  return [...m.values()].sort((a, b) => b.last.localeCompare(a.last));
}
function renderPlaces() {
  const P = placeIndex(); const withLL = P.filter(p => p.lat != null);
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
    <div class="maps">${mapLinks(p)}</div><button class="linkbtn" data-pf="${esc(p.place)}">이곳의 기록 보기 →</button></div>`).join("")
    : `<div class="empty"><div class="big">📍</div>기록에 장소를 넣으면 여기와 지도에 모여요.<br><span class="hint">장소는 내 기록에서만 모아 보여요.</span></div>`;
}
document.addEventListener("click", e => { const b = e.target.closest("[data-pf]"); if (!b) return; e.preventDefault();
  S.q = b.dataset.pf; S.cat = ""; $("#q").value = S.q; $("#qclear").classList.remove("hide"); setTab("mine"); });

/* ───────────── 시트(화면 위에 쌓이는 화면) ───────────── */
function openSheet() { sheet.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeSheet() { sheet.classList.remove("open"); document.body.style.overflow = ""; stack = []; F = null; D = null; }
function nav(fn, meta = {}) { stack.push({ fn, ...meta }); fn(); openSheet(); sheet.scrollTop = 0; }
function back() { stack.pop(); if (!stack.length) { closeSheet(); if (S.tab === "feed") renderFeed(); return; } stack[stack.length - 1].fn(); }
const bar = (title, right = "") => `<div class="sbar"><button class="btn ghost" id="s-back">‹ 닫기</button><h2>${title}</h2>${right || "<span></span>"}</div>`;

/* ───────────── 상세 ───────────── */
function renderDetail(it, kind) {
  const c = CAT[it.category] || CAT["기타"]; const ph = it.photos || [];
  const isMine = kind === "mine" || it.ownerUid === me();
  const owner = it.ownerUid || me();
  const social = kind === "post" || (kind === "mine" && it.shared);
  const note = (t, v) => v ? `<div class="note"><h4>${t}</h4><p>${esc(v)}</p></div>` : "";
  sheet.innerHTML = `${bar("", isMine ? `<button class="btn" id="d-edit">수정</button>` : "")}
  <div class="sbody">
    ${kind === "post" ? `<div class="phead" style="padding:0 0 12px">${avatar(owner)}<div class="pi" data-prof="${esc(owner)}" style="flex:1;min-width:0;cursor:pointer"><b>${esc(pname(owner))}</b><div class="dim sm">@${esc(phandle(owner))} · ${esc(ago(it.when))}</div></div>${isMine ? "" : followBtn(owner)}</div>` : ""}
    ${ph.length ? `<div class="gallery">${ph.map((p, i) => `<img data-pid="${esc(p.id)}" src="${i === 0 ? esc(it.thumb || "") : ""}" alt="">`).join("")}</div>` : ""}
    <h3 class="dname">${esc(it.name)}${it.recommend ? '<span class="reco">👍 추천</span>' : ""}${kind === "mine" && it.shared ? '<span class="badge">공유 중</span>' : ""}</h3>
    <div class="dsub">${c.icon} ${esc([it.category, it.subtype].filter(Boolean).join(" · "))}</div>
    <div class="dsub">${esc([it.producer, it.origin, it.aging, it.abv ? it.abv + "%" : ""].filter(Boolean).join(" · "))}</div>
    ${it.detail ? `<div class="dsub">${esc(c.detail)}: ${esc(it.detail)}</div>` : ""}
    ${it.recoLine ? `<div class="note" style="margin-top:12px"><h4>👍 이럴 때 추천해요</h4><p>${esc(it.recoLine)}</p></div>` : ""}
    <dl class="kv">
      ${it.rating ? `<dt>평점</dt><dd>${stars(it.rating)}</dd>` : ""}
      <dt>시간</dt><dd>${esc(fmtWhen(it.when))}</dd>
      ${it.price ? `<dt>가격</dt><dd>${won(it.price)} / ${esc(it.priceUnit || "잔")}</dd>` : ""}
      ${it.place ? `<dt>장소</dt><dd>${esc(it.place)}${it.address ? `<div class="dsub">${esc(it.address)}</div>` : ""}<div class="maps">${mapLinks(it)}</div></dd>` : ""}
    </dl>
    ${it.lat != null ? `<div class="minimap" id="d-map"></div>` : ""}
    ${(it.tags || []).length ? `<div class="tags" style="margin:12px 0">${it.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
    ${note("향 (노즈)", it.nose)}${note("맛 (팔레트)", it.palate)}${note("여운 (피니시)", it.finish)}${note("경험 · 메모", it.note)}
    ${social ? `<div class="sec">좋아요 · 댓글</div><div class="social" id="social"><div class="hint">불러오는 중…</div></div>` : ""}
    ${kind === "mine" ? `<div class="actions"><button class="btn" id="d-again">여기서 한 잔 더</button><button class="btn danger" id="d-del">삭제</button></div>` : ""}
  </div>`;
  $("#s-back").onclick = back;
  sheet.querySelectorAll(".gallery img[data-pid]").forEach(async img => { try { const d = await fullPhoto(img.dataset.pid); if (d && img.isConnected) img.src = d; } catch (e) {} });
  if (it.lat != null) setTimeout(() => { const el = $("#d-map"); if (!el) return; const m = makeMap(el, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false });
    m.setView([it.lat, it.lng], 16); dot([it.lat, it.lng]).addTo(m); }, 280);
  const prof = sheet.querySelector("[data-prof]"); if (prof) prof.onclick = () => nav(() => renderProfile(owner));
  bindFollow();
  if (isMine) {
    const src = kind === "mine" ? it : S.mine.find(x => x.id === it.id);
    if (src) $("#d-edit").onclick = () => openForm(src); else $("#d-edit").classList.add("hide");
  }
  if (kind === "mine") {
    $("#d-again").onclick = () => openForm(null, { place: it.place, address: it.address, lat: it.lat, lng: it.lng, mapLink: it.mapLink });
    $("#d-del").onclick = async () => { if (await ask(`“${it.name}” 기록을 삭제할까요? 사진과 공유한 글도 함께 지워져요.`, "삭제")) deleteLog(it); };
  }
  if (social) initSocial(it.id, owner);
}

/* ───────────── 좋아요 · 댓글 ───────────── */
async function initSocial(id, ownerUid) {
  D = { id, ownerUid, liked: false, likeCount: 0, commentCount: 0, comments: [] };
  try {
    const [ps, ls, cs] = await Promise.all([FS.getDoc(ref("posts", id)), FS.getDoc(ref("posts", id, "likes", me())), FS.getDocs(FS.query(col("posts", id, "comments"), FS.orderBy("createdAt", "asc")))]);
    if (D?.id !== id) return;
    if (!ps.exists()) { const b = $("#social"); if (b) b.innerHTML = `<div class="hint">공유된 글을 찾지 못했어요.</div>`; return; }
    D.likeCount = ps.data().likeCount || 0; D.commentCount = ps.data().commentCount || 0; D.liked = ls.exists();
    D.comments = cs.docs.map(d => ({ id: d.id, ...d.data() })); await loadPeople(D.comments.map(c => c.authorUid));
  } catch (e) { const b = $("#social"); if (b) b.innerHTML = `<div class="err">불러오지 못했어요: ${errText(e)}</div>`; return; }
  if (D?.id === id) renderSocial();
}
function syncCounts() { const p = S.feed.find(x => x.id === D.id); if (p) { p.likeCount = D.likeCount; p.commentCount = D.commentCount; } }
function renderSocial() {
  const box = $("#social"); if (!box || !D) return;
  box.innerHTML = `<div class="likerow"><button class="likebtn ${D.liked ? "on" : ""}" id="s-like">${D.liked ? "♥" : "♡"} ${D.likeCount}</button><span class="dim">💬 ${D.commentCount}</span></div>
    ${D.comments.map(c => `<div class="comment">${avatar(c.authorUid)}<div class="ct"><div class="cn"><b>${esc(pname(c.authorUid))}</b> · ${esc(c.createdAt?.toDate ? ago(c.createdAt.toDate()) : "방금")}</div><p>${esc(c.text)}</p></div>${c.authorUid === me() || D.ownerUid === me() ? `<button class="del" data-cdel="${esc(c.id)}">삭제</button>` : ""}</div>`).join("")}
    <div class="cinput"><input class="inp" id="s-text" maxlength="500" placeholder="댓글 달기…"><button class="btn pri" id="s-send">등록</button></div>`;
  $("#s-like").onclick = async () => {
    const was = D.liked; const b = FS.writeBatch(db); const lr = ref("posts", D.id, "likes", me()), pr = ref("posts", D.id);
    if (was) { b.delete(lr); b.update(pr, { likeCount: FS.increment(-1) }); } else { b.set(lr, { createdAt: FS.serverTimestamp() }); b.update(pr, { likeCount: FS.increment(1) }); }
    D.liked = !was; D.likeCount += was ? -1 : 1; syncCounts(); renderSocial();
    try { await b.commit(); } catch (e) { D.liked = was; D.likeCount += was ? 1 : -1; syncCounts(); renderSocial(); toast("실패: " + errText(e)); }
  };
  const send = async () => {
    const inp = $("#s-text"); const text = inp.value.trim(); if (!text) return; $("#s-send").disabled = true;
    const b = FS.writeBatch(db); const cr = FS.doc(col("posts", D.id, "comments"));
    b.set(cr, { authorUid: me(), text, createdAt: FS.serverTimestamp() }); b.update(ref("posts", D.id), { commentCount: FS.increment(1) });
    try { await b.commit(); D.comments.push({ id: cr.id, authorUid: me(), text, createdAt: null }); D.commentCount++; people.set(me(), S.member); syncCounts(); renderSocial(); }
    catch (e) { toast("실패: " + errText(e)); $("#s-send").disabled = false; }
  };
  $("#s-send").onclick = send; $("#s-text").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); send(); } };
  box.querySelectorAll("[data-cdel]").forEach(btn => btn.onclick = async () => {
    if (!await ask("댓글을 삭제할까요?", "삭제")) return; const id = btn.dataset.cdel;
    const b = FS.writeBatch(db); b.delete(ref("posts", D.id, "comments", id)); b.update(ref("posts", D.id), { commentCount: FS.increment(-1) });
    try { await b.commit(); D.comments = D.comments.filter(c => c.id !== id); D.commentCount = Math.max(0, D.commentCount - 1); syncCounts(); renderSocial(); } catch (e) { toast("실패: " + errText(e)); }
  });
}

/* ───────────── 팔로우 · 사람 · 프로필 ───────────── */
const followBtn = uid => `<button class="btn small ${S.following.has(uid) ? "on" : ""}" data-follow="${esc(uid)}">${S.following.has(uid) ? "팔로잉" : "팔로우"}</button>`;
function refreshFollowButtons() { document.querySelectorAll("[data-follow]").forEach(b => { const f = S.following.has(b.dataset.follow); b.textContent = f ? "팔로잉" : "팔로우"; b.classList.toggle("on", f); }); }
function bindFollow() {
  sheet.querySelectorAll("[data-follow]").forEach(b => b.onclick = async e => {
    e.stopPropagation(); const u = b.dataset.follow; b.disabled = true;
    try { if (S.following.has(u)) await FS.deleteDoc(ref("follows", `${me()}_${u}`)); else await FS.setDoc(ref("follows", `${me()}_${u}`), { followerUid: me(), followeeUid: u, createdAt: FS.serverTimestamp() }); }
    catch (er) { toast("실패: " + errText(er)); } b.disabled = false;
  });
}
function personRow(p) {
  return `<div class="person">${avatar(p.uid)}<div class="pi" data-prof="${esc(p.uid)}"><b>${esc(p.displayName)}</b><span class="dim sm">@${esc(p.handle)}</span></div>${p.uid === me() ? "" : followBtn(p.uid)}</div>`;
}
function bindPeople() { bindFollow(); sheet.querySelectorAll("[data-prof]").forEach(el => el.onclick = () => nav(() => renderProfile(el.dataset.prof))); }

function renderPeople() {
  sheet.innerHTML = `${bar("사람 찾기")}<div class="sbody">
    <input class="inp" id="p-q" autocapitalize="off" autocomplete="off" placeholder="아이디로 검색 (앞부분만 써도 돼요)">
    <div id="p-res" style="margin-top:12px"></div></div>`;
  $("#s-back").onclick = back;
  const show = async () => {
    const q = $("#p-q").value.trim().toLowerCase().replace(/^@/, ""); const box = $("#p-res");
    if (!q) { const ids = [...S.following]; await loadPeople(ids);
      box.innerHTML = ids.length ? `<div class="sec" style="margin-top:0">팔로잉</div>` + ids.map(u => people.get(u)).filter(Boolean).map(personRow).join("") : `<div class="empty">아이디를 입력해 멤버를 찾아 보세요.</div>`; bindPeople(); return; }
    try {
      const s = await FS.getDocs(FS.query(col("members"), FS.where("handle", ">=", q), FS.where("handle", "<=", q + ""), FS.limit(20)));
      if ($("#p-q")?.value.trim().toLowerCase().replace(/^@/, "") !== q) return;
      const rows = s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(p => p.status === "active"); rows.forEach(p => people.set(p.uid, p));
      box.innerHTML = rows.length ? rows.map(personRow).join("") : `<div class="empty">찾는 멤버가 없어요.</div>`; bindPeople();
    } catch (e) { box.innerHTML = `<div class="err">검색 실패: ${errText(e)}</div>`; }
  };
  let t; $("#p-q").oninput = () => { clearTimeout(t); t = setTimeout(show, 300); }; show();
}

async function renderProfile(uid) {
  await loadPeople([uid]); const p = people.get(uid);
  if (!p) { sheet.innerHTML = `${bar("프로필")}<div class="sbody"><div class="empty">멤버를 찾을 수 없어요.</div></div>`; $("#s-back").onclick = back; return; }
  sheet.innerHTML = `${bar("프로필")}<div class="sbody"><div class="profile">${avatar(uid, "lg")}<h3>${esc(p.displayName)}</h3><div class="dim">@${esc(p.handle)}</div>
    ${p.bio ? `<p style="margin:8px 0 0">${esc(p.bio)}</p>` : ""}
    <div class="pcount"><div><b id="pc-posts">–</b>글</div><div><b id="pc-fr">–</b>팔로워</div><div><b id="pc-fg">–</b>팔로잉</div></div>
    ${uid === me() ? "" : followBtn(uid)}</div><div class="sec">공유한 기록</div><div id="pp"><div class="hint">불러오는 중…</div></div></div>`;
  $("#s-back").onclick = back; bindFollow();
  try {
    const [ps, fr, fg] = await Promise.all([
      FS.getDocs(FS.query(col("posts"), FS.where("ownerUid", "==", uid), FS.orderBy("when", "desc"), FS.limit(50))),
      FS.getCountFromServer(FS.query(col("follows"), FS.where("followeeUid", "==", uid))),
      FS.getCountFromServer(FS.query(col("follows"), FS.where("followerUid", "==", uid)))]);
    if (!$("#pp")) return; const posts = ps.docs.map(d => ({ id: d.id, ...d.data() }));
    posts.forEach(x => { const i = S.feed.findIndex(f => f.id === x.id); if (i < 0) S.feed.push(x); });
    $("#pc-posts").textContent = posts.length; $("#pc-fr").textContent = fr.data().count; $("#pc-fg").textContent = fg.data().count;
    $("#pp").innerHTML = posts.length ? posts.map(postCard).join("") : `<div class="empty">공유한 기록이 아직 없어요.</div>`;
    $("#pp").onclick = e => { const c = e.target.closest(".post"); if (c) { const it = posts.find(x => x.id === c.dataset.id); nav(() => renderDetail(it, "post")); } };
  } catch (e) { const b = $("#pp"); if (b) b.innerHTML = `<div class="err">불러오지 못했어요: ${errText(e)}</div>`; }
}

/* ───────────── 나 ───────────── */
/* ───────────── QR 코드 ───────────── */
const appUrl = () => "https://yoonbigbear.github.io/drink-log/";
function qrBlock(id) { return `<div class="qrbox"><canvas id="${id}" class="qrcv"></canvas><div class="dim sm" style="word-break:break-all">${esc(appUrl())}</div>
  <div class="row"><button class="btn pri" data-qr="img">QR 이미지 복사</button><button class="btn" data-qr="link">링크 복사</button></div>
  <div class="row"><button class="btn" data-qr="invite">초대 문구 복사</button><button class="btn" data-qr="save">이미지 저장</button></div></div>`; }
function bindQr(root, id) {
  const cv = $("#" + id), url = appUrl(); const c = qrCanvas(url, 8);
  if (c) { cv.width = c.width; cv.height = c.height; cv.getContext("2d").drawImage(c, 0, 0); } else cv.replaceWith(Object.assign(document.createElement("div"), { className: "err", textContent: "QR을 만들 수 없어요" }));
  const copyText = async (t, ok) => { try { await navigator.clipboard.writeText(t); toast(ok); } catch { prompt("복사해서 사용하세요", t); } };
  const invite = () => `술로그에 초대해요 🥃\n${url}` + (S.member?.handle ? `\n가입할 때 추천인 아이디에 @${S.member.handle} 를 적어 주세요.` : "");
  const png = () => new Promise(r => (c || cv).toBlob(r, "image/png"));
  root.querySelectorAll("[data-qr]").forEach(b => b.onclick = async () => {
    const k = b.dataset.qr;
    if (k === "link") return copyText(url, "링크를 복사했어요");
    if (k === "invite") return copyText(invite(), "초대 문구를 복사했어요");
    if (k === "save") { const a = document.createElement("a"); a.download = "drinklog-qr.png"; a.href = URL.createObjectURL(await png()); a.click(); return toast("이미지를 저장했어요"); }
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": png() })]); toast("QR 이미지를 복사했어요"); }
    catch { toast("이 브라우저는 이미지 복사를 못해요. 이미지 저장을 써 주세요"); }
  });
}
function renderQr() {
  sheet.innerHTML = `${bar("QR 코드")}<div class="sbody">${qrBlock("qr-main")}<div class="hint">친구가 이 QR로 접속해 가입하면, 추천인 칸에 내 아이디 <b>@${esc(S.member?.handle || "")}</b>를 적게 하세요.</div></div>`;
  $("#s-back").onclick = back; bindQr(sheet, "qr-main");
}

function renderMe() {
  const el = $("#me"); if (!el || !S.member) return; const m = S.member;
  const pend = pendingList(); const act = S.invitees.filter(i => i.status === "active");
  el.innerHTML = `<div class="profile">${avatar(me(), "lg")}<h3>${esc(m.displayName)}</h3><div class="dim">@${esc(m.handle)}</div>${m.bio ? `<p style="margin:8px 0 0">${esc(m.bio)}</p>` : ""}
    <div class="pcount"><div><b>${S.mine.length}</b>기록</div><div><b id="me-fr">–</b>팔로워</div><div><b>${S.following.size}</b>팔로잉</div></div>
    <div class="row" style="justify-content:center"><button class="btn" id="me-edit" style="flex:0 0 auto">프로필 수정</button><button class="btn" id="me-view" style="flex:0 0 auto">내 공유글 보기</button></div></div>
    ${pend.length ? `<div class="sec">가입 승인 요청 (${pend.length})</div>` + pend.map(p => `<div class="person inbox">${avatar(p.uid)}<div class="pi"><b>${esc(p.displayName)}</b><span class="dim sm">@${esc(p.handle)} 님이 나를 추천인으로 지정했어요</span></div></div>
      <div class="row" style="margin:-4px 0 12px"><button class="btn" data-rej="${esc(p.uid)}">거절</button><button class="btn pri" data-acc="${esc(p.uid)}">승인</button></div>`).join("") : ""}
    <div class="sec">QR 코드로 초대하기</div>${qrBlock("qr-me")}
    <div class="sec">내가 추천한 멤버 (${act.length})</div>
    ${act.length ? act.map(personRow).join("") : `<div class="hint">아직 없어요. 친구가 가입할 때 내 아이디 <b>@${esc(m.handle)}</b>를 추천인으로 적으면, 여기서 승인할 수 있어요.</div>`}
    <div class="sec">내 추천인</div><div class="hint" id="me-ref">${m.referrerUid ? "불러오는 중…" : "첫 멤버(관리자)예요."}</div>
    <div class="sec">계정</div><button class="btn danger" id="me-out" style="width:100%">로그아웃</button>`;
  bindQr(el, "qr-me");
  $("#me-out").onclick = logout;
  $("#me-edit").onclick = () => nav(renderEditProfile);
  $("#me-view").onclick = () => nav(() => renderProfile(me()));
  el.querySelectorAll("[data-acc]").forEach(b => b.onclick = () => decide(b.dataset.acc, "active"));
  el.querySelectorAll("[data-rej]").forEach(b => b.onclick = async () => { if (await ask("이 가입 요청을 거절할까요?", "거절")) decide(b.dataset.rej, "rejected"); });
  el.querySelectorAll("[data-prof]").forEach(x => x.onclick = () => nav(() => renderProfile(x.dataset.prof)));
  el.querySelectorAll("[data-follow]").forEach(b => b.onclick = async () => { const u = b.dataset.follow; b.disabled = true;
    try { if (S.following.has(u)) await FS.deleteDoc(ref("follows", `${me()}_${u}`)); else await FS.setDoc(ref("follows", `${me()}_${u}`), { followerUid: me(), followeeUid: u, createdAt: FS.serverTimestamp() }); } catch (e) { toast("실패: " + errText(e)); } b.disabled = false; });
  FS.getCountFromServer(FS.query(col("follows"), FS.where("followeeUid", "==", me()))).then(s => { const n = $("#me-fr"); if (n) n.textContent = s.data().count; }).catch(() => {});
  if (m.referrerUid) loadPeople([m.referrerUid]).then(() => { const n = $("#me-ref"); if (n) n.textContent = `${pname(m.referrerUid)} (@${phandle(m.referrerUid)})`; });
}
async function decide(uid, status) {
  try { const d = { status }; if (status === "active") d.approvedAt = FS.serverTimestamp(); await FS.updateDoc(ref("members", uid), d); toast(status === "active" ? "승인했어요. 이제 멤버예요 🎉" : "거절했어요"); }
  catch (e) { toast("실패: " + errText(e)); }
}
function renderEditProfile() {
  const m = S.member;
  sheet.innerHTML = `${bar("프로필 수정", `<button class="btn pri" id="pe-save">저장</button>`)}<div class="sbody">
    <label>닉네임</label><input class="inp" id="pe-name" maxlength="20" value="${esc(m.displayName)}">
    <label>소개 (선택)</label><textarea class="inp" id="pe-bio" maxlength="140">${esc(m.bio || "")}</textarea>
    <div class="hint">아이디(@${esc(m.handle)})는 바꿀 수 없어요.</div></div>`;
  $("#s-back").onclick = back;
  $("#pe-save").onclick = async () => { const name = $("#pe-name").value.trim(); if (!name) return toast("닉네임을 입력해 주세요");
    try { await FS.updateDoc(ref("members", me()), { displayName: name, bio: $("#pe-bio").value.trim() }); people.delete(me()); toast("저장했어요"); back(); } catch (e) { toast("실패: " + errText(e)); } };
}

/* ───────────── 기록 폼 ───────────── */
function openForm(it, pre) {
  const d = Object.assign({}, pre || {}, it || {}); const o = d.shareOpts || {};
  F = { id: it?.id || null, createdAt: it?.createdAt || null, wasShared: !!it?.shared,
    photos: (it?.photos || []).map(p => ({ ...p })), removed: [], origFirstId: it?.photos?.[0]?.id || null, origThumb: it?.thumb || "", tags: new Set(it?.tags || []), rating: it?.rating || 0,
    whenTouched: !!it, cat: d.category || S.mine[0]?.category || "위스키", pickMap: null, pickMarker: null,
    share: !!it?.shared, sPrice: o.price ?? false, sPlace: o.place || "name", sNote: o.note ?? true, reco: !!d.recommend };
  const coordStr = d.lat != null ? `${d.lat}, ${d.lng}` : ""; const recent = placeIndex().slice(0, 10);
  nav(() => {}, {});  // 스택에 자리만 잡고 아래에서 내용을 그린다
  stack[stack.length - 1].fn = () => { if (F) return; };
  sheet.innerHTML = `<div class="sbar"><button class="btn ghost" id="f-cancel">취소</button><h2>${it ? "기록 수정" : "새 기록"}</h2><button class="btn pri" id="f-save">저장</button></div>
  <form class="sbody" id="form" autocomplete="off">
    <fieldset><legend>주종</legend><div class="chips" id="f-cats">${CATS.map(c => `<button type="button" class="chip ${F.cat === c.key ? "on" : ""}" data-k="${esc(c.key)}">${c.icon} ${esc(c.key)}</button>`).join("")}</div></fieldset>
    <fieldset><legend>사진</legend><div class="photos" id="photos"></div><div class="hint">사진에 위치·촬영 시간이 남아 있으면 자동으로 채워져요. 최대 6장.</div></fieldset>
    <fieldset><legend>술</legend>
      <label>이름 *</label><input class="inp" id="f-name" value="${esc(d.name)}" placeholder="예: 글렌드로낙 15, 지역 막걸리 이름 등">
      <div class="row"><div><label>세부 종류</label><input class="inp" id="f-subtype" list="dl-sub" value="${esc(d.subtype)}"></div><div><label id="l-producer">생산자</label><input class="inp" id="f-producer" value="${esc(d.producer)}"></div></div>
      <datalist id="dl-sub"></datalist>
      <div class="row"><div><label>산지 · 지역</label><input class="inp" id="f-origin" value="${esc(d.origin)}" placeholder="예: 스페이사이드, 부르고뉴"></div><div><label id="l-aging">빈티지 · 숙성</label><input class="inp" id="f-aging" value="${esc(d.aging)}"></div></div>
      <div class="row"><div><label>도수 (%)</label><input class="inp" id="f-abv" inputmode="decimal" value="${esc(d.abv ?? "")}"></div><div><label id="l-detail">세부 정보</label><input class="inp" id="f-detail" value="${esc(d.detail)}"></div></div>
    </fieldset>
    <fieldset><legend>장소</legend>
      ${recent.length ? `<div class="chips scroll" id="recent" style="margin-bottom:2px">${recent.map((b, i) => `<button type="button" class="chip" data-i="${i}">${esc(b.place)}</button>`).join("")}</div>` : ""}
      <label>장소 이름</label><input class="inp" id="f-place" value="${esc(d.place)}" placeholder="바, 식당, 양조장, 집…">
      <label>주소 (선택)</label><input class="inp" id="f-address" value="${esc(d.address)}">
      <label>좌표 또는 지도 링크</label><input class="inp" id="f-coord" value="${esc(d.mapLink || coordStr)}" placeholder="37.5665, 126.9780 또는 지도 링크"><div id="coordmsg"></div>
      <div class="locbtns"><button type="button" class="btn" id="f-here">📍 현재 위치</button><button type="button" class="btn" id="f-geocode">🔎 주소·이름으로 찾기</button><button type="button" class="btn" id="f-pick">🗺️ 지도에서 고르기</button></div>
      <div id="pickmap" class="pickmap hide"></div>
    </fieldset>
    <fieldset><legend>시간 · 가격</legend>
      <label>마신 시간</label><input class="inp" type="datetime-local" id="f-when" value="${esc(d.when || nowLocal())}">
      <div class="row"><div><label>가격 (원)</label><input class="inp" id="f-price" inputmode="numeric" value="${esc(d.price ?? "")}" placeholder="25000"></div>
        <div><label>기준</label><select class="inp" id="f-unit">${[...new Set([...(d.priceUnit ? [d.priceUnit] : []), ...UNITS])].map(u => `<option ${(d.priceUnit || "잔") === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div></div>
    </fieldset>
    <fieldset><legend>향 · 맛</legend><div class="chips" id="aromas"></div>
      <div class="row" style="margin-top:6px"><input class="inp" id="f-newtag" placeholder="태그 직접 추가"><button type="button" class="btn" id="f-addtag" style="flex:0 0 auto">추가</button></div>
      <label>향 (노즈)</label><textarea class="inp" id="f-nose">${esc(d.nose)}</textarea><label>맛 (팔레트)</label><textarea class="inp" id="f-palate">${esc(d.palate)}</textarea><label>여운 (피니시)</label><textarea class="inp" id="f-finish">${esc(d.finish)}</textarea>
    </fieldset>
    <fieldset><legend>경험</legend>
      <label>평점</label><div class="ratepick" id="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}">★</button>`).join("")}</div>
      <label>메모 (누구와, 분위기, 페어링 등)</label><textarea class="inp" id="f-note" style="min-height:96px">${esc(d.note)}</textarea>
    </fieldset>
    <fieldset><legend>공유</legend>
      <div class="seg" id="f-share"><button type="button" data-s="0" class="${F.share ? "" : "on"}">🔒 나만 보기</button><button type="button" data-s="1" class="${F.share ? "on" : ""}">👥 멤버에게 공유</button></div>
      <div class="sharebox ${F.share ? "" : "hide"}" id="sharebox">
        <label class="opt"><input type="checkbox" id="f-reco" ${F.reco ? "checked" : ""}> 👍 이 술을 추천해요</label>
        <input class="inp" id="f-recoline" maxlength="80" value="${esc(d.recoLine)}" placeholder="추천 한마디 (예: 비 오는 날 혼술로 딱)">
        <label>공유할 범위</label>
        <label class="opt"><input type="checkbox" id="f-sprice" ${F.sPrice ? "checked" : ""}> 가격 공개</label>
        <label class="opt"><input type="checkbox" id="f-snote" ${F.sNote ? "checked" : ""}> 메모 공개</label>
        <label>장소</label>
        <select class="inp" id="f-splace"><option value="none" ${F.sPlace === "none" ? "selected" : ""}>숨김</option><option value="name" ${F.sPlace === "name" ? "selected" : ""}>장소 이름만</option><option value="exact" ${F.sPlace === "exact" ? "selected" : ""}>주소·좌표까지 공개</option></select>
        <div class="hint">공유한 글은 승인된 멤버 누구나 볼 수 있어요. 좌표·가격은 위에서 고른 것만 복사돼요.</div>
      </div>
    </fieldset>
    ${it ? `<button type="button" class="btn danger" id="f-del" style="width:100%;padding:11px">이 기록 삭제</button>` : ""}
  </form>`;
  applyCat(); renderPhotos(); renderRate(); updateCoordMsg(); sheet.scrollTop = 0;
  F.photos.forEach(async (p, i) => { if (p.preview) return; if (i === 0 && it?.thumb) p.preview = it.thumb; else { try { p.preview = await thumbFromData(await fullPhoto(p.id)); } catch (e) {} } if (F) renderPhotos(); });
  $("#f-cancel").onclick = cancelForm; $("#f-save").onclick = save; $("#form").onsubmit = e => { e.preventDefault(); save(); };
  $("#f-when").oninput = () => { F.whenTouched = true; }; $("#f-coord").oninput = () => { updateCoordMsg(); syncPickMarker(); };
  $("#f-cats").onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; F.cat = b.dataset.k; document.querySelectorAll("#f-cats .chip").forEach(x => x.classList.toggle("on", x === b)); applyCat(); };
  $("#rate").onclick = e => { const b = e.target.closest("[data-n]"); if (!b) return; const n = +b.dataset.n; F.rating = F.rating === n ? 0 : n; renderRate(); };
  $("#aromas").onclick = e => { const b = e.target.closest("[data-t]"); if (!b) return; const t = b.dataset.t; F.tags.has(t) ? F.tags.delete(t) : F.tags.add(t); b.classList.toggle("on"); };
  const addTag = () => { const v = $("#f-newtag").value.trim(); if (!v) return; $("#f-newtag").value = ""; F.tags.add(v); renderAromas(); };
  $("#f-addtag").onclick = addTag; $("#f-newtag").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } };
  $("#f-share").onclick = e => { const b = e.target.closest("[data-s]"); if (!b) return; F.share = b.dataset.s === "1";
    document.querySelectorAll("#f-share button").forEach(x => x.classList.toggle("on", x === b)); $("#sharebox").classList.toggle("hide", !F.share); };
  if ($("#recent")) $("#recent").onclick = e => { const c = e.target.closest("[data-i]"); if (!c) return; const b = recent[+c.dataset.i];
    $("#f-place").value = b.place; $("#f-address").value = b.address || ""; $("#f-coord").value = b.mapLink || (b.lat != null ? `${b.lat}, ${b.lng}` : ""); updateCoordMsg(); syncPickMarker(); };
  $("#f-here").onclick = () => { if (!navigator.geolocation) return toast("이 브라우저는 위치를 지원하지 않아요"); toast("현재 위치를 찾는 중…");
    navigator.geolocation.getCurrentPosition(p => { setCoord(p.coords.latitude, p.coords.longitude); toast("현재 위치를 넣었어요"); }, e => toast(e.code === 1 ? "위치 권한이 거부됐어요" : "위치를 찾지 못했어요"), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); };
  $("#f-geocode").onclick = async () => { const q = $("#f-address").value.trim() || $("#f-place").value.trim(); if (!q) return toast("주소나 장소 이름을 먼저 적어 주세요");
    try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=${encodeURIComponent(q)}`); const j = await r.json();
      if (!j.length) return toast("찾지 못했어요. 지도에서 골라 주세요"); setCoord(+j[0].lat, +j[0].lon);
      if (!$("#f-address").value.trim()) $("#f-address").value = j[0].display_name.split(",").slice(0, 4).join(","); toast("위치를 찾았어요. 지도에서 확인해 보세요"); showPickMap(); } catch (e) { toast("검색 실패"); } };
  $("#f-pick").onclick = () => { const el = $("#pickmap"); if (el.classList.contains("hide")) showPickMap(); else el.classList.add("hide"); };
  if ($("#f-del")) $("#f-del").onclick = async () => { if (await ask(`“${it.name}” 기록을 삭제할까요? 사진과 공유한 글도 함께 지워져요.`, "삭제")) { const x = it; F = null; await deleteLog(x); } };
}
function applyCat() {
  const c = CAT[F.cat] || CAT["기타"]; $("#l-producer").textContent = c.producer || "생산자"; $("#l-aging").textContent = c.aging || "빈티지 · 숙성";
  $("#l-detail").textContent = c.detail || "세부 정보"; $("#f-detail").placeholder = c.detailPh || ""; $("#dl-sub").innerHTML = (c.subs || []).map(s => `<option value="${esc(s)}">`).join(""); renderAromas();
}
function renderAromas() { const c = CAT[F.cat] || CAT["기타"]; const list = [...new Set([...(c.aromas || []), ...F.tags])];
  $("#aromas").innerHTML = list.map(a => `<button type="button" class="chip ${F.tags.has(a) ? "on" : ""}" data-t="${esc(a)}">${esc(a)}</button>`).join(""); }
function setCoord(la, lo) { la = +la.toFixed(6); lo = +lo.toFixed(6); $("#f-coord").value = `${la}, ${lo}`; updateCoordMsg(); syncPickMarker(true); }
function showPickMap() {
  const el = $("#pickmap"); el.classList.remove("hide"); const c = parseCoord($("#f-coord").value);
  if (!F.pickMap) { F.pickMap = makeMap(el); F.pickMarker = null; F.pickMap.setView(c ? [c.lat, c.lng] : [37.5665, 126.978], c ? 16 : 12); F.pickMap.on("click", e => setCoord(e.latlng.lat, e.latlng.lng)); }
  setTimeout(() => { F.pickMap.invalidateSize(); syncPickMarker(true); }, 50);
}
function syncPickMarker(pan) {
  if (!F || !F.pickMap) return; const c = parseCoord($("#f-coord").value);
  if (!c) { if (F.pickMarker) { F.pickMarker.remove(); F.pickMarker = null; } return; }
  if (!F.pickMarker) F.pickMarker = dot([c.lat, c.lng]).addTo(F.pickMap); else F.pickMarker.setLatLng([c.lat, c.lng]);
  if (pan) F.pickMap.setView([c.lat, c.lng], Math.max(F.pickMap.getZoom(), 15));
}
function renderRate() { document.querySelectorAll("#rate button").forEach(b => b.classList.toggle("on", +b.dataset.n <= F.rating)); }
function updateCoordMsg() {
  const v = $("#f-coord").value.trim(); const c = parseCoord(v); const m = $("#coordmsg");
  if (!v) m.innerHTML = ""; else if (c) m.innerHTML = `<div class="ok">✓ 좌표 ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</div>`;
  else if (/^https?:\/\//i.test(v)) m.innerHTML = `<div class="hint">링크로 저장돼요. (단축 링크라 좌표는 읽지 못했어요 — 지도에서 골라도 돼요)</div>`;
  else m.innerHTML = `<div class="err">좌표 형식을 읽지 못했어요. 예: 37.5665, 126.9780</div>`;
}

/* ── 사진 (Firestore photos/{id} 에 data URL 로 저장: 무료 요금제에서는 Storage 를 쓸 수 없다) ── */
const fullCache = new Map();
async function fullPhoto(id) {
  if (fullCache.has(id)) return fullCache.get(id);
  const s = await FS.getDoc(ref("photos", id)); const d = s.exists() ? s.data().data : null; if (d) fullCache.set(id, d); return d;
}
function renderPhotos() {
  const el = $("#photos"); if (!el) return;
  el.innerHTML = F.photos.map((p, i) => `<div class="ph"><img src="${esc(p.preview || "")}" alt="">${p.busy ? '<div class="up">처리 중…</div>' : ""}<button type="button" class="x" data-i="${i}">✕</button></div>`).join("")
    + (F.photos.length < 6 ? `<div class="addph" id="addph"><span class="ic">📷</span>사진 추가</div>` : "");
  el.querySelectorAll(".x").forEach(b => b.onclick = () => { const p = F.photos[+b.dataset.i]; if (p.busy) return; F.photos.splice(+b.dataset.i, 1); if (!p.data) F.removed.push(p); renderPhotos(); });
  const a = $("#addph"); if (a) a.onclick = () => $("#file").click();
}
$("#file").onchange = async e => { const files = [...e.target.files]; e.target.value = ""; for (const f of files) { if (!F || F.photos.length >= 6) break; await addPhoto(f); } };
async function addPhoto(f) {
  const myF = F;
  try { const ex = readExif(await f.arrayBuffer());
    if (ex) { if (ex.lat != null && !$("#f-coord").value.trim()) { setCoord(ex.lat, ex.lng); toast("사진에서 위치를 찾았어요"); } if (ex.date && !F.whenTouched) { $("#f-when").value = ex.date; F.whenTouched = true; } } } catch (e) {}
  const p = { id: rid(), busy: true }; F.photos.push(p); renderPhotos();
  try { const img = await loadImg(f); p.data = toDataUrl(img, ...FULL); p.thumb = toDataUrl(img, ...THUMB); p.preview = p.thumb; p.busy = false; }
  catch (e) { const i = myF.photos.indexOf(p); if (i >= 0) myF.photos.splice(i, 1); toast("이 사진은 열 수 없어요"); }
  if (F === myF) renderPhotos();
}

/* ── 저장 · 삭제 ── */
async function cancelForm() { F = null; back(); }
const num = s => { const v = String(s ?? "").replace(/[,\s₩원%]/g, ""); if (v === "") return null; const n = parseFloat(v); return isFinite(n) ? n : null; };
// 내 원본 기록 → 공유 게시물(고른 항목만)
function projection(l, uid) {
  const o = l.shareOpts, del = FS.deleteField();
  const p = { ownerUid: uid, category: l.category, name: l.name, subtype: l.subtype, producer: l.producer, origin: l.origin, aging: l.aging, abv: l.abv, detail: l.detail,
    when: l.when, tags: l.tags, nose: l.nose, palate: l.palate, finish: l.finish, rating: l.rating, recommend: l.recommend, recoLine: l.recoLine,
    photos: l.photos, thumb: l.thumb || "", createdAt: l.createdAt, updatedAt: l.updatedAt,
    note: o.note ? l.note : "",
    price: o.price && l.price != null ? l.price : del, priceUnit: o.price && l.price != null ? l.priceUnit : del,
    place: o.place !== "none" && l.place ? l.place : del,
    address: o.place === "exact" && l.address ? l.address : del,
    lat: o.place === "exact" && l.lat != null ? l.lat : del, lng: o.place === "exact" && l.lat != null ? l.lng : del,
    mapLink: o.place === "exact" && l.mapLink ? l.mapLink : del };
  return p;
}
async function save() {
  if (!F) return;
  if (F.photos.some(p => p.busy)) return toast("사진 처리가 끝나면 저장할 수 있어요");
  const v = id => $(id).value.trim(); const name = v("#f-name"); if (!name) { toast("이름을 입력해 주세요"); $("#f-name").focus(); return; }
  const cs = v("#f-coord"); const c = parseCoord(cs); const uid = me();
  const id = F.id || FS.doc(col("private", uid, "logs")).id; const btn = $("#f-save"); btn.disabled = true; btn.textContent = "저장 중…";
  try {
    const photos = F.photos.map(p => ({ id: p.id }));
    // 목록·피드용 썸네일은 첫 번째 사진 것만 문서에 담는다
    let thumb = ""; const first = F.photos[0];
    if (first) {
      if (first.thumb) thumb = first.thumb;
      else if (first.id === F.origFirstId) thumb = F.origThumb;
      else { const d = await fullPhoto(first.id); thumb = d ? await thumbFromData(d) : ""; }
    }
    const log = { category: F.cat, name, subtype: v("#f-subtype"), producer: v("#f-producer"), origin: v("#f-origin"), aging: v("#f-aging"), abv: num(v("#f-abv")), detail: v("#f-detail"),
      place: v("#f-place"), address: v("#f-address"), lat: c ? c.lat : null, lng: c ? c.lng : null, mapLink: /^https?:\/\//i.test(cs) ? cs : "",
      when: v("#f-when") || nowLocal(), price: num(v("#f-price")), priceUnit: v("#f-unit"), tags: [...F.tags], nose: v("#f-nose"), palate: v("#f-palate"), finish: v("#f-finish"), note: v("#f-note"),
      rating: F.rating || 0, photos, thumb, recommend: !!$("#f-reco").checked, recoLine: v("#f-recoline"),
      shared: F.share, shareOpts: { price: $("#f-sprice").checked, place: $("#f-splace").value, note: $("#f-snote").checked },
      createdAt: F.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (F.wasShared && !F.share) await cleanupSubs(id);
    const b = FS.writeBatch(db); b.set(ref("private", uid, "logs", id), log);
    for (const p of F.photos) {   // 사진 본문은 따로 저장하고, 공유 여부를 따라간다
      if (p.data) { b.set(ref("photos", p.id), { ownerUid: uid, logId: id, shared: F.share, data: p.data, createdAt: FS.serverTimestamp() }); fullCache.set(p.id, p.data); }
      else if (F.share !== F.wasShared) b.update(ref("photos", p.id), { shared: F.share });
    }
    F.removed.forEach(p => b.delete(ref("photos", p.id)));
    if (F.share) { const post = projection(log, uid); if (!F.wasShared) { post.likeCount = 0; post.commentCount = 0; } b.set(ref("posts", id), post, { merge: true }); }
    else if (F.wasShared) b.delete(ref("posts", id));
    await b.commit();
    const wasNew = !F.id, shared = F.share; F = null;
    if (wasNew) closeSheet(); else back();
    toast(shared ? "저장하고 멤버에게 공유했어요 🥂" : "저장했어요 🥃");
    if (shared) loadFeed();
  } catch (e) {
    btn.disabled = false; btn.textContent = "저장";
    toast("저장 실패: " + errText(e));
  }
}
async function cleanupSubs(id) {
  for (const sub of ["comments", "likes"]) {
    const s = await FS.getDocs(col("posts", id, sub)); const docs = s.docs;
    for (let i = 0; i < docs.length; i += 400) { const b = FS.writeBatch(db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
  }
}
async function deleteLog(it) {
  try {
    if (it.shared) await cleanupSubs(it.id);
    const b = FS.writeBatch(db); b.delete(ref("private", me(), "logs", it.id)); if (it.shared) b.delete(ref("posts", it.id));
    (it.photos || []).forEach(p => b.delete(ref("photos", p.id))); await b.commit(); closeSheet(); toast("삭제했어요"); if (it.shared) loadFeed();
  } catch (e) { toast("삭제 실패: " + errText(e)); }
}
