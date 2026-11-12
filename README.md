# 술로그

마신 술(위스키, 와인, 사케, 막걸리, 전통주, 바이주, 꼬냑 등)을 사진·장소(지도)·향·경험·가격·시간과 함께 기록하는 모바일 웹앱.

- 호스팅: GitHub Pages (`main` 브랜치, 루트)
- 로그인/DB: Firebase Auth(구글) + Firestore — flashcard 와 같은 프로젝트(`flashcard-1476f`)
- 지도: Leaflet + OpenStreetMap/CARTO 타일, 주소 검색은 Nominatim

## 데이터
- `drinks/{OWNER_UID}/logs/{id}` 기록 한 건 (사진 썸네일 포함)
- `drinks/{OWNER_UID}/photos/{id}` 원본 사진 (JPEG data URL, 1 MiB 이하로 줄여 저장)

누구나 읽을 수 있고, 쓰기는 `firebase-config.js` 의 `OWNER_UID` 계정만 가능하다.

## 처음 설정
1. Firebase 콘솔 → Firestore → 규칙에 `firestore.rules` 내용을 통째로 붙여 넣고 게시 (flashcard 규칙도 들어 있음).
2. 저장소 Settings → Pages → Source: `main` / `/ (root)`.

주종을 추가하거나 추천 향 태그를 바꾸려면 `categories.js` 만 고치면 된다.
