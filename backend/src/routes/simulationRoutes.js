// routes/simulationRoutes.js
const express = require('express');
const router = express.Router();
const Simulation = require('../models/Simulation');
const { authenticate } = require('../middleware/auth');

// POST /api/simulations
router.post('/', authenticate, async (req, res) => {
  try {
    const utilisateurId = req.user._id; // récupéré grâce au middleware
    const { colis } = req.body;

    const nouvelleSimulation = new Simulation({
      utilisateurId,
      colis,
      date: new Date()
    });

    await nouvelleSimulation.save();

    res.status(201).json({ success: true, simulation: nouvelleSimulation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la simulation', error: err.message });
  }
});


module.exports = router;
