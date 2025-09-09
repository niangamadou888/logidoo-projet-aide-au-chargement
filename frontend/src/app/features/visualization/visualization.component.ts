// src/app/features/visualization/visualization.component.ts

<<<<<<< HEAD
import { Component, OnInit, OnDestroy, Inject, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
=======
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Imports des composants de visualisation
import { CanvasComponent } from './components/canvas/canvas.component';
import { SceneComponent } from './components/scene/scene.component';
<<<<<<< HEAD
=======
import { ToolbarComponent } from './components/toolbar/toolbar.component';
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
import { PanelComponent } from './components/panel/panel.component';

// Imports des services et modèles
import { VisualizationService } from './services/visualization.service';
import {
  VisualizationScene,
  VisualizationConfig,
  ViewportSettings
} from './models/visualization.model';
import { SimulationData } from './models/placement.model';
import { ExportService } from './services/export.service';


@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [
    CommonModule,
    CanvasComponent,
    SceneComponent,
<<<<<<< HEAD
=======
    ToolbarComponent,
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
    PanelComponent
  ],
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.scss']
})
export class VisualizationComponent implements OnInit, OnDestroy {

  // État de la visualisation
  scene: VisualizationScene | null = null;
  config: VisualizationConfig | null = null;
  viewport: ViewportSettings | null = null;

  // États de l'interface
  loading = true;
  error: string | null = null;
  simulationData: SimulationData | null = null;

  // Variables pour la navigation
  currentView: '2d' | '3d' = '3d';
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();
<<<<<<< HEAD
  private isInitializing = false;

  // Références aux vues pour déclencher un reset contextuel
  @ViewChild(CanvasComponent) private canvasComp?: CanvasComponent;
  @ViewChild(SceneComponent) private sceneComp?: SceneComponent;
=======
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5

  constructor(
    private visualizationService: VisualizationService,
    private router: Router,
    private route: ActivatedRoute,
<<<<<<< HEAD
    private exportService: ExportService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // S'abonner d'abord pour capter le prochain état de scène
    this.subscribeToVisualizationState();
    // Puis initialiser la visualisation (déclenche le chargement)
    this.initializeVisualization();
=======
    private exportService: ExportService
  ) { }

