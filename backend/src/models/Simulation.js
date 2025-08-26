const mongoose = require('mongoose');

// Schéma pour les colis
const ColisSchema = new mongoose.Schema({
  reference: String,
  type: String,
  nomDestinataire: String,
  adresse: String,
  telephone: String,
  poids: Number,
  longueur: Number,
  largeur: Number,
  hauteur: Number,
  quantite: Number,
  fragile: Boolean,
  gerbable: Boolean,
  couleur: String,
  statut: String,
  dateAjout: Date
});

// Schéma pour les résultats de simulation
const ResultatsSchema = new mongoose.Schema({
  success: Boolean,
  stats: {
    totalVolume: Number,
    totalWeight: Number,
    containersCount: Number,
    avgVolumeUtilization: Number,
    avgWeightUtilization: Number,
    fragilesCount: Number,
    nonGerbablesCount: Number
  },
  // Utiliser Mixed pour être tolérant aux différentes formes de données retournées par l'algo
  containers: [mongoose.Schema.Types.Mixed],
  placements: [{
    containerId: String,
    containerRef: mongoose.Schema.Types.ObjectId,
    item: ColisSchema
  }],
  unplacedItems: [ColisSchema]
});

// Schéma principal de simulation
const SimulationSchema = new mongoose.Schema({
  utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nom: { type: String },
  description: { type: String },
  colis: [ColisSchema],
  resultats: { type: ResultatsSchema, default: null },
  date: { type: Date, default: Date.now }
});

// Méthode pour calculer les statistiques principales
SimulationSchema.methods.getStats = function() {
  let totalVolume = 0;
  let totalWeight = 0;
  
  this.colis.forEach(colis => {
    const volume = (colis.longueur * colis.largeur * colis.hauteur) / 1_000_000; // cm³ -> m³
    totalVolume += volume * (colis.quantite || 1);
    totalWeight += (colis.poids || 0) * (colis.quantite || 1);
  });
  
  return {
    totalVolume,
    totalWeight,
    colisCount: this.colis.length,
    hasResultats: !!this.resultats
  };
};

module.exports = mongoose.model('Simulation', SimulationSchema);
