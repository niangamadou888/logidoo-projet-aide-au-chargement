// routes/simulationRoutes.js
const express = require('express');
const router = express.Router();
const Simulation = require('../models/Simulation');
const { authenticate } = require('../middleware/auth');
const optimizedSimulationService = require('../services/optimizedSimulationService');
const { performance } = require('perf_hooks');

// Créer une nouvelle simulation
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

// Obtenir une prévisualisation de chargement optimal
router.post('/preview', authenticate, async (req, res) => {
  const startTime = performance.now();
  try {
    const { colis, options } = req.body;
    
    if (!colis || !Array.isArray(colis) || colis.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'La liste des colis est requise et ne peut pas être vide' 
      });
    }

    // Appeler le service de simulation avec les options fournies
    const result = await optimizedSimulationService.simulateOptimalPlacement(colis, options || {});
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    res.json({ 
      success: true, 
      result,
      executionTime // En millisecondes
    });
  } catch (err) {
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du calcul de la simulation',
      error: err.message,
      executionTime
    });
  }
});

// Trouver le conteneur optimal pour une liste de colis
router.post('/optimal-container', authenticate, async (req, res) => {
  const startTime = performance.now();
  try {
    const { colis } = req.body;
    
    if (!colis || !Array.isArray(colis) || colis.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'La liste des colis est requise et ne peut pas être vide' 
      });
    }

    // Appeler le service pour trouver le conteneur optimal
    const optimalContainer = await optimizedSimulationService.findOptimalContainer(colis);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (!optimalContainer) {
      return res.status(404).json({
        success: false,
        message: 'Aucun conteneur optimal trouvé pour ces colis',
        executionTime
      });
    }
    
    res.json({ 
      success: true, 
      optimalContainer,
      executionTime // En millisecondes
    });
  } catch (err) {
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la recherche du conteneur optimal',
      error: err.message,
      executionTime
    });
  }
});

// Enregistrer les résultats d'une simulation
router.post('/save', authenticate, async (req, res) => {
  try {
    const utilisateurId = req.user._id;
    let { colis, resultats } = req.body;

    // Normalisation du payload pour éviter les erreurs de typage
    try {
      if (typeof colis === 'string') {
        colis = JSON.parse(colis);
      }
    } catch (_) {}

    try {
      if (typeof resultats === 'string') {
        resultats = JSON.parse(resultats);
      }
    } catch (_) {}

    try {
      if (resultats && typeof resultats.containers === 'string') {
        resultats.containers = JSON.parse(resultats.containers);
      }
    } catch (_) {}

    if (!colis || !resultats) {
      return res.status(400).json({ 
        success: false, 
        message: 'Les colis et les résultats sont requis' 
      });
    }
    
    const simulation = await optimizedSimulationService.saveSimulation(utilisateurId, colis, resultats);
    
    res.status(201).json({ 
      success: true, 
      simulation 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la sauvegarde de la simulation',
      error: err.message
    });
  }
});

// Récupérer toutes les simulations d'un utilisateur
router.get('/user', authenticate, async (req, res) => {
  try {
    const utilisateurId = req.user._id;
    const simulations = await optimizedSimulationService.getUserSimulations(utilisateurId);
    
    res.json({ 
      success: true, 
      simulations 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des simulations',
      error: err.message
    });
  }
});

// Récupérer les détails d'une simulation
router.get('/:id', authenticate, async (req, res) => {
  try {
    const simulationId = req.params.id;
    const simulation = await Simulation.findById(simulationId);
    
    if (!simulation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Simulation non trouvée' 
      });
    }
    
    // Vérifier que l'utilisateur est le propriétaire de la simulation
    if (simulation.utilisateurId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé à cette simulation' 
      });
    }
    
    res.json({ 
      success: true, 
      simulation 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de la simulation',
      error: err.message
    });
  }
});

module.exports = router;
