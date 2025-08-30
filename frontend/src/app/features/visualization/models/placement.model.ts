// src/app/features/visualization/models/placement.model.ts

import { VisualizationItem, VisualizationContainer, Position3D } from './visualization.model';

export interface PlacementResult {
  item: VisualizationItem;
  container: VisualizationContainer;
  position: Position3D;
  rotation: Position3D;
  placementScore: number;
  constraints: PlacementConstraint[];
  timestamp: number;
}

export interface PlacementConstraint {
  type: 'fragile' | 'weight' | 'stackable' | 'dimension' | 'stability';
  description: string;
  satisfied: boolean;
  severity: 'info' | 'warning' | 'error';
}

export interface OptimizedLayout {
  containers: VisualizationContainer[];
  unplacedItems: VisualizationItem[];
  efficiency: {
    volumeUtilization: number;
    weightUtilization: number;
    spaceUtilization: number;
  };
  stats: {
    totalItems: number;
    placedItems: number;
    containersUsed: number;
    totalVolume: number;
    totalWeight: number;
  };
  placementTime: number;
  algorithm: string;
}

export interface PlacementAnimation {
  id: string;
  item: VisualizationItem;
  startPosition: Position3D;
  endPosition: Position3D;
  duration: number;
  delay: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  onComplete?: () => void;
}

export interface SimulationData {
  colis: any[];
  resultats: any;
  nom: string;
  simulationId?: string;
  timestamp?: number;
}