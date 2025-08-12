

const Camions = require("../models/Camions");
const suggestionService = require("../services/suggestionService");


module.exports = {
  
 //+++++++++++++++++++++++++++++++++
  // Manuel : Création de camion
  //+++++++++++++++++++++++++++++++++
 
  async creerCamion(req, res) {
    try {
      const nouveauCamion = new Camions(req.body);
      const saved = await nouveauCamion.save();
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

   //+++++++++++++++++++++++++++++++++
  // Suggestion automatique de  camions
  //+++++++++++++++++++++++++++++++++

  async suggestionCamions(req, res) {
    try {
      const { colis } = req.body;
      if (!colis || !Array.isArray(colis)) {
        return res.status(400).json({ message: "Liste d'articles requise" });
      }
      const suggestions = await suggestionService.suggererCamions(colis);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

 //+++++++++++++++++++++++++++++++++
   // Lister tous les Camions
  //+++++++++++++++++++++++++++++++++
 
async listerCamions  (req, res)  {
  try {
    const camions = await Camions.find();
    res.json(camions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},



 //+++++++++++++++++++++++++++++++++
   // Mettre à jour un Camions
  //+++++++++++++++++++++++++++++++++
async mettreAJourCamions  (req, res)  {
  try {
    const updated = await Camions.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Camions non trouvé' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

 //+++++++++++++++++++++++++++++++++
   // Supprimer un Camions
  //+++++++++++++++++++++++++++++++++

async supprimerCamions (req, res)  {
  try {
    const deleted = await Camions.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Camions non trouvé' });
    }
    res.json({ message: 'Camions supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
};