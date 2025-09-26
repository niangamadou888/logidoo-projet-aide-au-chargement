// controllers/contenant.controller.js

const service = require("../services/suggestionService");
const multer = require("multer");
const path = require("path");

/**
 * Suggestion automatique de contenants (camions + conteneurs)
 */
exports.suggestionContenants = async (req, res) => {
  try {
    const articles = req.body.articles; // on récupère les articles depuis le body
    const contenants = await service.suggererContenants(articles);

    res.status(200).json(contenants);
  } catch (error) {
    console.error("Erreur suggestion contenants:", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};


/**
 * Création d’un nouveau contenant
 */
exports.creerContenant = async (req, res) => {
  try {
    let data = req.body;

    // Vérifier que le matricule est fourni
    if (!data.matricule || data.matricule.trim() === '') {
      return res.status(400).json({
        message: "Le matricule est requis",
        error: "Matricule manquant"
      });
    }

    // S'assurer que le matricule est une chaîne de caractères
    data.matricule = data.matricule.toString().trim();

    // Parse dimensions si elles sont envoyées en string
    if (data.dimensions && typeof data.dimensions === "string") {
      data.dimensions = JSON.parse(data.dimensions);
    }

    // S'assurer que les dimensions sont des nombres
    if (data.dimensions) {
      data.dimensions.longueur = Number(data.dimensions.longueur) || 0;
      data.dimensions.largeur = Number(data.dimensions.largeur) || 0;
      data.dimensions.hauteur = Number(data.dimensions.hauteur) || 0;
    }

    // Parse capacite si envoyée en string
    if (data.capacite && typeof data.capacite === "string") {
      data.capacite = JSON.parse(data.capacite);
    }

    // S'assurer que les champs numériques existent
    data.capacitePoids = Number(data.capacitePoids) || 0;
    if (!data.capacite) data.capacite = {};
    data.capacite.volume = Number(data.capacite.volume) || 0;
    data.capacite.poidsMax = Number(data.capacite.poidsMax) || data.capacitePoids;

    // Ajout image uploadée
    if (req.file) {
      if (!data.images) data.images = [];
      data.images.push(`/uploads/${req.file.filename}`);
    }

    // Calcul automatique du volume si non fourni
    if (data.dimensions && (!data.volume || data.volume === 0)) {
      data.volume = (data.dimensions.longueur * data.dimensions.largeur * data.dimensions.hauteur) / 1000000000;
    }

    const contenant = await service.creerContenant(data);
    res.status(201).json(contenant);
  } catch (error) {
    console.error("Erreur création contenant:", error);
    res.status(500).json({ message: "Erreur interne", error: error.message });
  }
};


/**
 * Suggestion automatique de camions uniquement
 */
exports.suggestionCamions = async (req, res) => {
  try {
    const articles = req.body.articles;
    const camions = await service.suggererCamions(articles);

    res.status(200).json(camions);
  } catch (error) {
    console.error("Erreur suggestion camions:", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

/**
 * Suggestion automatique de conteneurs uniquement
 */
exports.suggestionConteneurs = async (req, res) => {
  try {
    const articles = req.body.articles;
    const conteneurs = await service.suggererConteneurs(articles);

    res.status(200).json(conteneurs);
  } catch (error) {
    console.error("Erreur suggestion conteneurs:", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};


exports.getContenants = async(req, res) => {
try {
  const contenants=await service.getContenants();
  res.json(contenants)
} catch (error) {
  console.error("Erreur getContenants:", error);
    res.status(500).json({ message: "Erreur interne", error });
}
};

exports.getContenantById =async (req, res) => {
try {
    const id = req.params.id;
    const contenant = await service.getContenantById(id); 
    if (!contenant) return res.status(404).json({ message: "Conteneur non trouvé" });
    res.json(contenant);
  } catch (error) {
    console.error("Erreur getContenantById:", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
};

// Configuration Multer pour les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/**
 * Mise à jour d’un contenant
 */
exports.updateContenant = async (req, res) => {
  try {
    const id = req.params.id;
    let data = req.body;

    // Parse dimensions si envoyées en string
    if (data.dimensions && typeof data.dimensions === "string") {
      data.dimensions = JSON.parse(data.dimensions);
    }

    // Ajout nouvelle image uploadée
    if (req.file) {
      if (!data.images) data.images = [];
      data.images.push(`/uploads/${req.file.filename}`);
    }

    const updated = await service.updateContenant(id, data);
    res.status(200).json(updated);
  } catch (error) {
    console.error("Erreur updateContenant:", error);
    res.status(500).json({ message: "Erreur interne", error: error.message });
  }
};

/**
 * Supprimer un contenant par ID
 */

exports.deleteContenant=async(req,res)=>{
  try {
    const id= req.params.id;
    const deleted=await service.deleteContenant(id);
    res.status(200).json({ message: "Contenant supprimé avec succès", deleted})
  } catch (error) {
    console.error("Erreur deleteContenant:", error)
    res.status(500).json({ message: "Erreur interne", error: error.message})
  }
};
exports.getCategories=async(req,res)=>{
  try {
    const categories = await service.getCategories();
    res.status(200).json(categories);
  } catch (error) {
   console.error("Erreur récupération catégories:", error);
    
  }
}