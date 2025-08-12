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
  materiau: { type: String },
  disponible: { type: Boolean, default: true },
  trackingId: { type: String },
  scanQRCode: { type: String },
   camionsId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Camion',require:true }],
  colisId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Colis', require:true }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Conteneur', ConteneurSchema);
