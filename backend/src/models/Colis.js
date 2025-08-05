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
  statut: String,
  dateAjout: Date
});

module.exports = ColisSchema;
