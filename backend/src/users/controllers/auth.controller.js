const { registerUser, loginUser,logoutUser } = require("../services/auth.service");


exports.register = async (req, res) => {
   // console.log('Requête reçue :', req.body);
  try {
    const newUser = await registerUser(req.body);
    res.status(201).json({ message: 'Utilisateur créé', userId: newUser._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { token, user } = await loginUser(req.body);
    res.json({ message: 'Connexion réussie', token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }

  
};
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ message: 'Token manquant' });
    }

    const result = await logoutUser(token);
    res.json({
      success: result.success,
      message: result.message,
      userId: result.userId,
      timestamp: result.logoutTime
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};
