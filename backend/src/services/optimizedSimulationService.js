const Contenant = require('../models/Contenant');
const Simulation = require('../models/Simulation');

/**
 * CONSTANTS - Rotation types and axes
 * Inspired by py3dbp library
 */
const RotationType = {
  RT_WHD: 0, // Width-Height-Depth (original orientation)
  RT_HWD: 1, // Height-Width-Depth
  RT_HDW: 2, // Height-Depth-Width
  RT_DHW: 3, // Depth-Height-Width
  RT_DWH: 4, // Depth-Width-Height
  RT_WDH: 5, // Width-Depth-Height
  ALL: [0, 1, 2, 3, 4, 5],
  NOT_UPDOWN: [0, 1] // Only horizontal rotations
};

const Axis = {
  WIDTH: 0,   // X axis (longueur)
  HEIGHT: 1,  // Y axis (largeur)
  DEPTH: 2,   // Z axis (hauteur)
  ALL: [0, 1, 2]
};

const START_POSITION = [0, 0, 0];
const DEFAULT_NUMBER_OF_DECIMALS = 2;
const HEAVY_WEIGHT_THRESHOLD = 50; // kg

/**
 * Calcule le volume en m³ à partir des dimensions en cm
 */
function cmDimsToM3Volume({ longueur, largeur, hauteur, quantite = 1 }) {
  const v = (longueur * largeur * hauteur) / 1_000_000; // cm³ -> m³
  return v * (quantite || 1);
}

/**
 * Arrondit un nombre à N décimales
 */
function set2Decimal(value, decimals = DEFAULT_NUMBER_OF_DECIMALS) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Obtient les dimensions selon le type de rotation
 * @param {Object} item - Item avec longueur, largeur, hauteur
 * @param {number} rotationType - Type de rotation (0-5)
 * @returns {Array} [longueur, largeur, hauteur] après rotation
 */
function getDimensionByRotation(item, rotationType) {
  const w = item.longueur;
  const h = item.largeur;
  const d = item.hauteur;

  switch (rotationType) {
    case RotationType.RT_WHD: return [w, h, d];
    case RotationType.RT_HWD: return [h, w, d];
    case RotationType.RT_HDW: return [h, d, w];
    case RotationType.RT_DHW: return [d, h, w];
    case RotationType.RT_DWH: return [d, w, h];
    case RotationType.RT_WDH: return [w, d, h];
    default: return [w, h, d];
  }
}

/**
 * Vérifie l'intersection de deux rectangles dans un plan 2D
 * Utilise la méthode des centres et demi-dimensions
 */
function rectIntersect(item1, item2, axis1, axis2) {
  const d1 = item1.finalDimensions;
  const d2 = item2.finalDimensions;
  const p1 = item1.position;
  const p2 = item2.position;

  if (!d1 || !d2 || !p1 || !p2) return false;

  // Conversion des axes: 0=longueur (X), 1=largeur (Y), 2=hauteur (Z)
  const dims1 = [d1.longueur, d1.largeur, d1.hauteur];
  const dims2 = [d2.longueur, d2.largeur, d2.hauteur];
  const pos1 = [p1.x, p1.y, p1.z];
  const pos2 = [p2.x, p2.y, p2.z];

  // Centre de chaque rectangle
  const cx1 = pos1[axis1] + dims1[axis1] / 2;
  const cy1 = pos1[axis2] + dims1[axis2] / 2;
  const cx2 = pos2[axis1] + dims2[axis1] / 2;
  const cy2 = pos2[axis2] + dims2[axis2] / 2;

  // Distance entre les centres
  const ix = Math.max(cx1, cx2) - Math.min(cx1, cx2);
  const iy = Math.max(cy1, cy2) - Math.min(cy1, cy2);

  // Intersection si distance < somme des demi-dimensions
  return ix < (dims1[axis1] + dims2[axis1]) / 2 &&
         iy < (dims1[axis2] + dims2[axis2]) / 2;
}

/**
 * Vérifie si deux items se chevauchent dans l'espace 3D
 * Doit y avoir intersection dans les 3 plans (XY, YZ, XZ)
 */
function itemsIntersect(item1, item2) {
  return rectIntersect(item1, item2, Axis.WIDTH, Axis.HEIGHT) &&
         rectIntersect(item1, item2, Axis.HEIGHT, Axis.DEPTH) &&
         rectIntersect(item1, item2, Axis.WIDTH, Axis.DEPTH);
}

/**
 * Résume les caractéristiques d'une liste de colis
 */
