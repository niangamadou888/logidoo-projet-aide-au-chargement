// src/app/features/visualization/services/visualization.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  VisualizationScene,
  VisualizationContainer,
  VisualizationItem,
  ViewportSettings,
  VisualizationConfig,
  Position3D,
  Dimensions3D
} from '../models/visualization.model';
import { SimulationData, OptimizedLayout } from '../models/placement.model';
import { ColorUtils } from '../../../shared/utils/color-utils';
import { GeometryUtils } from '../../../shared/utils/geometry-utils';

@Injectable({
  providedIn: 'root'
})
export class VisualizationService {

  // Observables pour l'état de la visualisation
  private sceneSubject = new BehaviorSubject<VisualizationScene>(this.getDefaultScene());
  private configSubject = new BehaviorSubject<VisualizationConfig>(this.getDefaultConfig());
  private viewportSubject = new BehaviorSubject<ViewportSettings>(this.getDefaultViewport());

  public scene$ = this.sceneSubject.asObservable();
  public config$ = this.configSubject.asObservable();
  public viewport$ = this.viewportSubject.asObservable();

  constructor() { }

  /**
   * Initialise la visualisation avec les données de simulation
   */
  initializeVisualization(simulationData: SimulationData): void {
    console.log('Initialisation de la visualisation avec:', simulationData);

    const containers = this.convertSimulationToContainers(simulationData);

    const scene: VisualizationScene = {
      containers,
      viewMode: containers.length === 1 ? 'individual' : 'all',
      renderMode: '3d',
      currentContainerIndex: 0
    };

    this.sceneSubject.next(scene);
  }

  /**
   * Convertit les données de simulation en containers visualisables
   */
  private convertSimulationToContainers(simulationData: SimulationData): VisualizationContainer[] {
    if (!simulationData.resultats?.containers) {
      return [];
    }

    return simulationData.resultats.containers.map((container: any, index: number) => {
      console.log('🚚 Container du backend:', container);

      const visualizationContainer: VisualizationContainer = {
        id: container.id || `container-${index}`,
        ref: container.ref,
        type: container.type || 'Container',
        categorie: container.categorie || 'conteneur',
        dimensions: {
          // Utiliser des dimensions réalistes de conteneur
          longueur: container.capacity?.longueur || 1200,  // 12m
          largeur: container.capacity?.largeur || 240,     // 2.4m 
          hauteur: container.capacity?.hauteur || 260      // 2.6m
        },
        items: this.convertItemsToVisualization(container.items || [], container.id),
        capacity: {
          volume: container.capacity?.volume || 0,
          poids: container.capacity?.poids || 0
        },
        used: {
          volume: container.used?.volume || this.calculateUsedVolume(container.items || []),
          poids: container.used?.poids || this.calculateUsedWeight(container.items || [])
        },
        utilization: {
          volume: container.utilization?.volume || this.calculateVolumeUtilization(container),
          poids: container.utilization?.poids || this.calculateWeightUtilization(container)
        },
        color: this.getContainerColor(container.categorie),
        position: { x: index * 800, y: 0, z: 0 }
      };

      console.log('📏 Dimensions utilisées:', visualizationContainer.dimensions);
      console.log('📦 Nombre d\'items à placer:', visualizationContainer.items.length);

      // Calculer les positions des items dans le container
      this.calculateItemPositions(visualizationContainer);

      return visualizationContainer;
    });
  }

  private calculateUsedVolume(items: any[]): number {
    return items.reduce((total, item) => {
      const itemVolume = (item.longueur || 30) * (item.largeur || 25) * (item.hauteur || 20) / 1_000_000; // cm³ -> m³
      return total + (itemVolume * (item.quantite || 1));
    }, 0);
  }

  private calculateUsedWeight(items: any[]): number {
    return items.reduce((total, item) => {
      return total + ((item.poids || 2.5) * (item.quantite || 1));
    }, 0);
  }

  private calculateVolumeUtilization(container: any): number {
    const usedVolume = this.calculateUsedVolume(container.items || []);

    // Utiliser les vraies dimensions du conteneur
    const containerDims = {
      longueur: container.dimensions?.longueur || 1200,
      largeur: container.dimensions?.largeur || 240,
      hauteur: container.dimensions?.hauteur || 260
    };

    // Calculer le volume du conteneur en m³
    const containerVolume = (containerDims.longueur * containerDims.largeur * containerDims.hauteur) / 1_000_000;

    console.log('Dimensions conteneur:', containerDims);
    console.log('Volume conteneur:', containerVolume, 'm³');
    console.log('Volume utilisé:', usedVolume, 'm³');
    console.log('Utilisation calculée:', (usedVolume / containerVolume) * 100, '%');

    return containerVolume > 0 ? (usedVolume / containerVolume) * 100 : 0;
  }

