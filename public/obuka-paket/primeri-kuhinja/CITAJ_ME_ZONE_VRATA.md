# Kuhinjska vrata — unos sa zonama (kao celo vozilo)

Isti raspored kao NTV: **dijagram u sredini + zone + dugmad + NOK forma**.

## Šta je urađeno u kodu

| Stavka | Vrednost |
|--------|----------|
| Dijagram | `public/vozilo/dijagrami/kuh-vrata.png` |
| Zone | Ivica · Površina · Uglovi · Rupice |
| Mapiranje ID | `KUH-VRATA-600-L`, prefiks `KUH-` |
| Hotspot / strelice | `src/lib/vrataZoneConfig.js` |

### Ako promeniš sliku dijagrama

Strelice i obruči su poravnati sa brojevima **1–4 ucrtanim u samoj slici**.
Slika je 1024×1536 i u `viewBox 682×520` ulazi kao `objectFit: contain`, pa je
prevod piksela slike u koordinate dijagrama:

```
x_svg = 167.67 + x_px * 0.33855
y_svg =          y_px * 0.33855
```

Nova slika = izmeri centre brojeva u pikselima, provuci kroz formulu i upiši ih
u `hotspot` (`prsten: true` znači da se broj ne crta duplo — dolazi iz slike),
a `linijaDo` postavi ~17 jedinica pre centra da strelica ne prekrije broj.

## U šifrarniku (jednom)

1. **Delovi** → `KUH-VRATA-600-L`
   - **TIP KONTROLE** = `vozilo` *(ili ostavi `deo` — ID sa `KUH-` već pali zone UI)*
   - **VOZILO KATALOG ID** = `KUH` (preporuka)
2. **Greške** (katalog) sa kategorijama:
   - `IVICA`
   - `POVRŠINA`
   - `GEOMETRIJA` (uglovi)
   - `BUŠENJE` (rupice)
3. (Opciono) Tipovi linija → kod `KUH`, dijagram `/vozilo/dijagrami/kuh-vrata.png`

## Na liniji

1. F5  
2. Atributivne → linija  
3. Sken `KUH-VRATA-600-L`  
4. Ekran: **KONTROLA VRATA — izaberi zonu** + slika vrata + čipovi zona  
5. Izaberi zonu → NOK → greške te zone → snimi  

Merljive i dalje koriste svoj crtež (dimenzije) — bez zona.
