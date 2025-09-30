const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Simulation = require('../models/Simulation');

// Get admin dashboard statistics
router.get('/statistics', authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get active users count
    const activeUsers = await User.countDocuments({ active: true });

    // Get total simulations count
    const totalSimulations = await Simulation.countDocuments();

    // Get simulations by period
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const simulationsToday = await Simulation.countDocuments({
      date: { $gte: startOfDay }
    });

    const simulationsThisWeek = await Simulation.countDocuments({
      date: { $gte: startOfWeek }
    });

    const simulationsThisMonth = await Simulation.countDocuments({
      date: { $gte: startOfMonth }
    });

    // Get top active users
    const topUsersData = await Simulation.aggregate([
      {
        $group: {
          _id: '$utilisateurId',
          simulationCount: { $sum: 1 }
        }
      },
      { $sort: { simulationCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.username',
          simulations: '$simulationCount'
        }
      }
    ]);

    // Calculate average fill rates
    const simulationsWithResults = await Simulation.find({
      'resultats.stats': { $exists: true }
    }).select('resultats.stats');

    let totalVolumeUtilization = 0;
    let totalWeightUtilization = 0;
    let count = 0;

    simulationsWithResults.forEach(sim => {
      if (sim.resultats && sim.resultats.stats) {
        totalVolumeUtilization += sim.resultats.stats.avgVolumeUtilization || 0;
        totalWeightUtilization += sim.resultats.stats.avgWeightUtilization || 0;
        count++;
      }
    });

    const avgVolumeUtilization = count > 0 ? Math.round(totalVolumeUtilization / count) : 0;
    const avgWeightUtilization = count > 0 ? Math.round(totalWeightUtilization / count) : 0;

    // Get most used container types
    const containerUsage = await Simulation.aggregate([
      { $match: { 'resultats.containers': { $exists: true, $ne: [] } } },
      { $unwind: '$resultats.containers' },
      {
        $group: {
          _id: '$resultats.containers.name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalContainerCount = containerUsage.reduce((sum, item) => sum + item.count, 0);
    const mostUsedContainers = containerUsage.map(item => ({
      type: item._id || 'Unknown',
      count: item.count,
      percentage: totalContainerCount > 0
        ? Math.round((item.count / totalContainerCount) * 100)
        : 0
    }));

    // Return statistics
    res.json({
      success: true,
      statistics: {
        totalUsers,
        activeUsers,
        totalSimulations,
        simulationsByPeriod: {
          day: simulationsToday,
          week: simulationsThisWeek,
          month: simulationsThisMonth
        },
        topUsers: topUsersData,
        avgFillRate: {
          volume: avgVolumeUtilization,
          weight: avgWeightUtilization
        },
        mostUsedContainers
      }
    });
  } catch (err) {
    console.error('Error fetching admin statistics:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: err.message
    });
  }
});

module.exports = router;