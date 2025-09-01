import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Contenant} from '../core/models/contenant.model';
import { Observable } from 'rxjs';
import { Colis } from './colis.service';


@Injectable({
  providedIn: 'root'
})
export class ConteneurService {

private apiUrl = 'https://logidoo.onrender.com/api';

  constructor(private http: HttpClient) { }


 
    listerContenants(): Observable<Contenant[]> {
    return this.http.get<Contenant[]>(`${this.apiUrl}/contenants`);
  }

  suggestionContenants(articles: Colis[]): Observable<Contenant[]> {
    return this.http.post<Contenant[]>(`${this.apiUrl}/contenants/suggestions`, { articles });
  }


    getConteneurs(): Observable<Contenant[]> {
    return this.http.get<Contenant[]>(`${this.apiUrl}/contenants`);
  }
}
