# sap-drop — stari tok (CSV → Excel)

**Za dnevni ERP uvoz direktno u bazu koristi `erp-drop/incoming/`** i:

```powershell
npm run import:erp-dnevni
```

## Kada koristiti sap-drop

Samo ako i dalje radiš **ručni Excel šifrarnik**:

1. SAP izvozi CSV ovde → `sap-drop/incoming/`
2. `npm run sap:csv-excel` — popuni `excel-rad/SPC_master_atributivne.xlsx`
3. Ručni uvoz iz Excela u aplikaciji

Vidi `docs/obuka-paket/UPUTSTVO_SAP_CSV_EXCEL.md`.

## Preporuka za go-live

Jedan folder: **`erp-drop/incoming/`** (cron `import:erp-dnevni`).  
`sap-drop` može ostati za prelazni period ili se isprazni.