function summarize(items) {
  let totalVolume = 0;
  let totalWeight = 0;
  let fragilesCount = 0;
  let nonGerbablesCount = 0;
  let colisCount = 0;
  let fragileNonStackableVolume = 0;
  let heavyNonStackableCount = 0;
  let heavyNonStackableVolume = 0;
  const heavyNonStackableItems = [];

  if (!items || !Array.isArray(items)) {
    return {
      totalVolume: 0, totalWeight: 0, count: 0, colisCount: 0,
      fragilesCount: 0, nonGerbablesCount: 0, fragileNonStackableVolume: 0,
      heavyNonStackableCount: 0, heavyNonStackableVolume: 0,
      heavyNonStackableItems: []
    };
  }

  items.forEach(it => {
    const q = it.quantite || 1;
    colisCount += q;
    const itemVolume = ((it.longueur * it.largeur * it.hauteur) / 1_000_000) * q;
    const itemWeight = it.poids || 0;
    totalVolume += itemVolume;
    totalWeight += itemWeight * q;

    if (it.fragile) fragilesCount += q;
    if (!it.gerbable) nonGerbablesCount += q;

    if (it.fragile || it.gerbable === false) {
      fragileNonStackableVolume += itemVolume;
    }

    if (itemWeight > HEAVY_WEIGHT_THRESHOLD && it.gerbable === false) {
      heavyNonStackableCount += q;
      heavyNonStackableVolume += itemVolume;

      if (!heavyNonStackableItems.find(item => item.reference === it.reference)) {
        heavyNonStackableItems.push({
          reference: it.reference,
          poids: itemWeight,
          longueur: it.longueur,
          largeur: it.largeur,
          hauteur: it.hauteur,
          quantite: q,
          volume: itemVolume
        });
      }
    }
  });

  return {
    totalVolume, totalWeight, count: items.length, colisCount,
    fragilesCount, nonGerbablesCount, fragileNonStackableVolume,
    heavyNonStackableCount, heavyNonStackableVolume, heavyNonStackableItems
  };
}

/**
 * Génère des avertissements pour les colis lourds non-gerbables
 */
function generateHeavyNonStackableWarnings(summary) {
  const warnings = [];

  if (summary.heavyNonStackableCount > 0) {
    warnings.push({
      type: 'HEAVY_NON_STACKABLE_DETECTED',
      severity: 'high',
      message: `${summary.heavyNonStackableCount} colis lourd(s) non-gerbable(s) détecté(s) (>${HEAVY_WEIGHT_THRESHOLD}kg). Ces colis ne peuvent pas supporter de charge et nécessitent un espace dédié.`,
      items: summary.heavyNonStackableItems,
      count: summary.heavyNonStackableCount,
      affectedVolume: summary.heavyNonStackableVolume
    });
  }

  return warnings;
}

/**
 * Génère des recommandations basées sur les colis lourds non-gerbables
 */
function generateHeavyNonStackableRecommendations(summary, wastedSpaceFactor) {
  const recommendations = [];

  if (summary.heavyNonStackableCount === 0) {
    return recommendations;
  }

  if (wastedSpaceFactor > 1.3) {
    recommendations.push({
      type: 'SUGGEST_LARGER_CONTAINER',
      priority: 'high',
      message: 'Les colis lourds non-gerbables créent beaucoup d\'espace perdu. Envisagez un conteneur plus grand pour optimiser le chargement.',
      suggestedVolumeIncrease: wastedSpaceFactor,
      reasoning: `Facteur d'espace perdu: ${wastedSpaceFactor.toFixed(2)}x`
    });
  }

  const heavyVolumePercentage = (summary.heavyNonStackableVolume / summary.totalVolume) * 100;
  if (heavyVolumePercentage > 30) {
    recommendations.push({
      type: 'OPTIMIZE_PACKAGING',
      priority: 'medium',
      message: `Les colis lourds non-gerbables représentent ${heavyVolumePercentage.toFixed(1)}% du volume total. Envisagez de réorganiser ou diviser ces colis pour améliorer l'efficacité du chargement.`,
      heavyVolumePercentage: heavyVolumePercentage
    });
  }

  if (summary.heavyNonStackableCount > 0) {
    recommendations.push({
      type: 'PLACEMENT_STRATEGY',
      priority: 'medium',
      message: 'Placez les colis lourds non-gerbables en bas et dans les coins pour maximiser l\'utilisation de l\'espace horizontal.',
      affectedItems: summary.heavyNonStackableCount
    });
  }

  return recommendations;
}

/**
 * Récupère tous les contenants disponibles
 */
async function getContainerPool() {
  try {
    const pool = await Contenant.find({ disponible: true }).lean();
    return pool;
  } catch (e) {
    console.error("Erreur lors de la récupération des contenants:", e);
    return [];
  }
}

/**
 * Classe Container - Représente un conteneur avec méthodes de placement améliorées
 */
