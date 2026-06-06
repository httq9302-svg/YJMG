// ============================================================
//  민구 💗 이재 STORY — 메인 로직 (v2)
// ============================================================
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const MOODS = ['😊','🥰','😍','😘','🤗','😌','😴','😋','🥳','😎','😢','😭','😡','🤒','😔','😆'];
const EMOJI_PICK = ['💗','💑','🎂','🎉','✈️','🍽️','🎁','🌸','⭐','📍','🏖️','🎬','☕','🌙','🎵','🍰','🐻','🐰','💍','🥂','🌹','🎀','🎈','🍕'];

let ME = null;
let lastActAt = 0;
const data = { anniversaries: [], bucket: [], diary: [], statuses: [], photos: [], footprints: [], roulette: [] };
let calRef = startOfMonth(new Date());
let selectedDay = null;     // {y,m,d}
let bucketCat = 'travel';

// ---------- 유틸 ----------
function partner(email) {
  const p = (CONFIG.PARTNERS || {})[email];
  return p || { name: email ? email.split('@')[0] : '누군가', emoji: '💗' };
}
function esc(s) { return (s ?? '').toString().replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayYmd() { return ymd(new Date()); }
function markAct() { lastActAt = performance.now(); }
function fromMe() { return performance.now() - lastActAt < 1800; }

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden', 'show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2800);
}

async function write(promise, okMsg) {
  const res = await promise;
  if (res && res.error) { toast('⚠️ ' + (res.error.message || '저장 실패')); return false; }
  if (okMsg) toast(okMsg);
  return true;
}

// ---------- 라이트박스 ----------
function openLightbox(src, cap) {
  $('#lbImg').src = src;
  $('#lbCap').textContent = cap || '';
  $('#lightbox').classList.remove('hidden');
}
$('#lbClose').onclick = () => $('#lightbox').classList.add('hidden');
$('#lightbox').onclick = (e) => { if (e.target.id === 'lightbox') $('#lightbox').classList.add('hidden'); };

// ============================================================
//  업그레이드된 모달 — 필드 타입: text/date/number/textarea/emoji/choice/file/note/searchlinks
// ============================================================
function fieldHtml(f) {
  const lbl = `<label>${esc(f.label || '')}</label>`;
  if (f.type === 'note') return `<div class="field-note">${esc(f.label)}</div>`;
  if (f.type === 'emoji') {
    const list = f.options || EMOJI_PICK;
    const cur = f.value || list[0];
    return `<div class="field">${lbl}<div class="mc-group emoji-group" data-grp="${f.key}">${
      list.map(e => `<button data-val="${esc(e)}" class="${e === cur ? 'sel' : ''}">${e}</button>`).join('')}</div></div>`;
  }
  if (f.type === 'choice') {
    const cur = f.value || (f.options[0] && f.options[0].value);
    return `<div class="field">${lbl}<div class="mc-group choice-group" data-grp="${f.key}">${
      f.options.map(o => `<button data-val="${esc(o.value)}" class="${o.value === cur ? 'sel' : ''}">${esc(o.label)}</button>`).join('')}</div></div>`;
  }
  if (f.type === 'textarea')
    return `<div class="field">${lbl}<textarea data-k="${f.key}" rows="3" placeholder="${esc(f.placeholder||'')}">${esc(f.value||'')}</textarea></div>`;
  if (f.type === 'file')
    return `<div class="field">${lbl}<input data-k="${f.key}" type="file" accept="image/*" /></div>`;
  if (f.type === 'searchlinks')
    return `<div class="field">${lbl}<div class="search-links">${
      f.links.map(l => `<button class="btn-link" data-search="${f.from}" data-url="${esc(l.url)}" data-suffix="${esc(l.suffix||'')}">${esc(l.label)}</button>`).join('')}</div></div>`;
  return `<div class="field">${lbl}<input data-k="${f.key}" type="${f.type||'text'}" placeholder="${esc(f.placeholder||'')}" value="${esc(f.value||'')}" /></div>`;
}

