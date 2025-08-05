// src/app/services/colis.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Colis {
  reference?: string;
  type: string;
  nomDestinataire: string;
  adresse: string;
  telephone: string;
  poids: number;
  longueur: number;
  largeur: number;
  hauteur: number;
  quantite: number;
  fragile: boolean;
  statut?: string;
  dateAjout?: Date;
}

@Injectable({ providedIn: 'root' })
export class ColisService {
  private apiUrl = 'http://localhost:3000/api/colis';

  constructor(private http: HttpClient) {}

  ajouterColis(colis: Colis): Observable<Colis> {
    return this.http.post<Colis>(this.apiUrl, colis);
  }

  getColis(): Observable<Colis[]> {
    return this.http.get<Colis[]>(this.apiUrl);
  }
}
