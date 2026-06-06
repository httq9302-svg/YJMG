// ============================================================
//  우리 둘만의 공간 — 메인 로직
// ============================================================
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const MOODS = ['😊','🥰','😍','😘','🤗','😌','😴','😋','🥳','😎','😢','😭','😡','🤒','😔','😆'];

let ME = null;                 // 로그인한 사용자 email
let lastActAt = 0;             // 내가 방금 행동한 시각(자기 알림 억제용)
const data = {                 // 메모리 캐시
  anniversaries: [], bucket: [], diary: [], statuses: [],
  photos: [], footprints: [], roulette: [],
};
let calRef = startOfMonth(new Date());
let bucketCat = 'travel';

// ---------- 유틸 ----------
function partner(email) {
  const p = (CONFIG.PARTNERS || {})[email];
  if (p) return p;
  return { name: email ? email.split('@')[0] : '누군가', emoji: '💗' };
}
function esc(s) { return (s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayYmd() { return ymd(new Date()); }
function markAct() { lastActAt = performance.now(); }
function fromMe() { return performance.now() - lastActAt < 1800; }

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden'); t.classList.remove('show');
  void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2600);
}

// 간단 모달 (필드 입력) — fields: [{key,label,type,value,placeholder}]
function modal(title, fields) {
  return new Promise((resolve) => {
    const m = $('#modal'), body = $('#modalBody');
    body.innerHTML = `<h3>${esc(title)}</h3>` + fields.map(f => `
      <div class="field">
        <label>${esc(f.label)}</label>
        ${f.type === 'textarea'
          ? `<textarea data-k="${f.key}" rows="3" placeholder="${esc(f.placeholder||'')}">${esc(f.value||'')}</textarea>`
          : `<input data-k="${f.key}" type="${f.type||'text'}" placeholder="${esc(f.placeholder||'')}" value="${esc(f.value||'')}" />`}
      </div>`).join('');
    m.classList.remove('hidden');
    const close = (val) => { m.classList.add('hidden'); resolve(val); };
    $('#modalCancel').onclick = () => close(null);
    $('#modalOk').onclick = () => {
      const out = {};
      $$('[data-k]', body).forEach(el => out[el.dataset.k] = el.value.trim());
      close(out);
    };
  });
}

// ============================================================
//  인증
// ============================================================
async function tryAuthMsg(promise, okMsg) {
  $('#loginMsg').textContent = '...';
  const { error } = await promise;
  if (error) { $('#loginMsg').textContent = '⚠️ ' + error.message; return false; }
  if (okMsg) $('#loginMsg').textContent = okMsg;
  return true;
}

$('#loginBtn').onclick = async () => {
  const email = $('#loginEmail').value.trim(), pw = $('#loginPw').value;
  if (!email || !pw) return ($('#loginMsg').textContent = '이메일과 비밀번호를 입력해줘');
  await tryAuthMsg(DB.signIn(email, pw));
};
$('#signupBtn').onclick = async () => {
  const email = $('#loginEmail').value.trim(), pw = $('#loginPw').value;
  if (!email || pw.length < 6) return ($('#loginMsg').textContent = '비밀번호는 6자 이상');
  if (await tryAuthMsg(DB.signUp(email, pw), '가입 완료! 이제 들어가기를 눌러줘 💕')) {
    // 이메일 인증이 꺼져 있으면 바로 로그인됨
  }
};
$('#logoutBtn').onclick = async () => { await DB.signOut(); location.reload(); };

DB.onAuth((user) => {
  if (user) enterApp(user);
});

async function enterApp(user) {
  ME = user.email;
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#topTitle').textContent = CONFIG.APP_TITLE || '우리 둘만의 공간';
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch {}
  }
  buildMoodPickers();
  await loadAll();
  DB.subscribe(onRealtime);
}

