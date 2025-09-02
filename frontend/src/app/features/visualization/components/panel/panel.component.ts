// src/app/features/visualization/components/panel/panel.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  VisualizationScene, 
  VisualizationConfig,
  VisualizationContainer,
  VisualizationItem
} from '../../models/visualization.model';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent implements OnInit {

  @Input() scene: VisualizationScene | null = null;
  @Input() config: VisualizationConfig | null = null;

  constructor() { }

  ngOnInit(): void {
  }

  selectItem(item: VisualizationItem): void {
    console.log('Select item:', item);
    // TODO: Émettre un événement vers le parent ou utiliser le service
  }

  /**
   * Obtient le conteneur actuellement sélectionné
   */
  getCurrentContainer(): VisualizationContainer | null {
    if (!this.scene?.containers || this.scene.containers.length === 0) {
      return null;
    }
    
    const index = this.scene.currentContainerIndex;
    if (index < 0 || index >= this.scene.containers.length) {
      return null;
    }
    
    return this.scene.containers[index];
  }

  /**
   * Vérifie s'il y a des containers disponibles
   */
  hasContainers(): boolean {
    return !!(this.scene?.containers && this.scene.containers.length > 0);
  }

  /**
   * Obtient le nombre d'items dans le container actuel
   */
  getCurrentContainerItemCount(): number {
    const container = this.getCurrentContainer();
    return container?.items?.length || 0;
  }

  /**
   * TrackBy function pour optimiser le rendu de la liste d'items
   */
  trackByItemId(index: number, item: VisualizationItem): string {
    return item.id || index.toString();
  }
}