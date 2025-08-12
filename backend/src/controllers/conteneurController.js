
const Camions = require("../models/Camions");
const Conteneur = require("../models/Conteneur");
const suggestionService = require("../services/suggestionService");


module.exports = {
  //+++++++++++++++++++++++++++++++++
  // Manuel : Création de contenant
  //+++++++++++++++++++++++++++++++++
  async creerContenant(req, res) {
    try {
      const nouveauContenant = new Conteneur(req.body);
      const saved = await nouveauContenant.save();
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
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
  // Suggestion automatique de contenants
  //+++++++++++++++++++++++++++++++++
 
  async suggestionContenants(req, res) {
    try {
      const { articles } = req.body;
      if (!articles || !Array.isArray(articles)) {
        return res.status(400).json({ message: "Liste d'articles requise" });
      }
      const suggestions = await suggestionService.suggererContenants(articles);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },


   //+++++++++++++++++++++++++++++++++
  // Suggestion automatique de  camions
  //+++++++++++++++++++++++++++++++++

  async suggestionCamions(req, res) {
    try {
      const { articles } = req.body;
      if (!articles || !Array.isArray(articles)) {
        return res.status(400).json({ message: "Liste d'articles requise" });
      }
      const suggestions = await suggestionService.suggererCamions(articles);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },


  // Lister tous les conteneurs
async listerContenants  (req, res)  {
  try {
    const contenants = await Conteneur.find();
    res.json(contenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

async mettreAJourContenant  (req, res)  {
  try {
    const updated = await Conteneur.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Conteneur non trouvé' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Supprimer un conteneur
async supprimerContenant (req, res)  {
  try {
    const deleted = await Conteneur.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Conteneur non trouvé' });
    }
    res.json({ message: 'Conteneur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
};