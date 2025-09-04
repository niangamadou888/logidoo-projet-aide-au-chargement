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

  constructor() { }

  ngOnInit(): void {
    this.initializeCanvas();
    this.setupEventListeners();
    this.setupResizeObserver();
    // Initialize container dimensions from DOM to avoid first draw with 0x0
    if (this.containerRef?.nativeElement) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      this.containerDimensions = { width: rect.width, height: rect.height };
    }
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scene'] || changes['config'] || changes['viewport']) {
      // Scene or configuration changed: rebuild static layer
      this.staticDirty = true;
      this.render();
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
    
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.handleResize(entry.contentRect);
      }
    });
    
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private handleResize(rect: DOMRectReadOnly): void {
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
    // TODO: Implémenter la sélection d'items au clic
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('Click à', x, y);
  }

  private render(): void {
    if (!this.ctx || !this.scene) return;

    // Annuler l'animation précédente
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.draw();
    });
  }

  private draw(): void {
    if (!this.ctx || !this.scene) return;

    const canvas = this.canvasRef.nativeElement;
    const { width, height } = this.containerDimensions;

    // Effacer le canvas
    this.ctx.clearRect(0, 0, width, height);

    // Dessiner le conteneur actuel via un calque offscreen mis en cache
    const currentContainer = this.scene.containers[this.scene.currentContainerIndex];
    if (currentContainer) {
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
    // Contour du conteneur
    const base = this.getProjectedContainerSize(container);
    const baseW = base.width;
    const baseH = base.height;

    ctx.strokeStyle = container.color || '#666666';
    ctx.lineWidth = 3;
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

    // Déterminer les axes projetés selon la vue
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

    const containerHalfWidth = projContainerW * containerScale / 2;
    const containerHalfHeight = projContainerH * containerScale / 2;

    const x = -containerHalfWidth + (posX * containerScale);
    // Pour les vues avec l'axe vertical (hauteur), inverser Y pour avoir l'origine en bas
    const y = (this.viewMode === 'side' || this.viewMode === 'side-opposite' || this.viewMode === 'back' || this.viewMode === 'front')
      ? (containerHalfHeight - ((posY + itemH) * containerScale))
      : (-containerHalfHeight + (posY * containerScale));
    const width = itemW * containerScale;
    const height = itemH * containerScale;

    // Dessiner l'item
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, width, height);

    // Contour
    ctx.strokeStyle = this.darkenColor(item.color, 20);
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, width, height);

    // Marqueurs spéciaux
    if (item.fragile) {
      this.drawFragileMarkerToCtx(ctx, x, y, width, height);
    }

    if (!item.gerbable) {
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
}