function modal(title, fields) {
  return new Promise((resolve) => {
    const m = $('#modal'), body = $('#modalBody');
    $('#modalTitle').textContent = title;
    body.innerHTML = fields.map(fieldHtml).join('');
    $$('.mc-group', body).forEach(g => $$('button', g).forEach(b => b.onclick = (e) => {
      e.preventDefault(); $$('button', g).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    }));
    $$('[data-search]', body).forEach(b => b.onclick = (e) => {
      e.preventDefault();
      let q = b.dataset.search.split(',')
        .map(k => { const el = body.querySelector(`[data-k="${k}"]`); return el ? el.value.trim() : ''; })
        .filter(Boolean).join(' ');
      if (b.dataset.suffix) q = (q + ' ' + b.dataset.suffix).trim();
      if (!q) return toast('이름을 먼저 적어줘');
      window.open(b.dataset.url + encodeURIComponent(q), '_blank');
    });
    m.classList.remove('hidden');
    const close = (val) => { m.classList.add('hidden'); resolve(val); };
    $('#modalCancel').onclick = () => close(null);
    $('#modalOk').onclick = () => {
      const out = {};
      fields.forEach(f => {
        if (f.type === 'note' || f.type === 'searchlinks') return;
        if (f.type === 'emoji' || f.type === 'choice') {
          const sel = body.querySelector(`[data-grp="${f.key}"] button.sel`);
          out[f.key] = sel ? sel.dataset.val : (f.value || '');
        } else if (f.type === 'file') {
          const el = body.querySelector(`[data-k="${f.key}"]`);
          out[f.key] = el && el.files[0] ? el.files[0] : null;
        } else {
          const el = body.querySelector(`[data-k="${f.key}"]`);
          out[f.key] = el ? el.value.trim() : '';
        }
      });
      close(out);
    };
  });
}
function confirmBox(title) {
  return new Promise((resolve) => {
    const m = $('#modal'), body = $('#modalBody');
    $('#modalTitle').textContent = title;
    body.innerHTML = '';
    m.classList.remove('hidden');
    const close = (v) => { m.classList.add('hidden'); resolve(v); };
    $('#modalCancel').onclick = () => close(false);
    $('#modalOk').onclick = () => close(true);
  });
}

// ============================================================
//  인증
// ============================================================
function idToEmail(v) {
  v = (v || '').trim().toLowerCase();
  if (!v) return '';
  return v.includes('@') ? v : `${v}@${CONFIG.LOGIN_DOMAIN || 'love.com'}`;
}
async function tryAuthMsg(promise, okMsg) {
  $('#loginMsg').textContent = '...';
  const { error } = await promise;
  if (error) { $('#loginMsg').textContent = '⚠️ ' + error.message; return false; }
  if (okMsg) $('#loginMsg').textContent = okMsg;
  return true;
}
$('#loginBtn').onclick = async () => {
  const email = idToEmail($('#loginEmail').value), pw = $('#loginPw').value;
  if (!email || !pw) return ($('#loginMsg').textContent = '아이디와 비밀번호를 입력해줘');
  await tryAuthMsg(DB.signIn(email, pw));
};
$('#signupBtn').onclick = async () => {
  const email = idToEmail($('#loginEmail').value), pw = $('#loginPw').value;
  if (!email || pw.length < 6) return ($('#loginMsg').textContent = '비밀번호는 6자 이상');
  await tryAuthMsg(DB.signUp(email, pw), '가입 완료! 이제 들어가기를 눌러줘 💕');
};
$('#logoutBtn').onclick = async () => { await DB.signOut(); location.reload(); };
DB.onAuth((user) => { if (user) enterApp(user); });

async function enterApp(user) {
  ME = user.email;
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#topTitle').textContent = CONFIG.APP_TITLE || '우리 둘만의 공간';
  $('#topTag').textContent = CONFIG.APP_TAGLINE || '';
  if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch {} }
  buildMoodPickers();
  await loadAll();
  DB.subscribe(onRealtime);
  handleDeepLink();
}

// ============================================================
//  로드 + 렌더
// ============================================================
async function loadAll() {
  const [a, b, d, s, ph, f, r] = await Promise.all([
    DB.anniversaries.list(), DB.bucket.list(), DB.diary.list(),
    DB.status.all(), DB.photos.list(), DB.footprints.list(), DB.roulette.list(),
  ]);
  data.anniversaries = a.data || [];
  data.bucket = b.data || [];
  data.diary = d.data || [];
  data.statuses = s.data || [];
  data.photos = ph.data || [];
  data.footprints = f.data || [];
  data.roulette = r.data || [];
  const errs = [a, b, d, s, ph, f, r].map(x => x.error).filter(Boolean);
  if (errs.some(e => /does not exist|relation|column/i.test(e.message || '')))
    toast('⚠️ DB가 최신이 아니에요. Supabase에서 schema.sql을 다시 실행해줘!');
  else if (errs.length) toast('⚠️ ' + (errs[0].message || '데이터 로드 오류'));
  renderAll();
}
function renderAll() {
  renderDday(); renderMood(); renderUpcoming();
  renderCalendar(); renderBucketTools(); renderBucket(); renderPhotos();
  renderFootprints(); renderDiary();
}

