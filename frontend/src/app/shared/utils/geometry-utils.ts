// src/app/shared/utils/geometry-utils.ts

import { Position3D, Dimensions3D } from '../../features/visualization/models/visualization.model';

export class GeometryUtils {

  /**
   * Calcule le volume d'un objet 3D
   */
  static calculateVolume(dimensions: Dimensions3D): number {
    return dimensions.longueur * dimensions.largeur * dimensions.hauteur;
  }

  /**
   * Calcule le centre d'un objet
   */
  static calculateCenter(position: Position3D, dimensions: Dimensions3D): Position3D {
    return {
      x: position.x + dimensions.longueur / 2,
      y: position.y + dimensions.largeur / 2,
      z: position.z + dimensions.hauteur / 2
    };
  }

  /**
   * Vérifie si deux objets se chevauchent
   */
  static isOverlapping(
    pos1: Position3D, dim1: Dimensions3D,
    pos2: Position3D, dim2: Dimensions3D
  ): boolean {
    // Vérification des axes X, Y et Z
    const xOverlap = pos1.x < pos2.x + dim2.longueur && pos1.x + dim1.longueur > pos2.x;
    const yOverlap = pos1.y < pos2.y + dim2.largeur && pos1.y + dim1.largeur > pos2.y;
    const zOverlap = pos1.z < pos2.z + dim2.hauteur && pos1.z + dim1.hauteur > pos2.z;

    return xOverlap && yOverlap && zOverlap;
  }

  /**
   * Calcule la distance entre deux points
   */
  static calculateDistance(point1: Position3D, point2: Position3D): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Trouve la meilleure position pour placer un objet dans un conteneur
   */
  static findBestPosition(
    containerDims: Dimensions3D,
    itemDims: Dimensions3D,
    existingItems: Array<{position: Position3D, dimensions: Dimensions3D}>,
    fragile = false
  ): Position3D | null {
    const step = 10; // Pas de recherche en centimètres
    
    // Si l'objet est fragile, commencer par le haut
    const startZ = fragile ? containerDims.hauteur - itemDims.hauteur : 0;
    const endZ = fragile ? containerDims.hauteur - itemDims.hauteur : containerDims.hauteur - itemDims.hauteur;
    const stepZ = fragile ? -step : step;

    for (let z = startZ; fragile ? z >= 0 : z <= endZ; z += stepZ) {
      for (let y = 0; y <= containerDims.largeur - itemDims.largeur; y += step) {
        for (let x = 0; x <= containerDims.longueur - itemDims.longueur; x += step) {
          const position: Position3D = { x, y, z };
          
          // Vérifier s'il n'y a pas de collision avec les objets existants
          let hasCollision = false;
          for (const existing of existingItems) {
            if (this.isOverlapping(position, itemDims, existing.position, existing.dimensions)) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            return position;
          }
        }
      }
    }

    return null; // Aucune position trouvée
  }

  /**
   * Calcule les dimensions optimales d'orientation pour un objet
   */
  static getOptimalOrientation(
    itemDims: Dimensions3D,
    containerDims: Dimensions3D,
    preferredOrientation: 'standard' | 'rotated' | 'optimal' = 'optimal'
  ): Dimensions3D {
    const orientations = [
      { longueur: itemDims.longueur, largeur: itemDims.largeur, hauteur: itemDims.hauteur },
      { longueur: itemDims.longueur, largeur: itemDims.hauteur, hauteur: itemDims.largeur },
      { longueur: itemDims.largeur, largeur: itemDims.longueur, hauteur: itemDims.hauteur },
      { longueur: itemDims.largeur, largeur: itemDims.hauteur, hauteur: itemDims.longueur },
      { longueur: itemDims.hauteur, largeur: itemDims.longueur, hauteur: itemDims.largeur },
      { longueur: itemDims.hauteur, largeur: itemDims.largeur, hauteur: itemDims.longueur }
    ];

    // Filtrer les orientations qui rentrent dans le conteneur
    const validOrientations = orientations.filter(orientation => 
      orientation.longueur <= containerDims.longueur &&
      orientation.largeur <= containerDims.largeur &&
      orientation.hauteur <= containerDims.hauteur
    );

    if (validOrientations.length === 0) {
      return itemDims; // Aucune orientation ne fonctionne
    }

    if (preferredOrientation === 'standard') {
      return validOrientations.find(o => 
        o.longueur === itemDims.longueur && 
        o.largeur === itemDims.largeur && 
        o.hauteur === itemDims.hauteur
      ) || validOrientations[0];
    }

    if (preferredOrientation === 'optimal') {
      // Choisir l'orientation qui maximise la stabilité (hauteur minimale)
      return validOrientations.reduce((best, current) => 
        current.hauteur < best.hauteur ? current : best
      );
    }

    return validOrientations[0];
  }

  /**
   * Convertit des centimètres en unités de rendu 3D
   */
  static cmToRenderUnits(cm: number): number {
    return cm / 10; // 1 unité de rendu = 10cm
  }

  /**
   * Convertit des unités de rendu 3D en centimètres
   */
  static renderUnitsToCm(units: number): number {
    return units * 10; // 1 unité de rendu = 10cm
  }

  /**
   * Calcule la boîte englobante d'un ensemble d'objets
   */
  static calculateBoundingBox(
    items: Array<{position: Position3D, dimensions: Dimensions3D}>
  ): {min: Position3D, max: Position3D, dimensions: Dimensions3D} {
    if (items.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
        dimensions: { longueur: 0, largeur: 0, hauteur: 0 }
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    items.forEach(item => {
      minX = Math.min(minX, item.position.x);
      minY = Math.min(minY, item.position.y);
      minZ = Math.min(minZ, item.position.z);
      
      maxX = Math.max(maxX, item.position.x + item.dimensions.longueur);
      maxY = Math.max(maxY, item.position.y + item.dimensions.largeur);
      maxZ = Math.max(maxZ, item.position.z + item.dimensions.hauteur);
    });

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      dimensions: {
        longueur: maxX - minX,
        largeur: maxY - minY,
        hauteur: maxZ - minZ
      }
    };
  }
}