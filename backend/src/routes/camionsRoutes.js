const express = require('express');
const router = express.Router();
const camionsController = require('../controllers/camionsController');




// Camions
router.post('/', camionsController.creerCamion);
router.post('/suggestions', camionsController.suggestionCamions);



//========================================
//   Lister tous les camions
//========================================
router.get('/', camionsController.listerCamions);

//========================================
//  Mettre à jour un camions par ID
//========================================

router.put('/:id', camionsController.mettreAJourCamions);


//========================================
//  Supprimer un camions par ID
//========================================
router.delete('/:id', camionsController.supprimerCamions);
module.exports = router;