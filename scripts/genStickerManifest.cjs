// 놀이기록 스티커 에셋 파이프라인 (이름 변경 방식).
// client/public/assets/deco 의 테마형 일러스트(*-IC(*)*.png, 서술형 한글 파일명)는
// 정적 서버가 서빙하지 못하므로(공백·괄호·쉼표·한글), 주제별 servable ASCII 이름(stk-<theme>-<n>.png)으로 rename 한다.
// 누적 방식: 기존 stk-* 는 건드리지 않고, 새로 추가된 IC 파일만 다음 번호로 rename 후 매니페스트 재생성.
// 에셋 추가 후 `node scripts/genStickerManifest.cjs` 재실행하면 새 파일만 정리된다.
const fs = require("fs");
const path = require("path");

const DECO = path.join(__dirname, "..", "client", "public", "assets", "deco");
const OUT = path.join(__dirname, "..", "client", "src", "playrecord", "stickerManifest.ts");

// 파일명 키워드 → 주제 키 (구체적인 것을 먼저). layouts.js THEMES 의 key 와 일치해야 한다.
const RULES = [
  [/겨울|눈사람|썰매|루돌프|펭귄|크리스마스/, "winter"],
  [/교통|자동차|버스|신호|횡단|카시트|경찰|라바콘|바리케이드|불도저|중장비|표지/, "traffic"],
  [/추석|전통|송편|한복|청사초롱|팽이|오곡|차례|보름달|윷/, "chuseok"],
  [/가을|단풍|낙엽|도토리|허수아비|코스모스|감나무/, "autumn"],
  [/공룡|브라키오|스테고|티라노|화석|쥐라기/, "dino"],
  [/모양|도형|삼각형|사각형|육각형|오각형|원형|십자|초승달|정육면체|블록/, "shapes"],
  [/마트|배달|영수증|가격|세일|상품|장바구니|카트|결제|뱃지/, "mart"],
  [/에너지|미디어|카메라|라디오|컴퓨터|모니터|위성|마이크|방송|필름/, "media"],
  [/봄|벚꽃|새싹|개나리|진달래|튤립/, "spring"],
  [/캠핑|모닥불|장작|텐트|정글|야자|열대|마시멜로|그루터기/, "summer"],
  [/여름|물놀이|수박|바다|해변|모래|수영|곤충|꿀벌|개미|잠자리|수국|태양|아이스크림|빙수|선풍기|휴가|날씨/, "summer"],
  [/환경|지구|재활용|식물|나무|숲|자연|꽃/, "eco"],
];
function themeOf(name) {
  const n = name.normalize("NFC");
  for (const [re, key] of RULES) if (re.test(n)) return key;
  return "default";
}
const STK = /^stk-([a-z]+)-(\d+)\.png$/;

const before = fs.readdirSync(DECO);
// 주제별 현재 최대 번호(누적 시작점)
const maxN = {};
for (const f of before) { const mt = f.match(STK); if (mt) maxN[mt[1]] = Math.max(maxN[mt[1]] || 0, +mt[2]); }

// 서빙 불가한 테마형(IC) 원본을 servable 이름으로 rename(누적 번호)
const ic = before.filter((f) => /-IC\(/.test(f.normalize("NFC"))).sort((a, b) => a.normalize("NFC").localeCompare(b.normalize("NFC")));
let renamed = 0;
for (const f of ic) {
  const t = themeOf(f);
  const n = (maxN[t] = (maxN[t] || 0) + 1);
  fs.renameSync(path.join(DECO, f), path.join(DECO, `stk-${t}-${n}.png`));
  renamed++;
}

// 매니페스트는 현재 존재하는 모든 stk-* 로 재생성
const after = fs.readdirSync(DECO);
const grouped = {};
for (const f of after) { const mt = f.match(STK); if (mt) (grouped[mt[1]] = grouped[mt[1]] || []).push([+mt[2], `/assets/deco/${f}`]); }
const manifest = {};
for (const k of Object.keys(grouped).sort()) manifest[k] = grouped[k].sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const ts =
  "// 자동 생성 파일 — 직접 수정 금지. `node scripts/genStickerManifest.cjs` 로 재생성.\n" +
  "// deco 테마형 일러스트를 주제별 servable 이름(stk-*)으로 정리한 결과.\n" +
  "export const STICKER_MANIFEST: Record<string, string[]> = " +
  JSON.stringify(manifest, null, 2) +
  ";\n";
fs.writeFileSync(OUT, ts);

console.log("renamed:", renamed, "themes:", Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, v.length])));
