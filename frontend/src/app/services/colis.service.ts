// src/app/services/colis.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../core/services/config.service';

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
  gerbable: boolean;
  couleur?: string;
  statut?: string;
  dateAjout?: Date;
}

@Injectable({ providedIn: 'root' })
export class ColisService {
  constructor(
    private http: HttpClient,
    private config: ConfigService
  ) {}

  ajouterColis(colis: Colis): Observable<Colis> {
    return this.http.post<Colis>(this.config.getApiUrl('colis'), colis);
  }

  getColis(): Observable<Colis[]> {
    return this.http.get<Colis[]>(this.config.getApiUrl('colis'));
  }
}