  private calculateWeightUtilization(container: any): number {
    const usedWeight = this.calculateUsedWeight(container.items || []);

    // Utiliser la capacité réelle du conteneur ou une valeur par défaut basée sur le type
    const maxWeight = container.capacity?.poids ||
      (container.categorie === 'conteneur' ? 28000 : 40000); // 28T conteneur, 40T camion

    console.log('Poids utilisé:', usedWeight, 'kg');
    console.log('Capacité poids:', maxWeight, 'kg');
    console.log('Utilisation poids:', (usedWeight / maxWeight) * 100, '%');

    return maxWeight > 0 ? (usedWeight / maxWeight) * 100 : 0;
  }

  /**
   * Convertit les items de simulation en items visualisables
   */
  private convertItemsToVisualization(items: any[], containerId: string): VisualizationItem[] {
    console.log('🔍 Items reçus du backend:', items); // ← Ajoutez cette ligne

    return items.map((item, index) => ({
      id: `${containerId}-item-${index}`,
      reference: item.reference || `REF-${index}`,
      type: item.type || 'Colis',
      dimensions: {
        longueur: item.longueur || 30,
        largeur: item.largeur || 25,
        hauteur: item.hauteur || 20
      },
      position: { x: 0, y: 0, z: 0 }, // Sera calculé plus tard
      color: item.couleur || ColorUtils.getColorByType(item.type || 'default'),
      poids: item.poids || 0,
      quantite: item.quantite || 1,
      fragile: item.fragile || false,
      gerbable: item.gerbable !== false, // true par défaut
      nomDestinataire: item.nomDestinataire,
      adresse: item.adresse,
      telephone: item.telephone
    }));
  }

  /**
  * Calcule les positions des items dans un container - VERSION FINALE
  */
  private calculateItemPositions(container: VisualizationContainer): void {
    if (!container.items?.length) return;

    console.log('📦 Calcul des positions pour container:', container.dimensions);

    const margin = 20;
    const spacing = 5;
    const maxX = container.dimensions.longueur - margin;
    const maxY = container.dimensions.largeur - margin;
    const maxZ = container.dimensions.hauteur - margin;

    let currentX = margin;
    let currentY = margin;
    let currentZ = margin;
    let currentRowMaxWidth = 0;
    let currentLayerMaxHeight = 0;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    container.items.forEach((item, index) => {
      const { longueur, largeur, hauteur } = item.dimensions;

      // Vérification CORRECTE : est-ce que l'item entier rentre ?
      if (currentX + longueur > maxX) {
        console.log(`⬅️ Item ${index + 1}: Fin de ligne (${currentX} + ${longueur} > ${maxX})`);

        currentX = margin;
        currentY += currentRowMaxWidth + spacing;
        currentRowMaxWidth = 0;

        if (currentY + largeur > maxY) {
          console.log(`⬆️ Item ${index + 1}: Fin de couche (${currentY} + ${largeur} > ${maxY})`);

          currentY = margin;
          currentZ += currentLayerMaxHeight + spacing;
          currentLayerMaxHeight = 0;

          if (currentZ + hauteur > maxZ) {
            console.log(`❌ Item ${index + 1}: Ne rentre pas (${currentZ} + ${hauteur} > ${maxZ})`);
            item.position = { x: margin, y: margin, z: margin };
            item.opacity = 0.3;
            return;
          }
        }
      }

      // Position cible avant clamp
      let targetX = currentX;
      let targetY = currentY;
      let targetZ = currentZ;

      // Convertir en centres et appliquer le clamp dans les limites du conteneur
      const halfItemX = longueur / 2;
      const halfItemY = largeur / 2;
      const halfItemZ = hauteur / 2;

      const containerLen = container.dimensions.longueur;
      const containerWid = container.dimensions.largeur;
      const containerHei = container.dimensions.hauteur;

      const centerX = clamp(targetX + halfItemX, halfItemX, containerLen - halfItemX);
      const centerY = clamp(targetY + halfItemY, halfItemY, containerWid - halfItemY);
      const centerZ = clamp(targetZ + halfItemZ, halfItemZ, containerHei - halfItemZ);

      // Revenir aux positions d'origine (coin) après clamp des centres
      item.position = {
        x: centerX - halfItemX,
        y: centerY - halfItemY,
        z: centerZ - halfItemZ
      };
      item.opacity = 1.0;

      console.log(`✅ Item ${index + 1}: placé à x=${currentX}, y=${currentY}, z=${currentZ} (limite: ${maxX}, ${maxY}, ${maxZ})`);

      currentX += longueur + spacing;
      currentRowMaxWidth = Math.max(currentRowMaxWidth, largeur);
      currentLayerMaxHeight = Math.max(currentLayerMaxHeight, hauteur);
    });
  }

