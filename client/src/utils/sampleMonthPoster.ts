// 크로퍼에 자동으로 띄울 "샘플 월안 포스터"를 캔버스로 그려 dataURL 로 반환한다.
// (사용자가 업로드하지 않아도 바로 영역 선택을 시험할 수 있게. 실제 포스터는 📂 불러오기로 교체)
const TABS = ["#FF6B6B", "#FFB84D", "#FFD93D", "#6BCB77", "#4D96FF"];
const WEEKS = [
  { n: "1주", t: "여름 시작", plays: ["여름 날씨 이야기", "햇볕 그림자 놀이"], cols: ["#7FC9F2", "#FFD27F"] },
  { n: "2주", t: "여름 자연", plays: ["곤충 관찰하기", "여름 꽃 꾸미기"], cols: ["#A8E6A1", "#9FD4FF"] },
  { n: "3주", t: "여름 색", plays: ["물감 번지기 놀이", "시원한 색 그림"], cols: ["#C7A0F5", "#FF9FB0"] },
  { n: "4주", t: "여름 맛", plays: ["수박 화채 만들기", "과일 가게 놀이"], cols: ["#FFB36B", "#FF8A5B"] },
  { n: "5주", t: "여름 이야기", plays: ["그림책 읽기", "경험 나누기"], cols: ["#9FE0D0", "#FFD27F"] },
];

export function sampleMonthPoster(): string {
  const W = 900, H = 1500;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return "";
  x.fillStyle = "#FBEFD6";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#E8862B";
  x.font = "bold 52px sans-serif";
  x.fillText("여름이 왔어요", 40, 80);
  x.fillStyle = "#8a7a5a";
  x.font = "20px sans-serif";
  x.fillText("만 3-5세 · 6월", 44, 114);

  let y = 150;
  const bandH = 258;
  WEEKS.forEach((w, i) => {
    // 흰 밴드 카드
    x.fillStyle = "#ffffff";
    x.fillRect(30, y, W - 60, bandH - 16);
    // 주차 탭
    x.fillStyle = TABS[i];
    x.fillRect(50, y + 18, 86, 38);
    x.fillStyle = "#ffffff";
    x.font = "bold 20px sans-serif";
    x.fillText(w.n, 64, y + 44);
    // 제목
    x.fillStyle = "#C76A2B";
    x.font = "bold 30px sans-serif";
    x.fillText(w.t, 156, y + 47);
    // 놀이명
    x.fillStyle = "#5A4A2E";
    x.font = "18px sans-serif";
    w.plays.forEach((p, k) => x.fillText("· " + p, 56, y + 96 + k * 30));
    // 우측 작품 사진 2장(그라데이션)
    const pw = 180, ph = 160, px0 = W - 60 - (pw * 2 + 20), py = y + 36;
    w.cols.forEach((col, k) => {
      const g = x.createLinearGradient(0, py, 0, py + ph);
      g.addColorStop(0, col);
      g.addColorStop(1, "#ffffff");
      x.fillStyle = g;
      x.fillRect(px0 + k * (pw + 20), py, pw, ph);
    });
    y += bandH;
  });
  return c.toDataURL("image/png");
}
