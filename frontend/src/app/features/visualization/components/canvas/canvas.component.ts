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

  // Mode de vue 2D: plan (dessus), côté (profil), arrière
  viewMode: 'top' | 'side' | 'back' = 'top';

  constructor() { }

  ngOnInit(): void {
    this.initializeCanvas();
    this.setupEventListeners();
    this.setupResizeObserver();
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scene'] || changes['config'] || changes['viewport']) {
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
    canvas.addEventListener('wheel', this.onWheel.bind(this));
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

    // Appliquer les transformations
    this.ctx.save();
    this.ctx.translate(this.offsetX + width / 2, this.offsetY + height / 2);
    this.ctx.scale(this.scale, this.scale);

    // Dessiner le conteneur actuel
    const currentContainer = this.scene.containers[this.scene.currentContainerIndex];
    if (currentContainer) {
      this.drawContainer(currentContainer);
    }

    this.ctx.restore();

    // Dessiner l'interface (non transformée)
    this.drawInterface();
  }

  private drawContainer(container: VisualizationContainer): void {
    if (!this.ctx) return;

    // Dimensions projetées du conteneur selon la vue sélectionnée
    const base = this.getProjectedContainerSize(container);
    const { width: baseW, height: baseH } = base;
    const scale = Math.min(
      (this.containerDimensions.width - 2 * this.padding) / baseW,
      (this.containerDimensions.height - 2 * this.padding) / baseH
    ) * 0.8;

    // Dessiner le contour du conteneur
    this.ctx.strokeStyle = container.color || '#666666';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([]);
    this.ctx.strokeRect(-baseW * scale / 2, -baseH * scale / 2, baseW * scale, baseH * scale);

    // Dessiner les items
    container.items.forEach(item => {
      this.drawItem(item, container, scale);
    });

    // Dessiner les informations du conteneur
    this.drawContainerInfo(container, scale, baseW, baseH);
  }

  private drawItem(item: VisualizationItem, container: VisualizationContainer, containerScale: number): void {
    if (!this.ctx) return;

    // Déterminer les axes projetés selon la vue
    let projContainerW: number;
    let projContainerH: number;
    let posX: number;
    let posY: number;
    let itemW: number;
    let itemH: number;

    if (this.viewMode === 'top') {
      projContainerW = container.dimensions.longueur;
      projContainerH = container.dimensions.largeur;
      posX = item.position.x;
      posY = item.position.y;
      itemW = item.dimensions.longueur;
      itemH = item.dimensions.largeur;
    } else if (this.viewMode === 'side') {
      projContainerW = container.dimensions.longueur;
      projContainerH = container.dimensions.hauteur;
      posX = item.position.x;
      posY = item.position.z;
      itemW = item.dimensions.longueur;
      itemH = item.dimensions.hauteur;
    } else { // 'back'
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
    const y = (this.viewMode === 'side' || this.viewMode === 'back')
      ? (containerHalfHeight - ((posY + itemH) * containerScale))
      : (-containerHalfHeight + (posY * containerScale));
    const width = itemW * containerScale;
    const height = itemH * containerScale;

    // Dessiner l'item
    this.ctx.fillStyle = item.color;
    this.ctx.fillRect(x, y, width, height);

    // Contour
    this.ctx.strokeStyle = this.darkenColor(item.color, 20);
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]);
    this.ctx.strokeRect(x, y, width, height);

    // Marqueurs spéciaux
    if (item.fragile) {
      this.drawFragileMarker(x, y, width, height);
    }

    if (!item.gerbable) {
      this.drawNonStackableMarker(x, y, width, height);
    }

    // Texte (si assez de place)
    if (width > 40 && height > 20) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(item.type, x + width / 2, y + height / 2);
    }
  }

  private drawFragileMarker(x: number, y: number, width: number, height: number): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = '#ff4444';
    this.ctx.beginPath();
    this.ctx.arc(x + width - 8, y + 8, 6, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 8px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('!', x + width - 8, y + 11);
  }

  private drawNonStackableMarker(x: number, y: number, width: number, height: number): void {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = '#ff8800';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([3, 3]);
    this.ctx.strokeRect(x, y, width, height);
  }

  private drawContainerInfo(container: VisualizationContainer, scale: number, baseW: number, baseH: number): void {
    if (!this.ctx) return;

    const containerWidth = baseW * scale;
    const containerHeight = baseH * scale;

    // Titre du conteneur
    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      container.type, 
      0, 
      -containerHeight / 2 - 20
    );

    // Dimensions
    this.ctx.font = '12px Arial';
    const dims = container.dimensions;
    const dimsText = this.viewMode === 'top'
      ? `${dims.longueur} × ${dims.largeur} cm (Plan)`
      : this.viewMode === 'side'
        ? `${dims.longueur} × ${dims.hauteur} cm (Côté)`
        : `${dims.largeur} × ${dims.hauteur} cm (Arrière)`;

    this.ctx.fillText(dimsText, 0, -containerHeight / 2 - 5);
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
    const vueLabel = this.viewMode === 'top' ? 'Plan' : this.viewMode === 'side' ? 'Côté' : 'Arrière';
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
  setViewMode(mode: 'top' | 'side' | 'back'): void {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      this.resetZoom();
    }
  }

  private getProjectedContainerSize(container: VisualizationContainer): { width: number, height: number } {
    if (this.viewMode === 'top') {
      return { width: container.dimensions.longueur, height: container.dimensions.largeur };
    } else if (this.viewMode === 'side') {
      return { width: container.dimensions.longueur, height: container.dimensions.hauteur };
    }
    // back
    return { width: container.dimensions.largeur, height: container.dimensions.hauteur };
  }
}
