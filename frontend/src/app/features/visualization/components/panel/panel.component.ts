// src/app/features/visualization/components/panel/panel.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  VisualizationScene, 
  VisualizationConfig,
  VisualizationContainer,
  VisualizationItem
} from '../../models/visualization.model';
<<<<<<< HEAD
import { VisualizationService } from '../../services/visualization.service';
=======
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5

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

<<<<<<< HEAD
  // Champ de recherche local
  searchTerm = '';

  constructor(private visualizationService: VisualizationService) { }
=======
  constructor() { }
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5

  ngOnInit(): void {
  }

  selectItem(item: VisualizationItem): void {
<<<<<<< HEAD
    this.visualizationService.selectItem(item);
=======
    console.log('Select item:', item);
    // TODO: Émettre un événement vers le parent ou utiliser le service
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
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
<<<<<<< HEAD

  /**
   * Filtre les items selon le champ de recherche
   */
  getFilteredItems(items: VisualizationItem[] | undefined): VisualizationItem[] {
    if (!items || !items.length) return [];
    const q = (this.searchTerm || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => {
      const values = [
        it.id,
        it.reference,
        it.type,
        it.nomDestinataire,
        it.adresse,
        it.telephone
      ]
        .filter(Boolean)
        .map(v => String(v).toLowerCase());
      return values.some(v => v.includes(q));
    });
  }

  /**
   * Handler input pour éviter les erreurs de cast dans le template
   */
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm = target?.value ?? '';
  }
}
=======
}
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
