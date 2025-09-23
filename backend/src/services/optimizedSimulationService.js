const Contenant = require('../models/Contenant');
const Simulation = require('../models/Simulation');

/**
 * Calcule le volume en m³ à partir des dimensions en cm
 */
function cmDimsToM3Volume({ longueur, largeur, hauteur, quantite = 1 }) {
  const v = (longueur * largeur * hauteur) / 1_000_000; // cm3 -> m3
  return v * (quantite || 1);
}

/**
 * Vérifie si un objet peut être placé dans un conteneur selon différentes rotations
 * Retourne également l'orientation optimale pour une meilleure utilisation de l'espace
 */
function itemRotationsFit(itemDims, boxDims) {
  const a = [itemDims.longueur, itemDims.largeur, itemDims.hauteur];
  const b = [boxDims.longueur, boxDims.largeur, boxDims.hauteur];

  // Toutes les 6 permutations possibles avec leurs orientations
  const perms = [
    { perm: [0, 1, 2], dims: [a[0], a[1], a[2]] },
    { perm: [0, 2, 1], dims: [a[0], a[2], a[1]] },
    { perm: [1, 0, 2], dims: [a[1], a[0], a[2]] },
    { perm: [1, 2, 0], dims: [a[1], a[2], a[0]] },
    { perm: [2, 0, 1], dims: [a[2], a[0], a[1]] },
    { perm: [2, 1, 0], dims: [a[2], a[1], a[0]] }
  ];

  return perms.some(p => p.dims[0] <= b[0] && p.dims[1] <= b[1] && p.dims[2] <= b[2]);
}

/**
 * Trouve la meilleure orientation pour un item dans un conteneur
 * Privilégie les orientations qui maximisent l'utilisation de l'espace
 */
