/* 자산관리 계기판 — 앱 동작 (app.js)
   숫자·목록은 settings.js, 구글 키는 config.js 에서 고치세요. 이 파일은 보통 고칠 필요가 없습니다. */
(() => {
"use strict";
/* ---------- 설정 읽기 (settings.js 가 깨졌을 때를 대비한 기본값 포함) ---------- */
const FALLBACK = { DEFAULT_PRESET: "50공격", ROLES: [{k:"cash",n:"유동성",d:"현금·CMA·MMF",c:"#8a9099"},{k:"kr",n:"국내주식",d:"성장",c:"#2f5fe0"},{k:"gl",n:"해외주식",d:"성장",c:"#5fa0ff"},{k:"bond",n:"채권",d:"방어",c:"#0f9d8a"},{k:"inc",n:"인컴",d:"현금흐름",c:"#7b5cf0"},{k:"gold",n:"금·원자재",d:"물가 방어",c:"#d4a000"},{k:"alt",n:"대체투자",d:"IMA·리츠",c:"#9a6a3a"},{k:"sat",n:"위성",d:"고위험",c:"#e0457b"}],
  PRESETS: {"50공격":[8,10,30,20,12,6,8,6]}, BAND:{type:"abs",value:5}, INSTITUTIONS:["기타"], ACCOUNTS:["일반(위탁)","ISA","연금저축","IRP","DC/DB","CMA","예적금","기타"], RISK_LIMIT:70, RISKY_ROLES:["kr","gl","sat","gold","alt"], HOME_ACCOUNT:{}, ROLE_HINTS:[], COLUMN_HINTS:{} };
const SET = Object.assign({}, FALLBACK, window.JASAN_SETTINGS || {});
const CONFIG = window.JASAN_CONFIG || {};
const ROLES = SET.ROLES, RK = ROLES.map(r => r.k), RM = Object.fromEntries(ROLES.map(r => [r.k, r]));
const ACCTS = SET.ACCOUNTS, TAXADV = ["ISA", "연금저축", "IRP", "DC/DB"];
const DEF = SET.PRESETS[SET.DEFAULT_PRESET] ? SET.DEFAULT_PRESET : Object.keys(SET.PRESETS)[0];
const LS = "jasan-v1", FILE = "자산관리_데이터.json";
const DRIVE = "https://www.googleapis.com/drive/v3", UPLOAD = "https://www.googleapis.com/upload/drive/v3";

/* ---------- 도우미 ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const won = n => Math.round(n).toLocaleString("ko-KR") + "원";
const short = n => { const a = Math.abs(n), s = n < 0 ? "−" : ""; return a >= 1e8 ? s + (a / 1e8).toFixed(2) + "억" : a >= 1e4 ? s + Math.round(a / 1e4).toLocaleString("ko-KR") + "만" : s + Math.round(a).toLocaleString("ko-KR"); };
const pct = (x, d = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(d) + "%";
const cls = x => x > 0 ? "up" : x < 0 ? "dn" : "";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const toT = a => Object.fromEntries(RK.map((k, i) => [k, +(a && a[i]) || 0]));
const ret = h => h.cost ? (h.value - h.cost) / h.cost : 0;
let toastT = 0;
function toast(m){ const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3500); }
function presetParts(name){ const m = /^(\d+)(.+)$/.exec(name) || []; return { age: m[1] || "50", style: m[2] || "공격" }; }

/* ---------- 상태 ---------- */
function blank(){ const p = presetParts(DEF); return { sample: false, age: p.age, style: p.style, targets: toT(SET.PRESETS[DEF]), band: { type: SET.BAND.type, v: SET.BAND.value }, mode: "full", newCash: 0, holdings: [], snaps: [], savedAt: 0 }; }
function sample(){
  const h = [["한국투자증권","ISA","국내 상장 S&P500 ETF","gl",28e6,35.4e6],["한국투자증권","ISA","국내 상장 나스닥100 ETF","gl",12e6,15.9e6],["미래에셋증권","연금저축","전세계주식 ETF","gl",10e6,11.8e6],["미래에셋증권","연금저축","코스피200 ETF","kr",9e6,11.7e6],["삼성증권","IRP","국고채 10년 ETF","bond",15e6,15.3e6],["삼성증권","IRP","미국채 단기 ETF(환노출)","bond",8e6,8.15e6],["키움증권","일반(위탁)","미국 투자등급 회사채(달러)","inc",9e6,9.25e6],["NH투자증권","일반(위탁)","KRX 금현물","gold",6e6,8.4e6],["한국투자증권","일반(위탁)","IMA 상품","alt",7e6,7.21e6],["업비트","기타","비트코인","sat",4e6,6.9e6],["토스증권","일반(위탁)","AI 반도체 개별주","sat",5e6,6.3e6],["한국투자증권","CMA","CMA(발행어음형)","cash",9e6,9e6]]
    .map(r => ({ id: uid(), inst: r[0], acct: r[1], name: r[2], role: r[3], cost: r[4], value: r[5] }));
  return Object.assign(blank(), { sample: true, mode: "full", holdings: h,
    snaps: [["2026-06-01",110e6,112e6],["2026-07-01",113e6,118.5e6],["2026-08-01",116e6,121e6],["2026-09-01",118e6,126e6],["2026-10-01",120e6,133e6],["2026-11-01",122e6,139.5e6]].map(s => ({ d: s[0], c: s[1], v: s[2] })) });
}
function norm(s){
  const b = blank(); s = Object.assign(b, s || {});
  s.targets = Object.assign(toT([]), s.targets); s.band = Object.assign({ type: "abs", v: 5 }, s.band);
  s.holdings = (Array.isArray(s.holdings) ? s.holdings : []).map(h => ({ id: h.id || uid(), inst: String(h.inst || ""), acct: ACCTS.includes(h.acct) ? h.acct : "기타", name: String(h.name || ""), role: RK.includes(h.role) ? h.role : RK[0], cost: +h.cost || 0, value: +h.value || 0 }));
  s.snaps = (Array.isArray(s.snaps) ? s.snaps : []).filter(x => x && x.d).map(x => ({ d: String(x.d), c: +x.c || 0, v: +x.v || 0 }));
  s.savedAt = +s.savedAt || 0; return s;
}
let S = null, firstRun = false;
try { const raw = JSON.parse(localStorage.getItem(LS)); if (raw && typeof raw === "object") S = norm(raw); } catch (e) {}
if (!S) { S = blank(); firstRun = true; }

let pend = false;
function saveLocal(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }
function persist(){ S.savedAt = Date.now(); saveLocal(); pend = true; setSync(); scheduleSync(); }

/* ---------- 계산 ---------- */
function calc(){
  const T = { v: 0, c: 0 }, R = {}; RK.forEach(k => R[k] = { v: 0, c: 0 });
  S.holdings.forEach(h => { T.v += h.value; T.c += h.cost; R[h.role].v += h.value; R[h.role].c += h.cost; });
  const nc = Math.max(0, +S.newCash || 0), T2 = T.v + nc;
  const rows = ROLES.map(r => { const cur = R[r.k].v, t = (+S.targets[r.k] || 0) / 100, w = T.v ? cur / T.v : 0, d = (w - t) * 100, lim = S.band.type === "abs" ? +S.band.v : t * S.band.v;
    return { r, cur, t, w, d, lim, out: T.v > 0 && Math.abs(d) > lim + 1e-9, trade: 0 }; });
  if (S.mode === "full") rows.forEach(x => x.trade = x.t * T2 - x.cur);
  else { const def = rows.map(x => Math.max(0, x.t * T2 - x.cur)), sd = def.reduce((a, b) => a + b, 0);
    rows.forEach((x, i) => x.trade = sd > 0 ? def[i] * Math.min(1, nc / sd) : 0);
    const left = nc - rows.reduce((a, x) => a + x.trade, 0); if (left > 1) rows.forEach(x => x.trade += left * x.t); }
  rows.forEach(x => { x.trade = Math.round(x.trade / 1e4) * 1e4; x.after = T2 ? (x.cur + x.trade) / T2 : 0; });
  return { T, R, rows, nc, T2 };
}
function where(role, sell){
  const hs = S.holdings.filter(h => h.role === role).sort((a, b) => b.value - a.value);
  if (!hs.length) return "보유 없음 → 추천 계좌: " + esc(SET.HOME_ACCOUNT[role] || "일반(위탁)");
  const p = sell ? (hs.find(h => TAXADV.includes(h.acct)) || hs[0]) : hs[0];
  return esc(p.inst) + " · " + esc(p.acct) + " · " + esc(p.name || "이름 없음");
}

/* ---------- 화면: 상단 ---------- */
function renderTop(c){
  const out = c.rows.filter(x => x.out).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)), g = c.T.v - c.T.c;
  let h;
  if (!S.holdings.length) h = "자산을 불러오면 리밸런싱 계산이 시작됩니다";
  else if (!out.length) h = "모든 자산이 허용 밴드 안에 있습니다 — 이번에는 그대로 두세요";
  else { const x = out[0]; h = `${x.r.n}이 목표보다 ${Math.abs(x.d).toFixed(1)}%p ${x.d > 0 ? "높습니다" : "낮습니다"} — 리밸런싱이 필요합니다` + (out.length > 1 ? ` (외 ${out.length - 1}개)` : ""); }
  $("head").textContent = h;
  const mx = c.rows.reduce((a, x) => Math.abs(x.d) > Math.abs(a.d) ? x : a, c.rows[0]);
  const nb = c.rows.filter(x => x.trade > 0).length, ns = c.rows.filter(x => x.trade < 0).length, has = c.T.v > 0;
  $("kpis").innerHTML = `<div class="kpi"><span>총 평가액</span><b>${short(c.T.v)}</b><span>${S.holdings.length}개 자산 · ${new Set(S.holdings.map(h => h.inst)).size}개 기관</span></div>
  <div class="kpi"><span>평가손익</span><b class="${cls(g)}">${short(g)}</b><span class="${cls(g)}">${pct(c.T.c ? g / c.T.c : 0)} (원금 ${short(c.T.c)})</span></div>
  <div class="kpi"><span>최대 이탈</span><b>${has ? (mx.d > 0 ? "+" : "−") + Math.abs(mx.d).toFixed(1) + "%p" : "—"}</b><span>${has ? esc(mx.r.n) + " · " : ""}밴드 ${S.band.type === "abs" ? "±" + S.band.v + "%p" : "±" + S.band.v + "%"}</span></div>
  <div class="kpi"><span>다음 할 일</span><b>${!has ? "자산 입력" : out.length ? "리밸런싱" : "유지"}</b><span>${out.length ? `매수 ${nb}건 · 매도 ${ns}건` : has ? "다음 점검까지 대기" : "파일 불러오기 또는 직접 입력"}</span></div>`;
  $("sampleBar").hidden = !S.sample;
  $("welcome").hidden = !!S.holdings.length; document.body.classList.toggle("empty", !S.holdings.length);
}

