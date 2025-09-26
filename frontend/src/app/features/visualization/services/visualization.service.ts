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
import { ConteneurService } from '../../../services/conteneur.service';
import { Contenant } from '../../../core/models/contenant.model';
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

  private containersCache: Record<string, Contenant> = {};

  constructor(private conteneurService: ConteneurService) { }

  /**
   * Initialise la visualisation avec les données de simulation
   */
  initializeVisualization(simulationData: SimulationData): void {
    console.log('Initialisation de la visualisation avec:', simulationData);

    
    // Tenter d'enrichir avec les dimensions exactes des contenants via l'API
    try {
      this.conteneurService.listerContenants().subscribe({
        next: (list) => {
          this.containersCache = {};
          for (const c of list || []) {
            if (c && c._id) this.containersCache[c._id] = c;
          }
          const containers = this.convertSimulationToContainers(simulationData);
          const scene: VisualizationScene = {
            containers,
            viewMode: containers.length === 1 ? 'individual' : 'all',
            renderMode: '3d',
            currentContainerIndex: 0
          };
          this.sceneSubject.next(scene);
        },
        error: (err) => {
          console.warn('Impossible de charger la liste des contenants pour enrichir les dimensions:', err);
          const containers = this.convertSimulationToContainers(simulationData);
          const scene: VisualizationScene = {
            containers,
            viewMode: containers.length === 1 ? 'individual' : 'all',
            renderMode: '3d',
            currentContainerIndex: 0
          };
          this.sceneSubject.next(scene);
        }
      });
    } catch (e) {
      console.warn('Erreur inattendue lors du chargement des contenants:', e);
      const containers = this.convertSimulationToContainers(simulationData);
      const scene: VisualizationScene = {
        containers,
        viewMode: containers.length === 1 ? 'individual' : 'all',
        renderMode: '3d',
        currentContainerIndex: 0
      };
      this.sceneSubject.next(scene);
    }
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

      // Essayer de récupérer les dimensions exactes depuis le cache par ref (ObjectId)
      const fromCache = container?.ref ? this.containersCache[container.ref] : undefined;

      let chosenDims: Dimensions3D = {
        longueur: container.dimensions?.longueur
          ?? fromCache?.dimensions?.longueur
          ?? container.capacity?.longueur
          ?? 1200,
        largeur: container.dimensions?.largeur
          ?? fromCache?.dimensions?.largeur
          ?? container.capacity?.largeur
          ?? 240,
        hauteur: container.dimensions?.hauteur
          ?? fromCache?.dimensions?.hauteur
          ?? container.capacity?.hauteur
          ?? 260
      };

      // Normaliser les unités: certaines sources stockent en mm, convertir en cm
      const looksLikeMM = (chosenDims.largeur >= 1000) || (chosenDims.hauteur >= 1000);
      if (looksLikeMM) {
        chosenDims = {
          longueur: chosenDims.longueur / 10,
          largeur: chosenDims.largeur / 10,
          hauteur: chosenDims.hauteur / 10
        };
      }

      // Calculs d'utilisation basés sur dimensions fiables
      const usedVolume = container.used?.volume ?? this.calculateUsedVolume(container.items || []);
      const containerVolume = (chosenDims.longueur * chosenDims.largeur * chosenDims.hauteur) / 1_000_000;
      const volumeUtilPercent = container.utilization?.volume ?? (containerVolume > 0 ? (usedVolume / containerVolume) * 100 : 0);
      const usedWeight = container.used?.poids ?? this.calculateUsedWeight(container.items || []);
      const maxWeight = container.capacity?.poids || (container.categorie === 'conteneur' ? 28000 : 40000);
      const weightUtilPercent = container.utilization?.poids ?? (maxWeight > 0 ? (usedWeight / maxWeight) * 100 : 0);

      const visualizationContainer: VisualizationContainer = {
        id: container.id || `container-${index}`,
        ref: container.ref,
        matricule: container.matricule || fromCache?.matricule || `CONT-${String(index + 1).padStart(3, '0')}`,
        type: container.type || fromCache?.type || 'Container',
        categorie: container.categorie || 'conteneur',
        dimensions: chosenDims,
        items: this.convertItemsToVisualization(container.items || [], container.id),
        capacity: {
          volume: container.capacity?.volume || 0,
          poids: container.capacity?.poids || 0
        },
        used: {
          volume: usedVolume,
          poids: usedWeight
        },
        utilization: {
          volume: volumeUtilPercent,
          poids: weightUtilPercent
        },
        color: this.getContainerColor(container.categorie),
        position: { x: index * 800, y: 0, z: 0 },
        images: container.images || fromCache?.images || []
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

    console.log('📦 Calcul des positions (optimisé, anti-collision) pour container:', container.dimensions);

    const containerDims: Dimensions3D = { ...container.dimensions };

    // 1) Ordonner les items pour limiter les trous (grands d'abord)
    const items = [...container.items];
    items.sort((a, b) => {
      const va = a.dimensions.longueur * a.dimensions.largeur * a.dimensions.hauteur;
      const vb = b.dimensions.longueur * b.dimensions.largeur * b.dimensions.hauteur;
      return vb - va;
    });

    const placed: Array<{ position: Position3D; dimensions: Dimensions3D; ref: string; gerbable?: boolean }> = [];

    // Générer toutes les orientations possibles (6 permutations)
    const orientations = (d: Dimensions3D): Dimensions3D[] => [
      { longueur: d.longueur, largeur: d.largeur, hauteur: d.hauteur },
      { longueur: d.longueur, largeur: d.hauteur, hauteur: d.largeur },
      { longueur: d.largeur, largeur: d.longueur, hauteur: d.hauteur },
      { longueur: d.largeur, largeur: d.hauteur, hauteur: d.longueur },
      { longueur: d.hauteur, largeur: d.longueur, hauteur: d.largeur },
      { longueur: d.hauteur, largeur: d.largeur, hauteur: d.longueur }
    ];

    // 2) Placement avec grille fine et anti-collision
    for (const item of items) {
      let placedOK = false;
      let chosenDims: Dimensions3D | null = null;
      let chosenPos: Position3D | null = null;

      // Essayer plusieurs orientations pour trouver un fit serré
      for (const orient of orientations(item.dimensions)) {
        // Filtrer si l'orientation ne rentre pas géométriquement
        if (
          orient.longueur > containerDims.longueur ||
          orient.largeur > containerDims.largeur ||
          orient.hauteur > containerDims.hauteur
        ) {
          continue;
        }

        // Recherche avec pas fin (5cm) pour combler les trous
        const pos = GeometryUtils.findBestPosition(
          containerDims,
          orient,
          placed.map(p => ({ position: p.position, dimensions: p.dimensions, gerbable: p.gerbable })),
          false,
          5
        );

        if (pos) {
          // Glisser au plus près des parois / colis pour limiter les trous au milieu
          const pushed = GeometryUtils.pushToWalls(
            pos,
            orient,
            containerDims,
            placed.map(p => ({ position: p.position, dimensions: p.dimensions, gerbable: p.gerbable })),
            2
          );
          chosenDims = orient;
          chosenPos = pushed;
          placedOK = true;
          break;
        }
      }

      if (!placedOK) {
        // Marquer comme non placé visuellement (semi-transparent), mais éviter chevauchement
        item.opacity = 0.3;
        item.position = { x: 0, y: 0, z: 0 };
        continue;
      }

      // Appliquer position + dimensions retenues
      item.position = chosenPos!;
      // Mettre à jour les dimensions si rotation appliquée
      item.dimensions = chosenDims!;
      item.opacity = 1.0;

      placed.push({ position: chosenPos!, dimensions: chosenDims!, ref: item.id, gerbable: item.gerbable });
    }

    // 3) Sécurité: vérifier qu'aucun colis ne se chevauche (log + ajustement léger)
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i];
        const B = placed[j];
        if (GeometryUtils.isOverlapping(A.position, A.dimensions, B.position, B.dimensions)) {
          // Décaler très légèrement B sur X si collision détectée
          const nudge = 1;
          const tryPos: Position3D = { ...B.position, x: Math.min(B.position.x + nudge, containerDims.longueur - B.dimensions.longueur) };
          if (!GeometryUtils.collides(tryPos, B.dimensions, placed.filter((_, k) => k !== j))) {
            B.position = tryPos;
          }
        }
      }
    }

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