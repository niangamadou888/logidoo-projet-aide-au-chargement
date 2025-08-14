import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Camion } from '../core/models/camion.model';
import { Colis } from './colis.service';

@Injectable({
  providedIn: 'root'
})
export class CamionsService {
private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }


  //   creerCamion(camion: Camion): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/camions`, camion);
  // }
    listerCamions(): Observable<Camion[]> {
    return this.http.get<Camion[]>(`${this.apiUrl}/camions`);
  }
suggestionCamions(articles: Colis[]): Observable<Camion[]> {
    return this.http.post<Camion[]>(`${this.apiUrl}/contenants/suggestions`, { articles });
  }

    getConteneurs(): Observable<Camion[]> {
    return this.http.get<Camion[]>(this.apiUrl);
  }
}
