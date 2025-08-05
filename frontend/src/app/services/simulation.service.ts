import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private apiUrl = 'http://localhost:3000/api/simulations';

  constructor(private http: HttpClient) {}

  enregistrerSimulation(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  recupererSimulations(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
