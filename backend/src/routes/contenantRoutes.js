const express = require('express');
const router = express.Router();
const contenantController = require('../controllers/contenantController');
const upload=require('../middleware/upload');


// Création d’un contenant
router.post("/create",upload.single("image"), contenantController.creerContenant);

// Routes de suggestion
router.post("/suggestion", contenantController.suggestionContenants);
router.post("/suggestion/camions", contenantController.suggestionCamions);
router.post("/suggestion/conteneurs", contenantController.suggestionConteneurs);
router.get("/",contenantController.getContenants)
router.put("/:id",upload.single("image"),contenantController.updateContenant)
router.delete("/:id",contenantController.deleteContenant);
module.exports = router;