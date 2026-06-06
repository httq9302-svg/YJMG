// ============================================================
//  우리 둘만의 공간 — 설정 파일
//  여기 값만 바꾸면 우리 커플에 맞게 세팅됩니다.
// ============================================================

const CONFIG = {
  // --- Supabase 연결 정보 -------------------------------------
  // Supabase 대시보드 > Project Settings > API 에서 복사
  SUPABASE_URL: "https://fxhjbwsogsrbzjgfzrfb.supabase.co",
  SUPABASE_ANON_KEY: "여기에_anon_public_key_를_붙여넣으세요", // eyJ... 로 시작하는 긴 키

  // --- 우리 커플 정보 ----------------------------------------
  // 사귄 날 (YYYY-MM-DD)
  ANNIVERSARY_DATE: "2024-01-01",

  // 두 사람 (이름 + 이모지). 로그인 이메일로 누가 누군지 구분합니다.
  PARTNERS: {
    // "로그인이메일": { name: "표시이름", emoji: "이모지" }
    "me@example.com":      { name: "나",   emoji: "🐰" },
    "you@example.com":     { name: "너",   emoji: "🐻" },
  },

  // 잠금화면 문구
  APP_TITLE: "우리 둘만의 공간",
  APP_SUBTITLE: "💕",
};