  /**
   * Estime une dimension à partir du volume (pour les containers sans dimensions explicites)
   */
  private estimateDimensionFromVolume(volume: number): number {
    // Volume approximatif basé sur des ratios standards de containers
    const cubicRoot = Math.pow(volume, 1 / 3);
    return Math.round(cubicRoot * 100); // Conversion en cm
  }

  /**
   * Obtient la couleur d'un container selon sa catégorie
   */
  private getContainerColor(categorie: string): string {
    const colors = {
      'camion': '#FF6B35',
      'conteneur': '#004AAD',
      'default': '#666666'
    };
    return colors[categorie as keyof typeof colors] || colors.default;
  }

  // Getters pour les états actuels
  getCurrentScene(): VisualizationScene {
    return this.sceneSubject.getValue();
  }

  getCurrentConfig(): VisualizationConfig {
    return this.configSubject.getValue();
  }

  getCurrentViewport(): ViewportSettings {
    return this.viewportSubject.getValue();
  }

  // Méthodes de mise à jour
  updateScene(updates: Partial<VisualizationScene>): void {
    const currentScene = this.getCurrentScene();
    this.sceneSubject.next({ ...currentScene, ...updates });
  }

  updateConfig(updates: Partial<VisualizationConfig>): void {
    const currentConfig = this.getCurrentConfig();
    this.configSubject.next({ ...currentConfig, ...updates });
  }

  updateViewport(updates: Partial<ViewportSettings>): void {
    const currentViewport = this.getCurrentViewport();
    this.viewportSubject.next({ ...currentViewport, ...updates });
  }

  // Sélection d'éléments
  selectItem(item: VisualizationItem): void {
    this.updateScene({ selectedItem: item });
  }

  selectContainer(container: VisualizationContainer): void {
    this.updateScene({ selectedContainer: container });
  }

  clearSelection(): void {
    this.updateScene({ selectedItem: undefined, selectedContainer: undefined });
  }

  // Navigation entre containers
  nextContainer(): void {
    const scene = this.getCurrentScene();
    if (scene.containers.length > 1) {
      const nextIndex = (scene.currentContainerIndex + 1) % scene.containers.length;
      this.updateScene({ currentContainerIndex: nextIndex });
    }
  }

  previousContainer(): void {
    const scene = this.getCurrentScene();
    if (scene.containers.length > 1) {
      const prevIndex = scene.currentContainerIndex > 0
        ? scene.currentContainerIndex - 1
        : scene.containers.length - 1;
      this.updateScene({ currentContainerIndex: prevIndex });
    }
  }

  // États par défaut
  private getDefaultScene(): VisualizationScene {
    return {
      containers: [],
      viewMode: 'individual',
      renderMode: '3d',
      currentContainerIndex: 0
    };
  }

  private getDefaultConfig(): VisualizationConfig {
    return {
      showDimensions: true,
      showWeights: false,
      showDestinations: false,
      showFragileItems: true,
      highlightNonGerbable: true,
      colorMode: 'type',
      animationEnabled: true,
      animationDuration: 1000,
      showTooltips: true,
      enableSelection: true
    };
  }

  private getDefaultViewport(): ViewportSettings {
    return {
      zoom: 1,
      rotation: { x: -0.3, y: 0.5, z: 0 },
      center: { x: 0, y: 0, z: 0 },
      perspective: true,
      showWireframe: false,
      showAxes: true,
      showGrid: true,
      showDimensions: true,
      backgroundColor: '#f5f5f5'
    };
  }
}
