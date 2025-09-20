// src/app/features/visualization/visualization.component.ts

import { Component, OnInit, OnDestroy, Inject, ViewChild, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Imports des composants de visualisation
import { CanvasComponent } from './components/canvas/canvas.component';
import { SceneComponent } from './components/scene/scene.component';
import { PanelComponent } from './components/panel/panel.component';

// Imports des services et modèles
import { VisualizationService } from './services/visualization.service';
import {
  VisualizationScene,
  VisualizationConfig,
  ViewportSettings
} from './models/visualization.model';
import { SimulationData } from './models/placement.model';
import { ExportService } from './services/export-clean.service';
import { ExportLogidooService } from './services/export-logidoo.service';


@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CanvasComponent,
    SceneComponent,
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
  current2DView: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back' = 'top';
  sidebarCollapsed = false;

  // État du menu d'export
  showExportMenu = false;

  private destroy$ = new Subject<void>();
  private isInitializing = false;

  // Références aux vues pour déclencher un reset contextuel
  @ViewChild(CanvasComponent) private canvasComp?: CanvasComponent;
  @ViewChild(SceneComponent) private sceneComp?: SceneComponent;

  constructor(
    private visualizationService: VisualizationService,
    private router: Router,
    private route: ActivatedRoute,
    private exportService: ExportService,
    private exportLogidooService: ExportLogidooService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // S'abonner d'abord pour capter le prochain état de scène
    this.subscribeToVisualizationState();
    // Puis initialiser la visualisation (déclenche le chargement)
    this.initializeVisualization();

    // Écouter les changements de visibilité pour détecter les retours de l'utilisateur
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkForDataUpdates();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Listener pour fermer le menu quand on clique ailleurs
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const exportDropdown = document.querySelector('.export-dropdown');
    
    if (exportDropdown && !exportDropdown.contains(target)) {
      this.showExportMenu = false;
    }
  }

  /**
   * Initialise la visualisation avec les données reçues
   */
  private initializeVisualization(): void {
    console.log('🎯 INIT: Début initialisation visualisation');

    const isBrowser = isPlatformBrowser(this.platformId);
    if (isBrowser) {
      // Utiliser requestAnimationFrame pour éviter de bloquer le thread principal
      requestAnimationFrame(() => {
        this.loadDataFromSources();
      });
    } else {
      this.error = 'Données non disponibles côté serveur';
      this.loading = false;
    }
  }

  /**
   * Charge les données depuis différentes sources de manière optimisée
   */
  private loadDataFromSources(): void {
    // Vérifier sessionStorage immédiatement
    try {
      const sessionData = sessionStorage.getItem('simulationData');
      console.log('💾 SessionStorage data:', sessionData ? 'TROUVÉ' : 'VIDE');

      if (sessionData) {
        try {
          this.simulationData = JSON.parse(sessionData);
          console.log('✅ Données récupérées:', this.simulationData);
          this.loadVisualizationAsync();
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
        this.loadVisualizationAsync();
        return;
      }
    } catch (e) {
      console.warn('Accès à history.state indisponible:', e);
    }

    console.log('❌ Aucune donnée trouvée');
    this.error = 'Aucune donnée de simulation disponible';
    this.loading = false;
  }

  /**
   * Charge la visualisation avec les données disponibles (version asynchrone)
   */
  private loadVisualizationAsync(): void {
    if (!this.simulationData) {
      this.error = 'Données de simulation manquantes';
      this.loading = false;
      return;
    }

    try {
      // Activer l'état de chargement et masquer l'ancienne scène
      this.isInitializing = true;
      this.loading = true;
      this.error = null;
      this.scene = null;

      console.log('📡 Initialisation du service de visualisation avec:', this.simulationData);

      // Différer l'initialisation pour permettre au loader de s'afficher
      setTimeout(() => {
        this.visualizationService.initializeVisualization(this.simulationData!);
      }, 100);

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la visualisation:', error);
      this.error = 'Erreur lors du chargement de la visualisation';
      this.loading = false;
    }
  }

  /**
   * Charge la visualisation avec les données disponibles (version synchrone, dépréciée)
   */
  private loadVisualization(): void {
    this.loadVisualizationAsync();
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
    // Écouter les changements de scène avec optimisation
    this.visualizationService.scene$
      .pipe(
        takeUntil(this.destroy$),
        // Éviter les mises à jour trop fréquentes
        // debounceTime(50)
      )
      .subscribe(scene => {
        console.log('🎬 Scene mise à jour:', scene);

        // Utiliser requestAnimationFrame pour les mises à jour visuelles
        requestAnimationFrame(() => {
          this.scene = scene;

          // Désactiver le loader après réception d'une nouvelle scène post-init
          if (this.isInitializing) {
            console.log('✅ Visualisation initialisée, arrêt du loading');
            this.loading = false;
            this.isInitializing = false;
          }
        });
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
    console.log(`🔄 Changement de vue: ${this.currentView} → ${this.currentView === '2d' ? '3d' : '2d'}`);
    console.log('État actuel - scene:', !!this.scene, 'loading:', this.loading);
    this.currentView = this.currentView === '2d' ? '3d' : '2d';
    this.visualizationService.updateScene({
      renderMode: this.currentView
    });
    console.log('Nouvelle vue:', this.currentView);
  }

  /**
   * Change la vue 2D (plan, dessous, côtés, etc.)
   */
  change2DView(newView: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back'): void {
    if (this.current2DView !== newView) {
      console.log(`🔄 Changement de vue 2D: ${this.current2DView} → ${newView}`);
      this.current2DView = newView;
      
      // Appliquer le changement au composant canvas
      if (this.canvasComp && this.canvasComp.changeView) {
        this.canvasComp.changeView(newView);
      }
    }
  }

  /**
   * Bascule l'affichage de la barre latérale
   */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Bascule l'affichage du menu d'export
   */
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  /**
   * Cache le menu d'export
   */
  hideExportMenu(): void {
    this.showExportMenu = false;
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
   * Vérifie s'il y a de nouvelles données depuis la simulation
   */
  private checkForDataUpdates(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const sessionData = sessionStorage.getItem('simulationData');
      if (sessionData) {
        const newData = JSON.parse(sessionData);

        // Comparer avec les données actuelles
        if (this.hasDataChanged(newData)) {
          console.log('🔄 Nouvelles données détectées, mise à jour de la visualisation');
          this.simulationData = newData;
          this.loadVisualizationAsync();
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la vérification des mises à jour:', error);
    }
  }

  /**
   * Vérifie si les données ont changé
   */
  private hasDataChanged(newData: any): boolean {
    if (!this.simulationData || !newData) return true;

    // Comparer les timestamps
    if (newData.timestamp && this.simulationData.timestamp) {
      return newData.timestamp > this.simulationData.timestamp;
    }

    // Comparer le nombre de conteneurs
    const currentContainers = this.simulationData.resultats?.containers?.length || 0;
    const newContainers = newData.resultats?.containers?.length || 0;

    if (currentContainers !== newContainers) return true;

    // Comparer les IDs des conteneurs
    const currentIds = this.simulationData.resultats?.containers?.map((c: any) => c.id || c.ref).join(',') || '';
    const newIds = newData.resultats?.containers?.map((c: any) => c.id || c.ref).join(',') || '';

    return currentIds !== newIds;
  }

  /**
   * Retour à la simulation
  */
  goBackToSimulation(): void {
    this.router.navigate(['/simulation'], {
      state: { simulationData: this.simulationData }
    });
  }

  /**
   * Exportation de la visualisation avec toutes les vues
   */
  exportVisualization(): void {
    if (!this.scene) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportType = prompt(
      'Type d\'export:\n' +
      '1 - PNG (vue actuelle)\n' +
      '2 - PNG (toutes les vues 3D/2D)\n' +
      '3 - PNG (toutes les vues 2D uniquement)\n' +
      '4 - PDF (vue actuelle)\n' +
      '5 - PDF (toutes les vues 3D/2D)\n' +
      '6 - PDF (toutes les vues 2D uniquement)\n' +
      '7 - JSON (données)\n' +
      '8 - Package complet (ZIP)\n' +
      'Entrez le numéro:', 
      '6'
    );

    switch (exportType) {
      case '1':
        this.exportCurrentViewAsPNG();
        break;
      case '2':
        this.exportAllViewsAsPNG();
        break;
      case '3':
        this.exportAll2DViewsAsPNG();
        break;
      case '4':
        this.exportCurrentViewAsPDF();
        break;
      case '5':
        this.exportAllViewsAsPDF();
        break;
      case '6':
        this.exportAll2DViewsAsPDF();
        break;
      case '7':
        this.exportAsJSON();
        break;
      case '8':
        this.exportCompletePackage();
        break;
      default:
        console.log('Export annulé');
    }
  }

  /**
   * Export PNG de la vue actuelle
   */
  exportCurrentViewAsPNG(): void {
    if (this.currentView === '2d') {
      const canvasElement = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      if (canvasElement) {
        this.exportService.exportCanvasToPNG(canvasElement, `simulation-2d-${this.getSimulationTitle()}`);
      } else {
        alert('❌ Canvas 2D non trouvé');
      }
    } else {
      this.export3DCanvas();
    }
  }

  /**
   * Export PNG de toutes les vues
   */
  async exportAllViewsAsPNG(): Promise<void> {
    try {
      console.log('📸 Export de toutes les vues...');
      await this.exportService.exportAllViewsToPNG(`simulation-${this.getSimulationTitle()}`);
      
      // Afficher une notification de succès
      this.showNotification('✅ Export PNG réussi pour toutes les vues', 'success');
    } catch (error) {
      console.error('❌ Erreur export PNG toutes vues:', error);
      this.showNotification('❌ Erreur lors de l\'export PNG', 'error');
    }
  }

  /**
   * Export PDF de la vue actuelle
   */
  async exportCurrentViewAsPDF(): Promise<void> {
    try {
      let canvasDataUrl: string | undefined;

      if (this.currentView === '2d') {
        const canvasElement = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
        canvasDataUrl = canvasElement?.toDataURL('image/png');
      } else {
        const threeCanvas = this.findThreeJSCanvas();
        canvasDataUrl = threeCanvas?.toDataURL('image/png');
      }

      await this.exportService.exportToPDF(this.scene!, { 
        includeAllViews: false,
        view2D: this.currentView === '2d' ? canvasDataUrl : undefined,
        view3D: this.currentView === '3d' ? canvasDataUrl : undefined
      });
      
      this.showNotification('✅ Export PDF réussi', 'success');
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      this.showNotification('❌ Erreur lors de l\'export PDF', 'error');
    }
  }

  /**
   * Export PDF avec toutes les vues
   */
  async exportAllViewsAsPDF(): Promise<void> {
    try {
      console.log('📄 Export PDF avec toutes les vues 2D...');
      
      this.showNotification('📄 Génération du rapport avec toutes les vues 2D...', 'info');
      
      // Utiliser la nouvelle méthode qui capture toutes les vues 2D
      await this.exportService.exportToPDFWithAll2DViews(this.scene!);
      
      this.showNotification('✅ Rapport PDF multi-vues 2D généré avec succès', 'success');
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      this.showNotification('❌ Erreur lors de la génération du rapport', 'error');
    }
  }

  /**
   * Export package complet avec image camion et calculs
   */
  async exportCompletePackage(): Promise<void> {
    try {
      console.log('📦 Création du rapport complet avec calculs...');
      
      this.showNotification('📦 Création du rapport complet avec calculs...', 'info');
      
      // Utilise le service Logidoo pour un rapport complet avec image camion et calculs
      await this.exportLogidooService.exportToPDFWithAll2DViewsAndColors(this.scene!);
      
      this.showNotification('✅ Rapport complet créé avec succès !', 'success');
    } catch (error) {
      console.error('❌ Erreur rapport complet:', error);
      this.showNotification('❌ Erreur lors de la création du rapport', 'error');
    }
  }

  /**
   * Export JSON (existant, légèrement modifié)
   */
  public exportAsJSON(): void {
    this.exportService.exportDataToJSON(this.scene!, `simulation-data-${this.getSimulationTitle()}`);
  }

  /**
   * Export PNG de toutes les vues 2D (plan, dessous, côtés, etc.)
   */
  public async exportAll2DViewsAsPNG(): Promise<void> {
    try {
      console.log('📸 Export de toutes les vues 2D...');
      this.showNotification('📸 Export de toutes les vues 2D...', 'info');
      
      await this.exportService.exportAll2DViewsToPNG(`simulation-2d-vues-${this.getSimulationTitle()}`);
      
      this.showNotification('✅ Export PNG de toutes les vues 2D réussi', 'success');
    } catch (error) {
      console.error('❌ Erreur export PNG toutes vues 2D:', error);
      this.showNotification('❌ Erreur lors de l\'export PNG des vues 2D', 'error');
    }
  }

  /**
   * Export PDF de toutes les vues 2D (plan, dessous, côtés, etc.)
   */
  public async exportAll2DViewsAsPDF(): Promise<void> {
    try {
      console.log('📄 Export PDF de toutes les vues 2D...');
      this.showNotification('📄 Export PDF de toutes les vues 2D...', 'info');
      
      await this.exportService.exportToPDFWithAll2DViews(this.scene!);
      
      this.showNotification('✅ Export PDF de toutes les vues 2D réussi', 'success');
    } catch (error) {
      console.error('❌ Erreur export PDF toutes vues 2D:', error);
      this.showNotification('❌ Erreur lors de l\'export PDF des vues 2D', 'error');
    }
  }

  /**
   * Export PDF avec design professionnel Logidoo
   */
  public async exportLogidooPDF(): Promise<void> {
    try {
      console.log('🎨 Export PDF Logidoo professionnel...');
      this.showNotification('🎨 Export PDF avec design Logidoo...', 'info');
      
      await this.exportLogidooService.exportToPDFWithAll2DViews(this.scene!);
      
      this.showNotification('✅ Export PDF Logidoo réussi', 'success');
    } catch (error) {
      console.error('❌ Erreur export PDF Logidoo:', error);
      this.showNotification('❌ Erreur lors de l\'export PDF Logidoo', 'error');
    }
  }

  /**
   * Export 3D Canvas (méthode existante améliorée)
   */
  private export3DCanvas(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas3D = this.findThreeJSCanvas();

        if (canvas3D) {
          console.log('✅ Canvas 3D trouvé:', canvas3D.width + 'x' + canvas3D.height);

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

  /**
   * Méthode utilitaire pour trouver le canvas Three.js
   */
  private findThreeJSCanvas(): HTMLCanvasElement | null {
    // Méthode 1: Sélecteur direct
    let canvas3D: HTMLCanvasElement | null = document.querySelector('app-scene canvas');
    if (canvas3D) return canvas3D;

    // Méthode 2: Chercher dans le container de scène
    const sceneContainer = document.querySelector('.scene-container');
    if (sceneContainer) {
      canvas3D = sceneContainer.querySelector('canvas');
      if (canvas3D) return canvas3D;
    }

    // Méthode 3: Prendre le canvas le plus récent
    const allCanvas = document.querySelectorAll('canvas');
    if (allCanvas.length > 1) {
      return allCanvas[allCanvas.length - 1] as HTMLCanvasElement;
    }

    // Méthode 4: Chercher un canvas avec des dimensions importantes
    const canvasArray = Array.from(allCanvas);
    return canvasArray.find(c => c.width > 100 && c.height > 100) as HTMLCanvasElement || null;
  }

  /**
   * Méthode pour forcer le rendu avant export (utile pour Three.js)
   */
  private async forceRenderAndCapture(): Promise<{ view2D: string | null, view3D: string | null }> {
    // Forcer le rendu des composants
    if (this.sceneComp) {
      // Si le composant 3D a une méthode pour forcer le rendu
      // this.sceneComp.forceRender?.();
    }

    if (this.canvasComp) {
      // Si le composant 2D a une méthode pour forcer le rendu
      // this.canvasComp.forceRender?.();
    }

    // Attendre que les rendus se terminent
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    // Capturer les vues
    const allViews = await this.exportService.captureAll2DViews();
    return {
      view2D: allViews['top'] || allViews['side'] || null, // Prendre la première vue disponible comme 2D
      view3D: null // Pas de vue 3D dans le nouveau service
    };
  }

  /**
   * Affiche une notification temporaire
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles inline pour la notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '9999',
      padding: '12px 16px',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease-out',
      maxWidth: '300px'
    });

    // Couleurs selon le type
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type];

    // Ajouter au DOM et animer
    document.body.appendChild(notification);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Supprimer après 4 secondes
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 4000);
  }

  /**
   * Force l'actualisation des données depuis la simulation
   */
  forceRefresh(): void {
    console.log('🔄 Actualisation forcée des données');
    this.checkForDataUpdates();
  }

  /**
   * Réinitialisation de la vue
   */
  resetView(): void {
    // Réinitialise selon la vue active
    if (this.currentView === '2d') {
      this.canvasComp?.resetZoom();
    } else {
      this.sceneComp?.resetView();
    }

    // Mettre aussi à jour le viewport partagé pour garder la cohérence d'état
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


  
}

