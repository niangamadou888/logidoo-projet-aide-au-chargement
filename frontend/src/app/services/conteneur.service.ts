import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Conteneur } from '../core/models/conteneur.model';
import { Observable } from 'rxjs';
import { Colis } from './colis.service';
import { Camion } from '../core/models/camion.model';

@Injectable({
  providedIn: 'root'
})
export class ConteneurService {

private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  creerContenant(conteneur:Conteneur):Observable<any>{
    return this.http.post(`${this.apiUrl}/contenants`,conteneur);
  }
    creerCamion(camion: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/camions`, camion);
  }
    listerContenants(): Observable<Conteneur[]> {
    return this.http.get<Conteneur[]>(`${this.apiUrl}/contenants`);
  }

  suggestionContenants(articles: Colis[]): Observable<Conteneur[]> {
    return this.http.post<Conteneur[]>(`${this.apiUrl}/contenants/suggestions`, { articles });
  }

  suggestionCamions(articles: Colis[]): Observable<Camion[]> {
    return this.http.post<Camion[]>(`${this.apiUrl}/camions/suggestions`, { articles });
  }

    getConteneurs(): Observable<Conteneur[]> {
    return this.http.get<Conteneur[]>(this.apiUrl);
  }
}