// ============================================================
//  데이터 로드 + 전체 렌더
// ============================================================
async function loadAll() {
  const [a, b, d, s, ph, f, r] = await Promise.all([
    DB.anniversaries.list(), DB.bucket.list(), DB.diary.list(),
    DB.status.all(), DB.photos.list(), DB.footprints.list(), DB.roulette.list(),
  ]);
  data.anniversaries = a.data || [];
  data.bucket        = b.data || [];
  data.diary         = d.data || [];
  data.statuses      = s.data || [];
  data.photos        = ph.data || [];
  data.footprints    = f.data || [];
  data.roulette      = r.data || [];
  renderAll();
}
function renderAll() {
  renderDday(); renderMood(); renderUpcoming();
  renderCalendar(); renderBucket(); renderPhotos();
  renderFootprints(); renderDiary();
}

// ============================================================
//  실시간
// ============================================================
const TABLE_LABEL = {
  anniversaries: '기념일', bucket_items: '버킷리스트', diary_entries: '일기',
  statuses: '기분', photos: '사진', footprints: '발자취', roulette_options: '룰렛',
};
async function onRealtime(table, payload) {
  // 콕 찌르기 → 특별 알림
  if (table === 'pokes' && payload.eventType === 'INSERT') {
    const row = payload.new;
    if (row.from_email !== ME) notifyPoke(row);
    return;
  }
  // 나머지 → 해당 데이터만 다시 불러와서 갱신
  await loadAll();
  if (!fromMe()) toast(`💕 ${TABLE_LABEL[table] || ''} 업데이트됐어!`);
}
function notifyPoke(row) {
  const who = partner(row.from_email);
  const msg = `${who.emoji} ${who.name}: ${row.message || '보고싶어!'}`;
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('콕! 💗', { body: msg }); } catch {}
  }
  toast(msg);
  const log = $('#pokeLog');
  if (log) log.insertAdjacentHTML('afterbegin', `<div>💗 ${esc(msg)}</div>`);
}

// ============================================================
//  탭 네비게이션
// ============================================================
$$('.tabbtn').forEach(btn => btn.onclick = () => {
  const go = btn.dataset.go;
  $$('.tabbtn').forEach(b => b.classList.toggle('active', b === btn));
  $$('.tab').forEach(t => t.classList.toggle('hidden', t.dataset.tab !== go));
});

// ============================================================
//  홈 — D-day
// ============================================================
function renderDday() {
  const start = new Date(CONFIG.ANNIVERSARY_DATE + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const days = Math.floor((now - start) / 86400000) + 1;
  const card = $('#ddayCard');
  // 다음 100일 단위
  const next100 = (Math.floor((days-1) / 100) + 1) * 100;
  const toNext = next100 - days;
  card.innerHTML = `
    <div class="dday-label">우리가 함께한 지</div>
    <div class="dday-num">${days > 0 ? days : 0}일</div>
    <div class="dday-sub">💑 ${CONFIG.ANNIVERSARY_DATE} 부터</div>
    <div class="dday-sub">🎉 ${next100}일까지 ${toNext}일 남았어!</div>`;
}

// ============================================================
//  홈 — 오늘의 기분
// ============================================================
let pickedMood = '😊';
function buildMoodPickers() {
  const make = (host, onPick) => {
    host.innerHTML = MOODS.map(e => `<button data-e="${e}">${e}</button>`).join('');
    $$('button', host).forEach(b => b.onclick = () => {
      $$('button', host).forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); onPick(b.dataset.e);
    });
  };
  make($('#moodPicker'), e => pickedMood = e);
  make($('#diaryMoodPicker'), e => diaryMood = e);
}
function renderMood() {
  const emails = Object.keys(CONFIG.PARTNERS || {});
  // 설정에 없으면 현재 저장된 사람들로
  const list = emails.length ? emails : data.statuses.map(s => s.user_email);
  const row = $('#moodRow');
  row.innerHTML = list.map(email => {
    const p = partner(email);
    const st = data.statuses.find(s => s.user_email === email);
    return `<div class="mood-person">
      <div class="who">${esc(p.emoji)} ${esc(p.name)}</div>
      <div class="emo">${st ? esc(st.mood) : '🫥'}</div>
      <div class="msg">${st ? esc(st.message) : ''}</div>
    </div>`;
  }).join('') || '<div class="empty">설정에서 두 사람을 등록해줘</div>';
}
$('#moodSave').onclick = async () => {
  markAct();
  await DB.status.set({ user_email: ME, mood: pickedMood, message: $('#moodMsg').value.trim() });
  toast('기분 저장됐어 💗'); await loadAll();
};

