# Word 8D izveštaji

Stavite anonimizovane `.docx` fajlove ovde (npr. 15 komada).

```bash
npm run build:primeri-8d:word
```

Skripta izvlači tekst iz svih fajlova u `izvuceno-iz-word.txt`, zatim generiše `src/data/primeri-8d.json`.

**Format:** svaki dokument treba da ima zaglavlje sa `KONTROLA KVALITETA · SPC` i `8D Izveštaj — …` (kao u postojećim primerima).
