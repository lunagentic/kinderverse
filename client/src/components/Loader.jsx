import Lottie from "lottie-react";
import loaderData from "../assets/loader.json";

// 귀여운 바운싱 도트 로딩 (Lottie)
export default function Loader({ width = 150, label, sub }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        textAlign: "center",
      }}
    >
      <Lottie
        animationData={loaderData}
        loop
        autoplay
        style={{ width, height: width * 0.42 }}
      />
      {label && <div style={{ fontWeight: 800, fontSize: 14, color: "#a24e6b" }}>{label}</div>}
      {sub && <div style={{ fontSize: 11, color: "#8a8392", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
