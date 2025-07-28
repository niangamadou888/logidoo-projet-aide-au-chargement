const User=require('../models/model.user')
const bcrypt = require('bcryptjs');
 const jwt = require('jsonwebtoken');

async function registerUser({ userName, email, password, role='user'}) {
    console.log('Modèle User:', User); 

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('Email déjà utilisé');

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({ userName, email, password: hashedPassword,role });

  return newUser;
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Utilisateur non trouvé');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Mot de passe incorrect');

  const token = jwt.sign(
    { userId: user._id,role:user.role },
     process.env.JWT_SECRET,
      { expiresIn: '1d' });

  return { token, user };
}
async function logoutUser(token) {
  if (!token) {
    throw new Error('Token manquant');
  }
  
  try {
    // Vérifier que le token est valide
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Message de succès avec des informations utiles
    return {
      success: true,
      message: 'Déconnexion réussie',
      userId: decoded.userId,
      logoutTime: new Date().toISOString()
    };
  } catch (error) {
    // Gestion plus détaillée des erreurs
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expiré - Déconnexion automatique');
    }
    throw new Error('Token invalide - Impossible de déconnecter');
  }
}
module.exports = { registerUser, loginUser,logoutUser };
