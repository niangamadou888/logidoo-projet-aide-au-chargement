const Camions = require("../models/Camions");
const Conteneur = require("../models/Conteneur");



/**
 * Calcul du volume total et poids total d'une liste d'articles
 */
function calculerBesoins(articles) {
  let volumeTotal = 0;
  let poidsTotal = 0;

  articles.forEach(article => {
    const volumeArticle = (article.longueur * article.largeur * article.hauteur) / 1000000; // m³
    volumeTotal += volumeArticle * article.quantite;
    poidsTotal += article.poids * article.quantite;
  });

  return { volumeTotal, poidsTotal };
}

/**
 * Suggestion automatique de contenants
 */
async function suggererContenants(articles) {
  const { volumeTotal, poidsTotal } = calculerBesoins(articles);

  // 1. Récupérer tous les conteneurs qui satisfont le poids et la disponibilité
  const conteneurs = await Conteneur.find({
     volume: { $gte: volumeTotal },
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  // 2. Filtrer manuellement par volume
  const conteneursFiltres = conteneurs.filter(conteneur => {
    const volumeConteneur = (
      conteneur.dimensions.longueur *
      conteneur.dimensions.largeur *
      conteneur.dimensions.hauteur
    ) / 1000000;  // Conversion mm³ → m³
    
    return volumeConteneur >= volumeTotal;
  });

  return conteneursFiltres;
}

 
/**
 * Suggestion automatique de camions
 */
async function suggererCamions(articles) {
  const { volumeTotal, poidsTotal } = calculerBesoins(articles);

  // Récupération de tous les camions disponibles
  const camions = await Camion.find({
    volume: { $gte: volumeTotal },
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  // Calcul manuel du volume pour chaque camion (conservé comme demandé)
  const camionsFiltres = camions.filter(camion => {
    const volumeCamion = (
      camion.dimensions.longueur * 
      camion.dimensions.largeur * 
      camion.dimensions.hauteur
    ) / 1000000; // mm³ → m³
    
    return volumeCamion >= volumeTotal;
  });

  return camionsFiltres;
}

module.exports = {
    suggererCamions,
    suggererContenants
};
