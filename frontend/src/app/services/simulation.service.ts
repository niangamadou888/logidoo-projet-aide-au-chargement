import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SimulationOptions {
  forceUseContainers?: string[];
  preferredCategories?: string[];
}

export interface SimulationResult {
  success: boolean;
  stats: {
    totalVolume: number;
    totalWeight: number;
    colisCount: number;
    containersCount: number;
    avgVolumeUtilization: number;
    avgWeightUtilization: number;
    fragilesCount: number;
    nonGerbablesCount: number;
    placedCount: number;
    unplacedCount: number;
  };
  containers: any[];
  placements: any[];
  unplacedItems: any[];
}

export interface OptimalContainerResult {
  containerId: string;
  containerType: string;
  containerCategory: string;
  dimensions: {
    longueur: number;
    largeur: number;
    hauteur: number;
  };
  volume: number;
  capacitePoids: number;
  placedItems: number;
  totalItems: number;
  volumeUtilization: number;
  weightUtilization: number;
  placementScore: number;
  optimalityScore: number;
  simulation: any;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private apiUrl = 'http://localhost:3000/api/simulations';

  constructor(private http: HttpClient) {}

  /**
   * Enregistrer une simulation
   */
  enregistrerSimulation(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Récupérer toutes les simulations d'un utilisateur
   */
  recupererSimulations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user`);
  }

  /**
   * Récupérer une simulation spécifique par ID
   */
  recupererSimulation(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtenir une prévisualisation de chargement optimal
   */
  previewSimulation(colis: any[], options?: SimulationOptions): Observable<{
    success: boolean;
    result: SimulationResult;
    executionTime: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/preview`, { colis, options });
  }

  /**
   * Trouver le conteneur optimal pour une liste de colis
   */
  findOptimalContainer(colis: any[]): Observable<{
    success: boolean;
    optimalContainer: OptimalContainerResult;
    executionTime: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/optimal-container`, { colis });
  }

  /**
   * Sauvegarder les résultats d'une simulation
   */
  sauvegarderResultats(colis: any[], resultats: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/save`, { colis, resultats });
  }

  /**
   * Calculer le volume total des colis (version frontend)
   */
  calculerVolumeTotal(colis: any[]): number {
    return colis.reduce((total, item) => {
      const volume = (item.longueur * item.largeur * item.hauteur) / 1000000; // cm³ -> m³
      return total + (volume * (item.quantite || 1));
    }, 0);
  }

  /**
   * Calculer le poids total des colis (version frontend)
   */
  calculerPoidsTotal(colis: any[]): number {
    return colis.reduce((total, item) => {
      return total + ((item.poids || 0) * (item.quantite || 1));
    }, 0);
  }

  /**
   * Calculer le nombre total de colis (en tenant compte des quantités)
   */
  calculerNombreColis(colis: any[]): number {
    return colis.reduce((total, item) => {
      return total + (item.quantite || 1);
    }, 0);
  }
}