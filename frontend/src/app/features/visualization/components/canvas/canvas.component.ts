// src/app/features/visualization/components/canvas/canvas.component.ts

import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  VisualizationScene, 
  VisualizationConfig, 
  ViewportSettings,
  VisualizationContainer,
  VisualizationItem 
} from '../../models/visualization.model';
import { VisualizationService } from '../../services/visualization.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit, OnChanges, OnDestroy {

  @Input() scene: VisualizationScene | null = null;
  @Input() config: VisualizationConfig | null = null;
  @Input() viewport: ViewportSettings | null = null;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Offscreen caching for static layer (container + items)
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private offscreenScale = 1; // pixels per unit (cm)
  private staticDirty = true; // marks when static layer needs rebuild

  // État du canvas
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Dimensions de rendu
  private containerDimensions = { width: 0, height: 0 };
  private padding = 50;

  // Mode de vue 2D: plan (dessus), dessous, côté, côté opposé, avant, arrière
  viewMode: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back' = 'top';

  private lastSelectedItemId: string | null = null;

  constructor(private visualizationService: VisualizationService) { }

  ngOnInit(): void {
    this.initializeCanvas();
    this.setupEventListeners();
    // Temporairement désactivé pour debugger les dimensions
    // this.setupResizeObserver();
    
    // Initialize container dimensions from DOM to avoid first draw with 0x0
    if (this.containerRef?.nativeElement) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      console.log('🔍 Dimensions initiales du container:', rect);
      this.containerDimensions = { width: rect.width, height: rect.height };
    }
    
    // Exposer la méthode changeView pour l'export
    this.exposeChangeViewMethod();
    
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scene'] || changes['config'] || changes['viewport']) {
      // Scene or configuration changed: rebuild static layer
      this.staticDirty = true;
      this.render();
    }

    // Recentrer si la sélection change
    if (changes['scene'] && this.scene) {
      const selectedId = this.scene.selectedItem?.id || null;
      if (selectedId && selectedId !== this.lastSelectedItemId) {
        this.lastSelectedItemId = selectedId;
        this.centerOnSelectedItem();
      } else if (!selectedId) {
        this.lastSelectedItemId = null;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Change la vue 2D (utilisé pour l'export de toutes les vues)
   */
  public changeView(newViewMode: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back'): void {
    if (newViewMode !== this.viewMode) {
      console.log(`🔄 Changement de vue: ${this.viewMode} → ${newViewMode}`);
      this.viewMode = newViewMode;
      this.staticDirty = true; // Marquer pour reconstruction
      this.render(); // Re-render avec la nouvelle vue
    }
  }

  /**
   * Récupère la vue actuelle
   */
  public getCurrentView(): 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back' {
    return this.viewMode;
  }

  /**
   * Expose la méthode changeView pour l'export programmatique
   */
  private exposeChangeViewMethod(): void {
    // Exposer la méthode changeView sur l'élément DOM pour accès externe
    const element = this.containerRef.nativeElement.closest('app-canvas');
    if (element) {
      (element as any).changeView = (viewMode: string) => {
        this.changeView(viewMode as any);
      };
      console.log('🔗 Méthode changeView exposée sur app-canvas');
    }
  }

  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    
    if (!this.ctx) {
      console.error('Impossible d\'initialiser le contexte 2D du canvas');
      return;
    }

    // Configurer le canvas pour les écrans haute résolution
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    console.log('🏗️ Initialisation canvas avec rect:', rect);
    
    // Validation des dimensions
    if (rect.width <= 0 || rect.height <= 0 || rect.height > 10000) {
      console.warn('⚠️ Dimensions d\'initialisation anormales, utilisation de valeurs par défaut');
      // Utiliser des dimensions par défaut raisonnables
      canvas.width = 800 * devicePixelRatio;
      canvas.height = 600 * devicePixelRatio;
      canvas.style.width = '800px';
      canvas.style.height = '600px';
      this.containerDimensions = { width: 800, height: 600 };
    } else {
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      this.containerDimensions = { width: rect.width, height: rect.height };
    }
    
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        console.log('🔍 ResizeObserver détecte un changement:', {
          contentRect: entry.contentRect,
          target: entry.target.tagName,
          className: entry.target.className
        });
        this.handleResize(entry.contentRect);
      }
    });
    
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private handleResize(rect: DOMRectReadOnly): void {
    console.log('📐 HandleResize appelé avec rect:', rect);
    
    // Validation des dimensions pour éviter les valeurs aberrantes
    if (rect.width <= 0 || rect.height <= 0 || rect.height > 10000) {
      console.warn('⚠️ Dimensions anormales détectées, ignorées:', rect);
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    if (this.ctx) {
      this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    this.containerDimensions = { width: rect.width, height: rect.height };
    this.render();
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    // Mouse events pour le pan et zoom
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));

    // Empêcher le menu contextuel
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Écouter les événements de changement de vue pour l'export
    const container = this.containerRef.nativeElement.closest('app-canvas');
    if (container) {
      container.addEventListener('changeView', (event: any) => {
        const newViewMode = event.detail?.viewMode;
        if (newViewMode && newViewMode !== this.viewMode) {
          console.log(`🔄 Changement de vue: ${this.viewMode} → ${newViewMode}`);
          this.viewMode = newViewMode;
          this.staticDirty = true; // Marquer pour reconstruction
          this.render(); // Re-render avec la nouvelle vue
        }
      });
    }
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.canvasRef.nativeElement.style.cursor = 'grabbing';
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      this.offsetX += deltaX;
      this.offsetY += deltaY;
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      this.render();
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.canvasRef.nativeElement.style.cursor = 'grab';
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = this.scale * zoomFactor;
    
    // Limiter le zoom
    if (newScale >= 0.1 && newScale <= 5) {
      this.scale = newScale;
      this.render();
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const container = this.scene?.containers[this.scene?.currentContainerIndex || 0];
    if (!container) return;

    // Reproduire les transformations appliquées dans draw()
    const base = this.getProjectedContainerSize(container);
    const baseW = base.width;
    const baseH = base.height;
    const containerScale = Math.min(
      (this.containerDimensions.width - 2 * this.padding) / baseW,
      (this.containerDimensions.height - 2 * this.padding) / baseH
    ) * 0.8;
    const unitScale = this.offscreenScale || 1;
    const sceneScale = containerScale / unitScale;

    // Espace calque offscreen centré
    const ox = (x - (this.offsetX + this.containerDimensions.width / 2)) / (this.scale * sceneScale);
    const oy = (y - (this.offsetY + this.containerDimensions.height / 2)) / (this.scale * sceneScale);

    // Chercher l'item le plus proche visuellement (ordre inverse de dessin)
    const itemsInDepth = [...container.items].sort((a, b) => this.getDepth(b) - this.getDepth(a));
    const hit = itemsInDepth.find(item => {
      const r = this.getProjectedItemRectPx(item, container, unitScale);
      return ox >= r.x && ox <= r.x + r.width && oy >= r.y && oy <= r.y + r.height;
    });

    if (hit) {
      this.selectAndCenter(hit, container, unitScale, sceneScale);
    }
  }

  private render(): void {
    console.log('🎨 Canvas render() appelé - Contexte:', {
      ctx: !!this.ctx,
      scene: !!this.scene,
      containerDimensions: this.containerDimensions,
      viewMode: this.viewMode
    });
    
    if (!this.ctx || !this.scene) {
      console.log('⚠️ Arrêt du rendu - contexte ou scène manquant');
      return;
    }

    // Annuler l'animation précédente
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      console.log('🖼️ Animation frame - début du draw()');
      this.draw();
    });
  }

  private draw(): void {
    console.log('🖌️ Draw() appelé');
    
    if (!this.ctx || !this.scene) {
      console.log('⚠️ Draw arrêté - contexte ou scène manquant');
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const { width, height } = this.containerDimensions;
    
    console.log('📏 Dimensions canvas:', { width, height, canvasWidth: canvas.width, canvasHeight: canvas.height });

    // Effacer le canvas avec un arrière-plan blanc pour les exports
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    console.log('🧹 Canvas effacé avec fond blanc');

    // Dessiner le conteneur actuel via un calque offscreen mis en cache
    const currentContainer = this.scene.containers[this.scene.currentContainerIndex];
    if (currentContainer) {
      console.log('📦 Conteneur actuel:', currentContainer.id, this.scene.currentContainerIndex);
      this.buildOffscreenIfNeeded(currentContainer);

      // Calculer l'échelle d'affichage pour ajuster le calque offscreen au viewport
      const base = this.getProjectedContainerSize(currentContainer);
      const baseW = base.width;
      const baseH = base.height;
      const containerScale = Math.min(
        (this.containerDimensions.width - 2 * this.padding) / baseW,
        (this.containerDimensions.height - 2 * this.padding) / baseH
      ) * 0.8;

      const sceneScale = containerScale / this.offscreenScale;

      // Appliquer les transformations (pan + zoom + adaptation au viewport)
      this.ctx.save();
      this.ctx.translate(this.offsetX + width / 2, this.offsetY + height / 2);
      this.ctx.scale(this.scale * sceneScale, this.scale * sceneScale);

      if (this.offscreenCanvas) {
        const ow = this.offscreenCanvas.width;
        const oh = this.offscreenCanvas.height;
        // Le calque offscreen est centré sur l'origine
        this.ctx.drawImage(this.offscreenCanvas, -ow / 2, -oh / 2);

        // Surbrillance dynamique de l'élément sélectionné
        const selected = this.scene?.selectedItem;
        if (selected) {
          this.drawSelectedHighlight(this.ctx, selected, currentContainer, this.offscreenScale || 1);
        }
      }

      this.ctx.restore();
    }

    // Dessiner l'interface (non transformée)
    this.drawInterface();
  }

  // Construit ou reconstruit le calque offscreen pour le contenu statique
  private buildOffscreenIfNeeded(container: VisualizationContainer): void {
    if (!this.staticDirty && this.offscreenCanvas && this.offscreenCtx) return;

    const base = this.getProjectedContainerSize(container);
    const baseW = Math.max(1, base.width);
    const baseH = Math.max(1, base.height);

    // Choix d'une échelle offscreen bornée pour limiter la taille du canvas
    // On cible une dimension max ~1000px tout en limitant à 2px/unité
    const targetMaxPx = 1000;
    const maxUnit = Math.max(baseW, baseH);
    const scaleByMax = targetMaxPx / maxUnit;
    this.offscreenScale = Math.min(2, Math.max(0.5, scaleByMax));

    // Créer le canvas offscreen
    this.offscreenCanvas = document.createElement('canvas');
    const ow = Math.max(1, Math.round(baseW * this.offscreenScale));
    const oh = Math.max(1, Math.round(baseH * this.offscreenScale));
    this.offscreenCanvas.width = ow;
    this.offscreenCanvas.height = oh;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');

    if (!this.offscreenCtx) {
      // En cas d'échec, retomber sur le rendu direct
      this.offscreenCanvas = null;
      this.offscreenScale = 1;
      this.staticDirty = false;
      return;
    }

    // Nettoyer et centrer l'origine
    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, ow, oh);
    ctx.save();
    ctx.translate(ow / 2, oh / 2);

    // Dessiner le contenu statique à l'échelle offscreen
    this.drawContainerToCtx(ctx, container, this.offscreenScale);

    ctx.restore();
    this.staticDirty = false;
  }

  private drawContainerToCtx(
    ctx: CanvasRenderingContext2D,
    container: VisualizationContainer,
    unitScale: number
  ): void {
    // Contour du conteneur avec meilleure visibilité
    const base = this.getProjectedContainerSize(container);
    const baseW = base.width;
    const baseH = base.height;

    // Fond léger du conteneur pour meilleure visibilité
    ctx.fillStyle = 'rgba(240, 240, 240, 0.3)';
    ctx.fillRect(-baseW * unitScale / 2, -baseH * unitScale / 2, baseW * unitScale, baseH * unitScale);

    // Contour du conteneur plus visible
    ctx.strokeStyle = container.color || '#333333';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.strokeRect(-baseW * unitScale / 2, -baseH * unitScale / 2, baseW * unitScale, baseH * unitScale);

    // Items dessinés avec un tri par profondeur pour simuler l'occlusion
    const sorted = [...container.items].sort((a, b) => this.getDepth(a) - this.getDepth(b));
    for (const item of sorted) {
      this.drawItemToCtx(ctx, item, container, unitScale);
    }

    // Informations du conteneur
    this.drawContainerInfoToCtx(ctx, container, unitScale, baseW, baseH);
  }

  private drawItemToCtx(
    ctx: CanvasRenderingContext2D,
    item: VisualizationItem,
    container: VisualizationContainer,
    containerScale: number
  ): void {

    const { x, y, width, height } = this.getProjectedItemRectPx(item, container, containerScale);

    // Dessiner l'item (avec opacité si définie)
    const prevAlpha = ctx.globalAlpha;
    const alpha = typeof item.opacity === 'number' ? Math.max(0, Math.min(1, item.opacity)) : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = prevAlpha;

    // Contour
    ctx.strokeStyle = this.darkenColor(item.color, 20);
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, width, height);

    // Marqueurs spéciaux
    if (item.fragile && (this.config?.showFragileItems ?? true)) {
      this.drawFragileMarkerToCtx(ctx, x, y, width, height);
    }

    if (!item.gerbable && (this.config?.highlightNonGerbable ?? true)) {
      this.drawNonStackableMarkerToCtx(ctx, x, y, width, height);
    }

    // Texte (si assez de place)
    if (width > 40 && height > 20) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.type, x + width / 2, y + height / 2);
    }
  }

  // Calcul du rectangle projeté (coordonnées pixels du calque, origine centrée)
  private getProjectedItemRectPx(
    item: VisualizationItem,
    container: VisualizationContainer,
    unitScale: number
  ): { x: number, y: number, width: number, height: number } {
    let projContainerW: number;
    let projContainerH: number;
    let posX: number;
    let posY: number;
    let itemW: number;
    let itemH: number;

    if (this.viewMode === 'top' || this.viewMode === 'bottom') {
      projContainerW = container.dimensions.longueur;
      projContainerH = container.dimensions.largeur;
      posX = item.position.x;
      posY = item.position.y;
      itemW = item.dimensions.longueur;
      itemH = item.dimensions.largeur;
    } else if (this.viewMode === 'side' || this.viewMode === 'side-opposite') {
      projContainerW = container.dimensions.longueur;
      projContainerH = container.dimensions.hauteur;
      posX = item.position.x;
      posY = item.position.z;
      itemW = item.dimensions.longueur;
      itemH = item.dimensions.hauteur;
    } else { // 'back' | 'front'
      projContainerW = container.dimensions.largeur;
      projContainerH = container.dimensions.hauteur;
      posX = item.position.y;
      posY = item.position.z;
      itemW = item.dimensions.largeur;
      itemH = item.dimensions.hauteur;
    }

    const containerHalfWidth = projContainerW * unitScale / 2;
    const containerHalfHeight = projContainerH * unitScale / 2;

    const x = -containerHalfWidth + (posX * unitScale);
    const y = (this.viewMode === 'side' || this.viewMode === 'side-opposite' || this.viewMode === 'back' || this.viewMode === 'front')
      ? (containerHalfHeight - ((posY + itemH) * unitScale))
      : (-containerHalfHeight + (posY * unitScale));
    const width = itemW * unitScale;
    const height = itemH * unitScale;

    return { x, y, width, height };
  }

  private drawSelectedHighlight(
    ctx: CanvasRenderingContext2D,
    item: VisualizationItem,
    container: VisualizationContainer,
    unitScale: number
  ): void {
    const { x, y, width, height } = this.getProjectedItemRectPx(item, container, unitScale);

    ctx.save();
    // Halo extérieur
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 6;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, width, height);

    // Bordure en pointillé
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  private centerOnSelectedItem(): void {
    const container = this.scene?.containers[this.scene?.currentContainerIndex || 0];
    const selected = this.scene?.selectedItem;
    if (!container || !selected) return;

    // Déterminer et basculer vers la meilleure vue pour voir le package
    const bestView = this.getBestViewForItem(selected, container);
    if (bestView !== this.viewMode) {
      this.setViewMode(bestView);
    }

    const base = this.getProjectedContainerSize(container);
    const baseW = base.width;
    const baseH = base.height;
    const containerScale = Math.min(
      (this.containerDimensions.width - 2 * this.padding) / baseW,
      (this.containerDimensions.height - 2 * this.padding) / baseH
    ) * 0.8;
    const unitScale = this.offscreenScale || 1;
    const sceneScale = containerScale / unitScale;

    const r = this.getProjectedItemRectPx(selected, container, unitScale);
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;

    this.offsetX = -cx * this.scale * sceneScale;
    this.offsetY = -cy * this.scale * sceneScale;
    this.render();
  }

  private selectAndCenter(
    item: VisualizationItem,
    container: VisualizationContainer,
    unitScale: number,
    sceneScale: number
  ): void {
    // Propager la sélection via le service pour synchroniser tous les composants
    this.visualizationService.selectItem(item);

    // Déterminer et basculer vers la meilleure vue pour voir le package
    const bestView = this.getBestViewForItem(item, container);
    if (bestView !== this.viewMode) {
      this.setViewMode(bestView);
      // Après changement de vue, recalculer les dimensions et échelles
      const base = this.getProjectedContainerSize(container);
      const baseW = base.width;
      const baseH = base.height;
      const containerScale = Math.min(
        (this.containerDimensions.width - 2 * this.padding) / baseW,
        (this.containerDimensions.height - 2 * this.padding) / baseH
      ) * 0.8;
      const newUnitScale = this.offscreenScale || 1;
      const newSceneScale = containerScale / newUnitScale;
      
      // Centrer avec les nouvelles coordonnées projetées
      const r = this.getProjectedItemRectPx(item, container, newUnitScale);
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.offsetX = -cx * this.scale * newSceneScale;
      this.offsetY = -cy * this.scale * newSceneScale;
    } else {
      // Centrer immédiatement avec la vue actuelle
      const r = this.getProjectedItemRectPx(item, container, unitScale);
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.offsetX = -cx * this.scale * sceneScale;
      this.offsetY = -cy * this.scale * sceneScale;
    }
    
    this.lastSelectedItemId = item.id;
    this.render();
  }

  private drawFragileMarkerToCtx(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(x + width - 8, y + 8, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('!', x + width - 8, y + 11);
  }

  private drawNonStackableMarkerToCtx(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x, y, width, height);
  }

  private drawContainerInfoToCtx(
    ctx: CanvasRenderingContext2D,
    container: VisualizationContainer,
    unitScale: number,
    baseW: number,
    baseH: number
  ): void {
    const containerWidth = baseW * unitScale;
    const containerHeight = baseH * unitScale;

    // Titre du conteneur
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      container.type,
      0,
      -containerHeight / 2 - 20
    );

    // Dimensions
    ctx.font = '12px Arial';
    const dims = container.dimensions;
    const dimsText =
      this.viewMode === 'top'
        ? `${dims.longueur} × ${dims.largeur} cm (Plan)`
        : this.viewMode === 'bottom'
          ? `${dims.longueur} × ${dims.largeur} cm (Dessous)`
          : (this.viewMode === 'side' || this.viewMode === 'side-opposite')
            ? `${dims.longueur} × ${dims.hauteur} cm (${this.viewMode === 'side' ? 'Côté' : 'Côté opposé'})`
            : `${dims.largeur} × ${dims.hauteur} cm (${this.viewMode === 'back' ? 'Arrière' : 'Avant'})`;

    ctx.fillText(dimsText, 0, -containerHeight / 2 - 5);
  }

  private drawInterface(): void {
    if (!this.ctx) return;

    // Informations de zoom dans le coin
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 120, 50);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Zoom: ${Math.round(this.scale * 100)}%`, 20, 30);
    const vueLabel =
      this.viewMode === 'top' ? 'Plan'
      : this.viewMode === 'bottom' ? 'Dessous'
      : this.viewMode === 'side' ? 'Côté'
      : this.viewMode === 'side-opposite' ? 'Côté opposé'
      : this.viewMode === 'front' ? 'Avant'
      : 'Arrière';
    this.ctx.fillText(`Vue: ${vueLabel}`, 20, 45);
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Méthodes publiques appelées depuis le template
  zoomIn(): void {
    const newScale = this.scale * 1.2;
    if (newScale <= 5) {
      this.scale = newScale;
      this.render();
    }
  }

  zoomOut(): void {
    const newScale = this.scale * 0.8;
    if (newScale >= 0.1) {
      this.scale = newScale;
      this.render();
    }
  }

  resetZoom(): void {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.render();
  }

  // Changer de mode de vue 2D
  setViewMode(mode: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back'): void {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      // Vue changée => reconstruire le calque statique
      this.staticDirty = true;
      this.resetZoom();
    }
  }

  private getProjectedContainerSize(container: VisualizationContainer): { width: number, height: number } {
    if (this.viewMode === 'top' || this.viewMode === 'bottom') {
      return { width: container.dimensions.longueur, height: container.dimensions.largeur };
    } else if (this.viewMode === 'side' || this.viewMode === 'side-opposite') {
      return { width: container.dimensions.longueur, height: container.dimensions.hauteur };
    }
    // back / front
    return { width: container.dimensions.largeur, height: container.dimensions.hauteur };
  }

  // Mesure de profondeur selon la vue pour trier du plus éloigné au plus proche
  private getDepth(item: VisualizationItem): number {
    if (this.viewMode === 'top') {
      // Caméra au-dessus regardant vers -Z : profondeur = z du haut de l'item (plus grand = plus proche)
      return item.position.z + item.dimensions.hauteur;
    } else if (this.viewMode === 'bottom') {
      // Caméra en dessous regardant vers +Z : profondeur = distance au dessous (plus petit = plus loin)
      const containerH = this.scene?.containers[this.scene.currentContainerIndex]?.dimensions.hauteur || 0;
      return containerH - item.position.z;
    } else if (this.viewMode === 'side') {
      // Vue de côté (X/Z), profondeur le long de Y (largeur)
      return item.position.y + item.dimensions.largeur;
    } else if (this.viewMode === 'side-opposite') {
      // Vue côté opposé, profondeur inversée le long de Y
      const containerW = this.scene?.containers[this.scene.currentContainerIndex]?.dimensions.largeur || 0;
      return containerW - item.position.y;
    } else if (this.viewMode === 'back') {
      // Vue arrière (Y/Z), profondeur le long de X (longueur)
      return item.position.x + item.dimensions.longueur;
    }
    // Vue avant, profondeur inversée le long de X
    const containerL = this.scene?.containers[this.scene.currentContainerIndex]?.dimensions.longueur || 0;
    return containerL - item.position.x;
  }

  /**
   * Détermine la meilleure vue pour visualiser un package spécifique
   */
  private getBestViewForItem(item: VisualizationItem, container: VisualizationContainer): 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back' {
    const pos = item.position;
    const dims = item.dimensions;
    const containerDims = container.dimensions;
    
    // Calculer les positions relatives (0 à 1) du package dans le conteneur
    const relativeX = (pos.x + dims.longueur / 2) / containerDims.longueur; // Centre X normalisé
    const relativeY = (pos.y + dims.largeur / 2) / containerDims.largeur;   // Centre Y normalisé  
    const relativeZ = (pos.z + dims.hauteur / 2) / containerDims.hauteur;   // Centre Z normalisé
    
    // Calculer la visibilité dans chaque vue en fonction de la position et des obstacles
    const viewScores = {
      top: this.calculateViewScore(item, container, 'top'),
      bottom: this.calculateViewScore(item, container, 'bottom'),
      side: this.calculateViewScore(item, container, 'side'),
      'side-opposite': this.calculateViewScore(item, container, 'side-opposite'),
      front: this.calculateViewScore(item, container, 'front'),
      back: this.calculateViewScore(item, container, 'back')
    };
    
    // Retourner la vue avec le meilleur score
    const bestView = Object.entries(viewScores).reduce((best, [view, score]) => 
      score > best.score ? { view: view as keyof typeof viewScores, score } : best, 
      { view: 'top' as keyof typeof viewScores, score: -1 }
    );
    
    return bestView.view;
  }

  /**
   * Calcule un score de visibilité pour une vue donnée
   */
  private calculateViewScore(item: VisualizationItem, container: VisualizationContainer, view: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back'): number {
    const pos = item.position;
    const dims = item.dimensions;
    const containerDims = container.dimensions;
    
    let score = 0;
    
    // Score basé sur la position dans le conteneur (favoriser les éléments près des bords)
    switch (view) {
      case 'top':
        // Vue du dessus : favoriser les éléments en haut du conteneur
        score += (pos.z + dims.hauteur) / containerDims.hauteur * 30;
        // Pénalité si l'élément est caché par d'autres au-dessus
        score -= this.countItemsAbove(item, container) * 10;
        break;
        
      case 'bottom':
        // Vue du dessous : favoriser les éléments en bas du conteneur
        score += (1 - pos.z / containerDims.hauteur) * 30;
        // Pénalité si l'élément est caché par d'autres en dessous
        score -= this.countItemsBelow(item, container) * 10;
        break;
        
      case 'side':
        // Vue de côté : favoriser les éléments près du côté droit (Y+)
        score += (pos.y + dims.largeur) / containerDims.largeur * 30;
        // Pénalité si l'élément est caché par d'autres devant
        score -= this.countItemsInFront(item, container, 'side') * 10;
        break;
        
      case 'side-opposite':
        // Vue du côté opposé : favoriser les éléments près du côté gauche (Y-)
        score += (1 - pos.y / containerDims.largeur) * 30;
        // Pénalité si l'élément est caché par d'autres devant
        score -= this.countItemsInFront(item, container, 'side-opposite') * 10;
        break;
        
      case 'front':
        // Vue de face : favoriser les éléments près de l'avant (X-)
        score += (1 - pos.x / containerDims.longueur) * 30;
        // Pénalité si l'élément est caché par d'autres devant
        score -= this.countItemsInFront(item, container, 'front') * 10;
        break;
        
      case 'back':
        // Vue de l'arrière : favoriser les éléments près de l'arrière (X+)
        score += (pos.x + dims.longueur) / containerDims.longueur * 30;
        // Pénalité si l'élément est caché par d'autres devant
        score -= this.countItemsInFront(item, container, 'back') * 10;
        break;
    }
    
    // Bonus pour les éléments plus grands (plus visibles)
    const itemVolume = dims.longueur * dims.largeur * dims.hauteur;
    const avgItemVolume = container.items.reduce((sum, i) => sum + i.dimensions.longueur * i.dimensions.largeur * i.dimensions.hauteur, 0) / container.items.length;
    score += (itemVolume / avgItemVolume - 1) * 10;
    
    return score;
  }

  /**
   * Compte le nombre d'éléments au-dessus d'un item donné
   */
  private countItemsAbove(targetItem: VisualizationItem, container: VisualizationContainer): number {
    return container.items.filter(item => 
      item.id !== targetItem.id && 
      item.position.z > targetItem.position.z + targetItem.dimensions.hauteur &&
      this.itemsOverlap2D(targetItem, item, 'xy')
    ).length;
  }

  /**
   * Compte le nombre d'éléments en dessous d'un item donné
   */
  private countItemsBelow(targetItem: VisualizationItem, container: VisualizationContainer): number {
    return container.items.filter(item => 
      item.id !== targetItem.id && 
      item.position.z + item.dimensions.hauteur < targetItem.position.z &&
      this.itemsOverlap2D(targetItem, item, 'xy')
    ).length;
  }

  /**
   * Compte le nombre d'éléments devant un item donné selon la vue
   */
  private countItemsInFront(targetItem: VisualizationItem, container: VisualizationContainer, view: 'side' | 'side-opposite' | 'front' | 'back'): number {
    return container.items.filter(item => {
      if (item.id === targetItem.id) return false;
      
      switch (view) {
        case 'side':
          return item.position.y > targetItem.position.y + targetItem.dimensions.largeur &&
                 this.itemsOverlap2D(targetItem, item, 'xz');
        case 'side-opposite':
          return item.position.y + item.dimensions.largeur < targetItem.position.y &&
                 this.itemsOverlap2D(targetItem, item, 'xz');
        case 'front':
          return item.position.x + item.dimensions.longueur < targetItem.position.x &&
                 this.itemsOverlap2D(targetItem, item, 'yz');
        case 'back':
          return item.position.x > targetItem.position.x + targetItem.dimensions.longueur &&
                 this.itemsOverlap2D(targetItem, item, 'yz');
        default:
          return false;
      }
    }).length;
  }

  /**
   * Vérifie si deux éléments se chevauchent dans un plan 2D donné
   */
  private itemsOverlap2D(item1: VisualizationItem, item2: VisualizationItem, plane: 'xy' | 'xz' | 'yz'): boolean {
    const pos1 = item1.position;
    const dims1 = item1.dimensions;
    const pos2 = item2.position;
    const dims2 = item2.dimensions;
    
    switch (plane) {
      case 'xy':
        return !(pos1.x + dims1.longueur <= pos2.x || 
                 pos2.x + dims2.longueur <= pos1.x ||
                 pos1.y + dims1.largeur <= pos2.y || 
                 pos2.y + dims2.largeur <= pos1.y);
      case 'xz':
        return !(pos1.x + dims1.longueur <= pos2.x || 
                 pos2.x + dims2.longueur <= pos1.x ||
                 pos1.z + dims1.hauteur <= pos2.z || 
                 pos2.z + dims2.hauteur <= pos1.z);
      case 'yz':
        return !(pos1.y + dims1.largeur <= pos2.y || 
                 pos2.y + dims2.largeur <= pos1.y ||
                 pos1.z + dims1.hauteur <= pos2.z || 
                 pos2.z + dims2.hauteur <= pos1.z);
      default:
        return false;
    }
  }
}
