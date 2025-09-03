// src/app/features/visualization/services/export.service.ts
import jsPDF from 'jspdf';
import { Injectable } from '@angular/core';
import { VisualizationScene, VisualizationContainer } from '../models/visualization.model';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Export PNG du canvas 2D
   */
  exportCanvasToPNG(canvasElement: HTMLCanvasElement, filename: string = 'simulation-2d'): void {
    try {
      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().getTime()}.png`;
      link.href = canvasElement.toDataURL('image/png');
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Export PNG réussi');
    } catch (error) {
      console.error('❌ Erreur export PNG:', error);
    }
  }

  /**
   * Export PNG de la vue 3D
   */
  exportThreeJSToPNG(renderer: any, filename: string = 'simulation-3d'): void {
    try {
      // Render la scène dans un canvas temporaire
      const canvas = renderer.domElement;
      
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Export PNG 3D réussi');
    } catch (error) {
      console.error('❌ Erreur export PNG 3D:', error);
    }
  }

  /**
   * Export PDF avec informations détaillées
   */
  async exportToPDF(scene: VisualizationScene, canvasDataUrl?: string): Promise<void> {
    try {
      // Dynamically import jsPDF to avoid bundle size issues
    
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // En-tête
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Rapport de Simulation - Visualisation', 20, 30);
      
      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);

      let yPosition = 60;

      // Informations générales
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Résumé de la simulation', 20, yPosition);
      yPosition += 15;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      if (scene.containers && scene.containers.length > 0) {
        pdf.text(`Nombre de conteneurs: ${scene.containers.length}`, 25, yPosition);
        yPosition += 8;
        
        const totalItems = scene.containers.reduce((sum, c) => sum + (c.items?.length || 0), 0);
        pdf.text(`Total colis: ${totalItems}`, 25, yPosition);
        yPosition += 8;

        // Détails par conteneur
        scene.containers.forEach((container, index) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.text(`Conteneur ${index + 1}: ${container.type}`, 25, yPosition);
          yPosition += 8;

          pdf.setFont('helvetica', 'normal');
          pdf.text(`  • Dimensions: ${container.dimensions.longueur}×${container.dimensions.largeur}×${container.dimensions.hauteur}cm`, 30, yPosition);
          yPosition += 6;
          
          if (container.utilization) {
            pdf.text(`  • Volume utilisé: ${container.utilization.volume.toFixed(1)}%`, 30, yPosition);
            yPosition += 6;
            pdf.text(`  • Poids utilisé: ${container.utilization.poids.toFixed(1)}%`, 30, yPosition);
            yPosition += 6;
          }
          
          pdf.text(`  • Nombre d'items: ${container.items?.length || 0}`, 30, yPosition);
          yPosition += 12;
        });
      }

      // Ajouter l'image si fournie
      if (canvasDataUrl) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 30;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text('Aperçu visuel', 20, yPosition);
        yPosition += 15;

        // Ajouter l'image (redimensionnée pour tenir sur la page)
        pdf.addImage(canvasDataUrl, 'PNG', 20, yPosition, 170, 100);
      }

      // Télécharger le PDF
      const filename = `simulation-${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
      console.log('✅ Export PDF réussi');
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF. Vérifiez que jsPDF est installé.');
    }
  }

  /**
   * Export des données au format JSON
   */
  exportDataToJSON(scene: VisualizationScene, filename: string = 'simulation-data'): void {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        containers: scene.containers,
        viewMode: scene.viewMode,
        renderMode: scene.renderMode,
        stats: {
          totalContainers: scene.containers?.length || 0,
          totalItems: scene.containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().getTime()}.json`;
      link.href = URL.createObjectURL(blob);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(link.href);
      console.log('✅ Export JSON réussi');
    } catch (error) {
      console.error('❌ Erreur export JSON:', error);
    }
  }
}