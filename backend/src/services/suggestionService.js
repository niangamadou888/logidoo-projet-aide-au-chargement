const Contenant = require("../models/Contenant");  // un seul modèle

/**
 * Calcul du volume total et poids total d'une liste d'articles
 */
function calculerBesoins(articles) {
  let volumeTotal = 0;
  let poidsTotal = 0;

  articles.forEach(article => {
    const volumeArticle = (article.longueur * article.largeur * article.hauteur) / 1000000; // cm³ → m³
    volumeTotal += volumeArticle * article.quantite;
    poidsTotal += article.poids * article.quantite;
  });

  return { volumeTotal, poidsTotal };
}

/**
 * Création d’un contenant (camion ou conteneur)
 */

async function creerContenant(data){
    if(data.dimensions){
     data.volume = (data.dimensions.longueur * data.dimensions.largeur * data.dimensions.hauteur) / 1000000;
    }
    const contenant=new Contenant(data);
    await contenant.save();
    return contenant;
}

/**
 * Suggestion automatique de contenants (camions + conteneurs)
 */
async function suggererContenants(articles) {
  const { volumeTotal, poidsTotal } = calculerBesoins(articles);

  // Récupérer tous les contenants qui satisfont poids, volume et dispo
  const contenants = await Contenant.find({
    volume: { $gte: volumeTotal },
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  return contenants;
}

/**
 * Suggestion automatique de camions uniquement
 */
async function suggererCamions(articles) {
  const { volumeTotal, poidsTotal } = calculerBesoins(articles);

  // Filtrer uniquement les "camions"
  const camions = await Contenant.find({
    categorie: "camion",
    volume: { $gte: volumeTotal },
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  return camions;
}

/**
 * Suggestion automatique de conteneurs uniquement
 */
async function suggererConteneurs(articles) {
  const { volumeTotal, poidsTotal } = calculerBesoins(articles);

  // Filtrer uniquement les "conteneurs"
  const conteneurs = await Contenant.find({
    categorie: "conteneur",
    volume: { $gte: volumeTotal },
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  return conteneurs;
}

/**
 * ✅ Récupérer tous les contenants
 */
async function getContenants() {
  return await Contenant.find();
}

/**
 * ✅ Récupérer un contenant par ID
 */
async function getContenantById(id) {
  return await Contenant.findById(id);
}

async function updateContenant(id, data) {
   if (data.dimensions && typeof data.dimensions === "string") {
    data.dimensions = JSON.parse(data.dimensions);
  }
  // Calcul automatique du volume si dimensions présentes
  if (data.dimensions) {
    data.volume = (data.dimensions.longueur * data.dimensions.largeur * data.dimensions.hauteur) / 1000000;
  }
  const updatedContenant = await Contenant.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!updatedContenant) {
    throw new Error("Contenant non trouvé");
  }

  return updatedContenant;
}


/**
 * Supprimer un contenant par ID
 */
async function deleteContenant(id){
    const deleted = await Contenant.findByIdAndDelete(id);
    if (!deleted) {
        throw new Error ("Contenant non trouvé");
    }
    return deleted;
}

module.exports = {
  suggererContenants,
  suggererCamions,
  suggererConteneurs,
  getContenants,
  creerContenant,
  getContenantById,
  updateContenant,
  deleteContenant,
};
