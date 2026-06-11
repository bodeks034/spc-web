import os
import pandas as pd

# 1. Naziv vašeg Excel fajla
excel_fajl = "SPC_merljive.xlsx"

# 2. Folder gde će se sačuvati čisti CSV-ovi
izlazni_folder = "izvezeni_csv_fajlovi"
os.makedirs(izlazni_folder, exist_ok=True)

try:
    xl = pd.ExcelFile(excel_fajl)
    print(f"Počinje čišćenje i konverzija za fajl: {excel_fajl}\n" + "-"*50)
    
    for ime_sheeta in xl.sheet_names:
        # header=2 kaže Pandasu da je 3. red u Excelu (indeks 2) stvarno zaglavlje sa kolonama
        df = pd.read_excel(excel_fajl, sheet_name=ime_sheeta, header=2)
        
        # Čistimo prazne redove i prazne kolone
        df = df.dropna(how='all')
        df = df.dropna(axis=1, how='all')
        
        # --- KLJUČNA STVAR: Prebacivanje svih zaglavlja kolona u MALA SLOVA ---
        # Ovo pretvara 'ID' -> 'id', 'KATEGORIJA' -> 'kategorija', 'Defekt' -> 'defekt'
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        # Uklanjamo "Unnamed" kolone ako su se negde provukle
        df = df.loc[:, ~df.columns.str.contains('^unnamed:', na=False)]
        
        # Generišemo siguran naziv fajla (mala slova, bez razmaka)
        siguran_naziv = ime_sheeta.strip().replace(" ", "_").lower()
        putanja_za_spasavanje = os.path.join(izlazni_folder, f"{siguran_naziv}.csv")
        
        # Ako sheet nije prazan, čuvamo ga kao čist CSV
        if not df.empty:
            df.to_csv(putanja_za_spasavanje, index=False, encoding="utf-8")
            print(f" [USPEŠNO] Očišćen i sačuvan sheet: '{ime_sheeta}' -> {siguran_naziv}.csv")
            
    print("-"*50 + f"\nGotovo! Svi CSV fajlovi se nalaze u folderu '{izlazni_folder}'.")
    print("Sada su sva zaglavlja unutar CSV-ova (uključujući i 'defekt') napisana MALIM SLOVIMA.")

except Exception as e:
    print(f"Došlo je do greške: {e}")