/* ---------- 화면: 리밸런싱 ---------- */
function renderGauge(c){
  const M = Math.max(20, Math.ceil(Math.max(...c.rows.map(x => Math.max(x.w * 100, x.t * 100 + x.lim))) * 1.1 / 10) * 10);
  const P = v => Math.max(0, Math.min(100, v / M * 100));
  let tk = ""; for (let v = 0; v <= M; v += M > 60 ? 20 : 10) tk += `<i style="left:${P(v)}%">${v}%</i>`; $("ticks").innerHTML = tk;
  $("gauge").innerHTML = c.rows.map(x => { const w = x.w * 100, t = x.t * 100, a = Math.min(w, t), b = Math.max(w, t), tr = x.trade;
    return `<div class="gr"><div class="nm">${esc(x.r.n)}${x.out ? ' <span class="tag o">이탈</span>' : ""}<small>${esc(x.r.d)}</small></div>
    <div class="trk" title="목표 ${t.toFixed(1)}% · 현재 ${w.toFixed(1)}%"><div class="bd" style="left:${P(t - x.lim)}%;width:${P(t + x.lim) - P(t - x.lim)}%"></div><div class="dr" style="left:${P(a)}%;width:${P(b) - P(a)}%"></div><div class="tg" style="left:${P(t)}%"></div><div class="pt${x.out ? " out" : ""}" style="left:${P(w)}%"></div></div>
    <div class="ro"><b>${w.toFixed(1)}%</b> <span class="note">/ ${t.toFixed(1)}%</span><small class="${tr > 0 ? "buy" : tr < 0 ? "sell" : ""}">${Math.abs(tr) < 1e4 ? "조정 없음" : (tr > 0 ? "매수 " : "매도 ") + short(Math.abs(tr))}</small></div></div>`; }).join("");
}
function renderPlan(c){
  if (!S.holdings.length) { $("plan").innerHTML = '<p class="note">보유자산을 불러오거나 입력하세요.</p>'; return; }
  const rows = c.rows.filter(x => Math.abs(x.trade) >= 1e4), tsum = RK.reduce((a, k) => a + (+S.targets[k] || 0), 0);
  $("plan").innerHTML = (Math.abs(tsum - 100) > .01 ? `<div class="warn">목표 비율 합계가 ${tsum}%입니다. 100%로 맞춰야 계산이 정확합니다.</div>` : "")
   + (S.mode === "cash" && !c.nc ? '<div class="warn">‘추가 납입금으로만’ 방식은 이번 추가 납입금을 입력해야 매수 계획이 나옵니다.</div>' : "")
   + (rows.length ? `<table class="stack"><thead><tr><th>역할</th><th class="n">현재</th><th class="n">목표</th><th class="n">조정 후</th><th class="n">매매</th><th>어디서</th></tr></thead><tbody>${rows.sort((a, b) => a.trade - b.trade).map(x => `<tr><td>${esc(x.r.n)} ${x.out ? '<span class="tag o">이탈</span>' : ""}</td><td class="n">${(x.w * 100).toFixed(1)}%</td><td class="n">${(x.t * 100).toFixed(1)}%</td><td class="n">${(x.after * 100).toFixed(1)}%</td><td class="n ${x.trade > 0 ? "buy" : "sell"}"><b>${x.trade > 0 ? "매수" : "매도"} ${won(Math.abs(x.trade))}</b></td><td>${where(x.r.k, x.trade < 0)}</td></tr>`).join("")}</tbody></table><p class="note">매매 금액은 1만원 단위로 반올림했습니다. 매도 위치는 과세이연 계좌(ISA·연금·IRP)를 먼저 제안합니다.</p>` : '<p class="note">조정할 금액이 없습니다.</p>');
}
function renderChecks(c){
  const o = [], rh = S.holdings.filter(h => h.acct === "IRP" || h.acct === "DC/DB");
  if (rh.length) { const tv = rh.reduce((a, h) => a + h.value, 0), rv = rh.filter(h => SET.RISKY_ROLES.includes(h.role)).reduce((a, h) => a + h.value, 0), r = tv ? rv / tv : 0, L = SET.RISK_LIMIT / 100;
    o.push(`<div class="${r > L ? "warn" : ""}" style="margin:8px 0"><b>IRP·DC 위험자산 한도</b>: 위험자산 ${(r * 100).toFixed(0)}% / 한도 ${SET.RISK_LIMIT}% ${r > L ? "— 초과" : "— 정상"}<div class="note">settings.js의 RISKY_ROLES 역할을 위험자산으로 본 근사 판정입니다. 실제 분류는 상품마다 다릅니다.</div></div>`); }
  const sat = +S.targets.sat || 0;
  o.push(`<div style="margin:8px 0"><b>코어 · 위성</b>: 목표 코어 ${100 - sat}% · 위성 ${sat}% / 현재 위성 ${(c.T.v ? (c.R.sat ? c.R.sat.v : 0) / c.T.v * 100 : 0).toFixed(1)}%${sat > 30 ? ' <span class="tag o">위성 30% 초과</span>' : ""}</div>`);
  S.holdings.filter(h => c.T.v && h.value / c.T.v > .25).forEach(h => o.push(`<div class="warn">단일 상품 쏠림: ${esc(h.name)}이 전체의 ${(h.value / c.T.v * 100).toFixed(0)}%입니다.</div>`));
  const cv = c.R.cash ? c.R.cash.v : 0;
  o.push(`<div style="margin:8px 0"><b>유동성</b>: ${short(cv)} (${(c.T.v ? cv / c.T.v * 100 : 0).toFixed(1)}%) — 가까운 지출(통상 3~6개월 생활비)을 덮는지 확인하세요.</div>`);
  $("checks").innerHTML = o.join("");
}

