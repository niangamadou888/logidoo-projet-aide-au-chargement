import { Dimensions } from "./dimensions.model";

export interface Contenant {
    _id?: string;  // facultatif lors de la création
    matricule: string;
    categorie: string;
    modele?: string;
    type: string;
    dimensions: Dimensions;
    volume?: number;  // calculé automatiquement côté backend
    capacitePoids: number;
    capacite?: {
        volume?: number;
        poidsMax?: number;
    };
    disponible?: boolean;  // optionnel, valeur par défaut true
    images?: string[];     // optionnel
}
