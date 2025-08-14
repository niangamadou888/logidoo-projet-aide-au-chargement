import { Dimensions } from "./dimensions.model";

export interface Conteneur{
                  
  type: string;                // type de conteneur (ex: "dry-van-20ft", "high-cube-40ft", etc.)
  dimensions: Dimensions;     
  capacitePoids: number;      
  materiau?: string;          
  disponible: boolean;         
//   trackingId?: string;          
//   scanQRCode?: string;          
//   camionsId?: string[];         
//   colisId?: string[];           
  createdAt?: string;           
  updatedAt?: string;
}