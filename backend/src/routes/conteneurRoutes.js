const express = require('express');
const router = express.Router();
const contenantController = require('../controllers/conteneurController');


//========================================
//   créer conteneurs
//========================================
router.post('/', contenantController.creerContenant);
//========================================
//   suggestions de conteneur
//========================================
router.post('/suggestions', contenantController.suggestionContenants);

//========================================
//   Lister tous les conteneurs
//========================================
router.get('/', contenantController.listerContenants);

//========================================
//  Mettre à jour un conteneur par ID
//========================================

router.put('/:id', contenantController.mettreAJourContenant);


//========================================
//  Supprimer un conteneur par ID
//========================================
router.delete('/:id', contenantController.supprimerContenant);
module.exports = router;