/* ---------- 화면: 보유자산 ---------- */
function group(fn){ const m = {}; S.holdings.forEach(h => { const k = fn(h) || "(미입력)"; (m[k] = m[k] || { v: 0, c: 0 }); m[k].v += h.value; m[k].c += h.cost; }); return Object.entries(m).sort((a, b) => b[1].v - a[1].v); }
function gtable(entries, T, role){
  if (!entries.length) return '<p class="note">자산이 없습니다.</p>';
  return `<table class="stack"><thead><tr><th>구분</th><th class="n">평가액</th><th>비중</th><th class="n">수익률</th></tr></thead><tbody>${entries.map(([k, x]) => { const w = T ? x.v / T : 0, r = x.c ? (x.v - x.c) / x.c : 0;
    return `<tr><td>${esc(role ? RM[k].n : k)}</td><td class="n">${short(x.v)}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${w * 100}%;background:${role ? RM[k].c : "var(--ink)"}"></i></div><span class="note" style="width:3.5em;text-align:right">${(w * 100).toFixed(1)}%</span></div></td><td class="n ${cls(r)}">${pct(r)}</td></tr>`; }).join("")}</tbody></table>`;
}
function renderHoldings(){
  const f = $("instFilter").value;
  $("hbody").innerHTML = S.holdings.map((h, i) => `<tr data-i="${i}" ${f && h.inst !== f ? "hidden" : ""}><td><input data-k="inst" list="insts" value="${esc(h.inst)}" aria-label="증권사"></td><td><select data-k="acct" aria-label="계좌">${ACCTS.map(a => `<option${a === h.acct ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></td><td><input data-k="name" value="${esc(h.name)}" aria-label="상품명"></td><td><select data-k="role" aria-label="역할">${ROLES.map(x => `<option value="${x.k}"${x.k === h.role ? " selected" : ""}>${esc(x.n)}</option>`).join("")}</select></td><td><input class="n" data-k="cost" type="number" min="0" step="10000" value="${h.cost}" aria-label="투자원금"></td><td><input class="n" data-k="value" type="number" min="0" step="10000" value="${h.value}" aria-label="평가금액"></td><td class="n ${cls(ret(h))}" id="r-${h.id}">${pct(ret(h))}</td><td><button class="x" data-del="${i}" aria-label="삭제">✕</button></td></tr>`).join("")
    || '<tr><td colspan="8" class="note">아직 자산이 없습니다. ‘Numbers·엑셀 불러오기’ 또는 ‘+ 자산 추가’로 시작하세요.</td></tr>';
  renderHFoot();
}
function renderHFoot(){ const v = S.holdings.reduce((a, h) => a + h.value, 0), c = S.holdings.reduce((a, h) => a + h.cost, 0); $("hfoot").innerHTML = `<tr><th colspan="4">합계</th><th class="n">${won(c)}</th><th class="n">${won(v)}</th><th class="n ${cls(v - c)}">${pct(c ? (v - c) / c : 0)}</th><th></th></tr>`; }
function renderInstFilter(){
  const cur = $("instFilter").value, list = [...new Set(S.holdings.map(h => h.inst).filter(Boolean))];
  $("instFilter").innerHTML = '<option value="">전체</option>' + list.map(x => `<option${x === cur ? " selected" : ""}>${esc(x)}</option>`).join("");
  $("insts").innerHTML = [...new Set([...SET.INSTITUTIONS, ...list])].map(x => `<option value="${esc(x)}">`).join("");
}

/* ---------- 화면: 수익 분석 ---------- */
function twr(p){ let g = 1; for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], cf = b.c - a.c, den = a.v + cf / 2; if (den > 0) g *= 1 + (b.v - a.v - cf) / den; } return g - 1; }
function renderReturns(c){
  const pts = [...S.snaps].sort((a, b) => a.d.localeCompare(b.d)); if (S.holdings.length) pts.push({ d: "지금", v: c.T.v, c: c.T.c, now: 1 });
  const g = c.T.v - c.T.c, tw = pts.length > 1 ? twr(pts) : null; let ann = null;
  if (tw != null && S.snaps.length) { const days = (Date.parse(today()) - Date.parse(pts[0].d)) / 864e5; if (days >= 180) ann = Math.pow(1 + tw, 365 / days) - 1; }
  const best = S.holdings.slice().sort((a, b) => ret(b) - ret(a))[0];
  $("rkpis").innerHTML = `<div class="kpi"><span>단순 수익률(평가손익÷원금)</span><b class="${cls(g)}">${pct(c.T.c ? g / c.T.c : 0)}</b><span>${short(g)}</span></div>
  <div class="kpi"><span>기간 시간가중수익률</span><b class="${cls(tw || 0)}">${tw == null ? "—" : pct(tw)}</b><span>${pts.length > 1 ? pts[0].d + " 이후" : "기록이 2개 이상 필요"}</span></div>
  <div class="kpi"><span>연환산</span><b class="${cls(ann || 0)}">${ann == null ? "—" : pct(ann)}</b><span>${ann == null ? "180일 이상 기록 시 표시" : "시간가중 기준"}</span></div>
  <div class="kpi"><span>최고 수익 상품</span><b class="${best ? cls(ret(best)) : ""}">${best && best.cost ? pct(ret(best)) : "—"}</b><span>${best ? esc(best.name) : ""}</span></div>`;
  lineDraw.pts = pts; lineDraw();
  $("snapList").innerHTML = S.snaps.length ? '<span class="note">기록:</span>' + [...S.snaps].sort((a, b) => a.d.localeCompare(b.d)).map(s => `<span class="tag" style="padding:4px 4px 4px 8px">${s.d} ${short(s.v)} <button class="x" data-snapdel="${s.d}" aria-label="${s.d} 기록 삭제" style="min-height:24px;padding:0 6px">✕</button></span>`).join("") : "";
  const T = c.T.v, C = 2 * Math.PI * 70; let a = 0, arcs = "";
  ROLES.forEach(r => { const w = T ? c.R[r.k].v / T : 0; if (w > 0) { arcs += `<circle r="70" cx="100" cy="100" fill="none" stroke="${r.c}" stroke-width="34" stroke-dasharray="${w * C} ${C}" stroke-dashoffset="${-a * C}" transform="rotate(-90 100 100)"/>`; a += w; } });
  $("donut").innerHTML = `<circle r="70" cx="100" cy="100" fill="none" stroke="var(--band)" stroke-width="34"/>${arcs}<text x="100" y="96" text-anchor="middle" font-size="13" fill="var(--mute)">총 평가액</text><text x="100" y="117" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ink)">${short(T)}</text>`;
  $("donutLeg").innerHTML = ROLES.map(r => `<div><span class="sw" style="background:${r.c}"></span><span style="flex:1">${esc(r.n)}</span><b>${(T ? c.R[r.k].v / T * 100 : 0).toFixed(1)}%</b></div>`).join("");
  $("byRoleRet").innerHTML = gtable(group(h => h.role), T, true);
  $("byItem").innerHTML = S.holdings.length ? `<table class="stack"><thead><tr><th>상품</th><th>기관 · 계좌</th><th class="n">원금</th><th class="n">평가액</th><th class="n">손익</th><th class="n">수익률</th></tr></thead><tbody>${S.holdings.slice().sort((x, y) => ret(y) - ret(x)).map(h => { const d = h.value - h.cost; return `<tr><td><span class="sw" style="background:${RM[h.role].c};margin-right:6px"></span>${esc(h.name)}</td><td>${esc(h.inst)} · ${esc(h.acct)}</td><td class="n">${short(h.cost)}</td><td class="n">${short(h.value)}</td><td class="n ${cls(d)}">${short(d)}</td><td class="n ${cls(d)}">${pct(ret(h))}</td></tr>`; }).join("")}</tbody></table>` : '<p class="note">자산이 없습니다.</p>';
}
const lineSvg = $("line");
function lineDraw(){
  const s = lineSvg, W = s.clientWidth, H = s.clientHeight, p = lineDraw.pts || []; if (!W || !H) return;
  if (p.length < 2) { s.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--mute)" font-size="14">‘오늘 상태 기록’을 눌러 추이를 쌓아 가세요</text>`; return; }
  const sm = W < 520, L = sm ? 8 : 62, R = sm ? 8 : 16, Tp = 16, B = 30, vals = p.flatMap(x => [x.v, x.c]), lo = Math.min(...vals) * .97, hi = Math.max(...vals) * 1.02;
  const X = i => L + (W - L - R) * i / (p.length - 1), Y = v => Tp + (H - Tp - B) * (1 - (v - lo) / (hi - lo || 1));
  let g = ""; if (!sm) for (let k = 0; k <= 3; k++) { const v = lo + (hi - lo) * k / 3; g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--mute)">${short(v)}</text>`; }
  const step = Math.ceil(p.length / (sm ? 4 : 8));
  p.forEach((x, i) => { if (i % step === 0 || i === p.length - 1) g += `<text x="${X(i)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === p.length - 1 ? "end" : "middle"}" font-size="12" fill="var(--mute)">${x.now ? "지금" : x.d.slice(2).replace(/-/g, ".")}</text>`; });
  const path = k => p.map((x, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(x[k]).toFixed(1)).join(""), last = p[p.length - 1];
  s.innerHTML = g + `<path d="${path("c")}" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="5 4"/><path d="${path("v")}" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${p.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x.v)}" r="${x.now ? 5 : 3}" fill="${x.now ? "var(--acc)" : "var(--ink)"}"/>`).join("")}<text x="${X(p.length - 1) - 8}" y="${Y(last.v) - 10}" text-anchor="end" font-size="13" font-weight="700" fill="var(--ink)">평가액 ${short(last.v)}</text><text x="${X(p.length - 1) - 8}" y="${Y(last.c) + 18}" text-anchor="end" font-size="12" fill="var(--mute)">원금 ${short(last.c)}</text>`;
}
const lineRO = new ResizeObserver(() => lineDraw()); lineRO.observe(lineSvg);

/* ---------- 화면: 목표 비율 ---------- */
function renderTargets(){
  $("tgts").innerHTML = ROLES.map(r => `<div class="tgt"><div><span class="sw" style="background:${r.c};margin-right:8px"></span><b>${esc(r.n)}</b><div class="note">${esc(r.d)}</div></div><input type="number" min="0" max="100" step="0.5" data-t="${r.k}" value="${+S.targets[r.k] || 0}" aria-label="${esc(r.n)} 목표 비율"></div>`).join("");
  const p = presetParts(DEF); $("defName").textContent = p.age + "대 " + p.style + "형"; renderTSum();
}
function renderTSum(){
  const s = RK.reduce((a, k) => a + (+S.targets[k] || 0), 0), sat = +S.targets.sat || 0;
  $("tsum").innerHTML = `<span style="color:${Math.abs(s - 100) < .01 ? "var(--ink)" : "var(--acc)"}">${+s.toFixed(1)}%</span>`;
  $("coreSat").textContent = `코어 ${100 - sat}% · 위성 ${sat}% ` + (sat > 30 ? "— 책은 위성을 20~30% 안에서 제한할 것을 권합니다" : "(권장: 코어 70~80%, 위성 20~30% 이내)");
  segSet("age", S.age); segSet("style", S.style);
}
function segSet(id, v){ document.querySelectorAll("#" + id + " button").forEach(b => b.classList.toggle("on", b.dataset.v === String(v))); }

/* ---------- 전체 그리기 ---------- */
function renderLive(){ const c = calc(); renderTop(c); renderGauge(c); renderPlan(c); renderChecks(c); $("byInst").innerHTML = gtable(group(h => h.inst), c.T.v); $("byAcct").innerHTML = gtable(group(h => h.acct), c.T.v); renderReturns(c); renderHFoot(); }
function renderAll(){ segSet("bandType", S.band.type); segSet("mode", S.mode); $("bandV").value = S.band.v; $("newCash").value = S.newCash || ""; renderInstFilter(); renderHoldings(); renderTargets(); renderLive(); }
function touch(){ if (S.sample) S.sample = false; persist(); }

/* ---------- 이벤트 ---------- */
let liveT = 0; const soon = () => { clearTimeout(liveT); liveT = setTimeout(renderLive, 120); };
$("hbody").addEventListener("input", e => {
  const t = e.target, tr = t.closest("tr"); if (!tr || !t.dataset.k) return;
  const h = S.holdings[+tr.dataset.i], k = t.dataset.k;
  h[k] = (k === "cost" || k === "value") ? Math.max(0, +t.value || 0) : t.value;
  const r = $("r-" + h.id); if (r) { r.textContent = pct(ret(h)); r.className = "n " + cls(ret(h)); }
  touch(); soon();
});
$("hbody").addEventListener("change", e => { if (e.target.dataset.k === "inst") renderInstFilter(); });
$("hbody").addEventListener("click", e => {
  const d = e.target.closest("[data-del]"); if (!d) return;
  const i = +d.dataset.del, h = S.holdings[i]; S.holdings.splice(i, 1); touch(); renderInstFilter(); renderHoldings(); renderLive();
  const bar = document.createElement("div"); bar.className = "warn"; bar.innerHTML = `‘${esc(h.name || "자산")}’ 삭제됨 <button class="x" style="color:var(--acc)">되돌리기</button>`;
  $("undoHost").replaceChildren(bar);
  bar.querySelector("button").onclick = () => { S.holdings.splice(i, 0, h); touch(); renderInstFilter(); renderHoldings(); renderLive(); bar.remove(); };
  setTimeout(() => bar.remove(), 8000);
});
$("addRow").onclick = () => { S.holdings.push({ id: uid(), inst: $("instFilter").value || "", acct: ACCTS[0], name: "", role: "gl", cost: 0, value: 0 }); touch(); renderHoldings(); renderLive(); const ins = $("hbody").querySelectorAll("tr:last-child input"); if (ins[0]) ins[0].focus(); };
$("sortRows").onclick = () => { S.holdings.sort((a, b) => RK.indexOf(a.role) - RK.indexOf(b.role) || b.value - a.value); touch(); renderHoldings(); };
$("instFilter").onchange = renderHoldings;
document.querySelectorAll("#bandType,#mode,#age,#style").forEach(sg => sg.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v;
  if (sg.id === "bandType") { S.band.type = v; S.band.v = v === "abs" ? 5 : 25; $("bandV").value = S.band.v; }
  else if (sg.id === "mode") S.mode = v; else if (sg.id === "age") S.age = v; else S.style = v;
  segSet(sg.id, v); persist(); renderLive();
}));
$("bandV").oninput = e => { S.band.v = Math.max(.5, +e.target.value || 5); persist(); soon(); };
$("newCash").oninput = e => { S.newCash = Math.max(0, +e.target.value || 0); persist(); soon(); };
$("applyPreset").onclick = () => { const k = S.age + S.style; if (!SET.PRESETS[k]) { toast(k + " 프리셋이 settings.js에 없습니다"); return; } S.targets = toT(SET.PRESETS[k]); touch(); renderTargets(); renderLive(); toast(S.age + "대 " + S.style + "형 비율을 적용했습니다"); };
$("tgts").addEventListener("input", e => { const k = e.target.dataset.t; if (!k) return; S.targets[k] = Math.max(0, +e.target.value || 0); touch(); renderTSum(); soon(); });
$("snap").onclick = () => { const c = calc(), d = today(); S.snaps = S.snaps.filter(s => s.d !== d); S.snaps.push({ d, v: c.T.v, c: c.T.c }); touch(); renderLive(); toast(d + " 상태를 기록했습니다"); };
$("snapList").addEventListener("click", e => { const b = e.target.closest("[data-snapdel]"); if (!b) return; S.snaps = S.snaps.filter(s => s.d !== b.dataset.snapdel); touch(); renderLive(); });
function startBlank(){ const keep = S.savedAt; S = blank(); S.savedAt = keep; persist(); renderAll(); }
$("startMine").onclick = () => { startBlank(); location.hash = "holdings"; };
$("loadSample").onclick = $("loadSample2").onclick = () => { S = sample(); persist(); renderAll(); location.hash = "rebalance"; };
$("goManual").onclick = () => { location.hash = "holdings"; $("addRow").click(); };
let armed = 0;
$("clearAll").onclick = e => { if (!armed) { armed = 1; e.target.textContent = "한 번 더 누르면 모두 삭제"; setTimeout(() => { armed = 0; e.target.textContent = "전부 비우기"; }, 4000); return; } armed = 0; e.target.textContent = "전부 비우기"; startBlank(); toast("모두 비웠습니다"); };

/* ---------- 내보내기 ---------- */
function saveFile(name, data, type){ const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
$("dlJson").onclick = () => saveFile("자산관리_백업_" + today() + ".json", JSON.stringify(Object.assign({ app: "jasan", v: 1 }, S), null, 1), "application/json");
$("dlCsv").onclick = () => saveFile("보유자산_" + today() + ".csv", "﻿기관,계좌,상품명,역할,투자원금,평가금액,수익률\n" + S.holdings.map(h => [h.inst, h.acct, h.name, RM[h.role].n, h.cost, h.value, (ret(h) * 100).toFixed(2) + "%"].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n"), "text/csv");
$("dlTpl").onclick = async () => {
  try { await loadXLSX(); } catch (e) { toast("엑셀 도구를 불러오지 못했습니다"); return; }
  const rows = [["증권사", "계좌", "종목명", "분류", "매입금액", "평가금액"], ...(S.holdings.length ? S.holdings.map(h => [h.inst, h.acct, h.name, RM[h.role].n, h.cost, h.value]) : [["미래에셋증권", "연금저축", "전세계주식 ETF", "해외주식", 10000000, 11800000]])];
  const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "자산"); XLSX.writeFile(wb, "자산입력_양식.xlsx");
};
$("importJson").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const o = JSON.parse(t); S = norm(o); S.sample = false; persist(); renderAll(); $("ioMsg").textContent = `가져왔습니다: 자산 ${S.holdings.length}개, 기록 ${S.snaps.length}개`; } catch (er) { $("ioMsg").textContent = "백업 파일 형식이 올바르지 않습니다."; } e.target.value = ""; }); };

/* ---------- Numbers·엑셀 불러오기 ---------- */
let xlsxP = null;
function loadXLSX(){ if (window.XLSX) return Promise.resolve(); if (!xlsxP) xlsxP = new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "xlsx.full.min.js"; sc.onload = res; sc.onerror = () => { xlsxP = null; rej(); }; document.head.append(sc); }); return xlsxP; }
const IM = { wb: null, aoa: [], hdr: 0, map: {}, rows: [], mode: "replace" };
const FIELDS = [["inst", "증권사·기관"], ["acct", "계좌"], ["name", "상품명 *"], ["role", "역할·분류"], ["cost", "투자원금"], ["value", "평가금액"], ["qty", "수량"], ["avg", "매입단가"], ["price", "현재가"]];
const clean = s => String(s ?? "").replace(/\s+/g, "").toLowerCase();
const toNum = v => { if (typeof v === "number") return v; const s = String(v ?? "").replace(/[,\s원₩]/g, "").replace(/^\((.*)\)$/, "-$1"); const n = parseFloat(s); return isFinite(n) ? n : 0; };
function guessRole(...texts){ const t = texts.map(x => String(x || "")).join(" ").toUpperCase(); if (!t.trim()) return "";
  for (const r of ROLES) if (t.replace(/\s/g, "") === r.n.replace(/\s/g, "").toUpperCase()) return r.k;
  for (const [k, words] of SET.ROLE_HINTS) if (RK.includes(k) && words.some(w => t.includes(String(w).toUpperCase()))) return k;
  return ""; }
function guessAcct(t){ t = String(t || "").toUpperCase(); if (!t) return ""; if (t.includes("ISA")) return "ISA"; if (t.includes("IRP")) return "IRP"; if (t.includes("연금")) return "연금저축"; if (/DC|DB|퇴직/.test(t)) return "DC/DB"; if (t.includes("CMA")) return "CMA"; if (/예금|적금/.test(t)) return "예적금"; if (/위탁|일반|종합|주식/.test(t)) return ACCTS[0]; return ACCTS.find(a => a.toUpperCase() === t) || "기타"; }
function findHeader(aoa){
  const words = Object.values(SET.COLUMN_HINTS).flat().map(clean); let best = 0, bi = 0;
  aoa.slice(0, 30).forEach((r, i) => { const sc = (r || []).filter(c => { const s = clean(c); return s && words.some(w => s.includes(w)); }).length; if (sc > best) { best = sc; bi = i; } });
  if (!best) bi = Math.max(0, aoa.findIndex(r => (r || []).filter(c => String(c ?? "").trim()).length >= 2));
  return bi;
}
function autoMap(){
  const head = (IM.aoa[IM.hdr] || []).map(clean), used = new Set(); IM.map = {};
  const order = ["cost", "value", "qty", "avg", "price", "name", "inst", "acct", "role"];
  order.forEach(f => { const words = (SET.COLUMN_HINTS[f] || []).map(clean); let hit = -1;
    words.some(w => { const i = head.findIndex((h, j) => !used.has(j) && h === w); if (i >= 0) { hit = i; return true; } });
    if (hit < 0) words.some(w => { const i = head.findIndex((h, j) => !used.has(j) && h && h.includes(w)); if (i >= 0) { hit = i; return true; } });
    if (hit >= 0) { IM.map[f] = hit; used.add(hit); } });
}
function openImport(){ $("imp").showModal(); }
document.querySelectorAll("[data-open-import]").forEach(b => b.onclick = openImport); $("sampleImport").onclick = openImport;
$("impClose").onclick = () => $("imp").close();
$("impFile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return; $("impMsg").textContent = "파일을 읽는 중…"; $("impStep2").hidden = true;
  try { await loadXLSX(); } catch (er) { $("impMsg").textContent = "엑셀 도구(xlsx.full.min.js)를 불러오지 못했습니다. 깃허브에 이 파일이 올라갔는지 확인하세요."; return; }
  try {
    const buf = await f.arrayBuffer(); IM.wb = XLSX.read(buf, { type: "array", cellDates: true });
    const names = IM.wb.SheetNames.filter(n => { const ws = IM.wb.Sheets[n]; return ws && ws["!ref"]; });
    if (!names.length) throw new Error("빈 파일");
    $("impSheet").innerHTML = names.map(n => `<option>${esc(n)}</option>`).join(""); $("sheetWrap").hidden = names.length < 2;
    loadSheet(names[0]); if (!$("impInstDef").value && !IM.map.inst) $("impInstDef").value = "";
    $("impMsg").textContent = `‘${f.name}’을 읽었습니다. 아래에서 확인 후 불러오세요.`;
  } catch (er) { $("impMsg").innerHTML = "이 파일을 읽지 못했습니다. Numbers에서 <b>파일 → 내보내기 → Excel</b>로 저장한 뒤 그 파일을 올려 주세요. 그래도 안 되면 ‘입력 양식(엑셀) 받기’ 양식에 옮겨 적어 올리세요."; }
  e.target.value = "";
};
function loadSheet(n){
  IM.aoa = XLSX.utils.sheet_to_json(IM.wb.Sheets[n], { header: 1, raw: true, defval: "" }).filter(r => r.some(c => String(c).trim() !== ""));
  IM.hdr = findHeader(IM.aoa); autoMap();
  $("impHdr").innerHTML = IM.aoa.slice(0, 30).map((r, i) => `<option value="${i}"${i === IM.hdr ? " selected" : ""}>${i + 1}행: ${esc(r.filter(c => String(c).trim()).slice(0, 4).join(" · ").slice(0, 40))}</option>`).join("");
  $("hdrWrap").hidden = $("unitWrap").hidden = false; renderMaps(); buildRows();
}
$("impSheet").onchange = e => loadSheet(e.target.value);
$("impHdr").onchange = e => { IM.hdr = +e.target.value; autoMap(); renderMaps(); buildRows(); };
$("impUnit").onchange = buildRows; $("impInstDef").oninput = () => { if (IM.map.inst == null) buildRows(); };
function renderMaps(){
  const head = IM.aoa[IM.hdr] || [], opts = i => '<option value="">(없음)</option>' + head.map((h, j) => `<option value="${j}"${i === j ? " selected" : ""}>${esc(String(h).trim() || "열 " + (j + 1))}</option>`).join("");
  $("impMaps").innerHTML = FIELDS.map(([f, n]) => `<label class="f">${n}<select data-map="${f}">${opts(IM.map[f])}</select></label>`).join("");
  $("impStep2").hidden = false;
}
$("impMaps").addEventListener("change", e => { const f = e.target.dataset.map; if (!f) return; if (e.target.value === "") delete IM.map[f]; else IM.map[f] = +e.target.value; buildRows(); });
function buildRows(){
  const m = IM.map, u = +$("impUnit").value || 1, g = (r, f) => m[f] == null ? "" : r[m[f]];
  IM.rows = IM.aoa.slice(IM.hdr + 1).map(r => {
    const name = String(g(r, "name") ?? "").trim(), qty = toNum(g(r, "qty"));
    let cost = m.cost != null ? toNum(g(r, "cost")) * u : (qty && m.avg != null ? qty * toNum(g(r, "avg")) * u : 0);
    let value = m.value != null ? toNum(g(r, "value")) * u : (qty && m.price != null ? qty * toNum(g(r, "price")) * u : 0);
    if (!value && cost && m.value == null && m.price == null) value = cost;
    const roleTxt = g(r, "role"), role = guessRole(roleTxt) || guessRole(name, g(r, "acct"));
    const total = /^(합계|총계|소계|total|계)$/i.test(name.replace(/\s/g, "")) || /합계|총계|소계/.test(name);
    return { inc: !!name && !total && (value > 0 || cost > 0), inst: String(g(r, "inst") || $("impInstDef").value || "").trim(), acct: guessAcct(g(r, "acct")) || (/업비트|빗썸|코인원|코빗/.test(String(g(r, "inst") || "")) ? "기타" : ACCTS[0]), name, role: role || "", cost: Math.round(cost), value: Math.round(value) };
  }).filter(x => x.name || x.value || x.cost);
  renderPreview();
}
function renderPreview(){
  $("impBody").innerHTML = IM.rows.map((x, i) => `<tr data-i="${i}" class="${x.inc ? "" : "off"}"><td><input type="checkbox" data-f="inc" ${x.inc ? "checked" : ""} aria-label="포함" style="min-height:22px;width:22px"></td><td><input data-f="inst" list="insts" value="${esc(x.inst)}"></td><td><select data-f="acct">${ACCTS.map(a => `<option${a === x.acct ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></td><td><input data-f="name" value="${esc(x.name)}"></td><td><select data-f="role" style="${x.role ? "" : "border-color:var(--acc)"}"><option value="">확인 필요</option>${ROLES.map(r => `<option value="${r.k}"${r.k === x.role ? " selected" : ""}>${esc(r.n)}</option>`).join("")}</select></td><td class="n">${won(x.cost)}</td><td class="n">${won(x.value)}</td></tr>`).join("") || '<tr><td colspan="7" class="note">불러올 행이 없습니다. 머리글 행과 열 연결을 확인하세요.</td></tr>';
  impSum();
}
function impSum(){ const on = IM.rows.filter(x => x.inc), miss = on.filter(x => !x.role).length;
  $("impCount").textContent = `${IM.rows.length}행 중 ${on.length}행 포함`;
  $("impSum").innerHTML = `평가액 합계 <b>${won(on.reduce((a, x) => a + x.value, 0))}</b>` + (miss ? ` · <span style="color:var(--acc)">역할 확인 필요 ${miss}건</span>` : ""); }
$("impBody").addEventListener("input", e => { const tr = e.target.closest("tr"), f = e.target.dataset.f; if (!tr || !f) return; const x = IM.rows[+tr.dataset.i];
  if (f === "inc") { x.inc = e.target.checked; tr.className = x.inc ? "" : "off"; } else { x[f] = e.target.value; if (f === "role") e.target.style.borderColor = x.role ? "" : "var(--acc)"; }
  impSum(); });
$("impMode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; IM.mode = b.dataset.v; segSet("impMode", IM.mode); });
$("impGo").onclick = () => {
  const on = IM.rows.filter(x => x.inc); if (!on.length) { toast("포함된 행이 없습니다"); return; }
  const miss = on.filter(x => !x.role).length;
  if (miss && $("impGo").dataset.ok !== "1") { $("impGo").dataset.ok = "1"; $("impGo").textContent = `역할 미지정 ${miss}건은 ‘유동성’으로 넣고 불러오기`; return; }
  $("impGo").dataset.ok = ""; $("impGo").textContent = "이 내용으로 불러오기";
  const list = on.map(x => ({ id: uid(), inst: x.inst, acct: x.acct, name: x.name, role: x.role || RK[0], cost: x.cost, value: x.value }));
  if (S.sample) { const keep = S.savedAt; S = blank(); S.savedAt = keep; }
  S.holdings = IM.mode === "add" ? S.holdings.concat(list) : list; S.sample = false;
  persist(); renderAll(); $("imp").close(); location.hash = "rebalance";
  toast(`${list.length}개 자산을 불러왔습니다. 목표 비율: ${S.age}대 ${S.style}형`);
};

/* ---------- 구글 드라이브 자동 저장 (매물대장과 같은 방식, drive.file 권한) ---------- */
let token = null, tokenExp = 0, tokenClient = null, fileId = localStorage.getItem("jasan-fileid") || null, syncTimer = 0, syncing = false, lastSync = 0;
function setSync(msg, tone){
  let txt, t, btn = "";
  if (!CONFIG.GOOGLE_CLIENT_ID) { txt = "이 기기에 저장"; t = ""; }
  else if (token) { txt = pend ? "드라이브에 저장 대기 중" : "드라이브에 저장됨" + (lastSync ? " " + new Date(lastSync).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""); t = pend ? "warn" : "ok"; btn = "지금 동기화"; }
  else { const signed = localStorage.getItem("jasan-signed"); txt = pend ? "이 기기에만 저장됨" : "이 기기에 저장"; t = "warn"; btn = signed ? "드라이브 연결" : "구글 로그인"; }
  if (msg) { txt = msg; t = tone || "warn"; }
  $("syncTxt").textContent = txt; $("syncDot").className = "dot " + t; $("authBtn").hidden = !btn; $("authBtn").textContent = btn;
}
function scheduleSync(){ clearTimeout(syncTimer); if (token) syncTimer = setTimeout(sync, 1500); }
function initGoogle(){
  if (!CONFIG.GOOGLE_CLIENT_ID) { setSync(); return; }
  if (!(window.google && google.accounts && google.accounts.oauth2)) { setTimeout(initGoogle, 400); return; }
  tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CONFIG.GOOGLE_CLIENT_ID, scope: "https://www.googleapis.com/auth/drive.file",
    callback: r => { if (r.error) { setSync("로그인하지 못했습니다"); return; } token = r.access_token; tokenExp = Date.now() + (r.expires_in - 60) * 1000; localStorage.setItem("jasan-signed", "1"); sync(); } });
  setSync();
}
$("authBtn").onclick = () => {
  if (!tokenClient) { toast("구글 로그인을 준비하고 있습니다. 잠시 후 다시 누르세요"); return; }
  if (token && Date.now() < tokenExp) { sync(); return; }
  tokenClient.requestAccessToken({ prompt: localStorage.getItem("jasan-signed") ? "" : "consent" });
};
async function gfetch(url, opt = {}){
  if (!token || Date.now() > tokenExp) { token = null; throw { auth: true }; }
  const r = await fetch(url, Object.assign({}, opt, { headers: Object.assign({ Authorization: "Bearer " + token }, opt.headers || {}) }));
  if (r.status === 401) { token = null; throw { auth: true }; }
  if (r.status === 404) throw { notFound: true };
  if (!r.ok) throw new Error("드라이브 오류 " + r.status);
  return r;
}
async function findFile(){ const q = encodeURIComponent(`name='${FILE}' and trashed=false and 'me' in owners`); const j = await (await gfetch(`${DRIVE}/files?q=${q}&spaces=drive&fields=files(id)&orderBy=modifiedTime desc`)).json(); return (j.files && j.files[0] && j.files[0].id) || null; }
async function upload(){
  const body = JSON.stringify({ app: "jasan", version: 1, savedAt: S.savedAt, state: S });
  if (fileId) { await gfetch(`${UPLOAD}/files/${fileId}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body }); return; }
  const bd = "jasan" + Date.now(), meta = { name: FILE, mimeType: "application/json", description: "자산관리 계기판 앱 데이터입니다. 직접 수정하거나 이름을 바꾸지 마세요." };
  const mp = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${bd}--`;
  const j = await (await gfetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + bd }, body: mp })).json();
  fileId = j.id; localStorage.setItem("jasan-fileid", fileId);
}
async function sync(){
  if (!token || syncing) return; syncing = true; setSync("드라이브와 맞추는 중…", "warn");
  try {
    if (!fileId) fileId = await findFile();
    if (fileId) {
      let remote = null;
      try { remote = await (await gfetch(`${DRIVE}/files/${fileId}?alt=media`)).json(); } catch (e) { if (e.notFound) { fileId = null; localStorage.removeItem("jasan-fileid"); } else throw e; }
      const rAt = remote ? (+remote.savedAt || 0) : 0;
      if (remote && remote.state && (S.sample || rAt > (S.savedAt || 0))) {
        // 드라이브 쪽이 더 최신이거나, 지금 화면이 예시 데이터면 드라이브 자료를 씁니다(예시가 내 자료를 덮어쓰지 않게)
        S = norm(remote.state); S.savedAt = rAt; saveLocal(); pend = false; renderAll(); toast("드라이브에 저장된 내 자료를 불러왔습니다");
      } else if (!S.sample && (!remote || (S.savedAt || 0) > rAt)) await upload();
    } else if (!S.sample && (S.holdings.length || S.snaps.length)) await upload();
    pend = false; lastSync = Date.now(); setSync();
  } catch (e) { setSync(e && e.auth ? "다시 로그인해 주세요" : "드라이브 저장 실패 · 이 기기에는 저장됨"); }
  finally { syncing = false; }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && token) sync(); });

/* ---------- 탭 ---------- */
const VIEWS = ["rebalance", "holdings", "returns", "targets"];
function route(){ const h = location.hash.slice(1), v = VIEWS.includes(h) ? h : "rebalance"; VIEWS.forEach(x => $("v-" + x).classList.toggle("on", x === v)); document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + v)); if (v === "returns") requestAnimationFrame(lineDraw); }
addEventListener("hashchange", route);

route(); renderAll(); initGoogle();
if (!window.JASAN_SETTINGS) toast("settings.js를 읽지 못해 기본값으로 실행 중입니다. 따옴표·쉼표를 확인하세요");
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