function findBestOrientation(itemDims, boxDims, currentLevel = 0) {
  const a = [itemDims.longueur, itemDims.largeur, itemDims.hauteur];
  const b = [boxDims.longueur, boxDims.largeur, boxDims.hauteur];

  const orientations = [
    { perm: [0, 1, 2], dims: [a[0], a[1], a[2]] },
    { perm: [0, 2, 1], dims: [a[0], a[2], a[1]] },
    { perm: [1, 0, 2], dims: [a[1], a[0], a[2]] },
    { perm: [1, 2, 0], dims: [a[1], a[2], a[0]] },
    { perm: [2, 0, 1], dims: [a[2], a[0], a[1]] },
    { perm: [2, 1, 0], dims: [a[2], a[1], a[0]] }
  ];

  const validOrientations = orientations.filter(o =>
    o.dims[0] <= b[0] && o.dims[1] <= b[1] && o.dims[2] <= b[2]
  );

  if (validOrientations.length === 0) {
    return null;
  }

  // Privilégier l'orientation qui:
  // 1. Minimise la hauteur utilisée (pour permettre plus de couches)
  // 2. Maximise l'utilisation de la base du conteneur
  // 3. Laisse le plus d'espace pour d'autres items
  validOrientations.sort((a, b) => {
    // Score basé sur l'efficacité de l'espace
    const scoreA = (a.dims[0] * a.dims[1] * a.dims[2]) / (b[0] * b[1] * (b[2] - currentLevel));
    const scoreB = (b.dims[0] * b.dims[1] * b.dims[2]) / (b[0] * b[1] * (b[2] - currentLevel));

    // Privilégier la hauteur plus faible si les scores sont similaires
    if (Math.abs(scoreA - scoreB) < 0.01) {
      return a.dims[2] - b.dims[2];
    }

    return scoreB - scoreA;
  });

  return {
    orientation: validOrientations[0].perm,
    dimensions: {
      longueur: validOrientations[0].dims[0],
      largeur: validOrientations[0].dims[1],
      hauteur: validOrientations[0].dims[2]
    }
  };
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
  
  items.forEach(it => {
    const q = it.quantite || 1;
    colisCount += q;
    totalVolume += ((it.longueur * it.largeur * it.hauteur) / 1_000_000) * q;
    totalWeight += (it.poids || 0) * q;
    
    if (it.fragile) fragilesCount += q;
    if (!it.gerbable) nonGerbablesCount += q;
  });
  
  return { 
    totalVolume, 
    totalWeight,
    count: items.length,
    colisCount,
    fragilesCount,
    nonGerbablesCount
  };
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
 * Détermine la raison exacte pour laquelle un colis ne peut pas être placé dans un conteneur
 */
function getPlacementErrorReason(item, container) {
  // Vérifier si le colis est trop grand pour le conteneur (dimensions)
  const fitsDims = itemRotationsFit(
    { longueur: item.longueur, largeur: item.largeur, hauteur: item.hauteur },
    container.dimensions
  );
  
  if (!fitsDims) {
    return 'DIMENSIONS_TROP_GRANDES';
  }
  
  // Vérifier si le poids du colis dépasse la capacité de poids restante
  const itemWeight = (item.poids || 0) * (item.quantite || 1);
  if (itemWeight > container.remainingWeight) {
    return 'POIDS_DEPASSE';
  }
  
  // Vérifier si le volume du colis dépasse le volume restant
  const itemVolume = cmDimsToM3Volume(item);
  if (itemVolume > container.remainingVolume + 1e-9) { // epsilon pour éviter les erreurs d'arrondi
    return 'VOLUME_DEPASSE';
  }
  
  // Vérifier les contraintes spéciales
  if (item.fragile && container.hasItemsAbove) {
    return 'COLIS_FRAGILE';
  }
  
  if (!item.gerbable && container.needsItemsBelow) {
    return 'COLIS_NON_GERBABLE';
  }
  
  // Si aucune raison spécifique n'a été identifiée
  return 'PLACEMENT_IMPOSSIBLE';
}

/**
 * Structure 3D pour optimiser l'espace
 */
class SpaceNode {
  constructor(x, y, z, width, height, depth) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.occupied = false;
    this.item = null;
  }

  canFit(itemDims) {
    return !this.occupied &&
           itemDims.longueur <= this.width &&
           itemDims.largeur <= this.height &&
           itemDims.hauteur <= this.depth;
  }

  place(item, dims) {
    this.occupied = true;
    this.item = item;
    return this.split(dims);
  }

  split(itemDims) {
    const newSpaces = [];

    // Créer des espaces résiduels autour de l'item placé
    if (itemDims.longueur < this.width) {
      newSpaces.push(new SpaceNode(
        this.x + itemDims.longueur, this.y, this.z,
        this.width - itemDims.longueur, this.height, this.depth
      ));
    }

    if (itemDims.largeur < this.height) {
      newSpaces.push(new SpaceNode(
        this.x, this.y + itemDims.largeur, this.z,
        itemDims.longueur, this.height - itemDims.largeur, this.depth
      ));
    }

    if (itemDims.hauteur < this.depth) {
      newSpaces.push(new SpaceNode(
        this.x, this.y, this.z + itemDims.hauteur,
        itemDims.longueur, itemDims.largeur, this.depth - itemDims.hauteur
      ));
    }

    return newSpaces;
  }
}

/**
 * Vérifie si un colis peut être placé dans un conteneur ouvert
 * Version optimisée avec gestion 3D de l'espace
 */
function canPlaceInOpenContainer(item, open) {
  const q = item.quantite || 1;

  // Vérification du poids disponible
  if (open.remainingWeight < (item.poids || 0) * q) {
    return false;
  }

  // Vérification du volume approximatif
  const itemVolume = (item.longueur * item.largeur * item.hauteur) / 1_000_000;
  if (open.remainingVolume + 1e-9 < itemVolume * q) {
    return false;
  }

  // Vérification 3D avec les espaces disponibles
  if (!open.availableSpaces) {
    // Initialiser l'espace 3D si ce n'est pas déjà fait
    open.availableSpaces = [new SpaceNode(
      0, 0, 0,
      open.dimensions.longueur,
      open.dimensions.largeur,
      open.dimensions.hauteur
    )];
    open.currentLevel = 0;
    open.layers = [];
  }

  // Trouver la meilleure orientation
  const bestOrientation = findBestOrientation(
    { longueur: item.longueur, largeur: item.largeur, hauteur: item.hauteur },
    open.dimensions,
    open.currentLevel
  );

  if (!bestOrientation) {
    return false;
  }

  // Chercher un espace disponible pour cette orientation
  const fitsInSpace = open.availableSpaces.some(space =>
    space.canFit(bestOrientation.dimensions)
  );

  if (!fitsInSpace) {
    return false;
  }

  // Vérification des contraintes fragile/gerbable améliorées
  if (item.fragile) {
    // Les colis fragiles peuvent être placés mais pas écrasés
    if (open.hasFragileItemsCovered) {
      return false;
    }
  }

  if (!item.gerbable) {
    // Les colis non-gerbables doivent être au sol ou sur une couche stable
    const groundLevel = bestOrientation.dimensions.hauteur;
    if (open.currentLevel > 0 && !open.hasStableLayer) {
      return false;
    }
  }

  return true;
}