  ngOnInit(): void {
    this.initializeVisualization();
    this.subscribeToVisualizationState();
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialise la visualisation avec les données reçues
   */
  private initializeVisualization(): void {
    console.log('🎯 INIT: Début initialisation visualisation');

<<<<<<< HEAD
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      // Vérifier sessionStorage immédiatement (navigateur uniquement)
      try {
        const sessionData = sessionStorage.getItem('simulationData');
        console.log('💾 SessionStorage data:', sessionData ? 'TROUVÉ' : 'VIDE');

        if (sessionData) {
          try {
            this.simulationData = JSON.parse(sessionData);
            console.log('✅ Données récupérées:', this.simulationData);
            this.loadVisualization();
            return;
          } catch (error) {
            console.error('❌ Erreur parsing:', error);
          }
        }
      } catch (e) {
        console.warn('SessionStorage non disponible:', e);
      }

      // Si pas de sessionStorage, essayer les autres méthodes
      try {
        console.log('🔍 Vérification history.state...');
        const historyState = window.history?.state;

        if (historyState?.simulationData) {
          console.log('✅ Trouvé dans history.state');
          this.simulationData = historyState.simulationData;
          this.loadVisualization();
          return;
        }
      } catch (e) {
        console.warn('Accès à history.state indisponible:', e);
      }
=======
    // Vérifier sessionStorage immédiatement
    const sessionData = sessionStorage.getItem('simulationData');
    console.log('💾 SessionStorage data:', sessionData ? 'TROUVÉ' : 'VIDE');

    if (sessionData) {
      try {
        this.simulationData = JSON.parse(sessionData);
        console.log('✅ Données récupérées:', this.simulationData);
        sessionStorage.removeItem('simulationData');
        this.loadVisualization();
        return;
      } catch (error) {
        console.error('❌ Erreur parsing:', error);
      }
    }

    // Si pas de sessionStorage, essayer les autres méthodes
    console.log('🔍 Vérification history.state...');
    const historyState = window.history.state;

    if (historyState?.simulationData) {
      console.log('✅ Trouvé dans history.state');
      this.simulationData = historyState.simulationData;
      this.loadVisualization();
      return;
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
    }

    console.log('❌ Aucune donnée trouvée');
    this.error = 'Aucune donnée de simulation disponible';
    this.loading = false;
  }

  /**
   * Charge la visualisation avec les données disponibles
   */
  private loadVisualization(): void {
    if (!this.simulationData) {
      this.error = 'Données de simulation manquantes';
      this.loading = false;
      return;
    }

    try {
<<<<<<< HEAD
      // Activer l'état de chargement et masquer l'ancienne scène
      this.isInitializing = true;
      this.loading = true;
      this.error = null;
      this.scene = null;
      // Initialiser la visualisation avec les données (asynchrone)
      this.visualizationService.initializeVisualization(this.simulationData);
=======
      // Initialiser la visualisation avec les données
      this.visualizationService.initializeVisualization(this.simulationData);
      this.loading = false;
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la visualisation:', error);
      this.error = 'Erreur lors du chargement de la visualisation';
      this.loading = false;
    }
  }

  /**
   * Charge la visualisation depuis un ID de simulation (future implémentation)
   */
  private loadVisualizationFromId(simulationId: string): void {
    // TODO: Implémenter la récupération des données depuis le backend
    console.log('Chargement de la simulation ID:', simulationId);
    this.error = 'Chargement depuis ID non encore implémenté';
    this.loading = false;
  }

  /**
   * S'abonne aux changements d'état de la visualisation
   */
  private subscribeToVisualizationState(): void {
    // Écouter les changements de scène
    this.visualizationService.scene$
      .pipe(takeUntil(this.destroy$))
      .subscribe(scene => {
        this.scene = scene;
<<<<<<< HEAD
        // Désactiver le loader après réception d'une nouvelle scène post-init
        if (this.isInitializing) {
          this.loading = false;
          this.isInitializing = false;
        }
=======
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
      });

    // Écouter les changements de configuration
    this.visualizationService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.config = config;
      });