// ============================================================
//  홈 — 콕 찌르기
// ============================================================
$('#pokeBtn').onclick = async () => {
  markAct();
  await DB.poke.send({ from_email: ME, message: '보고싶어! 💗' });
  toast('콕! 보냈어 💗');
};

// ============================================================
//  홈 — 데이트 룰렛
// ============================================================
let rlCat = 'activity';
$$('.rl-tab').forEach(b => b.onclick = () => {
  rlCat = b.dataset.rl;
  $$('.rl-tab').forEach(x => x.classList.toggle('active', x === b));
  $('#rouletteResult').textContent = '버튼을 눌러봐!';
});
$('#rouletteBtn').onclick = () => {
  const opts = data.roulette.filter(o => o.category === rlCat);
  if (!opts.length) return toast('항목을 먼저 추가해줘!');
  const res = $('#rouletteResult');
  let n = 0;
  const spin = setInterval(() => {
    res.textContent = opts[Math.floor((performance.now() + n) % opts.length)].text;
    res.classList.remove('spin'); void res.offsetWidth; res.classList.add('spin');
    if (++n > 14) {
      clearInterval(spin);
      const pick = opts[Math.floor((performance.now()) % opts.length)];
      res.textContent = '👉 ' + pick.text;
    }
  }, 80);
};
$('#rouletteManage').onclick = async () => {
  const v = await modal('룰렛 항목 추가', [{ key: 'text', label: rlCat === 'food' ? '먹을거' : '놀거리', placeholder: '예: 떡볶이' }]);
  if (v && v.text) { markAct(); await DB.roulette.add({ category: rlCat, text: v.text }); toast('추가됐어!'); await loadAll(); }
};

// ============================================================
//  홈 — 다가오는 기념일
// ============================================================
function nextOccurrence(a) {
  const today = new Date(); today.setHours(0,0,0,0);
  let d = new Date(a.date + 'T00:00:00');
  if (a.yearly) {
    d = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (d < today) d.setFullYear(today.getFullYear() + 1);
  }
  return d;
}
function renderUpcoming() {
  const today = new Date(); today.setHours(0,0,0,0);
  const items = data.anniversaries
    .map(a => ({ a, when: nextOccurrence(a) }))
    .filter(x => x.when >= today)
    .sort((x, y) => x.when - y.when)
    .slice(0, 5);
  const host = $('#upcomingList');
  if (!items.length) { host.innerHTML = '<div class="empty">기념일을 추가해봐 📅</div>'; return; }
  host.innerHTML = items.map(({ a, when }) => {
    const dleft = Math.round((when - today) / 86400000);
    return `<div class="upcoming-item">
      <span class="emo">${esc(a.emoji)}</span>
      <span class="t">${esc(a.title)}</span>
      <span class="d">${dleft === 0 ? '오늘! 🎉' : 'D-' + dleft}</span>
    </div>`;
  }).join('');
}

// ============================================================
//  캘린더
// ============================================================
$('#calPrev').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1); renderCalendar(); };
$('#calNext').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() + 1, 1); renderCalendar(); };

