const mongoose = require('mongoose');

const ContenantSchema = new mongoose.Schema({
  matricule: { type: String, required: true, unique: true },

  categorie: {
    type: String,
    enum: ["camion", "conteneur"],
    required: true
  },


  type: { type: String, required: true },
  modele: { type: String }, 


  dimensions: {
    longueur: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true }
  },


  volume: { type: Number }, 
  capacitePoids: { type: Number, required: true },

 
  capacite: {
    volume: { type: Number, min: 0 },
    poidsMax: { type: Number, min: 0 }
  },
images:[{type:String}],

  disponible: { type: Boolean, default: true }

}, { timestamps: true });

// Middleware pour calculer automatiquement le volume si non fourni
ContenantSchema.pre('save', function(next) {
  if (this.dimensions && (!this.volume || this.volume===0)) {
    this.volume = (this.dimensions.longueur * 
                  this.dimensions.largeur * 
                  this.dimensions.hauteur)/ 1000000;
  }
  next();
});

module.exports = mongoose.model('Contenant', ContenantSchema);
