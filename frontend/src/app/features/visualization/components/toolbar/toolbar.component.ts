// src/app/features/visualization/components/toolbar/toolbar.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  VisualizationScene, 
  VisualizationConfig, 
  ViewportSettings 
} from '../../models/visualization.model';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {

  @Input() scene: VisualizationScene | null = null;
  @Input() config: VisualizationConfig | null = null;
  @Input() viewport: ViewportSettings | null = null;

  constructor() { }

  ngOnInit(): void {
  }

  // Méthodes temporaires pour éviter les erreurs
  toggleWireframe(): void {
    console.log('Toggle wireframe');
  }

  toggleAxes(): void {
    console.log('Toggle axes');
  }

  toggleGrid(): void {
    console.log('Toggle grid');
  }
}