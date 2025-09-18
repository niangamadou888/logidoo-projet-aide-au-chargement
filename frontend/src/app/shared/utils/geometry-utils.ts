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

    existingItems: Array<{position: Position3D, dimensions: Dimensions3D, gerbable?: boolean, fragile?: boolean}>,
    fragile = false,
    step = 10
  ): Position3D | null {
    // Bordures de sécurité pour éviter de coller les parois
    const margin = 1; // 1cm margin pour éviter les sorties de conteneur

    const minX = 0 + margin;
    const minY = 0 + margin;
    const minZ = 0 + margin;
    const maxX = containerDims.longueur - itemDims.longueur - margin;
    const maxY = containerDims.largeur - itemDims.largeur - margin;
    const maxZ = containerDims.hauteur - itemDims.hauteur - margin;

    // Validation stricte des dimensions pour empêcher les débordements
    if (maxX < minX || maxY < minY || maxZ < minZ) {
      console.warn(`❌ Item too large for container: item(${itemDims.longueur}×${itemDims.largeur}×${itemDims.hauteur}) container(${containerDims.longueur}×${containerDims.largeur}×${containerDims.hauteur})`);
      return null;
    }

    if (fragile) {
      // Pour un objet fragile: poser sur le sol ou sur une surface stable de niveau approprié
      const supportLevels = new Set<number>();
      supportLevels.add(0); // Sol du conteneur

      // Ajouter les niveaux de support des objets gerbables uniquement
      for (const ex of existingItems) {
        if (ex.gerbable !== false && !ex.fragile) { // Seuls les objets stables peuvent supporter
          const topZ = ex.position.z + ex.dimensions.hauteur;
          if (topZ + itemDims.hauteur <= containerDims.hauteur - margin) { // Vérifier qu'on ne dépasse pas le toit
            supportLevels.add(topZ);
          }
        }
      }

      // Essayer les niveaux les plus bas en premier pour stabilité
      const zLevels = Array.from(supportLevels.values()).sort((a, b) => a - b);

      for (const z of zLevels) {
        if (z + itemDims.hauteur > containerDims.hauteur - margin) continue; // Skip si trop haut

        for (let y = minY; y <= maxY; y += step) {
          for (let x = minX; x <= maxX; x += step) {
            const position: Position3D = { x, y, z };

            // Validation stricte des limites
            if (!this.isWithinContainer(position, itemDims, containerDims)) continue;

            if (!this.collides(position, itemDims, existingItems) &&
                (z === 0 || this.isSupported(position, itemDims, existingItems))) {
              // Validation finale avant retour
              const finalPos = this.validateAndClampPosition(position, itemDims, containerDims);
              console.log(`✅ Fragile item placed at (${finalPos.x}, ${finalPos.y}, ${finalPos.z})`);
              return finalPos;
            }
          }
        }
      }
    } else {
      // Parcours standard: de bas en haut, en recherchant d'abord les positions supportées
      for (let z = minZ; z <= maxZ; z += step) {
        if (z + itemDims.hauteur > containerDims.hauteur - margin) continue; // Skip si trop haut

        for (let y = minY; y <= maxY; y += step) {
          for (let x = minX; x <= maxX; x += step) {
            const position: Position3D = { x, y, z };

            // Validation stricte des limites
            if (!this.isWithinContainer(position, itemDims, containerDims)) continue;

            // Vérifier qu'on est soit au sol, soit bien supporté
            const isOnGround = z <= margin;
            const isWellSupported = !isOnGround && this.isSupported(position, itemDims, existingItems);

            if ((isOnGround || isWellSupported) && !this.collides(position, itemDims, existingItems)) {
              // Validation finale avant retour
              const finalPos = this.validateAndClampPosition(position, itemDims, containerDims);
              console.log(`✅ Regular item placed at (${finalPos.x}, ${finalPos.y}, ${finalPos.z})`);
              return finalPos;
            }
          }
        }
      }
    }

    console.warn(`❌ No valid position found for item (${itemDims.longueur}×${itemDims.largeur}×${itemDims.hauteur}) in container (${containerDims.longueur}×${containerDims.largeur}×${containerDims.hauteur})`);
    return null; // Aucune position trouvée
  }

  /**
   * Vérifie collision contre une liste d'objets
   */
  static collides(
    position: Position3D,
    dimensions: Dimensions3D,
    existingItems: Array<{position: Position3D, dimensions: Dimensions3D, gerbable?: boolean, fragile?: boolean}>
  ): boolean {
    for (const existing of existingItems) {
      // 1) Collision volumique classique (empêche le chevauchement)
      if (this.isOverlapping(position, dimensions, existing.position, existing.dimensions)) {
        return true;
      }

      // 2) Règle "non gerbable" (non empilable):
      //    si l'élément existant est non gerbable, on interdit toute
      //    pose au-dessus de son empreinte au sol (même sans chevauchement en Z).
      if (existing.gerbable === false) {
        const xOverlap = position.x < existing.position.x + existing.dimensions.longueur &&
                         position.x + dimensions.longueur > existing.position.x;
        const yOverlap = position.y < existing.position.y + existing.dimensions.largeur &&
                         position.y + dimensions.largeur > existing.position.y;
        const candidateBottomZ = position.z;
        const existingTopZ = existing.position.z + existing.dimensions.hauteur;

        if (xOverlap && yOverlap && candidateBottomZ >= existingTopZ) {
          return true; // Bloque toute pile au-dessus d'un non gerbable
        }
      }

      // 3) Règle "fragile en dessous": interdire toute pose au-dessus d'un colis fragile
      if (existing.fragile === true) {
        const xOverlap = position.x < existing.position.x + existing.dimensions.longueur &&
                         position.x + dimensions.longueur > existing.position.x;
        const yOverlap = position.y < existing.position.y + existing.dimensions.largeur &&
                         position.y + dimensions.largeur > existing.position.y;
        const candidateBottomZ = position.z;
        const existingTopZ = existing.position.z + existing.dimensions.hauteur;
        if (xOverlap && yOverlap && candidateBottomZ >= existingTopZ) {
          return true; // rien au-dessus d'un fragile
        }
      }
    }
    return false;
  }

  /**
   * Vérifie si la position proposée est posée (supportée) par le sol ou par un item déjà placé.
   * - Si z == 0: supporté par le sol
   * - Sinon: le bas de l'objet doit toucher le haut d'au moins un item existant avec chevauchement XY
   */
  static isSupported(
    position: Position3D,
    dimensions: Dimensions3D,
    existingItems: Array<{position: Position3D, dimensions: Dimensions3D, gerbable?: boolean, fragile?: boolean}>
  ): boolean {
    if (position.z === 0) return true;

    const bottomZ = position.z;
    const minAxisOverlap = 0.6; // exiger au moins 60% d'appui sur chaque axe pour stabilité
    for (const ex of existingItems) {
      const topZ = ex.position.z + ex.dimensions.hauteur;
      // Exiger un contact exact en Z
      if (Math.abs(bottomZ - topZ) > 0.0001) continue;

      // Chevauchement XY (au moins partiel)
      const overlapX = Math.min(position.x + dimensions.longueur, ex.position.x + ex.dimensions.longueur) -
                       Math.max(position.x, ex.position.x);
      const overlapY = Math.min(position.y + dimensions.largeur, ex.position.y + ex.dimensions.largeur) -
                       Math.max(position.y, ex.position.y);

      if (overlapX > 0 && overlapY > 0) {
        const ratioX = overlapX / dimensions.longueur;
        const ratioY = overlapY / dimensions.largeur;
        if (ratioX >= minAxisOverlap && ratioY >= minAxisOverlap) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Fait glisser un item au plus proche des parois/géométries (X puis Y) pour combler les espaces
   */
  static pushToWalls(
    startPosition: Position3D,
    dims: Dimensions3D,
    containerDims: Dimensions3D,
    existingItems: Array<{position: Position3D, dimensions: Dimensions3D, gerbable?: boolean}>,
    step = 2
  ): Position3D {
    let pos: Position3D = { ...startPosition };

    // Glissade vers -X
    while (pos.x > 0) {
      const next = { ...pos, x: Math.max(0, pos.x - step) };
      if (this.collides(next, dims, existingItems)) break;
      pos = next;
    }

    // Glissade vers -Y
    while (pos.y > 0) {
      const next = { ...pos, y: Math.max(0, pos.y - step) };
      if (this.collides(next, dims, existingItems)) break;
      pos = next;
    }

    // Clamp dans le conteneur (sécurité)
    pos.x = Math.min(pos.x, Math.max(0, containerDims.longueur - dims.longueur));
    pos.y = Math.min(pos.y, Math.max(0, containerDims.largeur - dims.largeur));
    pos.z = Math.min(pos.z, Math.max(0, containerDims.hauteur - dims.hauteur));

    return pos;
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

  /**
   * Vérifie qu'un objet reste complètement dans les limites du conteneur
   */
  static isWithinContainer(
    position: Position3D,
    itemDims: Dimensions3D,
    containerDims: Dimensions3D
  ): boolean {
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.z >= 0 &&
      position.x + itemDims.longueur <= containerDims.longueur &&
      position.y + itemDims.largeur <= containerDims.largeur &&
      position.z + itemDims.hauteur <= containerDims.hauteur
    );
  }

  /**
   * Valide et contraint une position pour s'assurer qu'elle reste dans le conteneur
   */
  static validateAndClampPosition(
    position: Position3D,
    itemDims: Dimensions3D,
    containerDims: Dimensions3D
  ): Position3D {
    return {
      x: Math.max(0, Math.min(position.x, containerDims.longueur - itemDims.longueur)),
      y: Math.max(0, Math.min(position.y, containerDims.largeur - itemDims.largeur)),
      z: Math.max(0, Math.min(position.z, containerDims.hauteur - itemDims.hauteur))
    };
  }

  /**
   * Recherche optimisée des espaces vides dans un conteneur
   */
  static findEmptySpaces(
    containerDims: Dimensions3D,
    existingItems: Array<{position: Position3D, dimensions: Dimensions3D}>,
    minSpaceSize: Dimensions3D,
    step = 5
  ): Position3D[] {
    const emptySpaces: Position3D[] = [];
    const margin = 1;

    for (let z = 0; z <= containerDims.hauteur - minSpaceSize.hauteur - margin; z += step) {
      for (let y = 0; y <= containerDims.largeur - minSpaceSize.largeur - margin; y += step) {
        for (let x = 0; x <= containerDims.longueur - minSpaceSize.longueur - margin; x += step) {
          const testPos: Position3D = { x, y, z };

          // Vérifier qu'il n'y a pas de collision avec cet espace
          let hasCollision = false;
          for (const item of existingItems) {
            if (this.isOverlapping(testPos, minSpaceSize, item.position, item.dimensions)) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision && this.isWithinContainer(testPos, minSpaceSize, containerDims)) {
            emptySpaces.push(testPos);
          }
        }
      }
    }

    return emptySpaces;
  }
}
