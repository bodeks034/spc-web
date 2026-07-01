"""Generiše TRI-CORE QC assete — ikona sa modulima 0/1/2 i natpisima, oštra PNG verzija."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC_CANDIDATES = [
    Path(
        r"C:\Users\dejan\.cursor\projects\c-mix-spc-web\assets"
        r"\c__Users_dejan_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
        r"_LOGO-c712c689-b50c-4f8f-a277-2a7458943bf7.png"
    ),
    PUBLIC / "tri-core-qc-logo.png",
    PUBLIC / "tri-core-qc-symbol.png",
]


def make_transparent(img: Image.Image, threshold: int = 245) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
            elif r > 228 and g > 228 and b > 228:
                px[x, y] = (r, g, b, 0)
    return img


def crop_non_transparent(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def crop_diagram_only(full: Image.Image) -> Image.Image:
    """Gornji deo loga — ceo krug sa donjim ikonama, bez TRI-CORE QC teksta."""
    w, h = full.size
    return crop_non_transparent(full.crop((0, 0, w, int(h * 0.74))), pad=12)


def crop_icon_clean(diagram: Image.Image) -> Image.Image:
    """Ceo dijagram — T3, tri modula, brojevi 0/1/2 i natpisi."""
    return crop_non_transparent(diagram, pad=10)


def sharpen_icon(img: Image.Image, out_px: int = 1536, scale: float = 0.76, lift: float = 0.03) -> Image.Image:
    """Maksimalno oštra ikona — supersampling pa precizno smanjenje."""
    work = img.copy()
    max_dim = max(work.width, work.height)
    # Prvo uvećaj izvor na ~4K radi supersamplinga
    factor = 4096 / max_dim
    work = work.resize(
        (max(1, int(work.width * factor)), max(1, int(work.height * factor))),
        Image.Resampling.LANCZOS,
    )

    fit = int(out_px * scale)
    work.thumbnail((fit, fit), Image.Resampling.LANCZOS)
    work = work.filter(ImageFilter.UnsharpMask(radius=1.2, percent=240, threshold=0))
    work = work.filter(ImageFilter.UnsharpMask(radius=0.5, percent=150, threshold=2))

    sq = Image.new("RGBA", (out_px, out_px), (0, 0, 0, 0))
    ox = (out_px - work.width) // 2
    oy = max(12, (out_px - work.height) // 2 - int(out_px * lift))
    sq.paste(work, (ox, oy), work)
    return sq


def crop_t3_mark(icon: Image.Image) -> Image.Image:
    w, h = icon.size
    cx, cy = w // 2, int(h * 0.46)
    half = int(min(w, h) * 0.26)
    return icon.crop((cx - half, cy - half, cx + half, cy + half))


def save_icon(img: Image.Image, path: Path, size: int, scale: float = 0.84) -> None:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon = img.copy()
    fit = int(size * scale)
    icon.thumbnail((fit, fit), Image.Resampling.LANCZOS)
    ox = (size - icon.width) // 2
    oy = (size - icon.height) // 2
    canvas.paste(icon, (ox, oy), icon)
    canvas.save(path, "PNG", optimize=True)


def save_maskable(img: Image.Image, path: Path, size: int) -> None:
    bg = Image.new("RGBA", (size, size), (28, 35, 51, 255))
    fit = int(size * 0.72)
    icon = img.copy()
    icon.thumbnail((fit, fit), Image.Resampling.LANCZOS)
    ox = (size - icon.width) // 2
    oy = (size - icon.height) // 2
    bg.paste(icon, (ox, oy), icon)
    bg.save(path, "PNG", optimize=True)


def main() -> None:
    src = next((p for p in SRC_CANDIDATES if p.exists()), None)
    if not src:
        raise SystemExit("Nema izvornog loga.")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    raw = Image.open(src)
    full = crop_non_transparent(make_transparent(raw))
    diagram = crop_diagram_only(full)
    icon_clean = sharpen_icon(crop_icon_clean(diagram), out_px=1536)

    icon_clean.save(PUBLIC / "tri-core-qc-icon.png", "PNG", optimize=False)
    crop_non_transparent(diagram, pad=4).save(
        PUBLIC / "tri-core-qc-symbol.png", "PNG", optimize=True
    )
    full.save(PUBLIC / "tri-core-qc-logo.png", "PNG", optimize=True)

    t3 = crop_t3_mark(icon_clean)
    save_icon(t3, PUBLIC / "favicon.png", 64, scale=0.92)
    save_icon(t3, PUBLIC / "favicon-32.png", 32, scale=0.9)
    save_icon(icon_clean, PUBLIC / "icon-192.png", 192)
    save_icon(icon_clean, PUBLIC / "icon-512.png", 512)
    save_icon(icon_clean, ROOT / "icon-192.png", 192)
    save_icon(icon_clean, ROOT / "icon-512.png", 512)
    save_maskable(icon_clean, PUBLIC / "icon-maskable-192.png", 192)
    save_maskable(icon_clean, PUBLIC / "icon-maskable-512.png", 512)

    print(f"OK — tri-core-qc-icon.png {icon_clean.size}")


if __name__ == "__main__":
    main()
