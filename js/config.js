// ============================================================
//  우리 둘만의 공간 — 설정 파일
//  여기 값만 바꾸면 우리 커플에 맞게 세팅됩니다.
// ============================================================

const CONFIG = {
  // --- Supabase 연결 정보 -------------------------------------
  // Supabase 대시보드 > Project Settings > API 에서 복사
  SUPABASE_URL: "https://fxhjbwsogsrbzjgfzrfb.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGpid3NvZ3NyYnpqZ2Z6cmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg4NDksImV4cCI6MjA5NjMxNDg0OX0.5Dl5hMMCnT7enGrOahMOiTnBSlvb4b2eoShXfCWw_qg",

  // --- 우리 커플 정보 ----------------------------------------
  // 사귄 날 (YYYY-MM-DD)
  ANNIVERSARY_DATE: "2026-04-11",

  // 로그인은 "아이디"만 입력 → 자동으로 @LOGIN_DOMAIN 이 붙어 이메일이 됩니다.
  LOGIN_DOMAIN: "love.com",

  // 두 사람 (이름 + 이모지). 키는 "아이디@LOGIN_DOMAIN" 소문자로 적어주세요.
  PARTNERS: {
    // "아이디@도메인": { name: "표시이름", emoji: "이모지" }
    "mg@love.com":  { name: "여보", emoji: "🐻" },
    "yj@love.com":  { name: "자기", emoji: "🐰" },
  },

  // 제목
  APP_TAGLINE: "세상에 하나뿐인",
  APP_TITLE: "민구 💗 이재 STORY",
};