// ============================================================
//  실시간
// ============================================================
const TABLE_LABEL = { anniversaries:'기념일', bucket_items:'버킷', diary_entries:'일기', statuses:'기분', photos:'사진', footprints:'발자취', roulette_options:'룰렛' };
async function onRealtime(table, payload) {
  if (table === 'pokes' && payload.eventType === 'INSERT') {
    if (payload.new.from_email !== ME) notifyPoke(payload.new);
    return;
  }
  await loadAll();
  if (!fromMe()) toast(`💕 ${TABLE_LABEL[table] || ''} 업데이트됐어!`);
}
function notifyPoke(row) {
  const who = partner(row.from_email);
  const msg = `${who.emoji} ${who.name}: ${row.message || '보고싶어!'}`;
  if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('콕! 💗', { body: msg }); } catch {} }
  toast(msg);
  const log = $('#pokeLog');
  if (log) log.insertAdjacentHTML('afterbegin', `<div>💗 ${esc(msg)}</div>`);
}

// ============================================================
//  탭
// ============================================================
function switchTab(go) {
  $$('.tabbtn').forEach(b => b.classList.toggle('active', b.dataset.go === go));
  $$('.tab').forEach(t => t.classList.toggle('hidden', t.dataset.tab !== go));
}
$$('.tabbtn').forEach(btn => btn.onclick = () => switchTab(btn.dataset.go));

