
export interface Colis {
  id?: number;
  reference?: string;
  type: string;
  longueur: number;
  largeur: number;
  hauteur: number;
  poids: number;
  quantite: number;
  nomDestinataire?: string;
  adresse?: string;
  telephone?: string;
  fragile?: boolean;
  gerbable?: boolean;
  couleur?: string;
  statut?: string;
  dateAjout?: Date;
}

export interface Simulation {
  id?: number;
  nom: string;
  description?: string;
  colis: Colis[];
  dateCreation: Date;
  statut: 'brouillon' | 'validée';
}

export interface ContainerStats {
  containerType: string;
  containerCategory: string;
  dimensions: {
    longueur: number;
    largeur: number;
    hauteur: number;
  };
  volume: number;
  capacitePoids: number;
  volumeUtilization: number;
  weightUtilization: number;
  placedItems: number;
  totalItems: number;
  optimalityScore: number;
}