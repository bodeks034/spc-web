/**
 * PDF i štampa — vizuelni snimak liste / panela sa ekrana (html2canvas).
 * Izvoz izgleda kao na UI, ne kao posebna tabela.
 */

function dISO() {
  return new Date().toISOString().slice(0, 10);
}

function safeSlug(s, fallback = "Lista") {
  return String(s || fallback).replace(/[^\w\-]+/g, "_").slice(0, 60) || fallback;
}

function bgFromEl(el) {
  if (!el) return "#0f1419";
  try {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
    const parent = el.parentElement;
    if (parent) {
      const pbg = getComputedStyle(parent).backgroundColor;
      if (pbg && pbg !== "rgba(0, 0, 0, 0)" && pbg !== "transparent") return pbg;
    }
  } catch { /* ignore */ }
  return "#0f1419";
}

/** Privremeno proširi scroll kontejnere da html2canvas uhvati celu listu. */
function expandForCapture(root) {
  const restored = [];
  const nodes = [root, ...root.querySelectorAll("*")];
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const cs = getComputedStyle(node);
    const oy = cs.overflowY;
    const ox = cs.overflowX;
    const scrollableY = (oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 2;
    const scrollableX = (ox === "auto" || ox === "scroll") && node.scrollWidth > node.clientWidth + 2;
    if (!scrollableY && !scrollableX) return;
    restored.push({
      node,
      overflow: node.style.overflow,
      overflowX: node.style.overflowX,
      overflowY: node.style.overflowY,
      height: node.style.height,
      maxHeight: node.style.maxHeight,
      width: node.style.width,
      maxWidth: node.style.maxWidth,
    });
    node.style.overflow = "visible";
    node.style.overflowX = "visible";
    node.style.overflowY = "visible";
    if (scrollableY) {
      node.style.maxHeight = "none";
      node.style.height = `${node.scrollHeight}px`;
    }
    if (scrollableX) {
      node.style.maxWidth = "none";
      node.style.width = `${node.scrollWidth}px`;
    }
  });
  return () => {
    restored.forEach((t) => {
      t.node.style.overflow = t.overflow;
      t.node.style.overflowX = t.overflowX;
      t.node.style.overflowY = t.overflowY;
      t.node.style.height = t.height;
      t.node.style.maxHeight = t.maxHeight;
      t.node.style.width = t.width;
      t.node.style.maxWidth = t.maxWidth;
    });
  };
}

async function captureEkran(el, { bgColor, scale = 1.5 } = {}) {
  if (!el) throw new Error("Nema sadržaja za izvoz");
  const { default: html2canvas } = await import("html2canvas");
  const restore = expandForCapture(el);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    return await html2canvas(el, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: bgColor || bgFromEl(el),
      width: Math.max(el.scrollWidth, el.offsetWidth),
      height: Math.max(el.scrollHeight, el.offsetHeight),
      windowWidth: Math.max(el.scrollWidth, el.offsetWidth),
      windowHeight: Math.max(el.scrollHeight, el.offsetHeight),
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll("[data-izvoz-hide]").forEach((n) => {
          n.style.display = "none";
        });
      },
    });
  } finally {
    restore();
  }
}

/** Seče visoki canvas na A4 stranice. */
function dodajCanvasNaPdf(pdf, canvas, { margin = 10 } = {}) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const pxPerMm = canvas.width / contentW;
  const pageHeightPx = Math.max(1, Math.floor(contentH * pxPerMm));

  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    if (page > 0) pdf.addPage();
    const sliceH = Math.min(pageHeightPx, canvas.height - y);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    const hMm = (sliceH * contentW) / canvas.width;
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, contentW, hMm);
    y += sliceH;
    page += 1;
  }
}

/**
 * @param {HTMLElement} el
 * @param {{ naslov?: string, prefiksFajla?: string, bgColor?: string, orientation?: 'portrait'|'landscape' }} [opts]
 */
export async function preuzmiEkranPdf(el, opts = {}) {
  const canvas = await captureEkran(el, opts);
  if (!canvas || canvas.height < 20) throw new Error("Nema sadržaja za PDF");

  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const orientation = opts.orientation
    || (canvas.width > canvas.height * 1.15 ? "landscape" : "portrait");
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  dodajCanvasNaPdf(pdf, canvas);

  const prefiks = safeSlug(opts.prefiksFajla || opts.naslov || "Lista");
  const filename = `TRI-CORE_${prefiks}_${dISO()}.pdf`;
  pdf.save(filename);
  return filename;
}

/**
 * Štampa vizuelni snimak liste (isto kao na ekranu).
 * @param {HTMLElement} el
 * @param {{ naslov?: string, bgColor?: string }} [opts]
 */
export async function stampajEkran(el, opts = {}) {
  const canvas = await captureEkran(el, { ...opts, scale: 1.75 });
  if (!canvas || canvas.height < 20) throw new Error("Nema sadržaja za štampu");

  const naslov = opts.naslov || "Lista";
  const dataUrl = canvas.toDataURL("image/png");
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${String(naslov).replace(/</g, "")}</title>
<style>
  html,body{margin:0;padding:0;background:#fff;}
  .wrap{padding:8mm;}
  img{width:100%;height:auto;display:block;}
  @media print{
    html,body{margin:0;background:#fff;}
    .wrap{padding:0;}
    img{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style></head><body>
<div class="wrap"><img src="${dataUrl}" alt="${String(naslov).replace(/"/g, "")}"/></div>
</body></html>`);
  win.document.close();
  await new Promise((r) => {
    const img = win.document.querySelector("img");
    if (img?.complete) r();
    else img?.addEventListener("load", () => r(), { once: true });
    setTimeout(r, 800);
  });
  win.focus();
  win.print();
}
