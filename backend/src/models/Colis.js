// models/Colis.js

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
  gerbable: Boolean,
  couleur: String,
  statut: String,
  dateAjout: Date,
  conteneurId:{type:mongoose.Schema.Types.ObjectId,ref:'Conteneur'},
   camionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Camion' }
});

module.exports = ColisSchema;