/**
 * Place effectivement un item dans le conteneur avec gestion 3D optimisée
 */
function placeItemInContainer(item, open) {
  const bestOrientation = findBestOrientation(
    { longueur: item.longueur, largeur: item.largeur, hauteur: item.hauteur },
    open.dimensions,
    open.currentLevel
  );

  if (!bestOrientation) {
    return false;
  }

  // Trouver le meilleur espace disponible
  let bestSpaceIndex = -1;
  let bestScore = -1;

  open.availableSpaces.forEach((space, index) => {
    if (space.canFit(bestOrientation.dimensions)) {
      // Score basé sur l'efficacité de l'utilisation de l'espace
      const efficiency = (bestOrientation.dimensions.longueur * bestOrientation.dimensions.largeur * bestOrientation.dimensions.hauteur) /
                        (space.width * space.height * space.depth);

      // Privilégier les espaces avec une meilleure efficacité et plus bas
      const score = efficiency * 1000 - space.z;

      if (score > bestScore) {
        bestScore = score;
        bestSpaceIndex = index;
      }
    }
  });

  if (bestSpaceIndex === -1) {
    return false;
  }

  // Placer l'item et créer de nouveaux espaces
  const selectedSpace = open.availableSpaces[bestSpaceIndex];
  const newSpaces = selectedSpace.place(item, bestOrientation.dimensions);

  // Mettre à jour la liste des espaces disponibles
  open.availableSpaces.splice(bestSpaceIndex, 1);
  open.availableSpaces.push(...newSpaces);

  // Nettoyer les espaces trop petits ou chevauchants
  open.availableSpaces = open.availableSpaces.filter(space =>
    space.width >= 1 && space.height >= 1 && space.depth >= 1
  );

  // Mettre à jour les statistiques du conteneur
  const v = cmDimsToM3Volume({ ...bestOrientation.dimensions, quantite: 1 });
  const w = (item.poids || 0);

  open.remainingVolume -= v;
  open.remainingWeight -= w;
  open.usedVolume += v;
  open.usedWeight += w;

  // Gérer les contraintes spéciales
  if (item.fragile) {
    open.hasFragileItems = true;
    open.hasItemsAbove = true;
  }

  if (!item.gerbable) {
    open.hasNonGerbableItems = true;
    open.hasStableLayer = true;
  }

  // Mettre à jour le niveau actuel
  const newLevel = selectedSpace.z + bestOrientation.dimensions.hauteur;
  if (newLevel > open.currentLevel) {
    open.currentLevel = newLevel;
  }

  // Ajouter l'item avec sa position et orientation
  open.items.push({
    ...item,
    position: { x: selectedSpace.x, y: selectedSpace.y, z: selectedSpace.z },
    orientation: bestOrientation.orientation,
    finalDimensions: bestOrientation.dimensions
  });

  return true;
}

/**
 * Évalue la capacité d'un conteneur pour les colis donnés
 * et renvoie un score d'optimalité
 */
