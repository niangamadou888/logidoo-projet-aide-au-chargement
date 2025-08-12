const mongoose = require('mongoose');

const camionSchema = new mongoose.Schema({
  modele: { type: String, required: true },
   type: {type: String,required: true
  },
  capacite: {
    volume: { type: Number, required: true,min: 0 }, // ici le volume est en m³
    poidsMax: { type: Number, required: true ,min: 0} 
  },
  dimensions: {
    longueur: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true }
  },
    capacitePoids: { type: Number, required: true },
  disponible: { type: Boolean, default: true },
  trackingId: { type: String },
  conteneurId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conteneur',require:true}],
  colisId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Colis' ,require:true}],

  disponible: { type: Boolean, default: true }
});

module.exports = mongoose.model('Camion', camionSchema);