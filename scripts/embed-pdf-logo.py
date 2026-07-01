import base64
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "public" / "tri-core-qc-icon.png"
if not src.exists():
    src = ROOT / "public" / "tri-core-qc-symbol.png"
img = Image.open(src).convert("RGBA")
img.thumbnail((160, 160), Image.Resampling.LANCZOS)
out_png = ROOT / "public" / "tri-core-qc-pdf.png"
img.save(out_png, "PNG", optimize=True)
buf = out_png.read_bytes()
b64 = base64.b64encode(buf).decode()
(ROOT / "src" / "lib" / "pdfLogoEmbedded.js").write_text(
    "/** Auto-generisano: npm run embed:pdf-logo */\n"
    f'export const PDF_LOGO_DATA_URL = "data:image/png;base64,{b64}";\n',
    encoding="utf-8",
)
print(f"OK {len(buf)} bytes")
