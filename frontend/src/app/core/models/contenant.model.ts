import { Dimensions } from "./dimensions.model";

export interface Contenant {
    _id: string;
    categorie: "camion" | "conteneur";
    modele?: string;
    type: string;                
    dimensions: Dimensions;
    volume: number;
    capacitePoids: number;
    capacite?: {               
        volume?: number;
        poidsMax?: number;
    };
    disponible: boolean;

    images: string[];

}