function annivOnDay(y, m, d) {
  return data.anniversaries.filter(a => {
    const ad = new Date(a.date + 'T00:00:00');
    if (a.yearly) return ad.getMonth() === m && ad.getDate() === d;
    return ad.getFullYear() === y && ad.getMonth() === m && ad.getDate() === d;
  });
}
function renderCalendar() {
  const y = calRef.getFullYear(), m = calRef.getMonth();
  $('#calLabel').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const t = new Date(); t.setHours(0,0,0,0);
  const dow = ['일','월','화','수','목','금','토'];
  let html = dow.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += `<div class="cal-cell dim"></div>`;
  for (let d = 1; d <= days; d++) {
    const hits = annivOnDay(y, m, d);
    const isToday = t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
    html += `<div class="cal-cell ${isToday ? 'today' : ''} ${hits.length ? 'has' : ''}">
      ${hits.length ? `<span class="cal-emoji">${esc(hits[0].emoji)}</span>` : ''}${d}</div>`;
  }
  $('#calGrid').innerHTML = html;

  // 목록
  const list = [...data.anniversaries].sort((a, b) => a.date.localeCompare(b.date));
  $('#annivList').innerHTML = list.length ? list.map(a => `
    <div class="anniv-item">
      <span class="emo">${esc(a.emoji)}</span>
      <div style="flex:1">
        <div class="t">${esc(a.title)}</div>
        <div class="date">${esc(a.date)}${a.yearly ? ' · 매년' : ''}</div>
      </div>
      <button class="del" data-del-anniv="${a.id}">✕</button>
    </div>`).join('') : '<div class="empty">아직 기념일이 없어</div>';
  $$('[data-del-anniv]').forEach(b => b.onclick = async () => {
    markAct(); await DB.anniversaries.remove(+b.dataset.delAnniv); await loadAll();
  });
}
$('#addAnnivBtn').onclick = async () => {
  const v = await modal('기념일 추가', [
    { key: 'title', label: '이름', placeholder: '예: 첫 데이트, 생일' },
    { key: 'date', label: '날짜', type: 'date', value: todayYmd() },
    { key: 'emoji', label: '이모지', value: '💗' },
    { key: 'yearly', label: '매년 반복? (y / n)', value: 'n' },
  ]);
  if (v && v.title && v.date) {
    markAct();
    await DB.anniversaries.add({ title: v.title, date: v.date, emoji: v.emoji || '💗', yearly: /^y/i.test(v.yearly) });
    toast('기념일 추가됐어 📅'); await loadAll();
  }
};