// ---------- 하트 애니메이션 ----------
function showHearts() {
  const box = document.createElement('div');
  box.className = 'hearts';
  const emojis = ['💗','💕','💞','💝','🩷','💖'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.className = 'heart';
    s.textContent = emojis[i % emojis.length];
    s.style.left = (5 + Math.random() * 90) + '%';
    s.style.animationDelay = (Math.random() * 0.5) + 's';
    s.style.fontSize = (22 + Math.random() * 24) + 'px';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}

// ---------- NFC / 딥링크 (?go=poke 등) ----------
async function handleDeepLink() {
  const p = new URLSearchParams(location.search);
  const go = p.get('go');
  if (!go) return;
  history.replaceState(null, '', location.pathname); // 새로고침 시 재실행 방지
  if (go === 'poke') {
    switchTab('home');
    await sendPoke(p.get('msg') || '보고싶어! 💗', true);
  } else if (['home','calendar','bucket','memory','diary'].includes(go)) {
    switchTab(go);
  }
}

// ============================================================
//  홈 — D-day
// ============================================================
function renderDday() {
  const start = new Date(CONFIG.ANNIVERSARY_DATE + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const days = Math.floor((now - start) / 86400000) + 1;
  const next100 = (Math.floor((days - 1) / 100) + 1) * 100;
  $('#ddayCard').innerHTML = `
    <div class="dday-label">우리가 함께한 지</div>
    <div class="dday-num">${days > 0 ? days : 0}일</div>
    <div class="dday-sub">💑 ${esc(CONFIG.ANNIVERSARY_DATE)} 부터</div>
    <div class="dday-sub">🎉 ${next100}일까지 ${next100 - days}일 남았어!</div>`;
}

// ============================================================
//  홈 — 기분
// ============================================================
let pickedMood = '😊', diaryMood = '😊';
function buildMoodPickers() {
  const make = (host, onPick) => {
    host.innerHTML = MOODS.map(e => `<button data-e="${e}">${e}</button>`).join('');
    $$('button', host).forEach(b => b.onclick = () => {
      $$('button', host).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); onPick(b.dataset.e);
    });
  };
  make($('#moodPicker'), e => pickedMood = e);
  make($('#diaryMoodPicker'), e => diaryMood = e);
}
function renderMood() {
  const emails = Object.keys(CONFIG.PARTNERS || {});
  const list = emails.length ? emails : data.statuses.map(s => s.user_email);
  $('#moodRow').innerHTML = list.map(email => {
    const p = partner(email), st = data.statuses.find(s => s.user_email === email);
    return `<div class="mood-person">
      <div class="who">${esc(p.emoji)} ${esc(p.name)}</div>
      <div class="emo">${st ? esc(st.mood) : '🫥'}</div>
      <div class="msg">${st ? esc(st.message) : ''}</div></div>`;
  }).join('') || '<div class="empty">설정에서 두 사람을 등록해줘</div>';
}
$('#moodSave').onclick = async () => {
  markAct();
  if (await write(DB.status.set({ user_email: ME, mood: pickedMood, message: $('#moodMsg').value.trim() }), '기분 저장됐어 💗')) await loadAll();
};

// ============================================================
//  홈 — 콕
// ============================================================
function partnerEmail() {
  return Object.keys(CONFIG.PARTNERS || {}).find(e => e !== ME);
}
// 상대 폰으로 ntfy 푸시 (앱 꺼져 있어도 알림)
// JSON 엔드포인트로 보내서 제목·내용 모두 한글/이모지 가능
async function pushPartner(msg) {
  try {
    const topic = (CONFIG.NTFY_TOPIC || {})[partnerEmail()];
    if (!topic) return;
    await fetch(`${CONFIG.NTFY_SERVER || 'https://ntfy.sh'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        title: '💗밍재',
        message: `${partner(ME).name}가 콕! ${msg || '보고싶어 💗'}`,
        tags: ['heart'],
        click: location.origin + location.pathname,
      }),
    });
  } catch (e) {}
}
async function sendPoke(msg, hearts) {
  markAct();
  if (hearts) showHearts();
  await write(DB.poke.send({ from_email: ME, message: msg || '보고싶어! 💗' }), '콕! 보냈어 💗');
  pushPartner(msg);
}
$('#pokeBtn').onclick = () => sendPoke('보고싶어! 💗', true);

// ============================================================
//  홈 — 데이트 추천(룰렛 + 검색 링크)
// ============================================================
let rlCat = 'activity', lastPick = '';
$$('.rl-tab').forEach(b => b.onclick = () => {
  rlCat = b.dataset.rl;
  $$('.rl-tab').forEach(x => x.classList.toggle('active', x === b));
  $('#rouletteResult').textContent = '버튼을 눌러봐!'; $('#recoLinks').innerHTML = '';
});
function rouletteSourceCat() { return rlCat === 'cook' ? 'food' : rlCat; }  // 뭐해먹지는 뭐먹지 목록 공용
$('#rouletteBtn').onclick = () => {
  const opts = data.roulette.filter(o => o.category === rouletteSourceCat());
  if (!opts.length) return toast('항목을 먼저 추가해줘! (아래 항목 관리)');
  const res = $('#rouletteResult'); $('#recoLinks').innerHTML = '';
  let n = 0;
  const spin = setInterval(() => {
    res.textContent = opts[Math.floor((performance.now() + n * 7) % opts.length)].text;
    res.classList.remove('spin'); void res.offsetWidth; res.classList.add('spin');
    if (++n > 14) {
      clearInterval(spin);
      lastPick = opts[Math.floor(performance.now() % opts.length)].text;
      res.textContent = '👉 ' + lastPick;
      renderRecoLinks(rlCat, lastPick);
    }
  }, 80);
};
function renderRecoLinks(cat, q) {
  const enc = encodeURIComponent(q);
  let links;
  if (cat === 'food')
    links = [['🍽️ 다이닝코드', 'https://www.diningcode.com/list.dc?query=' + enc],
             ['🗺️ 네이버지도', 'https://map.naver.com/p/search/' + enc]];
  else if (cat === 'cook')
    links = [['▶️ 유튜브 레시피', 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' 레시피')]];
  else
    links = [['💜 데이트팝', 'https://www.google.com/search?q=' + encodeURIComponent('데이트팝 ' + q)],
             ['🔎 네이버 검색', 'https://search.naver.com/search.naver?query=' + encodeURIComponent('데이트 ' + q)]];
  $('#recoLinks').innerHTML = links.map(([t, u]) => `<a class="btn-link" href="${u}" target="_blank" rel="noopener">${t}</a>`).join('');
}
async function reloadRoulette() { const r = await DB.roulette.list(); data.roulette = r.data || []; }
$('#rouletteManage').onclick = () => manageRoulette();
function manageRoulette() {
  const m = $('#modal'), body = $('#modalBody');
  $('#modalTitle').textContent = '추천 항목 관리';
  const section = (cat, label) => {
    const items = data.roulette.filter(o => o.category === cat);
    return `<div class="list-head">${label}</div>
      <div class="rl-items">${items.map(o => `<span class="rl-chip">${esc(o.text)}<button data-rldel="${o.id}">✕</button></span>`).join('') || '<span class="empty" style="padding:6px 0">없음</span>'}</div>
      <div class="add-row"><input data-rladd="${cat}" placeholder="추가할 항목..." /><button class="btn-small" data-rladdbtn="${cat}">추가</button></div>`;
  };
  const render = () => {
    body.innerHTML = section('activity', '🎡 뭐할까') + section('food', '🍽️ 뭐먹지 (뭐해먹지 공용)');
    $$('[data-rldel]', body).forEach(b => b.onclick = async () => { markAct(); await DB.roulette.remove(+b.dataset.rldel); await reloadRoulette(); render(); });
    $$('[data-rladdbtn]', body).forEach(b => b.onclick = async () => {
      const inp = body.querySelector(`[data-rladd="${b.dataset.rladdbtn}"]`);
      const t = (inp.value || '').trim(); if (!t) return;
      markAct(); await write(DB.roulette.add({ category: b.dataset.rladdbtn, text: t })); await reloadRoulette(); render();
    });
  };
  render();
  m.classList.remove('hidden');
  $('#modalCancel').onclick = () => m.classList.add('hidden');
  $('#modalOk').onclick = () => m.classList.add('hidden');
}

// ============================================================
//  홈 — 다가오는 기념일 (반복 지원)
// ============================================================
function repeatOf(a) { return a.repeat || (a.yearly ? 'yearly' : 'none'); }
function nextOccurrence(a) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(a.date + 'T00:00:00');
  const rep = repeatOf(a);
  if (rep === 'none') return start;
  if (rep === 'weekly') {
    const diff = (start.getDay() - today.getDay() + 7) % 7;
    const d = new Date(today); d.setDate(today.getDate() + diff); return d;
  }
  if (rep === 'monthly') {
    let d = new Date(today.getFullYear(), today.getMonth(), start.getDate());
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
    return d;
  }
  // yearly
  let d = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (d < today) d.setFullYear(today.getFullYear() + 1);
  return d;
}
function renderUpcoming() {
  const today = new Date(); today.setHours(0,0,0,0);
  const items = data.anniversaries.map(a => ({ a, when: nextOccurrence(a) }))
    .filter(x => x.when >= today).sort((x, y) => x.when - y.when).slice(0, 5);
  const host = $('#upcomingList');
  if (!items.length) { host.innerHTML = '<div class="empty">기념일을 추가해봐 📅</div>'; return; }
  host.innerHTML = items.map(({ a, when }) => {
    const dleft = Math.round((when - today) / 86400000);
    return `<div class="upcoming-item"><span class="emo">${esc(a.emoji)}</span>
      <span class="t">${esc(a.title)}</span>
      <span class="d">${dleft === 0 ? '오늘! 🎉' : 'D-' + dleft}</span></div>`;
  }).join('');
}

// ============================================================
//  캘린더
// ============================================================
const REPEAT_LABEL = { none: '', weekly: '매주', monthly: '매월', yearly: '매년' };
$('#calPrev').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1); renderCalendar(); };
$('#calNext').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() + 1, 1); renderCalendar(); };

function annivOnDay(y, m, d) {
  const cell = new Date(y, m, d);
  return data.anniversaries.filter(a => {
    const start = new Date(a.date + 'T00:00:00'); start.setHours(0,0,0,0);
    const rep = repeatOf(a);
    if (rep === 'none') return start.getFullYear() === y && start.getMonth() === m && start.getDate() === d;
    if (cell < start) return false;
    if (rep === 'weekly') return cell.getDay() === start.getDay();
    if (rep === 'monthly') return cell.getDate() === start.getDate();
    return cell.getMonth() === m && start.getMonth() === m && start.getDate() === d; // yearly
  });
}
function renderCalendar() {
  const y = calRef.getFullYear(), m = calRef.getMonth();
  $('#calLabel').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const t = new Date(); t.setHours(0,0,0,0);
  let html = ['일','월','화','수','목','금','토'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += `<div class="cal-cell dim"></div>`;
  for (let d = 1; d <= days; d++) {
    const hits = annivOnDay(y, m, d);
    const isToday = t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
    const isSel = selectedDay && selectedDay.y === y && selectedDay.m === m && selectedDay.d === d;
    html += `<div class="cal-cell ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''} ${hits.length ? 'has' : ''}" data-day="${d}">
      ${hits.length ? `<span class="cal-emoji">${esc(hits[0].emoji)}</span>` : ''}${d}</div>`;
  }
  $('#calGrid').innerHTML = html;
  $$('#calGrid .cal-cell[data-day]').forEach(c => c.onclick = () => { selectedDay = { y, m, d: +c.dataset.day }; renderCalendar(); renderDayPanel(); });

  // 전체 일정
  const list = [...data.anniversaries].sort((a, b) => a.date.localeCompare(b.date));
  $('#annivList').innerHTML = list.length ? list.map(a => `
    <div class="anniv-item"><span class="emo">${esc(a.emoji)}</span>
      <div style="flex:1"><div class="t">${esc(a.title)}</div>
        <div class="date">${esc(a.date)}${repeatOf(a) !== 'none' ? ' · ' + REPEAT_LABEL[repeatOf(a)] : ''}</div></div>
      <button class="del" data-del-anniv="${a.id}">✕</button></div>`).join('') : '<div class="empty">아직 기념일이 없어</div>';
  $$('[data-del-anniv]').forEach(b => b.onclick = async () => { markAct(); await DB.anniversaries.remove(+b.dataset.delAnniv); await loadAll(); });
  renderDayPanel();
}
function renderDayPanel() {
  const panel = $('#calDayPanel');
  if (!selectedDay) { panel.classList.add('hidden'); return; }
  const { y, m, d } = selectedDay;
  const hits = annivOnDay(y, m, d);
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="card-title">${y}.${m + 1}.${d} 일정</div>` +
    (hits.length ? hits.map(a => `<div class="upcoming-item"><span class="emo">${esc(a.emoji)}</span>
      <span class="t">${esc(a.title)}</span>
      <span class="date">${repeatOf(a) !== 'none' ? REPEAT_LABEL[repeatOf(a)] : ''}</span></div>`).join('')
      : '<div class="empty" style="padding:12px">이 날은 일정이 없어</div>') +
    `<button class="btn-ghost" id="dayAdd">+ 이 날 기념일 추가</button>`;
  $('#dayAdd').onclick = () => openAnnivModal(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
}
async function openAnnivModal(presetDate) {
  const v = await modal('기념일 추가', [
    { key: 'title', label: '이름', placeholder: '예: 첫 데이트, 생일' },
    { key: 'date', label: '날짜', type: 'date', value: presetDate || todayYmd() },
    { key: 'emoji', label: '이모지', type: 'emoji', value: '💗' },
    { key: 'repeat', label: '반복', type: 'choice', value: 'none', options: [
      { value: 'none', label: '반복없음' }, { value: 'weekly', label: '매주' },
      { value: 'monthly', label: '매월' }, { value: 'yearly', label: '매년' } ] },
  ]);
  if (v && v.title && v.date) {
    markAct();
    if (await write(DB.anniversaries.add({ title: v.title, date: v.date, emoji: v.emoji || '💗', repeat: v.repeat, yearly: v.repeat === 'yearly' }), '기념일 추가됐어 📅')) await loadAll();
  }
}
$('#addAnnivBtn').onclick = () => openAnnivModal();

// ============================================================
//  버킷리스트
// ============================================================
const BUCKET_LABEL = { travel: '여행', eat: '먹고싶은', buy: '사고싶은', do: '하고싶은' };
$$('#bucketSeg .seg-btn').forEach(b => b.onclick = () => {
  bucketCat = b.dataset.cat;
  $$('#bucketSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
  renderBucketTools(); renderBucket();
});

function renderBucketTools() {
  const host = $('#bucketTools');
  if (bucketCat === 'eat') {
    host.innerHTML = `<div class="search-row">
      <input id="eatSearch" type="text" placeholder="맛집/메뉴 검색어" />
      <div class="search-links">
        <button class="btn-link" data-q="https://www.diningcode.com/list.dc?query=">다이닝코드</button>
        <button class="btn-link" data-q="https://map.naver.com/p/search/">네이버지도</button>
        <button class="btn-link" data-q="https://www.youtube.com/results?search_query=" data-suffix="레시피">유튜브레시피</button>
      </div></div>`;
    $$('#bucketTools .btn-link').forEach(b => b.onclick = () => {
      let q = ($('#eatSearch').value || '').trim();
      if (!q) return toast('검색어를 입력해줘');
      if (b.dataset.suffix) q = q + ' ' + b.dataset.suffix;
      window.open(b.dataset.q + encodeURIComponent(q), '_blank');
    });
  } else host.innerHTML = '';
}

$('#bucketAddBtn').onclick = () => openBucketAdd(bucketCat);
async function openBucketAdd(cat) {
  let fields, build;
  if (cat === 'travel') {
    fields = [
      { key: 'country', label: '국내 / 해외', type: 'choice', value: '국내', options: [{value:'국내',label:'🇰🇷 국내'},{value:'해외',label:'🌏 해외'}] },
      { key: 'region', label: '지역', placeholder: '예: 제주도 / 오사카' },
      { type: 'searchlinks', label: '숙소 찾기 → 링크 복사해서 아래 숙소 링크칸에 붙여넣기', from: 'region', links: [
        { label: '야놀자', url: 'https://www.yanolja.com/search/' },
        { label: '부킹닷컴', url: 'https://www.booking.com/searchresults.ko.html?ss=' },
        { label: '네이버지도', url: 'https://map.naver.com/p/search/', suffix: '숙소' } ] },
      { key: 'url', label: '숙소 링크 (선택)', placeholder: 'https://...' },
      { key: 'want_date', label: '가고싶은 날짜 (선택)', type: 'date' },
    ];
    build = v => ({ category: 'travel', title: v.region || v.country, country: v.country, region: v.region || null, url: v.url || null, want_date: v.want_date || null });
  } else if (cat === 'eat') {
    fields = [
      { key: 'subcat', label: '종류', type: 'choice', value: '한식', options: ['한식','중식','일식','양식','카페','기타'].map(x=>({value:x,label:x})) },
      { key: 'region', label: '지역 (선택)', placeholder: '예: 망우동' },
      { key: 'title', label: '메뉴 / 맛집 이름' },
      { type: 'searchlinks', label: '맛집 찾기 (지역+메뉴로 검색)', from: 'region,title', links: [
        { label: '다이닝코드', url: 'https://www.diningcode.com/list.dc?query=' },
        { label: '네이버지도', url: 'https://map.naver.com/p/search/' } ] },
      { type: 'searchlinks', label: '레시피 찾기', from: 'title', links: [
        { label: '유튜브레시피', url: 'https://www.youtube.com/results?search_query=', suffix: '레시피' } ] },
      { key: 'url', label: '링크 (선택)', placeholder: 'https://...' },
    ];
    build = v => ({ category: 'eat', subcat: v.subcat, region: v.region || null, title: v.title, url: v.url || null });
  } else if (cat === 'buy') {
    fields = [
      { key: 'subcat', label: '종류', type: 'choice', value: '패션', options: ['패션','전자기기','리빙','뷰티','기타'].map(x=>({value:x,label:x})) },
      { key: 'title', label: '사고싶은 것' },
      { key: 'url', label: '링크 (선택)', placeholder: 'https://...' },
    ];
    build = v => ({ category: 'buy', subcat: v.subcat, title: v.title, url: v.url || null });
  } else {
    fields = [
      { key: 'subcat', label: '종류', type: 'choice', value: '액티비티', options: ['액티비티','문화생활','취미','챌린지','기타'].map(x=>({value:x,label:x})) },
      { key: 'title', label: '하고싶은 것' },
      { type: 'searchlinks', label: '데이트 코스 찾기', from: 'title', links: [
        { label: '데이트팝', url: 'https://www.google.com/search?q=', suffix: '데이트팝' },
        { label: '네이버 검색', url: 'https://search.naver.com/search.naver?query=', suffix: '데이트' } ] },
      { key: 'url', label: '링크 (선택)', placeholder: 'https://...' },
    ];
    build = v => ({ category: 'do', subcat: v.subcat, title: v.title, url: v.url || null });
  }
  const v = await modal(`${BUCKET_LABEL[cat]} 추가`, fields);
  if (!v) return;
  const row = build(v);
  if (!row.title) return toast('내용을 입력해줘');
  markAct();
  if (await write(DB.bucket.add({ ...row, created_by: ME }), '추가됐어 ✨')) await loadAll();
}

function renderBucket() {
  const items = data.bucket.filter(i => i.category === bucketCat);
  const host = $('#bucketList');
  host.innerHTML = items.length ? items.map(i => {
    const badges = [];
    if (i.country) badges.push(i.country);
    if (i.region) badges.push(i.region);
    if (i.subcat) badges.push(i.subcat);
    const reg = (i.created_at || '').slice(0, 10);
    return `<div class="bucket-item ${i.done ? 'done' : ''}">
      <div class="check" data-toggle="${i.id}" data-done="${i.done}">${i.done ? '✓' : ''}</div>
      <div class="bcontent">
        <div class="bt">${esc(i.title)}</div>
        <div class="bmeta">
          ${badges.map(b => `<span class="badge">${esc(b)}</span>`).join('')}
          ${i.want_date ? `<span class="badge want">🗓️ ${esc(i.want_date)}</span>` : ''}
          ${i.url ? `<a class="badge link" href="${esc(i.url)}" target="_blank" rel="noopener">🔗 열기</a>` : ''}
        </div>
        <div class="breg">등록 ${esc(reg)}</div>
      </div>
      <button class="del" data-del-bucket="${i.id}">✕</button></div>`;
  }).join('') : '<div class="empty">+ 추가 버튼으로 첫 항목을 넣어봐 ✨</div>';
  const done = items.filter(i => i.done).length;
  $('#bucketProgress').textContent = items.length ? `${done} / ${items.length} 달성 💪` : '';
  $$('[data-toggle]', host).forEach(el => el.onclick = async () => { markAct(); await DB.bucket.toggle(+el.dataset.toggle, !(el.dataset.done === 'true')); await loadAll(); });
  $$('[data-del-bucket]', host).forEach(b => b.onclick = async () => { markAct(); await DB.bucket.remove(+b.dataset.delBucket); await loadAll(); });
}

// ============================================================
//  추억 — 사진첩
// ============================================================
$$('#memSeg .seg-btn').forEach(b => b.onclick = () => {
  const k = b.dataset.mem;
  $$('#memSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
  $('#memPhotos').classList.toggle('hidden', k !== 'photos');
  $('#memFootprints').classList.toggle('hidden', k !== 'footprints');
});

$('#photoInput').onchange = async (e) => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  const v = await modal('사진 정보', [
    { key: 'title', label: '제목', placeholder: '예: 첫 여행 in 제주' },
    { key: 'date', label: '날짜', type: 'date', value: todayYmd() },
  ]);
  if (v === null) return;
  toast('사진 올리는 중... ⏳');
  try {
    const url = await DB.photos.upload(file, ME);
    markAct();
    if (await write(DB.photos.add({ url, title: v.title || '', taken_date: v.date || null, created_by: ME }), '사진 올라갔어 📸')) await loadAll();
  } catch (err) { toast('⚠️ 업로드 실패: ' + err.message); }
};
function renderPhotos() {
  const host = $('#photoGrid');
  host.innerHTML = data.photos.length ? data.photos.map(p => `
    <div class="photo-cell">
      <button class="photo-pin" data-pin-photo="${esc(p.url)}" title="위젯 배경으로">📌</button>
      <button class="photo-del" data-del-photo="${p.id}">✕</button>
      <img class="photo-img" src="${esc(p.url)}" data-lb="${p.id}" />
      ${p.title ? `<div class="cap">${esc(p.title)}</div>` : ''}
      ${p.taken_date ? `<div class="cap-date">${esc(p.taken_date)}</div>` : ''}
    </div>`).join('') : '<div class="empty" style="grid-column:1/-1">첫 사진을 올려봐 📷</div>';
  $$('[data-lb]', host).forEach(img => img.onclick = () => {
    const p = data.photos.find(x => x.id == img.dataset.lb);
    openLightbox(p.url, [p.title, p.taken_date].filter(Boolean).join(' · '));
  });
  $$('[data-pin-photo]', host).forEach(b => b.onclick = async () => {
    markAct(); await write(DB.widget.set(b.dataset.pinPhoto), '위젯 배경으로 설정했어 📌 (위젯은 잠시 뒤 바뀜)');
  });
  $$('[data-del-photo]', host).forEach(b => b.onclick = async () => {
    if (await confirmBox('이 사진을 삭제할까?')) { markAct(); await DB.photos.remove(+b.dataset.delPhoto); await loadAll(); }
  });
}

// ============================================================
//  추억 — 발자취
// ============================================================
$('#addFootBtn').onclick = async () => {
  const v = await modal('발자취 남기기', [
    { key: 'title', label: '무엇을 했어?', placeholder: '예: 한강 피크닉' },
    { key: 'place', label: '어디서? (선택)', placeholder: '예: 여의도 한강공원' },
    { key: 'date', label: '날짜', type: 'date', value: todayYmd() },
    { key: 'emoji', label: '이모지', type: 'emoji', value: '📍' },
    { key: 'note', label: '한마디 (선택)', type: 'textarea', placeholder: '그날의 기억...' },
    { key: 'photo', label: '사진 (선택)', type: 'file' },
  ]);
  if (!v || !v.title) return;
  markAct();
  let photo_url = null;
  if (v.photo) { toast('사진 올리는 중... ⏳'); try { photo_url = await DB.photos.upload(v.photo, ME); } catch (e) { toast('⚠️ 사진 실패: ' + e.message); } }
  if (await write(DB.footprints.add({ title: v.title, place: v.place, date: v.date || todayYmd(), emoji: v.emoji || '📍', note: v.note, photo_url }), '발자취 남겼어 🗺️')) await loadAll();
};
function renderFootprints() {
  const host = $('#footTimeline');
  host.innerHTML = data.footprints.length ? data.footprints.map(f => `
    <div class="tl-item"><div class="tl-card">
      <button class="del tl-del" data-del-foot="${f.id}">✕</button>
      <div class="tl-date">${esc(f.emoji)} ${esc(f.date || '')}</div>
      <div class="tl-title">${esc(f.title)}</div>
      ${f.place ? `<div class="tl-place">📍 ${esc(f.place)}</div>` : ''}
      ${f.note ? `<div class="tl-note">${esc(f.note)}</div>` : ''}
      ${f.photo_url ? `<img class="tl-photo" src="${esc(f.photo_url)}" data-lbf="${f.id}" />` : ''}
    </div></div>`).join('') : '<div class="empty">함께한 순간을 기록해봐 🗺️</div>';
  $$('[data-lbf]', host).forEach(img => img.onclick = () => {
    const f = data.footprints.find(x => x.id == img.dataset.lbf);
    openLightbox(f.photo_url, [f.title, f.date].filter(Boolean).join(' · '));
  });
  $$('[data-del-foot]', host).forEach(b => b.onclick = async () => { markAct(); await DB.footprints.remove(+b.dataset.delFoot); await loadAll(); });
}

// ============================================================
//  일기
// ============================================================
$('#diaryAdd').onclick = async () => {
  const content = $('#diaryInput').value.trim();
  if (!content) return toast('내용을 적어줘 ✍️');
  $('#diaryInput').value = '';
  markAct();
  if (await write(DB.diary.add({ author: ME, mood: diaryMood, content, entry_date: todayYmd() }), '남겼어 💌')) await loadAll();
};
function renderDiary() {
  const host = $('#diaryList');
  host.innerHTML = data.diary.length ? data.diary.map(d => {
    const p = partner(d.author), when = (d.created_at || '').slice(0, 10);
    return `<div class="diary-item"><div class="diary-top">
        <span class="emo">${esc(d.mood)}</span>
        <span class="who">${esc(p.emoji)} ${esc(p.name)}</span>
        <span class="date">${esc(d.entry_date || when)}</span>
        ${d.author === ME ? `<button class="del" data-del-diary="${d.id}">✕</button>` : ''}
      </div><div class="diary-content">${esc(d.content)}</div></div>`;
  }).join('') : '<div class="empty">오늘 하루를 남겨봐 💌</div>';
  $$('[data-del-diary]', host).forEach(b => b.onclick = async () => { markAct(); await DB.diary.remove(+b.dataset.delDiary); await loadAll(); });
}

// ============================================================
//  PWA
// ============================================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