function evaluateContainerFit(container, expandedItems) {
  // Copie du conteneur pour la simulation
  const containerCopy = {
    id: container._id,
    type: container.type,
    categorie: container.categorie,
    dimensions: container.dimensions,
    capacityVolume: container.volume || 0,
    capacityWeight: container.capacitePoids || 0,
    remainingVolume: container.volume || 0,
    remainingWeight: container.capacitePoids || 0,
    usedVolume: 0,
    usedWeight: 0,
    items: [],
    hasFragileItems: false,
    hasNonGerbableItems: false,
    hasItemsAbove: false,
    hasFragileItemsCovered: false,
    floorSpaceTotal: container.dimensions.longueur * container.dimensions.largeur,
    floorSpaceUsed: 0
  };

  // Tentative de placement optimisée avec algorithme 3D
  let placedItems = 0;
  const itemsToPlace = [...expandedItems];

  // Initialiser la structure 3D du conteneur
  containerCopy.availableSpaces = [new SpaceNode(
    0, 0, 0,
    containerCopy.dimensions.longueur,
    containerCopy.dimensions.largeur,
    containerCopy.dimensions.hauteur
  )];
  containerCopy.currentLevel = 0;
  containerCopy.layers = [];
  containerCopy.hasStableLayer = false;

  for (const item of itemsToPlace) {
    if (canPlaceInOpenContainer(item, containerCopy)) {
      if (placeItemInContainer(item, containerCopy)) {
        placedItems++;

        // Mettre à jour les contraintes globales
        if (!item.gerbable) {
          containerCopy.hasNonGerbableItems = true;
          containerCopy.hasStableLayer = true;
        }

        if (item.fragile) {
          containerCopy.hasFragileItems = true;
          containerCopy.hasItemsAbove = true;
        }

        // Optimisation: essayer de regrouper les espaces vides
        if (placedItems % 5 === 0) {
          containerCopy.availableSpaces = optimizeAvailableSpaces(containerCopy.availableSpaces);
        }
      }
    }
  }

  // Nettoyage final des espaces
  containerCopy.availableSpaces = optimizeAvailableSpaces(containerCopy.availableSpaces);

  // Calculer le taux d'utilisation réel basé sur l'espace 3D
  const realUsedVolume = calculateRealUsedVolume(containerCopy);
  containerCopy.realVolumeUtilization = realUsedVolume / containerCopy.capacityVolume;

  // Calcul des taux d'utilisation améliorés
  const volumeUtilization = containerCopy.capacityVolume > 0 ?
    containerCopy.usedVolume / containerCopy.capacityVolume : 0;

  const realVolumeUtilization = containerCopy.realVolumeUtilization || volumeUtilization;

  const weightUtilization = containerCopy.capacityWeight > 0 ?
    containerCopy.usedWeight / containerCopy.capacityWeight : 0;

  // Score d'optimalité amélioré tenant compte de l'utilisation réelle de l'espace
  const realVolumeScore = realVolumeUtilization * 0.5;
  const approxVolumeScore = volumeUtilization * 0.2;
  const weightScore = weightUtilization * 0.2;
  const placementScore = placedItems / itemsToPlace.length;
  const spaceEfficiencyScore = calculateSpaceEfficiency(containerCopy) * 0.1;

  const optimalityScore = (realVolumeScore + approxVolumeScore + weightScore + spaceEfficiencyScore) * placementScore;
  
  return {
    containerId: container._id,
    containerType: container.type,
    containerCategory: container.categorie,
    dimensions: container.dimensions,
    volume: container.volume,
    capacitePoids: container.capacitePoids,
    placedItems,
    totalItems: itemsToPlace.length,
    volumeUtilization,
    weightUtilization,
    placementScore,
    optimalityScore: optimalityScore,
    realVolumeUtilization: realVolumeUtilization,
    spaceEfficiency: calculateSpaceEfficiency(containerCopy),
    simulation: containerCopy
  };
}

/**
 * Trouve le conteneur optimal pour un ensemble de colis
 */
async function findOptimalContainer(items) {
  // Récupération de tous les contenants disponibles
  const containerPool = await getContainerPool();
  
  if (!containerPool || containerPool.length === 0) {
    return null;
  }
  
  // Expansion des articles selon leurs quantités
  const expandedItems = [];
  items.forEach((it) => {
    const q = Math.max(1, it.quantite || 1);
    for (let i = 0; i < q; i++) {
      expandedItems.push({ ...it, quantite: 1 });
    }
  });
  
  // Tri optimisé pour maximiser l'utilisation de l'espace
  expandedItems.sort((a, b) => {
    // 1. Priorité aux colis non-gerbables (doivent être à la base)
    if (!a.gerbable && b.gerbable) return -1;
    if (a.gerbable && !b.gerbable) return 1;

    // 2. Ensuite par densité (poids/volume) décroissante pour optimiser l'espace
    const densityA = (a.poids || 0) / Math.max(1, a.longueur * a.largeur * a.hauteur);
    const densityB = (b.poids || 0) / Math.max(1, b.longueur * b.largeur * b.hauteur);

    if (Math.abs(densityA - densityB) > 1e-6) {
      return densityB - densityA;
    }

    // 3. Ensuite par compacité (ratio hauteur/base) croissante
    const compactA = a.hauteur / Math.max(1, Math.sqrt(a.longueur * a.largeur));
    const compactB = b.hauteur / Math.max(1, Math.sqrt(b.longueur * b.largeur));

    if (Math.abs(compactA - compactB) > 0.1) {
      return compactA - compactB;
    }

    // 4. Enfin par volume décroissant
    const va = a.longueur * a.largeur * a.hauteur;
    const vb = b.longueur * b.largeur * b.hauteur;

    if (Math.abs(va - vb) > 1000) {
      return vb - va;
    }

    // 5. Les colis fragiles en dernier s'ils ont des caractéristiques similaires
    if (a.fragile && !b.fragile) return 1;
    if (!a.fragile && b.fragile) return -1;

    return 0;
  });

  // Évaluation de chaque conteneur
  const evaluations = [];
  for (const container of containerPool) {
    const evaluation = evaluateContainerFit(container, expandedItems);
    evaluations.push(evaluation);
  }
  
  // Filtrer les conteneurs qui peuvent accueillir tous les colis
  const fullPlacements = evaluations.filter(e => e.placedItems === expandedItems.length);
  
  if (fullPlacements.length > 0) {
    // Parmi les conteneurs qui peuvent tout contenir, prendre celui avec le meilleur score d'optimalité
    fullPlacements.sort((a, b) => b.optimalityScore - a.optimalityScore);
    return fullPlacements[0];
  }
  
  // Si aucun conteneur ne peut tout contenir, prendre celui qui contient le plus d'items
  evaluations.sort((a, b) => {
    if (b.placedItems === a.placedItems) {
      return b.optimalityScore - a.optimalityScore;
    }
    return b.placedItems - a.placedItems;
  });
  
  return evaluations[0];
}

