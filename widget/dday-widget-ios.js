// ============================================================
//  민구 💗 이재 — 아이폰 D-day 위젯 (Scriptable 앱용)
//  사진은 앱 사진첩에서 📌 누르면 자동으로 여기 배경이 바뀜!
//  사용법은 widget/README.md 참고
// ============================================================

// ---- 여기만 바꾸면 됨 -------------------------------------
const ANNIVERSARY = "2026-04-11";                       // 사귄 날
const TITLE       = "민구 💗 이재";                      // 위젯 위쪽 문구
const APP_URL     = "https://httq9302-svg.github.io/YJMG/"; // 위젯 누르면 열릴 앱 주소

// 사진 자동 연동 (앱에서 📌 누른 사진이 배경이 됨)
const SUPABASE_URL  = "https://fxhjbwsogsrbzjgfzrfb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGpid3NvZ3NyYnpqZ2Z6cmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg4NDksImV4cCI6MjA5NjMxNDg0OX0.5Dl5hMMCnT7enGrOahMOiTnBSlvb4b2eoShXfCWw_qg";
const PHOTO_URL_FALLBACK = "";  // 자동 연동이 비어있을 때 쓸 기본 사진(선택)
// -----------------------------------------------------------

const start = new Date(ANNIVERSARY + "T00:00:00");
const now = new Date(); now.setHours(0, 0, 0, 0);
const days = Math.floor((now - start) / 86400000) + 1;
const next100 = (Math.floor((days - 1) / 100) + 1) * 100;
const toNext = next100 - days;

// 앱에서 지정한 위젯 사진 가져오기
async function getWidgetPhoto() {
  try {
    const req = new Request(`${SUPABASE_URL}/rest/v1/widget_config?select=photo_url&id=eq.1`);
    req.headers = { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON };
    const j = await req.loadJSON();
    if (Array.isArray(j) && j[0] && j[0].photo_url) return j[0].photo_url;
  } catch (e) {}
  return PHOTO_URL_FALLBACK;
}

const w = new ListWidget();
w.url = APP_URL;
w.setPadding(16, 16, 16, 16);

const photoUrl = await getWidgetPhoto();
if (photoUrl) {
  try {
    w.backgroundImage = await new Request(photoUrl).loadImage();
    const g = new LinearGradient();
    g.colors = [new Color("#000000", 0.15), new Color("#000000", 0.6)];
    g.locations = [0, 1];
    w.backgroundGradient = g;
  } catch (e) {
    w.backgroundColor = new Color("#ff8fab");
  }
} else {
  const g = new LinearGradient();
  g.colors = [new Color("#ff8fab"), new Color("#ffc4a3")];
  g.locations = [0, 1];
  w.backgroundGradient = g;
}

const t = w.addText(TITLE);
t.font = Font.boldSystemFont(13);
t.textColor = Color.white();

w.addSpacer(6);

const big = w.addText(`${days > 0 ? days : 0}일`);
big.font = Font.boldSystemFont(36);
big.textColor = Color.white();

const sub = w.addText(`🎉 ${next100}일까지 ${toNext}일`);
sub.font = Font.systemFont(11);
sub.textColor = Color.white();
sub.textOpacity = 0.95;

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  w.presentSmall();
}
Script.complete();
