const mongoose = require('mongoose');

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
  statut: String,
  dateAjout: Date
});

const SimulationSchema = new mongoose.Schema({
  utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  colis: [ColisSchema],
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Simulation', SimulationSchema);
