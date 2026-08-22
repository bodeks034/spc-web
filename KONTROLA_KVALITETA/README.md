# KONTROLA KVALITETA

Glavni folder dokumentacije kvaliteta — NCR, 8D, PFMEA/CP, izveštaji za kupce/dobavljače i operativni PDF arhiv.

## Struktura

```
KONTROLA_KVALITETA/
├── NCR_KVALITET/
│   ├── NCR_Registar_Master.xlsx          ← master registar (statistika)
│   ├── A4_NCR_Obrazac_Template.xlsx      ← blanko šablon (Save As)
│   └── Pojedinacni_Obrasci/              ← NCR-2026-001.xlsx, …
├── 02_8D_Izvestaji/
│   └── 8D_YYYY_NNN_Opis.doc           ← zasebni Word po 8D
├── 03_Inzenjering_Kvaliteta/
│   └── Proces_{pogon}/
│       ├── PFMEA_{pogon}.xlsx
│       ├── Control_Plan_{pogon}.xlsx
│       └── PFMEA_ControlPlan_*.pdf    ← PDF izvoz iz modula
├── 04_Izvestaji_Kupci/
│   └── TRI-CORE_Izvestaj_kupca_*.pdf
├── 05_Izvestaji_Dobavljaci/
│   └── TRI-CORE_Izvestaj_dobavljac_*.pdf
└── 06_Operativni_Izvestaji/
    ├── Smena/           ← predaja smene PDF
    ├── Trasabilitet/    ← trasabilitet PDF
    ├── OEE/             ← OEE izveštaj PDF
    ├── FAI/             ← FAI PDF
    ├── Eskalacije/      ← eskalacije PDF
    └── NCR_PDF/         ← pojedinačni NCR obrazac PDF
```

## Kako koristiti

1. **U aplikaciji (preporučeno):** Analitika → NCR → tab **Folder kvaliteta** → **Kreiraj / poveži folder**
2. Izaberite roditeljski folder (npr. `Documents` ili mrežni disk)
3. Aplikacija automatski kreira `KONTROLA_KVALITETA` i podfoldere
4. Pri **čuvanju NCR-a** ažurira se `NCR_Registar_Master.xlsx` i pojedinačni fajl u `Pojedinacni_Obrasci/`
5. U svakom podfolderu postoji `CITAJ_ME.txt` sa kratkim uputstvom (pri povezivanju foldera)
6. Master Excel: **ZATVOREN** (zeleno), **OTVOREN** (žuto), alarm 8D (crveno), hyperlink u koloni Link ka fajlu
7. Pri **izvozu PDF/Word** (kupac, dobavljač, 8D, smena, trasabilitet, OEE, FAI, eskalacije, NCR PDF, PFMEA PDF) fajl se **automatski kopira** u odgovarajući podfolder (ako je folder povezan)

## IT / mrežni disk

Ovaj folder u repou služi kao referenca. Za produkciju kopirajte strukturu na:

- `\\server\Kvalitet\KONTROLA_KVALITETA` (Windows mreža)
- ili lokalno `Documents\KONTROLA_KVALITETA`

Browser (Chrome/Edge) mora imati dozvolu za pisanje u izabrani folder.

## Radno uputstvo

Puni postupak NCR → 8D → PFMEA/CP: **`docs/obuka-paket/UPUTSTVO_NCR_8D_PFMEA_CP.md`**  
U aplikaciji: **Uputstvo → NCR · 8D · PFMEA · Control Plan**
