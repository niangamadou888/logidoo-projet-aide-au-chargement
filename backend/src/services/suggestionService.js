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

  // Filtrer les contenants adaptés
  const contenants = await Conteneur.find({
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  // Vérification volume (simplifié)
  const filtres = contenants.filter(c => {
    const volumeContenant = (c.dimensions.longueur * c.dimensions.largeur * c.dimensions.hauteur) ;
    return volumeContenant >= volumeTotal;
  });

  return filtres;
}

/**
 * Suggestion automatique de camions
 */
async function suggererCamions(articles) {
  const { volumeTotal, poidsTotal } = calculerBesoins(articles);

  const camions = await Camions.find({
    capacitePoids: { $gte: poidsTotal },
    disponible: true
  });

  const filtres = camions.filter(c => {
    const volumeCamion = (c.dimensions.longueur * c.dimensions.largeur * c.dimensions.hauteur);
    return volumeCamion >= volumeTotal;
  });

  return filtres;
}

module.exports = {
    suggererCamions,
    suggererContenants
};