/**
 * Simule le placement optimisé des colis dans des contenants
 */
async function simulateOptimalPlacement(items, options = {}) {
  const { forceUseContainers = [], preferredCategories = [] } = options;
  const { totalVolume, totalWeight, colisCount, fragilesCount, nonGerbablesCount } = summarize(items);
  
  // Si aucun colis n'est fourni
  if (!items || items.length === 0) {
    return {
      success: false,
      error: "Aucun colis à placer",
      requirements: { totalVolume: 0, totalWeight: 0 }
    };
  }
  
  // Expansion des articles selon leurs quantités et tri
  const expanded = [];
  items.forEach((it) => {
    const q = Math.max(1, it.quantite || 1);
    for (let i = 0; i < q; i++) {
      expanded.push({ ...it, quantite: 1 });
    }
  });
  
  // Tri des items avec priorité spéciale pour les colis fragiles (à placer en dernier)
  expanded.sort((a, b) => {
    // On place d'abord les colis non-fragiles
    if (a.fragile && !b.fragile) return 1; // Colis fragile va à la fin
    if (!a.fragile && b.fragile) return -1; // Colis non-fragile va au début
    
    // Puis on trie par gerbabilité (non-gerbable d'abord)
    if (!a.gerbable && b.gerbable) return -1;
    if (a.gerbable && !b.gerbable) return 1;
    
    // Ensuite par volume décroissant
    const va = a.longueur * a.largeur * a.hauteur;
    const vb = b.longueur * b.largeur * b.hauteur;
    return vb - va;
  });

  // Si un conteneur spécifique est imposé
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
  // Si des catégories préférées sont spécifiées
  else if (preferredCategories && preferredCategories.length > 0) {
    containerPool = await Contenant.find({ 
      disponible: true,
      categorie: { $in: preferredCategories }
    }).lean();
  } 
  // Sinon, trouver le conteneur optimal
  else {
    // Trouver le meilleur conteneur pour tous les colis
    const optimalContainerEval = await findOptimalContainer(items);
    
    if (!optimalContainerEval) {
      return {
        success: false,
        error: "Aucun conteneur optimal trouvé",
        requirements: { totalVolume, totalWeight }
      };
    }
    
    // Récupérer le conteneur complet
    const optimalContainer = await Contenant.findById(optimalContainerEval.containerId).lean();
    containerPool = [optimalContainer];
  }

  // Placer les colis dans le(s) conteneur(s)
  const openContainers = [];
  const placements = [];
  const unplacedItems = [];

  // Pour chaque conteneur dans le pool
  for (const container of containerPool) {
    // Créer un nouveau conteneur ouvert
    const oc = {
      id: String(openContainers.length + 1),
      ref: container._id,
      type: container.type,
      categorie: container.categorie,
      dimensions: container.dimensions,
      capacityVolume: container.volume || 0,
      capacityWeight: container.capacitePoids || 0,
      remainingVolume: (container.volume || 0),
      remainingWeight: (container.capacitePoids || 0),
      usedVolume: 0,
      usedWeight: 0,
      items: [],
      hasFragileItems: false,
      hasNonGerbableItems: false,
      hasItemsAbove: false,
      hasFragileItemsCovered: false,
      floorSpaceTotal: container.dimensions.longueur * container.dimensions.largeur,
      floorSpaceUsed: 0
    };
    
    // Copie des colis non placés pour ce conteneur
    const remainingItems = expanded.filter(item => !placements.some(p => p.item === item));
    
    // Initialiser la structure 3D pour ce conteneur
    oc.availableSpaces = [new SpaceNode(
      0, 0, 0,
      oc.dimensions.longueur,
      oc.dimensions.largeur,
      oc.dimensions.hauteur
    )];
    oc.currentLevel = 0;
    oc.hasStableLayer = false;

    // Placer autant de colis que possible dans ce conteneur avec l'algorithme optimisé
    for (const item of remainingItems) {
      if (canPlaceInOpenContainer(item, oc)) {
        if (placeItemInContainer(item, oc)) {
          placements.push({ containerId: oc.id, containerRef: oc.ref, item });

          // Mettre à jour les contraintes globales
          if (!item.gerbable) {
            oc.hasNonGerbableItems = true;
            oc.hasStableLayer = true;
          }

          if (item.fragile) {
            oc.hasFragileItems = true;
            oc.hasItemsAbove = true;
          }
        }
      }
    }

    // Optimiser les espaces vides restants
    if (oc.items.length > 0) {
      oc.availableSpaces = optimizeAvailableSpaces(oc.availableSpaces);
      oc.realVolumeUtilization = calculateRealUsedVolume(oc) / oc.capacityVolume;
    }
    
    // Ajouter ce conteneur s'il a été utilisé
    if (oc.items.length > 0) {
      openContainers.push(oc);
    }
  }
  
  // Identifier les colis non placés
  for (const item of expanded) {
    if (!placements.some(p => p.item === item)) {
      // Déterminer la raison pour laquelle le colis n'a pas pu être placé
      let errorReason = "PLACEMENT_IMPOSSIBLE";
      
      if (openContainers.length > 0) {
        const lastContainer = openContainers[openContainers.length - 1];
        errorReason = getPlacementErrorReason(item, lastContainer);
      }
      
      unplacedItems.push({ 
        ...item, 
        error: errorReason
      });
    }
  }
  
  // Calcul des statistiques
  const avgVolumeUtilization = openContainers.length
    ? openContainers.reduce((s, c) => s + (c.usedVolume / Math.max(1e-9, c.capacityVolume)), 0) / openContainers.length
    : 0;
  
  const avgWeightUtilization = openContainers.length
    ? openContainers.reduce((s, c) => s + (c.usedWeight / Math.max(1e-9, c.capacityWeight)), 0) / openContainers.length
    : 0;
  
  // Préparation du résultat
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
      unplacedCount: unplacedItems.length
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
      items: c.items
    })),
    placements,
    unplacedItems
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

