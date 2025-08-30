// src/app/features/visualization/components/scene/scene.component.ts

import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  VisualizationScene, 
  VisualizationConfig, 
  ViewportSettings 
} from '../../models/visualization.model';
import { ThreeDRendererService } from '../../services/renderer3d.service';

@Component({
  selector: 'app-scene',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, OnChanges, OnDestroy {

  @Input() scene: VisualizationScene | null = null;
  @Input() config: VisualizationConfig | null = null;
  @Input() viewport: ViewportSettings | null = null;

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  isInitialized = false;
  initializationError: string | null = null;

  constructor(private threeDRenderer: ThreeDRendererService) { }

  ngOnInit(): void {
    this.initializeScene();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isInitialized) {
      if (changes['scene'] && this.scene) {
        this.updateScene();
      }
      if (changes['config'] && this.config) {
        this.threeDRenderer.updateConfig(this.config);
      }
      if (changes['viewport'] && this.viewport) {
        this.threeDRenderer.updateViewport(this.viewport);
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  public async initializeScene(): Promise<void> {
    try {
      await this.threeDRenderer.initialize(this.containerRef.nativeElement);
      this.isInitialized = true;
      this.initializationError = null;
      
      // Mettre à jour la scène si les données sont déjà disponibles
      if (this.scene) {
        this.updateScene();
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la scène 3D:', error);
      this.initializationError = 'Impossible de charger la visualisation 3D';
      this.isInitialized = false;
    }
  }

  private updateScene(): void {
    if (!this.isInitialized || !this.scene) return;
    
    this.threeDRenderer.updateScene(
      this.scene.containers,
      this.scene.currentContainerIndex
    );
  }

  private cleanup(): void {
    if (this.isInitialized) {
      this.threeDRenderer.dispose();
    }
  }
}