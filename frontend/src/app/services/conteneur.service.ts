import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Contenant} from '../core/models/contenant.model';
import { Observable } from 'rxjs';
import { Colis } from './colis.service';
import { ConfigService } from '../core/services/config.service';


@Injectable({
  providedIn: 'root'
})
export class ConteneurService {
  constructor(
    private http: HttpClient,
    private config: ConfigService
  ) { }



  // Créer un nouveau contenant avec upload d'image
  creerContenant(contenant: Contenant, imageFile?: File): Observable<Contenant> {
    const formData = new FormData();

    // Ajouter les champs du contenant
    for (const key in contenant) {
      if (contenant.hasOwnProperty(key)) {
        const value = (contenant as any)[key];
        if (value !== undefined && value !== null) {
          if (key === 'dimensions' || key === 'capacite') {
            // Convertir les objets en JSON string
            formData.append(key, JSON.stringify(value));
          } else if (key === 'images') {
            // images sera géré via imageFile
            continue;
          } else {
            formData.append(key, value.toString());
          }
        }
      }
    }

    // Ajouter l'image si fournie
    if (imageFile) {
      formData.append('image', imageFile, imageFile.name);
    }

    return this.http.post<Contenant>(this.config.getApiUrl('contenants/create'), formData);
  }
 
    listerContenants(): Observable<Contenant[]> {
    return this.http.get<Contenant[]>(this.config.getApiUrl('contenants'));
  }

  suggestionContenants(articles: Colis[]): Observable<Contenant[]> {
    return this.http.post<Contenant[]>(this.config.getApiUrl('contenants/suggestions'), { articles });
  }


    getConteneurs(): Observable<Contenant[]> {
    return this.http.get<Contenant[]>(this.config.getApiUrl('contenants'));
  }


    getCategories(): Observable<string[]> {
    return this.http.get<string[]>(this.config.getApiUrl('contenants/categories'));
  }
  
  // Supprimer un contenant par ID
  deleteContenant(id: string): Observable<void> {
    return this.http.delete<void>(this.config.getApiUrl(`contenants/${id}`));
  }
  
}
