// src/app/features/visualization/models/visualization.model.ts

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions3D {
  longueur: number;
  largeur: number;
  hauteur: number;
}

export interface VisualizationItem {
  id: string;
  reference?: string;
  type: string;
  dimensions: Dimensions3D;
  position: Position3D;
  rotation?: Position3D;
  color: string;
  poids: number;
  quantite: number;
  fragile?: boolean;
  gerbable?: boolean;
  nomDestinataire?: string;
  adresse?: string;
  telephone?: string;
  selected?: boolean;
  opacity?: number;
  layer?: number;
}

export interface VisualizationContainer {
  id: string;
  ref?: string;
  type: string;
  categorie: 'camion' | 'conteneur';
  dimensions: Dimensions3D;
  items: VisualizationItem[];
  capacity: {
    volume: number;
    poids: number;
  };
  used: {
    volume: number;
    poids: number;
  };
  utilization: {
    volume: number; // percentage
    poids: number;  // percentage
  };
  color?: string;
  wireframe?: boolean;
  position?: Position3D;
  images?: string[]; // Images du conteneur, comme dans l'interface de sélection
}

export interface VisualizationScene {
  containers: VisualizationContainer[];
  selectedItem?: VisualizationItem;
  selectedContainer?: VisualizationContainer;
  viewMode: 'individual' | 'all' | 'comparison';
  renderMode: '2d' | '3d';
  currentContainerIndex: number;
}

export interface ViewportSettings {
  zoom: number;
  rotation: Position3D;
  center: Position3D;
  perspective: boolean;
  showWireframe: boolean;
  showAxes: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  backgroundColor: string;
}

export interface VisualizationConfig {
  showDimensions: boolean;
  showWeights: boolean;
  showDestinations: boolean;
  showFragileItems: boolean;
  highlightNonGerbable: boolean;
  colorMode: 'type' | 'weight' | 'destination' | 'custom';
  animationEnabled: boolean;
  animationDuration: number;
  showTooltips: boolean;
  enableSelection: boolean;
}

export interface ContainerLayout {
  layers: LayerInfo[];
  totalLayers: number;
  maxItemsPerLayer: number;
  packingEfficiency: number;
}

export interface LayerInfo {
  level: number;
  height: number;
  items: VisualizationItem[];
  maxWeight: number;
  canStack: boolean;
  spaceUtilization: number;
}