class Container {
  constructor(containerData) {
    this.id = String(containerData._id || containerData.id);
    this.ref = containerData._id;
    this.type = containerData.type;
    this.categorie = containerData.categorie;
    this.dimensions = containerData.dimensions;
    this.capacityVolume = containerData.volume || 0;
    this.capacityWeight = containerData.capacitePoids || 0;
    this.remainingVolume = containerData.volume || 0;
    this.remainingWeight = containerData.capacitePoids || 0;
    this.usedVolume = 0;
    this.usedWeight = 0;
    this.items = [];

    // Fit items: tableau de régions occupées [x1, x2, y1, y2, z1, z2]
    this.fitItems = [[0, this.dimensions.longueur, 0, this.dimensions.largeur, 0, 0]];

    // Options de placement
    this.fixPoint = true; // Activer la correction de gravité
    this.checkStable = true; // Activer la vérification de stabilité
    this.supportSurfaceRatio = 0.75; // Ratio minimum de surface supportée
    this.putType = 1; // 1=general, 2=open_top

    // Contraintes
    this.hasFragileItems = false;
    this.hasNonGerbableItems = false;
    this.hasItemsAbove = false;
    this.hasStableLayer = false;

    // Distribution de poids (4 quadrants)
    this.gravity = [0, 0, 0, 0]; // [NW%, NE%, SW%, SE%]
  }

  /**
   * FIX POINT - Corrige la position Z (hauteur) pour éviter les objets flottants
   * Trouve la surface de support la plus haute sous l'item
   */
  checkHeight(unfixPoint) {
    // unfixPoint = [x1, x2, y1, y2, z1, z2]
    const yPositions = [[0, 0], [this.dimensions.largeur, this.dimensions.largeur]];

    for (const fitItem of this.fitItems) {
      // Créer des ensembles pour vérifier les intersections X et Z
      const xBottom = this.range(Math.floor(fitItem[0]), Math.floor(fitItem[1]));
      const xTop = this.range(Math.floor(unfixPoint[0]), Math.floor(unfixPoint[1]));
      const zBottom = this.range(Math.floor(fitItem[4]), Math.floor(fitItem[5]));
      const zTop = this.range(Math.floor(unfixPoint[4]), Math.floor(unfixPoint[5]));

      // Si intersection sur X et Z, cet item est un support potentiel
      const xIntersect = this.setIntersection(xBottom, xTop);
      const zIntersect = this.setIntersection(zBottom, zTop);

      if (xIntersect.size > 0 && zIntersect.size > 0) {
        yPositions.push([fitItem[2], fitItem[3]]);
      }
    }

    const topHeight = unfixPoint[3] - unfixPoint[2];
    yPositions.sort((a, b) => a[1] - b[1]);

    // Trouver le premier gap suffisamment grand
    for (let j = 0; j < yPositions.length - 1; j++) {
      if (yPositions[j + 1][0] - yPositions[j][1] >= topHeight) {
        return yPositions[j][1];
      }
    }

    return unfixPoint[2];
  }

  /**
   * FIX POINT - Corrige la position X (longueur)
   */
  checkWidth(unfixPoint) {
    const xPositions = [[0, 0], [this.dimensions.longueur, this.dimensions.longueur]];

    for (const fitItem of this.fitItems) {
      const zBottom = this.range(Math.floor(fitItem[4]), Math.floor(fitItem[5]));
      const zTop = this.range(Math.floor(unfixPoint[4]), Math.floor(unfixPoint[5]));
      const yBottom = this.range(Math.floor(fitItem[2]), Math.floor(fitItem[3]));
      const yTop = this.range(Math.floor(unfixPoint[2]), Math.floor(unfixPoint[3]));

      const zIntersect = this.setIntersection(zBottom, zTop);
      const yIntersect = this.setIntersection(yBottom, yTop);

      if (zIntersect.size > 0 && yIntersect.size > 0) {
        xPositions.push([fitItem[0], fitItem[1]]);
      }
    }

    const topWidth = unfixPoint[1] - unfixPoint[0];
    xPositions.sort((a, b) => a[1] - b[1]);

    for (let j = 0; j < xPositions.length - 1; j++) {
      if (xPositions[j + 1][0] - xPositions[j][1] >= topWidth) {
        return xPositions[j][1];
      }
    }

    return unfixPoint[0];
  }

  /**
   * FIX POINT - Corrige la position Z (profondeur)
   */
  checkDepth(unfixPoint) {
    const zPositions = [[0, 0], [this.dimensions.hauteur, this.dimensions.hauteur]];

    for (const fitItem of this.fitItems) {
      const xBottom = this.range(Math.floor(fitItem[0]), Math.floor(fitItem[1]));
      const xTop = this.range(Math.floor(unfixPoint[0]), Math.floor(unfixPoint[1]));
      const yBottom = this.range(Math.floor(fitItem[2]), Math.floor(fitItem[3]));
      const yTop = this.range(Math.floor(unfixPoint[2]), Math.floor(unfixPoint[3]));

      const xIntersect = this.setIntersection(xBottom, xTop);
      const yIntersect = this.setIntersection(yBottom, yTop);

      if (xIntersect.size > 0 && yIntersect.size > 0) {
        zPositions.push([fitItem[4], fitItem[5]]);
      }
    }

    const topDepth = unfixPoint[5] - unfixPoint[4];
    zPositions.sort((a, b) => a[1] - b[1]);

    for (let j = 0; j < zPositions.length - 1; j++) {
      if (zPositions[j + 1][0] - zPositions[j][1] >= topDepth) {
        return zPositions[j][1];
      }
    }

    return unfixPoint[4];
  }

