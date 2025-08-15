const mongoose = require('mongoose');

const camionSchema = new mongoose.Schema({
  modele: { type: String, required: true },
   type: {type: String,required: true
  },
  capacite: {
    volume: { type: Number, required: true,min: 0 }, 
    poidsMax: { type: Number, required: true ,min: 0} 
  },
  dimensions: {
    longueur: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true }
  },
    capacitePoids: { type: Number },
  disponible: { type: Boolean, default: true }
});

module.exports = mongoose.model('Camion', camionSchema);