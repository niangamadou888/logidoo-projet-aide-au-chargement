// Test data fixtures for use across tests

const testUsers = {
  admin: {
    username: 'admintest',
    email: 'admin@test.com',
    password: 'admin123456',
    role: 'admin'
  },
  user: {
    username: 'usertest',
    email: 'user@test.com',
    password: 'user123456',
    role: 'user'
  },
  inactiveUser: {
    username: 'inactiveuser',
    email: 'inactive@test.com',
    password: 'inactive123',
    role: 'user',
    active: false
  }
};

const testContenants = [
  {
    matricule: 'CAM-001',
    categorie: 'camion',
    type: 'Camion 20m³',
    modele: 'Mercedes Sprinter',
    dimensions: {
      longueur: 400,
      largeur: 200,
      hauteur: 250
    },
    capacitePoids: 3500,
    disponible: true
  },
  {
    matricule: 'CONT-001',
    categorie: 'conteneur',
    type: 'Conteneur 40 pieds',
    modele: 'Standard',
    dimensions: {
      longueur: 1203,
      largeur: 235,
      hauteur: 239
    },
    capacitePoids: 28000,
    disponible: true
  },
  {
    matricule: 'CAM-002',
    categorie: 'camion',
    type: 'Petit camion',
    modele: 'Renault Master',
    dimensions: {
      longueur: 300,
      largeur: 180,
      hauteur: 200
    },
    capacitePoids: 1500,
    disponible: false
  }
];

const testColis = [
  {
    reference: 'COL-001',
    type: 'Carton',
    nomDestinataire: 'Client A',
    adresse: '123 Rue Test',
    telephone: '0123456789',
    poids: 10,
    longueur: 50,
    largeur: 40,
    hauteur: 30,
    quantite: 2,
    fragile: false,
    gerbable: true,
    couleur: '#FF5733',
    statut: 'en_attente',
    dateAjout: new Date()
  },
  {
    reference: 'COL-002',
    type: 'Palette',
    nomDestinataire: 'Client B',
    adresse: '456 Avenue Test',
    telephone: '0987654321',
    poids: 50,
    longueur: 120,
    largeur: 80,
    hauteur: 150,
    quantite: 1,
    fragile: true,
    gerbable: false,
    couleur: '#33FF57',
    statut: 'en_attente',
    dateAjout: new Date()
  },
  {
    reference: 'COL-003',
    type: 'Caisse',
    nomDestinataire: 'Client C',
    adresse: '789 Boulevard Test',
    telephone: '0147258369',
    poids: 25,
    longueur: 70,
    largeur: 60,
    hauteur: 80,
    quantite: 3,
    fragile: false,
    gerbable: true,
    couleur: '#3357FF',
    statut: 'en_attente',
    dateAjout: new Date()
  }
];

const testSimulation = {
  nom: 'Test Simulation',
  description: 'Simulation de test pour les tests unitaires',
  colis: testColis
};

module.exports = {
  testUsers,
  testContenants,
  testColis,
  testSimulation
};