/**
 * Optimise les espaces disponibles en fusionnant les espaces adjacents
 */
function optimizeAvailableSpaces(spaces) {
  if (!spaces || spaces.length === 0) return [];

  // Supprimer les espaces trop petits
  let filteredSpaces = spaces.filter(space =>
    space.width >= 5 && space.height >= 5 && space.depth >= 5 && !space.occupied
  );

  // Trier par position pour faciliter la fusion
  filteredSpaces.sort((a, b) => {
    if (a.z !== b.z) return a.z - b.z;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  // Fusionner les espaces adjacents (algorithme simple)
  const mergedSpaces = [];
  for (const space of filteredSpaces) {
    let merged = false;

    for (let i = 0; i < mergedSpaces.length; i++) {
      const existing = mergedSpaces[i];

      // Vérifier si les espaces peuvent être fusionnés
      if (canMergeSpaces(existing, space)) {
        mergedSpaces[i] = mergeSpaces(existing, space);
        merged = true;
        break;
      }
    }

    if (!merged) {
      mergedSpaces.push(space);
    }
  }

  return mergedSpaces;
}

/**
 * Vérifie si deux espaces peuvent être fusionnés
 */
function canMergeSpaces(space1, space2) {
  // Fusion horizontale (axe X)
  if (space1.y === space2.y && space1.z === space2.z &&
      space1.height === space2.height && space1.depth === space2.depth) {
    return (space1.x + space1.width === space2.x) || (space2.x + space2.width === space1.x);
  }

  // Fusion verticale (axe Y)
  if (space1.x === space2.x && space1.z === space2.z &&
      space1.width === space2.width && space1.depth === space2.depth) {
    return (space1.y + space1.height === space2.y) || (space2.y + space2.height === space1.y);
  }

  // Fusion en profondeur (axe Z)
  if (space1.x === space2.x && space1.y === space2.y &&
      space1.width === space2.width && space1.height === space2.height) {
    return (space1.z + space1.depth === space2.z) || (space2.z + space2.depth === space1.z);
  }

  return false;
}

/**
 * Fusionne deux espaces adjacents
 */
function mergeSpaces(space1, space2) {
  const minX = Math.min(space1.x, space2.x);
  const minY = Math.min(space1.y, space2.y);
  const minZ = Math.min(space1.z, space2.z);

  const maxX = Math.max(space1.x + space1.width, space2.x + space2.width);
  const maxY = Math.max(space1.y + space1.height, space2.y + space2.height);
  const maxZ = Math.max(space1.z + space1.depth, space2.z + space2.depth);

  return new SpaceNode(
    minX, minY, minZ,
    maxX - minX,
    maxY - minY,
    maxZ - minZ
  );
}

/**
 * Calcule le volume réellement utilisé en tenant compte de l'espace 3D
 */
function calculateRealUsedVolume(container) {
  if (!container.items || container.items.length === 0) {
    return 0;
  }

  // Calculer le volume de la boîte englobante minimale
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  container.items.forEach(item => {
    if (item.position && item.finalDimensions) {
      const pos = item.position;
      const dims = item.finalDimensions;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      minZ = Math.min(minZ, pos.z);

      maxX = Math.max(maxX, pos.x + dims.longueur);
      maxY = Math.max(maxY, pos.y + dims.largeur);
      maxZ = Math.max(maxZ, pos.z + dims.hauteur);
    }
  });

  if (minX === Infinity) {
    return container.usedVolume;
  }

  // Volume de la boîte englobante en m³
  const boundingVolume = ((maxX - minX) * (maxY - minY) * (maxZ - minZ)) / 1_000_000;

  // Retourner le minimum entre le volume englobant et le volume théorique
  return Math.min(boundingVolume, container.usedVolume);
}

/**
 * Calcule l'efficacité de l'utilisation de l'espace
 */
function calculateSpaceEfficiency(container) {
  if (!container.items || container.items.length === 0) {
    return 0;
  }

  const totalItemVolume = container.usedVolume;
  const realUsedVolume = calculateRealUsedVolume(container);

  if (realUsedVolume === 0) {
    return 0;
  }

  // Ratio entre le volume des items et l'espace réellement occupé
  const packingEfficiency = totalItemVolume / realUsedVolume;

  // Facteur de compacité basé sur la distribution des items
  const compactnessScore = calculateCompactness(container);

  return Math.min(1, (packingEfficiency * 0.7 + compactnessScore * 0.3));
}

/**
 * Calcule un score de compacité basé sur la distribution des items
 */
function calculateCompactness(container) {
  if (!container.items || container.items.length <= 1) {
    return 1;
  }

  // Calculer les distances moyennes entre les items
  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < container.items.length; i++) {
    for (let j = i + 1; j < container.items.length; j++) {
      const item1 = container.items[i];
      const item2 = container.items[j];

      if (item1.position && item2.position) {
        const dx = item1.position.x - item2.position.x;
        const dy = item1.position.y - item2.position.y;
        const dz = item1.position.z - item2.position.z;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        totalDistance += distance;
        pairCount++;
      }
    }
  }

  if (pairCount === 0) {
    return 1;
  }

  const avgDistance = totalDistance / pairCount;
  const containerDiagonal = Math.sqrt(
    container.dimensions.longueur * container.dimensions.longueur +
    container.dimensions.largeur * container.dimensions.largeur +
    container.dimensions.hauteur * container.dimensions.hauteur
  );

  // Score inversement proportionnel à la distance moyenne
  return Math.max(0, 1 - (avgDistance / containerDiagonal));
}

module.exports = {
  simulateOptimalPlacement,
  findOptimalContainer,
  saveSimulation,
  getUserSimulations,
  summarize,
  cmDimsToM3Volume
};
