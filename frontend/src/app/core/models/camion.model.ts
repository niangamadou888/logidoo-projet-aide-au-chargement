import { Dimensions } from "./dimensions.model";

export interface Camion{

    modele: string;
    type:string;
  dimensions:Dimensions
  capacitePoids: number;
  disponible: boolean;
}