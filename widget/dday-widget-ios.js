// ============================================================
//  민구 💗 이재 — 아이폰 D-day 위젯 (Scriptable 앱용)
//  사용법은 widget/README.md 참고
// ============================================================

// ---- 여기만 바꾸면 됨 -------------------------------------
const ANNIVERSARY = "2026-04-11";                       // 사귄 날
const TITLE       = "민구 💗 이재";                      // 위젯 위쪽 문구
const PHOTO_URL   = "";                                  // 배경 사진 공개 URL (없으면 "")
const APP_URL     = "https://httq9302-svg.github.io/YJMG/"; // 위젯 누르면 열릴 앱 주소
// -----------------------------------------------------------

const start = new Date(ANNIVERSARY + "T00:00:00");
const now = new Date(); now.setHours(0, 0, 0, 0);
const days = Math.floor((now - start) / 86400000) + 1;
const next100 = (Math.floor((days - 1) / 100) + 1) * 100;
const toNext = next100 - days;

const w = new ListWidget();
w.url = APP_URL;
w.setPadding(16, 16, 16, 16);

// 배경: 사진이 있으면 사진 + 어두운 그라데이션, 없으면 핑크 그라데이션
if (PHOTO_URL) {
  try {
    w.backgroundImage = await new Request(PHOTO_URL).loadImage();
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
  w.presentSmall(); // 앱에서 직접 실행 시 미리보기
}
Script.complete();
