# 우리 둘만의 공간 💕

둘만을 위한 작은 커플 웹앱. 모바일 전용 · Supabase 실시간 동기화 · GitHub Pages 무료 배포.

## 기능
- 🏠 **홈** — D-day(함께한 날) · 오늘의 기분 공유 · 콕 찌르기(보고싶어 알림) · 데이트 룰렛
- 📅 **캘린더** — 기념일 달력 + D-day 알림 (매년 반복 지원)
- 🪣 **버킷리스트** — 여행 / 먹고싶은 / 사고싶은 / 하고싶은 카테고리
- 📸 **추억** — 사진첩 + 발자취 타임라인
- 💌 **일기** — 한줄일기/편지, 그날의 기분과 함께
- 🔔 한 명이 수정하면 상대 화면에 **실시간 반영 + 알림**

---

## 세팅 (3단계)

### 1) Supabase 준비
1. [supabase.com](https://supabase.com) 프로젝트 > **SQL Editor** 에 [`sql/schema.sql`](sql/schema.sql) 전체를 붙여넣고 **RUN**
   - 테이블 · 권한(RLS) · 실시간 · 룰렛 기본값 · 사진 저장소가 한 번에 생성됩니다.
2. **Authentication > Providers > Email** 켜기. (테스트 편하게 하려면 *Confirm email* 을 잠시 꺼두면 가입 즉시 로그인됩니다)
3. **Project Settings > API** 에서 `Project URL` 과 `anon public` 키 복사.

### 2) 설정 파일 채우기 — [`js/config.js`](js/config.js)
```js
SUPABASE_URL: "https://....supabase.co",
SUPABASE_ANON_KEY: "eyJ...",        // anon public 키
ANNIVERSARY_DATE: "2024-01-01",      // 사귄 날
PARTNERS: {
  "내이메일@example.com":  { name: "나", emoji: "🐰" },
  "너이메일@example.com":  { name: "너", emoji: "🐻" },
},
```
> ⚠️ `PARTNERS` 의 이메일 = 앱에서 회원가입할 때 쓸 이메일과 똑같이 맞춰주세요.

### 3) 배포 (GitHub Pages)
1. 이 저장소에 push.
2. GitHub 저장소 > **Settings > Pages > Source: Deploy from a branch** → `main` / `(root)` 선택.
3. 몇 분 뒤 `https://<아이디>.github.io/YJMG/` 주소가 생깁니다. 둘 다 폰에서 접속!
4. 처음엔 **회원가입**(둘이 각자), 그다음부터 **들어가기**.
5. 폰 브라우저에서 *홈 화면에 추가* 하면 앱처럼 쓸 수 있어요.

---

## 로컬에서 미리 보기
```bash
# 정적 서버 아무거나
npx serve .
# 또는
python -m http.server 8000
```
브라우저에서 열어 확인.

## 메모
- 사이트는 공개지만, 데이터는 **로그인한 두 사람만** 읽고 쓸 수 있어요(Supabase RLS).
- 앱이 꺼져 있을 때 오는 푸시 알림은 다음 버전에서 추가 예정 (현재는 앱이 켜져 있을 때 실시간 알림).
