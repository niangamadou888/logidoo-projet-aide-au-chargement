// routes/colisRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ColisSchema = require('../models/Colis');

// Créer un modèle temporaire en mémoire uniquement pour instancier des objets
const Colis = mongoose.model('TempColis', ColisSchema);

// Mémoire locale pour simulation
let colisList = [];

// Ajouter un colis (simulation sans DB)
router.post('/colis', (req, res) => {
  try {
    const data = req.body;

    if (!data.reference) {
      data.reference = 'REF-' + Date.now();
    }

    const colis = new Colis({
      reference: data.reference,
      type: data.type,
      nomDestinataire: data.nomDestinataire,
      adresse: data.adresse,
      telephone: data.telephone,
      poids: data.poids,
      longueur: data.longueur,
      largeur: data.largeur,
      hauteur: data.hauteur,
      quantite: data.quantite || 1,
      fragile: data.fragile || false,
      gerbable: data.gerbable || false,
      couleur: data.couleur || '#999999',
      statut: data.statut || 'En attente',
      dateAjout: new Date()
    });

    colisList.push(colis);
    res.status(201).json(colis);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Voir les colis simulés
router.get('/colis', (req, res) => {
  res.json(colisList);
});

// Reset colis list (for testing)
router.delete('/colis', (req, res) => {
  colisList = [];
  res.status(200).json({ message: 'Colis list cleared' });
});

module.exports = router;
