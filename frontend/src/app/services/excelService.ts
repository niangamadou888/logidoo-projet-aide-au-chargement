import * as XLSX from 'xlsx';
import { Injectable } from '@angular/core';
import { Colis } from '../models/simulation.model';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor() {}

    public randomColor(): string {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

  telechargerModele() {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Type": "Carton",
        "Longueur(cm)": 30,
        "Largeur(cm)": 25,
        "Hauteur(cm)": 20,
        "Poids(kg)": 2.5,
        "Quantité": 1,
        "Destinataire": "JAdiaOumy fall",
        "Adresse": "Medina rue 6",
        "Téléphone": "+221778128426"
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
      "Téléphone": "telephone"
    };

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        const couleur = this.randomColor();

        const colisImportes: Colis[] = jsonData.map((row, index) => {
          const mapped: Partial<Colis> = {};
          for (const key in row) {
            if (colonneMap[key]) {
              mapped[colonneMap[key]] = row[key];
            }
          }
          return {
            id: Date.now() + index,
            type: mapped.type || '',
            longueur: Number(mapped.longueur) || 0,
            largeur: Number(mapped.largeur) || 0,
            hauteur: Number(mapped.hauteur) || 0,
            poids: Number(mapped.poids) || 0,
            quantite: Number(mapped.quantite) || 1,
            nomDestinataire: mapped.nomDestinataire || '',
            adresse: mapped.adresse || '',
            telephone: mapped.telephone || '',
            couleur
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
