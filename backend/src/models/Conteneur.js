const mongoose = require('mongoose');

const ConteneurSchema = new mongoose.Schema({
 type: {
    type: String,required: true,},
  dimensions: {
    longueur: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true }
  },
  capacitePoids: { type: Number, required: true },
  disponible: { type: Boolean, default: true },

}, {
  timestamps: true
});

module.exports = mongoose.model('Conteneur', ConteneurSchema);
