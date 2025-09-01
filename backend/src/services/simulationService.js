const Contenant = require('../models/Contenant');

function cmDimsToM3Volume({ longueur, largeur, hauteur, quantite = 1 }) {
  const v = (longueur * largeur * hauteur) / 1_000_000; // cm3 -> m3
  return v * (quantite || 1);
}

function itemRotationsFit(itemDims, boxDims) {
  const a = [itemDims.longueur, itemDims.largeur, itemDims.hauteur];
  const b = [boxDims.longueur, boxDims.largeur, boxDims.hauteur];
  // All 6 permutations
  const perms = [
    [0, 1, 2], [0, 2, 1],
    [1, 0, 2], [1, 2, 0],
    [2, 0, 1], [2, 1, 0]
  ];
  return perms.some(p => a[p[0]] <= b[0] && a[p[1]] <= b[1] && a[p[2]] <= b[2]);
}

function summarize(items) {
  let totalVolume = 0;
  let totalWeight = 0;
  items.forEach(it => {
    const q = it.quantite || 1;
    totalVolume += ((it.longueur * it.largeur * it.hauteur) / 1_000_000) * q;
    totalWeight += (it.poids || 0) * q;
  });
  return { totalVolume, totalWeight, count: items.length };
}

async function getContainerPool() {
  try {
    const pool = await Contenant.find({ disponible: true }).lean();
    return pool;
  } catch (e) {
    // If DB is not connected or query fails, return empty pool to allow graceful preview
    return [];
  }
}

function pickSmallestFittingContainer(item, pool) {
  const candidates = pool.filter(c =>
    (c.capacitePoids || 0) >= (item.poids * (item.quantite || 1)) &&
    itemRotationsFit(
      { longueur: item.longueur, largeur: item.largeur, hauteur: item.hauteur },
      c.dimensions
    )
  );
  if (!candidates.length) return null;
  // choose minimal volume container
  candidates.sort((a, b) => (a.volume || 0) - (b.volume || 0));
  return candidates[0];
}

function canPlaceInOpenContainer(item, open) {
  // Check weight + approximate volume remaining and dimension fit to the box itself
  const fitsDims = itemRotationsFit(
    { longueur: item.longueur, largeur: item.largeur, hauteur: item.hauteur },
    open.dimensions
  );
  const itemVolume = (item.longueur * item.largeur * item.hauteur) / 1_000_000;
  const q = item.quantite || 1;
  return (
    fitsDims &&
    open.remainingWeight >= (item.poids || 0) * q &&
    open.remainingVolume + 1e-9 >= itemVolume * q // allow tiny epsilon
  );
}

async function preview(items) {
  const { totalVolume, totalWeight } = summarize(items);
  const pool = await getContainerPool();

  // Sort items by decreasing volume (FFD-like)
  const expanded = [];
  items.forEach((it) => {
    const q = Math.max(1, it.quantite || 1);
    for (let i = 0; i < q; i++) {
      expanded.push({ ...it, quantite: 1 });
    }
  });
  expanded.sort((a, b) => {
    const va = a.longueur * a.largeur * a.hauteur;
    const vb = b.longueur * b.largeur * b.hauteur;
    return vb - va;
  });

  const openContainers = [];
  const placements = [];

  for (const item of expanded) {
    let placed = false;
    // Try to place in existing open containers (First Fit)
    for (const oc of openContainers) {
      if (canPlaceInOpenContainer(item, oc)) {
        const v = cmDimsToM3Volume(item);
        const w = (item.poids || 0);
        oc.remainingVolume -= v;
        oc.remainingWeight -= w;
        oc.usedVolume += v;
        oc.usedWeight += w;
        oc.items.push(item);
        placements.push({ containerId: oc.id, item });
        placed = true;
        break;
      }
    }
    if (placed) continue;

    // Open a new container fitting this item
    const chosen = pickSmallestFittingContainer(item, pool);
    if (!chosen) {
      // No feasible container; mark as unplaced
      placements.push({ containerId: null, item, error: 'NO_FIT' });
      continue;
    }
    const oc = {
      id: String(openContainers.length + 1),
      ref: chosen._id,
      type: chosen.type,
      categorie: chosen.categorie,
      dimensions: chosen.dimensions,
      capacityVolume: chosen.volume || 0,
      capacityWeight: chosen.capacitePoids || 0,
      remainingVolume: (chosen.volume || 0),
      remainingWeight: (chosen.capacitePoids || 0),
      usedVolume: 0,
      usedWeight: 0,
      items: []
    };
    // place the item
    const v = cmDimsToM3Volume(item);
    const w = (item.poids || 0);
    oc.remainingVolume -= v;
    oc.remainingWeight -= w;
    oc.usedVolume += v;
    oc.usedWeight += w;
    oc.items.push(item);
    placements.push({ containerId: oc.id, item });
    openContainers.push(oc);
  }

  const result = {
    stats: {
      totalVolume,
      totalWeight,
      containersCount: openContainers.length,
      avgUtilization: openContainers.length
        ? openContainers.reduce((s, c) => s + (c.usedVolume / Math.max(1e-9, c.capacityVolume)), 0) / openContainers.length
        : 0
    },
    containers: openContainers.map(c => ({
      id: c.id,
      ref: c.ref,
      type: c.type,
      categorie: c.categorie,
      capacity: { volume: c.capacityVolume, poids: c.capacityWeight },
      used: { volume: c.usedVolume, poids: c.usedWeight },
      items: c.items
    })),
    placements
  };
  return result;
}

module.exports = { preview, summarize };
