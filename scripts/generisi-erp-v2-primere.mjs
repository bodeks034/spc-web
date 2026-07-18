#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "erp-drop", "examples", "v2");

const files = {
  "02_Dobavljaci.csv": `SifraDobavljaca,NazivDobavljaca,Drzava,Grad,PIB,Kontakt,Telefon,Email,Status
DOB-001,Primer dobavljač,RS,Beograd,100000001,Petar Petrović,+381111111,dobavljac@example.rs,aktivan`,
  "06_Sastavnica.csv": `NadredjeniDeo,PodredjeniDeo,Kolicina,JedinicaMere,Revizija,Status
D-100,D-101,2,kom,A,aktivan`,
  "08_RadniCentri.csv": `SifraRadnogCentra,SifraLinije,NazivRadnogCentra,Status
RC-01,L-01,Zavarivanje,aktivan`,
  "10_Operacije.csv": `SifraOperacije,SifraDela,BrojOperacije,NazivOperacije,SifraRadnogCentra,SifraMasine,VremeCiklusa,VremePripreme,Status
OP-001,D-100,0010,Zavarivanje,RC-01,M-01,4.5,15,aktivan`,
  "13_Materijali.csv": `SifraMaterijala,NazivMaterijala,Standard,Debljina,JedinicaMere,SifraDobavljaca,Status
MAT-001,Čelični lim,S355,5,mm,DOB-001,aktivan`,
  "14_Skladista.csv": `SifraSkladista,NazivSkladista,Opis,Status
SK-01,Glavno skladište,Ulazni materijal i gotovi delovi,aktivno`,
  "15_Lokacije.csv": `SifraLokacije,SifraSkladista,Regal,Polica,Pozicija,Status
SK01-R01-P01,SK-01,R01,P01,01,aktivna`,
  "19_Serije.csv": `BrojSerije,SifraDela,DatumProizvodnje,Kolicina,Status
LOT-2026-001,D-100,2026-07-18,100,aktivan`,
  "20_SerijskiBrojevi.csv": `SerijskiBroj,BrojSerije,SifraDela,DatumProizvodnje,Status
SN-000001,LOT-2026-001,D-100,2026-07-18,aktivan`,
  "KontrolniPlan.csv": `SifraDela,Revizija,SifraOperacije,SifraKarakteristike,NazivKarakteristike,VelicinaUzorka,Ucestalost,ReakcioniPlan,OdgovornoLice
D-100,A,OP-001,K-001,Dužina,5,svaki sat,Zaustavi proces i izoluj LOT,Kontrolor`,
  "PFMEA.csv": `SifraDela,Revizija,SifraOperacije,NacinOtkaza,PosledicaOtkaza,UzrokOtkaza,PreventivnaKontrola,DetekcionaKontrola,S,O,D,AP
D-100,A,OP-001,Nepotpun zavar,Gubitak nosivosti,Nedovoljna struja,Standard parametara,Vizuelna kontrola,8,3,4,H`,
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), `${content}\n`, "utf8");
}
console.log(`Generisano ${Object.keys(files).length} ERP v2 primera u ${OUT}`);
