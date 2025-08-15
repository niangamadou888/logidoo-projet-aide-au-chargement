const mongoose = require('mongoose');

const ConteneurSchema = new mongoose.Schema({
 type: {
    type: String,required: true,},
  dimensions: {
    longueur: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true }
  },
  volume: { type: Number },
  capacitePoids: { type: Number, required: true },
  disponible: { type: Boolean, default: true },

}, {
  timestamps: true
});
// Middleware pour calculer automatiquement le volume
ConteneurSchema.pre('save', function(next) {
  if (this.dimensions) {
    this.volume = this.dimensions.longueur * 
                  this.dimensions.largeur * 
                  this.dimensions.hauteur;
  }
  next();
});
module.exports = mongoose.model('Conteneur', ConteneurSchema);
