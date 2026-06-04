/** Učitaj sliku i smanji za čuvanje u TEXT (JPEG data URL). */
export function ucitajSlikuKaoDataUrl(file, maxW = 960, kvalitet = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Izaberi sliku (JPG/PNG)."));
      return;
    }
    const r = new FileReader();
    r.onerror = () => reject(new Error("Čitanje fajla nije uspelo."));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Slika nije validna."));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round(h * maxW / w);
          w = maxW;
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas nije dostupan."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const url = c.toDataURL("image/jpeg", kvalitet);
        if (url.length > 900_000) {
          reject(new Error("Slika je prevelika posle kompresije — probaj bliži kadar."));
          return;
        }
        resolve(url);
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