// ============================================================
//  버킷리스트
// ============================================================
$$('#bucketSeg .seg-btn').forEach(b => b.onclick = () => {
  bucketCat = b.dataset.cat;
  $$('#bucketSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
  renderBucket();
});
$('#bucketAdd').onclick = addBucket;
$('#bucketInput').addEventListener('keydown', e => { if (e.key === 'Enter') addBucket(); });
async function addBucket() {
  const title = $('#bucketInput').value.trim();
  if (!title) return;
  $('#bucketInput').value = '';
  markAct();
  await DB.bucket.add({ category: bucketCat, title, created_by: ME });
  await loadAll();
}
function renderBucket() {
  const items = data.bucket.filter(i => i.category === bucketCat);
  const host = $('#bucketList');
  host.innerHTML = items.length ? items.map(i => `
    <div class="bucket-item ${i.done ? 'done' : ''}">
      <div class="check" data-toggle="${i.id}" data-done="${i.done}">${i.done ? '✓' : ''}</div>
      <div class="bt">${esc(i.title)}</div>
      <button class="del" data-del-bucket="${i.id}">✕</button>
    </div>`).join('') : '<div class="empty">첫 항목을 추가해봐 ✨</div>';
  const done = items.filter(i => i.done).length;
  $('#bucketProgress').textContent = items.length ? `${done} / ${items.length} 달성 💪` : '';
  $$('[data-toggle]', host).forEach(el => el.onclick = async () => {
    markAct(); await DB.bucket.toggle(+el.dataset.toggle, !(el.dataset.done === 'true')); await loadAll();
  });
  $$('[data-del-bucket]', host).forEach(b => b.onclick = async () => {
    markAct(); await DB.bucket.remove(+b.dataset.delBucket); await loadAll();
  });
}

// ============================================================
//  추억 — 사진첩 / 발자취
// ============================================================
$$('#memSeg .seg-btn').forEach(b => b.onclick = () => {
  const k = b.dataset.mem;
  $$('#memSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
  $('#memPhotos').classList.toggle('hidden', k !== 'photos');
  $('#memFootprints').classList.toggle('hidden', k !== 'footprints');
});

$('#photoInput').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  toast('사진 올리는 중... ⏳');
  try {
    const url = await DB.photos.upload(file, ME);
    markAct();
    await DB.photos.add({ url, created_by: ME });
    toast('사진 올라갔어 📸'); await loadAll();
  } catch (err) { toast('⚠️ 업로드 실패: ' + err.message); }
  e.target.value = '';
};
function renderPhotos() {
  const host = $('#photoGrid');
  host.innerHTML = data.photos.length ? data.photos.map(p => `
    <div class="photo-cell">
      <img src="${esc(p.url)}" data-del-photo="${p.id}" />
    </div>`).join('') : '<div class="empty" style="grid-column:1/-1">첫 사진을 올려봐 📷</div>';
  $$('[data-del-photo]', host).forEach(img => img.onclick = async () => {
    const v = await modal('이 사진을 삭제할까?', []);
    if (v !== null) { markAct(); await DB.photos.remove(+img.dataset.delPhoto); await loadAll(); }
  });
}

$('#addFootBtn').onclick = async () => {
  const v = await modal('발자취 남기기', [
    { key: 'title', label: '무엇을 했어?', placeholder: '예: 한강 피크닉' },
    { key: 'place', label: '어디서?', placeholder: '예: 여의도 한강공원' },
    { key: 'date', label: '날짜', type: 'date', value: todayYmd() },
    { key: 'emoji', label: '이모지', value: '📍' },
    { key: 'note', label: '한마디', type: 'textarea', placeholder: '그날의 기억...' },
  ]);
  if (v && v.title) {
    markAct();
    await DB.footprints.add({ title: v.title, place: v.place, date: v.date || todayYmd(), emoji: v.emoji || '📍', note: v.note });
    toast('발자취 남겼어 🗺️'); await loadAll();
  }
};
function renderFootprints() {
  const host = $('#footTimeline');
  host.innerHTML = data.footprints.length ? data.footprints.map(f => `
    <div class="tl-item">
      <div class="tl-card">
        <div class="tl-date">${esc(f.emoji)} ${esc(f.date || '')}</div>
        <div class="tl-title">${esc(f.title)}</div>
        ${f.place ? `<div class="tl-place">📍 ${esc(f.place)}</div>` : ''}
        ${f.note ? `<div class="tl-note">${esc(f.note)}</div>` : ''}
        <button class="del" data-del-foot="${f.id}" style="float:right;margin-top:-22px">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">함께한 순간을 기록해봐 🗺️</div>';
  $$('[data-del-foot]', host).forEach(b => b.onclick = async () => {
    markAct(); await DB.footprints.remove(+b.dataset.delFoot); await loadAll();
  });
}

// ============================================================
//  일기
// ============================================================
let diaryMood = '😊';
$('#diaryAdd').onclick = async () => {
  const content = $('#diaryInput').value.trim();
  if (!content) return toast('내용을 적어줘 ✍️');
  $('#diaryInput').value = '';
  markAct();
  await DB.diary.add({ author: ME, mood: diaryMood, content, entry_date: todayYmd() });
  toast('남겼어 💌'); await loadAll();
};
function renderDiary() {
  const host = $('#diaryList');
  host.innerHTML = data.diary.length ? data.diary.map(d => {
    const p = partner(d.author);
    const when = (d.created_at || '').slice(0, 10);
    return `<div class="diary-item">
      <div class="diary-top">
        <span class="emo">${esc(d.mood)}</span>
        <span class="who">${esc(p.emoji)} ${esc(p.name)}</span>
        <span class="date">${esc(d.entry_date || when)}</span>
        ${d.author === ME ? `<button class="del" data-del-diary="${d.id}">✕</button>` : ''}
      </div>
      <div class="diary-content">${esc(d.content)}</div>
    </div>`;
  }).join('') : '<div class="empty">오늘 하루를 남겨봐 💌</div>';
  $$('[data-del-diary]', host).forEach(b => b.onclick = async () => {
    markAct(); await DB.diary.remove(+b.dataset.delDiary); await loadAll();
  });
}

// ============================================================
//  PWA 서비스워커
// ============================================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