    // Écouter les changements de viewport
    this.visualizationService.viewport$
      .pipe(takeUntil(this.destroy$))
      .subscribe(viewport => {
        this.viewport = viewport;
      });
  }

  /**
   * Bascule entre les vues 2D et 3D
   */
  toggleView(): void {
    this.currentView = this.currentView === '2d' ? '3d' : '2d';
    this.visualizationService.updateScene({
      renderMode: this.currentView
    });
  }

  /**
   * Bascule l'affichage de la barre latérale
   */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Navigation vers le conteneur suivant
   */
  nextContainer(): void {
    this.visualizationService.nextContainer();
  }

  /**
   * Navigation vers le conteneur précédent
   */
  previousContainer(): void {
    this.visualizationService.previousContainer();
  }

  /**
   * Retour à la simulation
   */
  goBackToSimulation(): void {
<<<<<<< HEAD
    this.router.navigate(['/simulation'], {
      state: { simulationData: this.simulationData }
    });
=======
    this.router.navigate(['/simulation']);
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
  }

  /**
   * Exportation de la visualisation (future implémentation)
   */
  /**
 * Exportation de la visualisation
 */
  exportVisualization(): void {
    if (!this.scene) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportType = prompt('Type d\'export:\n1 - PNG\n2 - PDF\n3 - JSON\nEntrez le numéro:', '1');

    switch (exportType) {
      case '1':
        this.exportAsPNG();
        break;
      case '2':
        this.exportAsPDF();
        break;
      case '3':
        this.exportAsJSON();
        break;
      default:
        console.log('Export annulé');
    }
  }

  private exportAsPNG(): void {
    if (this.currentView === '2d') {
      const canvasElement = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      if (canvasElement) {
        this.exportService.exportCanvasToPNG(canvasElement, `simulation-2d-${this.getSimulationTitle()}`);
      } else {
        alert('❌ Canvas 2D non trouvé');
      }
    } else {
      // Pour la 3D, attendre et forcer le rendu
      this.export3DCanvas();
    }
  }

  private export3DCanvas(): void {
    // Attendre que Three.js termine son rendu
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Double requestAnimationFrame pour être sûr

        // Chercher le canvas 3D de plusieurs façons
        let canvas3D: HTMLCanvasElement | null = null;

        // Méthode 1: Sélecteur direct
        canvas3D = document.querySelector('app-scene canvas');

        // Méthode 2: Chercher dans le container de scène
        if (!canvas3D) {
          const sceneContainer = document.querySelector('.scene-container');
          if (sceneContainer) {
            canvas3D = sceneContainer.querySelector('canvas');
          }
        }

        // Méthode 3: Prendre le canvas le plus récent (Three.js crée souvent le dernier)
        if (!canvas3D) {
          const allCanvas = document.querySelectorAll('canvas');
          if (allCanvas.length > 1) {
            canvas3D = allCanvas[allCanvas.length - 1] as HTMLCanvasElement;
          }
        }

        // Méthode 4: Chercher un canvas avec des dimensions importantes
        if (!canvas3D) {
          const allCanvas = Array.from(document.querySelectorAll('canvas'));
          canvas3D = allCanvas.find(c => c.width > 100 && c.height > 100) || null;
        }

        if (canvas3D) {
          console.log('✅ Canvas 3D trouvé:', canvas3D.width + 'x' + canvas3D.height);

          // Vérifier que le canvas n'est pas vide
          if (canvas3D.width > 0 && canvas3D.height > 0) {
            this.exportService.exportCanvasToPNG(canvas3D, `simulation-3d-${this.getSimulationTitle()}`);
          } else {
            alert('❌ Le canvas 3D est vide');
          }
        } else {
          alert('❌ Canvas 3D non trouvé');
          console.log('Tous les canvas:', document.querySelectorAll('canvas'));
        }
      });
    });
  }

  private async exportAsPDF(): Promise<void> {
    let canvasDataUrl: string | undefined;

    if (this.currentView === '2d') {
      const canvasElement = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      canvasDataUrl = canvasElement?.toDataURL('image/png');
    } else {
      const threeCanvas = document.querySelector('app-scene canvas') as HTMLCanvasElement;
      canvasDataUrl = threeCanvas?.toDataURL('image/png');
    }

    await this.exportService.exportToPDF(this.scene!, canvasDataUrl);
  }

  private exportAsJSON(): void {
    this.exportService.exportDataToJSON(this.scene!, `simulation-data-${this.getSimulationTitle()}`);
  }

  /**
   * Réinitialisation de la vue
   */
  resetView(): void {
<<<<<<< HEAD
    // Réinitialise selon la vue active
    if (this.currentView === '2d') {
      this.canvasComp?.resetZoom();
    } else {
      this.sceneComp?.resetView();
    }

    // Mettre aussi à jour le viewport partagé pour garder la cohérence d'état
=======
    // Créer les paramètres de viewport par défaut
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
    const defaultViewport: ViewportSettings = {
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
<<<<<<< HEAD
=======

>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
    this.visualizationService.updateViewport(defaultViewport);
  }

  /**
   * Obtient le titre de la simulation
   */
  getSimulationTitle(): string {
    return this.simulationData?.nom || 'Visualisation de simulation';
  }

  /**
   * Obtient le nombre total de containers
   */
  getTotalContainers(): number {
    return this.scene?.containers?.length || 0;
  }

  /**
   * Obtient le container actuellement affiché
   */
  getCurrentContainerName(): string {
    if (!this.scene?.containers?.length) return '';
    const current = this.scene.containers[this.scene.currentContainerIndex];
    return current?.type || `Container ${this.scene.currentContainerIndex + 1}`;
  }

  /**
   * Vérifie s'il y a plusieurs containers
   */
  hasMultipleContainers(): boolean {
    return (this.scene?.containers?.length || 0) > 1;
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
