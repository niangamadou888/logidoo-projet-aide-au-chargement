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
 */
function itemRotationsFit(itemDims, boxDims) {
  const a = [itemDims.longueur, itemDims.largeur, itemDims.hauteur];
  const b = [boxDims.longueur, boxDims.largeur, boxDims.hauteur];
  
  // Toutes les 6 permutations possibles
  const perms = [
    [0, 1, 2], [0, 2, 1],
    [1, 0, 2], [1, 2, 0],
    [2, 0, 1], [2, 1, 0]
  ];
  
  return perms.some(p => a[p[0]] <= b[0] && a[p[1]] <= b[1] && a[p[2]] <= b[2]);
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
 * Vérifie si un colis peut être placé dans un conteneur ouvert
 * en tenant compte des contraintes fragile/gerbable
 * Version améliorée qui traite mieux les colis fragiles
 */
function canPlaceInOpenContainer(item, open) {
  // Vérification des dimensions
  const fitsDims = itemRotationsFit(
    { longueur: item.longueur, largeur: item.largeur, hauteur: item.hauteur },
    open.dimensions
  );
  
  const itemVolume = (item.longueur * item.largeur * item.hauteur) / 1_000_000;
  const q = item.quantite || 1;
  
  // Vérification du poids et du volume disponibles
  const fitsCapacity = (
    open.remainingWeight >= (item.poids || 0) * q &&
    open.remainingVolume + 1e-9 >= itemVolume * q // epsilon pour éviter les erreurs d'arrondi
  );
  
  // Vérification des contraintes fragile/gerbable avec une gestion spéciale
  let respectsConstraints = true;
  
  // Pour les colis fragiles, on permet toujours le placement, mais on marque le conteneur
  // pour ne plus rien mettre au-dessus après
  if (item.fragile) {
    // Si le conteneur a déjà des items au-dessus des colis fragiles, on ne peut pas placer ce nouvel item fragile
    if (open.hasFragileItemsCovered) {
      respectsConstraints = false;
    }
    // Sinon c'est OK, mais on va marquer que ce conteneur a des colis fragiles
  }
  
  // Si l'item n'est pas gerbable, vérifier s'il y a assez d'espace au sol
  if (!item.gerbable && open.floorSpaceUsed >= open.floorSpaceTotal * 0.85) { // 85% d'occupation au sol
    respectsConstraints = false;
  }
  
  return fitsDims && fitsCapacity && respectsConstraints;
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

  // Tentative de placement de chaque item
  let placedItems = 0;
  const itemsToPlace = [...expandedItems]; // Copie des items pour ne pas les modifier
  
  for (const item of itemsToPlace) {
    if (canPlaceInOpenContainer(item, containerCopy)) {
      const v = cmDimsToM3Volume(item);
      const w = (item.poids || 0);
      
      containerCopy.remainingVolume -= v;
      containerCopy.remainingWeight -= w;
      containerCopy.usedVolume += v;
      containerCopy.usedWeight += w;
      
      // Mettre à jour les contraintes
      if (!item.gerbable) {
        containerCopy.hasNonGerbableItems = true;
        // Ajouter l'espace au sol occupé
        containerCopy.floorSpaceUsed += (item.longueur * item.largeur) / 10000; // cm² -> m²
      }
      
      if (item.fragile) {
        containerCopy.hasFragileItems = true;
        containerCopy.hasItemsAbove = true; // Marquer qu'on ne peut rien mettre au-dessus
      }
      
      containerCopy.items.push(item);
      placedItems++;
    }
  }

  // Calcul des taux d'utilisation
  const volumeUtilization = containerCopy.capacityVolume > 0 ? 
    containerCopy.usedVolume / containerCopy.capacityVolume : 0;
  
  const weightUtilization = containerCopy.capacityWeight > 0 ? 
    containerCopy.usedWeight / containerCopy.capacityWeight : 0;
  
  // Score d'optimalité (privilégie le taux de remplissage élevé et le conteneur le plus petit possible)
  // Le score optimal est un conteneur complètement rempli
  const volumeScore = volumeUtilization * 0.7; // Donne plus de poids au volume
  const weightScore = weightUtilization * 0.3;
  const placementScore = placedItems / itemsToPlace.length;
  
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
    optimalityScore: (volumeScore + weightScore) * placementScore,
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
  
  // Tri des items avec priorité spéciale pour les colis fragiles (à placer en dernier)
  expandedItems.sort((a, b) => {
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
    
    // Placer autant de colis que possible dans ce conteneur
    for (const item of remainingItems) {
      if (canPlaceInOpenContainer(item, oc)) {
        const v = cmDimsToM3Volume(item);
        const w = (item.poids || 0);
        
        oc.remainingVolume -= v;
        oc.remainingWeight -= w;
        oc.usedVolume += v;
        oc.usedWeight += w;
        
        // Mettre à jour les contraintes
        if (!item.gerbable) {
          oc.hasNonGerbableItems = true;
          // Ajouter l'espace au sol occupé
          oc.floorSpaceUsed += (item.longueur * item.largeur) / 10000; // cm² -> m²
        }
        
        if (item.fragile) {
          oc.hasFragileItems = true;
          // Marquer qu'on ne peut rien mettre au-dessus des colis fragiles
          oc.hasItemsAbove = true;
        }
        
        oc.items.push(item);
        placements.push({ containerId: oc.id, containerRef: oc.ref, item });
      }
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
async function saveSimulation(utilisateurId, colis, resultats) {
  try {
    const simulation = new Simulation({
      utilisateurId,
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
  cmDimsToM3Volume
};