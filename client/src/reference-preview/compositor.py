#!/usr/bin/env python3
# Reference Preview compositor — Render Spec(JSON) → PNG.
# usage: python compositor.py <spec.json> <public_dir> <out.png>
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

try:
    import numpy as np
except Exception:
    np = None


def cutout(im_rgba, tol=46):
    """가장자리 flood-fill 누끼 — 밝은/균일 배경을 투명화 (removeBackground.ts 와 동일 개념)."""
    rgb = im_rgba.convert("RGB")
    w, h = rgb.size
    SEED = (255, 0, 255)
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        try:
            ImageDraw.floodfill(rgb, s, SEED, thresh=tol)
        except Exception:
            pass
    out = im_rgba.copy()
    if np is not None:
        arr = np.array(rgb)
        mask = (arr[:, :, 0] == 255) & (arr[:, :, 1] == 0) & (arr[:, :, 2] == 255)
        a = np.array(out)
        if mask.mean() < 0.985:  # 거의 전부 지워지면(=피사체가 가장자리) 원본 유지
            a[mask, 3] = 0
            out = Image.fromarray(a, "RGBA")
    return out

spec_path, public_dir, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
spec = json.load(open(spec_path, encoding="utf-8"))
W, H = int(spec["width"]), int(spec["height"])

FONT_PATHS = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]

# Theme Design System 폰트 (client/public/fonts) — fontFamily/weight 기준 매핑
FONTS_DIR = os.path.join(public_dir, "fonts")


def hex2rgba(h, a=255):
    h = (h or "#FFFFFF").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def resolve_font_file(family, weight):
    fam = (family or "").lower()
    # 제목 계열 (ONE Mobile POP → Black Han Sans → Jua)
    if any(k in fam for k in ("one mobile", "pop", "black han", "jua")):
        for f in ("ONEMobilePOP.ttf", "BlackHanSans-Regular.ttf", "Jua-Regular.ttf"):
            p = os.path.join(FONTS_DIR, f)
            if os.path.exists(p):
                return p
    # 본문 계열 (SUIT / Pretendard)
    if any(k in fam for k in ("suit", "pretendard")) or not fam:
        wt = "ExtraBold" if weight >= 800 else ("Bold" if weight >= 600 else "Regular")
        for f in (f"SUIT-{wt}.ttf", "SUIT-Bold.ttf", "SUIT-Regular.ttf"):
            p = os.path.join(FONTS_DIR, f)
            if os.path.exists(p):
                return p
    return None


def load_font(size, family=None, weight=400):
    f = resolve_font_file(family, weight)
    if f:
        try:
            return ImageFont.truetype(f, int(size))
        except Exception:
            pass
    for p in FONT_PATHS:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, int(size))
            except Exception:
                pass
    return ImageFont.load_default()


canvas = Image.new("RGBA", (W, H), hex2rgba(spec.get("background", "#FFFFFF")))
draw = ImageDraw.Draw(canvas)


def draw_text(d, op):
    size = int(op["size"])
    color = hex2rgba(op["color"])
    font = load_font(size, op.get("fontFamily"), int(op.get("weight", 400)))
    x, y, w, h = op["x"], op["y"], op["w"], op["h"]
    # CJK 친화 char 단위 줄바꿈
    lines, cur = [], ""
    for ch in op["text"]:
        if ch == "\n":
            lines.append(cur); cur = ""; continue
        test = cur + ch
        if d.textlength(test, font=font) <= w or not cur:
            cur = test
        else:
            lines.append(cur); cur = ch
    if cur:
        lines.append(cur)
    line_h = int(size * 1.3)
    ty = y + max(0, (h - line_h * len(lines)) // 2)
    for ln in lines:
        lw = d.textlength(ln, font=font)
        if op["align"] == "center":
            tx = x + (w - lw) / 2
        elif op["align"] == "right":
            tx = x + w - lw
        else:
            tx = x
        d.text((tx, ty), ln, font=font, fill=color)
        ty += line_h


for op in spec["ops"]:
    t = op["op"]
    if t == "fill":
        draw.rectangle([0, 0, W, H], fill=hex2rgba(op["color"]))
    elif t == "rect":
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        fill = hex2rgba(op.get("fill", "#FFFFFF"), int(255 * float(op.get("opacity", 1))))
        box = [op["x"], op["y"], op["x"] + op["w"], op["y"] + op["h"]]
        rad = int(op.get("radius", 0))
        if rad > 0:
            od.rounded_rectangle(box, radius=rad, fill=fill)
        else:
            od.rectangle(box, fill=fill)
        canvas = Image.alpha_composite(canvas, overlay)
        draw = ImageDraw.Draw(canvas)
    elif t == "image":
        path = os.path.join(public_dir, op["path"].lstrip("/"))
        if os.path.exists(path):
            im = Image.open(path).convert("RGBA")
            tw, th = int(op["w"]), int(op["h"])
            if not op.get("cover"):
                im = cutout(im)  # 스티커/장식 누끼 (배경 cover 이미지는 제외)
            if op.get("cover"):
                # 풀블리드: 프레임을 가득 채우도록 확대 후 가운데 crop
                scale = max(tw / im.width, th / im.height)
                im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))))
                left = (im.width - tw) // 2
                top = (im.height - th) // 2
                im = im.crop((left, top, left + tw, top + th))
                canvas.alpha_composite(im, (int(op["x"]), int(op["y"])))
            else:
                im.thumbnail((tw, th))
                ox = int(op["x"] + (tw - im.width) // 2)
                oy = int(op["y"] + (th - im.height) // 2)
                canvas.alpha_composite(im, (ox, oy))
            draw = ImageDraw.Draw(canvas)
    elif t == "placeholder":
        box = [op["x"], op["y"], op["x"] + op["w"], op["y"] + op["h"]]
        draw.rounded_rectangle(box, radius=12, outline=(180, 180, 185, 255), width=2)
        f = load_font(14)
        lw = draw.textlength(op["label"], font=f)
        draw.text((op["x"] + (op["w"] - lw) / 2, op["y"] + op["h"] / 2 - 8), op["label"], font=f, fill=(150, 150, 155, 255))
    elif t == "text":
        draw_text(draw, op)

canvas.convert("RGB").save(out_path, "PNG")
print("saved", out_path)
