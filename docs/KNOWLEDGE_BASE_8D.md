# Knowledge base za SPC Asistent 8D

Plan prikupljanja referenci za **Fazu 2** (LLM + RAG). Faza 1 koristi ugrađene šablone u `src/lib/troubleshootingSabloni.js` — bez spoljnih PDF-ova.

## Faza 1 (trenutno)

- Šablonski generator: `src/lib/spcAsistent8d.js`
- Problem → uzrok → rešenje: `src/lib/troubleshootingSabloni.js`
- Ulaz: SPC dashboard, Pareto, p-karta, tab STANJE
- Izlaz: prefill D2–D8 u `OsmDIzvestaj` (human-in-the-loop pre snimanja)

## Faza 2 — šta pripremiti

### 1. Priručnici za rešavanje problema (Troubleshooting Guides)

Najvažniji izvor — direktno povezuje kvar sa uzrokom. **Koristiti samo legalno kupljene ili besplatno objavljene verzije sa sajtova proizvođača.**

| Oblast | Proizvođači / izvor | Šta tražiti |
|--------|---------------------|-------------|
| CNC obrada | Sandvik Coromant, Kennametal, Iscar, Walter Tools | „Tool Wear Troubleshooting Guide“, „Turning/Milling Defect Manual“ |
| Zavarivanje | Fronius, Kemppi, Lincoln Electric | „Welding Defects and Remedies“ |
| Kovanje / livenje | Akademski i industrijski izvori | „Forging defects atlas PDF“, „Die casting defects troubleshooting“ |

**Predlog strukture u repou** (kad firma dostavi fajlove):

```
docs/knowledge/
  cnc/
  zavarivanje/
  kovanje-livenje/
  README.md          ← izvor, datum, licenca
  manifest.json      ← metadata za RAG chunking
```

Ne skidati automatski sa Scribd-a — rizik autorskih prava.

### 2. Standardi i metodologije

Za ispravan 8D / FMEA / SPC jezik u izveštajima:

| Standard | Namena |
|----------|--------|
| **VDA 4** | 8D metodologija |
| **AIAG** FMEA, SPC priručnici | Automotiv |
| **ISO 5817** | Nivoi kvaliteta zavara (referenca u D4/D5 za zavar) |

Ako firma ima kupljene PDF verzije — smestiti u `docs/knowledge/standardi/` (ne u git bez dozvole).

Javni pregledi na ResearchGate / Scribd — samo za internu referencu tima, ne za produkcioni RAG bez licence.

### 3. Javne baze za testiranje (Faza 2 dev)

| Dataset | Upotreba |
|---------|----------|
| [Kaggle — Manufacturing Defects](https://www.kaggle.com/datasets) | Test parsiranja CSV, evaluacija prompta |
| Interni `kontrolni_log` | Pravi ground truth za SPC bot |

**Ne koristiti Kaggle u produkciji** — samo za razvoj LLM sloja.

## Faza 2 — arhitektura (plan)

```
SPC analitika → JSON kontekst → API (Edge/Node) → LLM
                                    ↑
                              RAG: docs/knowledge/*
                                    +
                              System prompt: VDA 8D struktura
```

- Server-side API (ključevi van frontenda)
- Strukturiran JSON ulaz (isti `saberiKontekst8d*` kao Faza 1)
- Human-in-the-loop: nacrt → pregled → snimanje u `osmd_izvestaji`
- Opciono: eskalacija pre 8D (`kreirajEskalacijuIzPredloga`)

## Proširenje šablona (pre LLM-a)

Dodajte redove u `troubleshootingSabloni.js` za specifične defekte vašeg pogona (kopirati format iz postojećih unosa). To odmah poboljšava Fazu 1 bez API troškova.
