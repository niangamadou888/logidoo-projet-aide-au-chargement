import * as XLSX from 'xlsx';
import { Injectable } from '@angular/core';
import { Colis } from '../models/simulation.model';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor() {}

  telechargerModele() {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Type": "Carton",
        "Longueur(cm)": 30,
        "Largeur(cm)": 25,
        "Hauteur(cm)": 20,
        "Poids(kg)": 2.5,
        "Quantité": 1,
        "Destinataire": "JAdiaOumy Fall",
        "Adresse": "Medina rue 6",
        "Téléphone": "+221778128426",
        "Fragile": "Non",
        "Gerbable": "Oui",
        "Couleur": "#F97316"
      }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle Colis');
    XLSX.writeFile(wb, 'modele_colis.xlsx');
  }


  importerDepuisExcel(file: File): Observable<Colis[]> {
  return new Observable<Colis[]>((observer) => {
    const colonneMap: Record<string, keyof Colis> = {
      "Type": "type",
      "Longueur(cm)": "longueur",
      "Largeur(cm)": "largeur",
      "Hauteur(cm)": "hauteur",
      "Poids(kg)": "poids",
      "Quantité": "quantite",
      "Destinataire": "nomDestinataire",
      "Adresse": "adresse",
      "Téléphone": "telephone",
      // Champs optionnels pris en charge
      "Fragile": "fragile",
      "Gerbable": "gerbable",
      "Couleur": "couleur"
    };

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const toBool = (val: any): boolean | undefined => {
          if (val === undefined || val === null || val === '') return undefined;
          const s = String(val).trim().toLowerCase();
          if (["1", "true", "vrai", "oui", "yes", "y", "x"].includes(s)) return true;
          if (["0", "false", "faux", "non", "no", "n"].includes(s)) return false;
          return undefined;
        };

        const normalizeColor = (val: any): string | undefined => {
          if (!val) return undefined;
          const s = String(val).trim();
          // Accept formats like #RRGGBB or rgb(...)
          if (/^#([0-9a-fA-F]{6})$/.test(s)) return s.toUpperCase();
          return s; // leave as provided; UI will still display
        };

        const colisImportes: Colis[] = jsonData.map((row, index) => {
          const mapped: Partial<Colis> = {};
          for (const key in row) {
            if (colonneMap[key]) {
              (mapped as any)[colonneMap[key]] = row[key];
            }
          }
          return {
            id: Date.now() + index,
            type: (mapped.type as any) || '',
            longueur: Number(mapped.longueur) || 0,
            largeur: Number(mapped.largeur) || 0,
            hauteur: Number(mapped.hauteur) || 0,
            poids: Number(mapped.poids) || 0,
            quantite: Number(mapped.quantite) || 1,
            nomDestinataire: (mapped.nomDestinataire as any) || '',
            adresse: (mapped.adresse as any) || '',
            telephone: (mapped.telephone as any) || '',
            fragile: toBool((mapped as any).fragile),
            gerbable: toBool((mapped as any).gerbable),
            couleur: normalizeColor((mapped as any).couleur)
          };
        });

        observer.next(colisImportes);
        observer.complete();
      } catch (err) {
        observer.error(err);
      }
    };

    reader.onerror = (err) => observer.error(err);
    reader.readAsArrayBuffer(file);
  });
}

}