  /**
   * Utilitaires pour les ensembles
   */
  range(start, end) {
    const result = new Set();
    for (let i = start; i < end; i++) {
      result.add(i);
    }
    return result;
  }

  setIntersection(set1, set2) {
    const result = new Set();
    for (const item of set1) {
      if (set2.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  /**
   * Vérifie la stabilité d'un item selon 2 règles:
   * 1. Ratio de surface supportée >= supportSurfaceRatio
   * 2. Si ratio insuffisant, vérifier que les 4 coins sont supportés
   */
  checkStability(x, y, z, w, h, d) {
    if (!this.checkStable) return true;

    const itemAreaLower = Math.floor(w * h);
    let supportAreaUpper = 0;

    // Calculer la surface de support sous l'item
    for (const fitItem of this.fitItems) {
      if (Math.abs(z - fitItem[5]) < 0.1) { // Même niveau Z (surface de support)
        const xIntersect = this.setIntersection(
          this.range(Math.floor(x), Math.floor(x + w)),
          this.range(Math.floor(fitItem[0]), Math.floor(fitItem[1]))
        );
        const yIntersect = this.setIntersection(
          this.range(Math.floor(y), Math.floor(y + h)),
          this.range(Math.floor(fitItem[2]), Math.floor(fitItem[3]))
        );
        supportAreaUpper += xIntersect.size * yIntersect.size;
      }
    }

    // Règle 1: Vérifier le ratio de surface supportée
    if (supportAreaUpper / itemAreaLower < this.supportSurfaceRatio) {
      // Règle 2: Vérifier que les 4 coins sont supportés
      const fourVertices = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h]
      ];

      const cornersSupported = [false, false, false, false];

      for (const fitItem of this.fitItems) {
        if (Math.abs(z - fitItem[5]) < 0.1) {
          fourVertices.forEach((vertex, idx) => {
            if (fitItem[0] <= vertex[0] && vertex[0] <= fitItem[1] &&
                fitItem[2] <= vertex[1] && vertex[1] <= fitItem[3]) {
              cornersSupported[idx] = true;
            }
          });
        }
      }

      // Si un coin n'est pas supporté, instable
      if (cornersSupported.includes(false)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Place un item dans le conteneur à un pivot donné
   * Avec rotation, vérification d'intersection, fix point et stabilité
   */
  putItem(item, pivot) {
    let fit = false;
    const validItemPosition = item.position ? { ...item.position } : { x: 0, y: 0, z: 0 };

    // Déterminer les rotations autorisées
    const allowedRotations = item.gerbable !== false ? RotationType.ALL : RotationType.NOT_UPDOWN;

    for (const rotationType of allowedRotations) {
      const [w, h, d] = getDimensionByRotation(item, rotationType);

      // Vérifier que l'item ne dépasse pas les limites
      if (pivot.x + w > this.dimensions.longueur ||
          pivot.y + h > this.dimensions.largeur ||
          pivot.z + d > this.dimensions.hauteur) {
        continue;
      }

      fit = true;

      // Créer un item temporaire pour tester l'intersection
      const testItem = {
        position: { x: pivot.x, y: pivot.y, z: pivot.z },
        finalDimensions: { longueur: w, largeur: h, hauteur: d },
        fragile: item.fragile,
        gerbable: item.gerbable
      };

      // Vérifier l'intersection avec les items existants
      for (const placedItem of this.items) {
        if (itemsIntersect(testItem, placedItem)) {
          fit = false;
          break;
        }
      }

      if (!fit) continue;

      // Vérifier le poids total
      if (this.usedWeight + (item.poids || 0) > this.capacityWeight) {
        fit = false;
        return fit;
      }

      // FIX POINT: Corriger la position pour éviter les objets flottants
      let finalX = pivot.x;
      let finalY = pivot.y;
      let finalZ = pivot.z;

      if (this.fixPoint) {
        const unfixPoint = [
          finalX, finalX + w,
          finalY, finalY + h,
          finalZ, finalZ + d
        ];

        // 3 itérations pour stabiliser la position
        for (let i = 0; i < 3; i++) {
          finalY = this.checkHeight([finalX, finalX + w, finalY, finalY + h, finalZ, finalZ + d]);
          finalX = this.checkWidth([finalX, finalX + w, finalY, finalY + h, finalZ, finalZ + d]);
          finalZ = this.checkDepth([finalX, finalX + w, finalY, finalY + h, finalZ, finalZ + d]);
        }

        // Vérifier la stabilité
        if (!this.checkStability(finalX, finalY, finalZ, w, h, d)) {
          fit = false;
          continue;
        }

        // Enregistrer la région occupée
        this.fitItems.push([finalX, finalX + w, finalY, finalY + h, finalZ, finalZ + d]);
      }

      // Placer l'item
      const finalPosition = {
        x: set2Decimal(finalX),
        y: set2Decimal(finalY),
        z: set2Decimal(finalZ)
      };

      const finalDimensions = {
        longueur: set2Decimal(w),
        largeur: set2Decimal(h),
        hauteur: set2Decimal(d)
      };

      const placedItem = {
        ...item,
        position: finalPosition,
        rotationType: rotationType,
        finalDimensions: finalDimensions,
        dimensions: finalDimensions // Pour compatibilité
      };

      this.items.push(placedItem);

      // Mettre à jour les volumes et poids
      const itemVolume = (w * h * d) / 1_000_000;
      this.usedVolume += itemVolume;
      this.usedWeight += (item.poids || 0);
      this.remainingVolume -= itemVolume;
      this.remainingWeight -= (item.poids || 0);

      // Mettre à jour les contraintes
      if (item.fragile) {
        this.hasFragileItems = true;
        this.hasItemsAbove = true;
      }
      if (!item.gerbable) {
        this.hasNonGerbableItems = true;
        this.hasStableLayer = true;
      }

      return true;
    }

    return false;
  }

  /**
   * Calcule la distribution du poids dans 4 quadrants
   * Retourne [NW%, NE%, SW%, SE%]
   */
  calculateGravityDistribution() {
    const w = this.dimensions.longueur;
    const h = this.dimensions.largeur;

    const area1 = { x: this.range(0, Math.floor(w / 2) + 1), y: this.range(0, Math.floor(h / 2) + 1), weight: 0 }; // NW
    const area2 = { x: this.range(Math.floor(w / 2) + 1, Math.floor(w) + 1), y: this.range(0, Math.floor(h / 2) + 1), weight: 0 }; // NE
    const area3 = { x: this.range(0, Math.floor(w / 2) + 1), y: this.range(Math.floor(h / 2) + 1, Math.floor(h) + 1), weight: 0 }; // SW
    const area4 = { x: this.range(Math.floor(w / 2) + 1, Math.floor(w) + 1), y: this.range(Math.floor(h / 2) + 1, Math.floor(h) + 1), weight: 0 }; // SE
    const areas = [area1, area2, area3, area4];

    for (const item of this.items) {
      const pos = item.position;
      const dims = item.finalDimensions;
      const weight = item.poids || 0;

      const xStart = Math.floor(pos.x);
      const xEnd = Math.floor(pos.x + dims.longueur);
      const yStart = Math.floor(pos.y);
      const yEnd = Math.floor(pos.y + dims.largeur);

      const xSet = this.range(xStart, xEnd + 1);
      const ySet = this.range(yStart, yEnd + 1);

      // Distribuer le poids dans les quadrants
      for (let j = 0; j < areas.length; j++) {
        const area = areas[j];

        // Item complètement dans ce quadrant
        if (this.isSubset(xSet, area.x) && this.isSubset(ySet, area.y)) {
          area.weight += weight;
          break;
        }
        // Item chevauche plusieurs quadrants
        else {
          const xIntersect = this.setIntersection(xSet, area.x);
          const yIntersect = this.setIntersection(ySet, area.y);

          if (xIntersect.size > 0 && yIntersect.size > 0) {
            const ratio = (xIntersect.size * yIntersect.size) / ((xEnd - xStart) * (yEnd - yStart));
            area.weight += weight * ratio;
          }
        }
      }
    }

    const totalWeight = areas.reduce((sum, area) => sum + area.weight, 0);

    if (totalWeight === 0) {
      return [25, 25, 25, 25];
    }

    return areas.map(area => set2Decimal((area.weight / totalWeight) * 100, 2));
  }

  isSubset(subset, superset) {
    for (const item of subset) {
      if (!superset.has(item)) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Classe Packer - Gère l'emballage des items dans les conteneurs
 */
class Packer {
  constructor() {
    this.bins = [];
    this.items = [];
    this.unfitItems = [];
    this.totalItems = 0;
  }

  addBin(bin) {
    this.bins.push(bin);
  }

  addItem(item) {
    this.items.push(item);
    this.totalItems = this.items.length;
  }

  /**
   * Pack un item dans un bin en testant les 3 axes
   * Inspiré de la méthode pack2Bin de py3dbp
   */
  pack2Bin(bin, item) {
    let fitted = false;

    // Si le bin est vide, placer à l'origine
    if (bin.items.length === 0) {
      const response = bin.putItem(item, { x: 0, y: 0, z: 0 });
      if (!response) {
        bin.unfittedItems = bin.unfittedItems || [];
        bin.unfittedItems.push(item);
      }
      return;
    }

    // Essayer chaque axe (WIDTH, HEIGHT, DEPTH)
    for (const axis of Axis.ALL) {
      const itemsInBin = [...bin.items];

      for (const placedItem of itemsInBin) {
        const [w, h, d] = getDimensionByRotation(placedItem, placedItem.rotationType);
        let pivot = { x: 0, y: 0, z: 0 };

        if (axis === Axis.WIDTH) {
          pivot = { x: placedItem.position.x + w, y: placedItem.position.y, z: placedItem.position.z };
        } else if (axis === Axis.HEIGHT) {
          pivot = { x: placedItem.position.x, y: placedItem.position.y + h, z: placedItem.position.z };
        } else if (axis === Axis.DEPTH) {
          pivot = { x: placedItem.position.x, y: placedItem.position.y, z: placedItem.position.z + d };
        }

        if (bin.putItem(item, pivot)) {
          fitted = true;
          break;
        }
      }

      if (fitted) break;
    }

    if (!fitted) {
      bin.unfittedItems = bin.unfittedItems || [];
      bin.unfittedItems.push(item);
    }
  }

  /**
   * Fonction principale de packing
   * @param {Object} options - Options de packing
   */
  pack(options = {}) {
    const {
      biggerFirst = true,
      distributeItems = true,
      fixPoint = true,
      checkStable = true,
      supportSurfaceRatio = 0.75
    } = options;

    // Trier les bins par volume
    this.bins.sort((a, b) => {
      const volA = a.capacityVolume;
      const volB = b.capacityVolume;
      return biggerFirst ? volB - volA : volA - volB;
    });

    // Trier les items: par volume décroissant, puis loadbear, puis level
    this.items.sort((a, b) => {
      const volA = a.longueur * a.largeur * a.hauteur;
      const volB = b.longueur * b.largeur * b.hauteur;

      // Volume décroissant
      if (Math.abs(volA - volB) > 100) {
        return biggerFirst ? volB - volA : volA - volB;
      }

      // Poids décroissant (loadbear)
      return (b.poids || 0) - (a.poids || 0);
    });

    // Configurer les options des bins
    for (const bin of this.bins) {
      bin.fixPoint = fixPoint;
      bin.checkStable = checkStable;
      bin.supportSurfaceRatio = supportSurfaceRatio;
    }

    // Packer les items dans les bins
    for (const bin of this.bins) {
      const itemsToPack = [...this.items];

      for (const item of itemsToPack) {
        this.pack2Bin(bin, item);
      }

      // Calculer la distribution de gravité
      bin.gravity = bin.calculateGravityDistribution();

      // Si distribute_items=true, retirer les items placés de la liste
      if (distributeItems) {
        for (const placedItem of bin.items) {
          const idx = this.items.findIndex(it => it.reference === placedItem.reference);
          if (idx !== -1) {
            this.items.splice(idx, 1);
          }
        }
      }
    }

    // Mettre les items non placés dans unfitItems
    if (this.items.length > 0) {
      this.unfitItems = [...this.items];
      this.items = [];
    }
  }
}

/**
 * Calcule le facteur d'espace perdu à cause des colis fragiles/non-gerbables
 */
function calculateWastedSpaceFactor(items) {
  const summary = summarize(items);

  if (summary.colisCount === 0) {
    return 1.0;
  }

  const problematicRatio = (summary.fragilesCount + summary.nonGerbablesCount) / summary.colisCount;
  const volumeRatio = summary.fragileNonStackableVolume / Math.max(0.001, summary.totalVolume);

  const baseFactor = 1.0;
  const problematicPenalty = problematicRatio * 0.8;
  const volumePenalty = volumeRatio * 0.7;

  const wastedSpaceFactor = baseFactor + problematicPenalty + volumePenalty;

  return Math.min(2.5, Math.max(1.0, wastedSpaceFactor));
}

/**
 * Évalue la capacité d'un conteneur pour les colis donnés
 */
function evaluateContainerFit(container, expandedItems) {
  const packer = new Packer();
  const bin = new Container(container);
  packer.addBin(bin);

  for (const item of expandedItems) {
    packer.addItem(item);
  }

  packer.pack({
    biggerFirst: true,
    distributeItems: false,
    fixPoint: true,
    checkStable: true,
    supportSurfaceRatio: 0.75
  });

  const packedBin = packer.bins[0];
  const placedItems = packedBin.items.length;
  const totalItems = expandedItems.length;

  const volumeUtilization = packedBin.capacityVolume > 0 ?
    packedBin.usedVolume / packedBin.capacityVolume : 0;

  const weightUtilization = packedBin.capacityWeight > 0 ?
    packedBin.usedWeight / packedBin.capacityWeight : 0;

  const placementScore = totalItems > 0 ? placedItems / totalItems : 0;
  const optimalityScore = (volumeUtilization * 0.5 + weightUtilization * 0.3) * placementScore + 0.2 * placementScore;

  return {
    containerId: container._id,
    matricule: container.matricule,
    containerType: container.type,
    containerCategory: container.categorie,
    dimensions: container.dimensions,
    volume: container.volume,
    capacitePoids: container.capacitePoids,
    placedItems,
    totalItems,
    volumeUtilization,
    weightUtilization,
    placementScore,
    optimalityScore,
    gravity: packedBin.gravity,
    simulation: packedBin
  };
}

/**
 * Trouve le conteneur optimal pour un ensemble de colis
 */
async function findOptimalContainer(items) {
  const containerPool = await getContainerPool();

  if (!containerPool || containerPool.length === 0) {
    return null;
  }

  const wastedSpaceFactor = calculateWastedSpaceFactor(items);
  const summary = summarize(items);

  console.log(`📊 Analyse des colis:
    - Total: ${summary.colisCount} colis
    - Fragiles: ${summary.fragilesCount}
    - Non-gerbables: ${summary.nonGerbablesCount}
    - Volume total: ${summary.totalVolume.toFixed(3)} m³
    - Facteur d'espace perdu: ${wastedSpaceFactor.toFixed(2)}x
    - Volume ajusté nécessaire: ${(summary.totalVolume * wastedSpaceFactor).toFixed(3)} m³`);

  // Expansion des articles
  const expandedItems = [];
  items.forEach((it) => {
    const q = Math.max(1, it.quantite || 1);
    for (let i = 0; i < q; i++) {
      expandedItems.push({ ...it, quantite: 1 });
    }
  });

  // Évaluation de chaque conteneur
  const evaluations = [];
  for (const container of containerPool) {
    const evaluation = evaluateContainerFit(container, expandedItems);

    const adjustedVolumeNeeded = summary.totalVolume * wastedSpaceFactor;
    const containerVolume = container.volume || 0;

    if (containerVolume < adjustedVolumeNeeded) {
      evaluation.volumeAdequacy = containerVolume / adjustedVolumeNeeded;
      evaluation.optimalityScore *= evaluation.volumeAdequacy;
    } else {
      evaluation.volumeAdequacy = 1.0;
    }

    evaluation.wastedSpaceFactor = wastedSpaceFactor;
    evaluations.push(evaluation);
  }

  const warnings = generateHeavyNonStackableWarnings(summary);
  const recommendations = generateHeavyNonStackableRecommendations(summary, wastedSpaceFactor);
  const heavyNonStackableDetected = summary.heavyNonStackableCount > 0;

  const fullPlacements = evaluations.filter(e => e.placedItems === expandedItems.length);

  if (fullPlacements.length > 0) {
    fullPlacements.sort((a, b) => b.optimalityScore - a.optimalityScore);

    console.log(`✅ Conteneur optimal trouvé: ${fullPlacements[0].containerType}
      - Tous les colis placés: ${fullPlacements[0].placedItems}/${fullPlacements[0].totalItems}
      - Score d'optimalité: ${fullPlacements[0].optimalityScore.toFixed(3)}`);

    return {
      ...fullPlacements[0],
      warnings,
      recommendations,
      heavyNonStackableDetected,
      heavyNonStackableItems: summary.heavyNonStackableItems,
      stats: {
        heavyNonStackableCount: summary.heavyNonStackableCount,
        heavyNonStackableVolume: summary.heavyNonStackableVolume
      }
    };
  }

  evaluations.sort((a, b) => {
    if (b.placedItems === a.placedItems) {
      return b.optimalityScore - a.optimalityScore;
    }
    return b.placedItems - a.placedItems;
  });

  console.log(`⚠️ Aucun conteneur ne peut tout contenir. Meilleur choix: ${evaluations[0].containerType}
    - Colis placés: ${evaluations[0].placedItems}/${evaluations[0].totalItems}
    - Score: ${evaluations[0].optimalityScore.toFixed(3)}`);

  return {
    ...evaluations[0],
    warnings,
    recommendations,
    heavyNonStackableDetected,
    heavyNonStackableItems: summary.heavyNonStackableItems,
    stats: {
      heavyNonStackableCount: summary.heavyNonStackableCount,
      heavyNonStackableVolume: summary.heavyNonStackableVolume
    }
  };
}

/**
 * Simule le placement optimisé des colis dans des contenants
 */
async function simulateOptimalPlacement(items, options = {}) {
  const { forceUseContainers = [], preferredCategories = [] } = options;
  const summary = summarize(items);
  const { totalVolume, totalWeight, colisCount, fragilesCount, nonGerbablesCount,
          heavyNonStackableCount, heavyNonStackableVolume, heavyNonStackableItems } = summary;

  if (!items || items.length === 0) {
    return {
      success: false,
      error: "Aucun colis à placer",
      requirements: { totalVolume: 0, totalWeight: 0 }
    };
  }

  // Expansion des articles
  const expanded = [];
  items.forEach((it) => {
    const q = Math.max(1, it.quantite || 1);
    for (let i = 0; i < q; i++) {
      expanded.push({ ...it, quantite: 1 });
    }
  });

  let containerPool = [];

  if (forceUseContainers && forceUseContainers.length > 0) {
    const forcedContainerIds = forceUseContainers.map(c => c._id || c);
    containerPool = await Contenant.find({ _id: { $in: forcedContainerIds } }).lean();

    if (containerPool.length === 0) {
      return {
        success: false,
        error: "Conteneur forcé non trouvé",
        requirements: { totalVolume, totalWeight }
      };
    }
  }
  else if (preferredCategories && preferredCategories.length > 0) {
    containerPool = await Contenant.find({
      disponible: true,
      categorie: { $in: preferredCategories }
    }).lean();
  }
  else {
    const optimalContainerEval = await findOptimalContainer(items);

    if (!optimalContainerEval) {
      return {
        success: false,
        error: "Aucun conteneur optimal trouvé",
        requirements: { totalVolume, totalWeight }
      };
    }

    const optimalContainer = await Contenant.findById(optimalContainerEval.containerId).lean();
    containerPool = [optimalContainer];
  }

  // Placer les colis avec le Packer
  const packer = new Packer();

  for (const container of containerPool) {
    const bin = new Container(container);
    packer.addBin(bin);
  }

  for (const item of expanded) {
    packer.addItem(item);
  }

  packer.pack({
    biggerFirst: true,
    distributeItems: true,
    fixPoint: true,
    checkStable: true,
    supportSurfaceRatio: 0.75
  });

  // Préparer les résultats
  const openContainers = packer.bins.filter(bin => bin.items.length > 0);
  const unplacedItems = packer.unfitItems;

  const avgVolumeUtilization = openContainers.length > 0
    ? openContainers.reduce((s, c) => s + (c.usedVolume / Math.max(1e-9, c.capacityVolume)), 0) / openContainers.length
    : 0;

  const avgWeightUtilization = openContainers.length > 0
    ? openContainers.reduce((s, c) => s + (c.usedWeight / Math.max(1e-9, c.capacityWeight)), 0) / openContainers.length
    : 0;

  const wastedSpaceFactor = calculateWastedSpaceFactor(items);
  const warnings = generateHeavyNonStackableWarnings(summary);
  const recommendations = generateHeavyNonStackableRecommendations(summary, wastedSpaceFactor);
  const heavyNonStackableDetected = heavyNonStackableCount > 0;

  const result = {
    success: unplacedItems.length === 0,
    stats: {
      totalVolume,
      totalWeight,
      colisCount,
      containersCount: openContainers.length,
      avgVolumeUtilization,
      avgWeightUtilization,
      fragilesCount,
      nonGerbablesCount,
      placedCount: expanded.length - unplacedItems.length,
      unplacedCount: unplacedItems.length,
      heavyNonStackableCount,
      heavyNonStackableVolume
    },
    containers: openContainers.map(c => ({
      id: c.id,
      ref: c.ref,
      type: c.type,
      categorie: c.categorie,
      capacity: { volume: c.capacityVolume, poids: c.capacityWeight },
      used: { volume: c.usedVolume, poids: c.usedWeight },
      utilization: {
        volume: c.capacityVolume > 0 ? (c.usedVolume / c.capacityVolume) * 100 : 0,
        poids: c.capacityWeight > 0 ? (c.usedWeight / c.capacityWeight) * 100 : 0
      },
      gravity: c.gravity,
      items: c.items
    })),
    placements: [],
    unplacedItems,
    warnings,
    recommendations,
    heavyNonStackableDetected,
    heavyNonStackableItems
  };

  return result;
}

/**
 * Sauvegarde une simulation dans la base de données
 */
async function saveSimulation(utilisateurId, colis, resultats, nom = undefined, description = undefined) {
  try {
    const simulation = new Simulation({
      utilisateurId,
      nom,
      description,
      colis,
      resultats,
      date: new Date()
    });

    await simulation.save();
    return simulation;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la simulation:", error);
    throw error;
  }
}

/**
 * Récupère les simulations d'un utilisateur
 */
async function getUserSimulations(utilisateurId) {
  return await Simulation.find({ utilisateurId }).sort({ date: -1 });
}

module.exports = {
  simulateOptimalPlacement,
  findOptimalContainer,
  saveSimulation,
  getUserSimulations,
  summarize,
  cmDimsToM3Volume,
  RotationType,
  Axis,
  Container,
  Packer
};