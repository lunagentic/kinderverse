# KinderLab AssetLibrary (번들 일러스트)

Vite가 `client/public/`를 루트로 서빙하므로 여기 파일은 `/assets/...` 로 접근된다.

## 구조
- `frames/` — **BackgroundLayer**: A4 풀페이지 프레임(테마 장식 + 가운데 비움). 권장 비율 A4 세로(210:297).
- `deco/` — **ContentImageLayer / DecorationLayer**: 컷아웃 일러스트(구름·해·물 등, 투명 배경).

## 실제 PNG로 교체하기
1. 보여준 스타일의 PNG를 위 폴더에 넣는다. 예: `frames/summer.png`, `deco/cloud.png`.
2. `client/src/renderer/image/assetManifest.ts`의 매니페스트 경로를 그 파일로 바꾼다(주제→파일 매핑).
   - 같은 파일명으로 교체하면 매니페스트 수정 없이도 동작(현재는 `.svg` 플레이스홀더).
3. 새 주제를 추가하려면 `ASSET_MANIFEST`에 항목 + `KEYWORDS`에 키워드 추가.

현재 `*.svg`는 동작 확인용 플레이스홀더다.
