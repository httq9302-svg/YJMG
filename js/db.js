// ============================================================
//  Supabase 클라이언트 + 데이터 접근 + 실시간 구독
// ============================================================

const sb = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

const DB = {
  // ---------- 인증 ----------
  async getUser() {
    const { data } = await sb.auth.getUser();
    return data?.user ?? null;
  },
  async signIn(email, password) {
    return sb.auth.signInWithPassword({ email, password });
  },
  async signUp(email, password) {
    return sb.auth.signUp({ email, password });
  },
  async signOut() {
    return sb.auth.signOut();
  },
  onAuth(cb) {
    sb.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
  },

  // ---------- 기념일 ----------
  anniversaries: {
    list: () => sb.from('anniversaries').select('*').order('date'),
    add: (row) => sb.from('anniversaries').insert(row),
    remove: (id) => sb.from('anniversaries').delete().eq('id', id),
  },

  // ---------- 버킷리스트 ----------
  bucket: {
    list: () => sb.from('bucket_items').select('*').order('created_at', { ascending: false }),
    add: (row) => sb.from('bucket_items').insert(row),
    toggle: (id, done) =>
      sb.from('bucket_items').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', id),
    remove: (id) => sb.from('bucket_items').delete().eq('id', id),
  },

  // ---------- 일기 ----------
  diary: {
    list: () => sb.from('diary_entries').select('*').order('created_at', { ascending: false }),
    add: (row) => sb.from('diary_entries').insert(row),
    remove: (id) => sb.from('diary_entries').delete().eq('id', id),
  },

  // ---------- 오늘의 기분 ----------
  status: {
    all: () => sb.from('statuses').select('*'),
    set: (row) => sb.from('statuses').upsert({ ...row, updated_at: new Date().toISOString() }),
  },

  // ---------- 콕 찌르기 ----------
  poke: {
    send: (row) => sb.from('pokes').insert(row),
    recent: () => sb.from('pokes').select('*').order('created_at', { ascending: false }).limit(20),
  },

  // ---------- 사진 ----------
  photos: {
    list: () => sb.from('photos').select('*').order('created_at', { ascending: false }),
    add: (row) => sb.from('photos').insert(row),
    remove: (id) => sb.from('photos').delete().eq('id', id),
    async upload(file, email) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const up = await sb.storage.from('photos').upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data } = sb.storage.from('photos').getPublicUrl(path);
      return data.publicUrl;
    },
  },

  // ---------- 발자취 ----------
  footprints: {
    list: () => sb.from('footprints').select('*').order('date', { ascending: false }),
    add: (row) => sb.from('footprints').insert(row),
    remove: (id) => sb.from('footprints').delete().eq('id', id),
  },

  // ---------- 룰렛 ----------
  roulette: {
    list: () => sb.from('roulette_options').select('*'),
    add: (row) => sb.from('roulette_options').insert(row),
    remove: (id) => sb.from('roulette_options').delete().eq('id', id),
  },

  // ---------- 실시간 구독 ----------
  // 모든 테이블 변경을 한 채널로 듣고, 콜백에 (table, payload) 전달
  subscribe(onChange) {
    const tables = ['anniversaries','bucket_items','diary_entries','statuses','pokes','photos','footprints','roulette_options'];
    const ch = sb.channel('couple-realtime');
    tables.forEach((t) => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload) => {
        onChange(t, payload);
      });
    });
    ch.subscribe();
    return ch;
  },
};
