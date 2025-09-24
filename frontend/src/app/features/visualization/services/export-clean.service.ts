// src/app/features/visualization/services/export.service.ts

import { Injectable } from '@angular/core';
import { VisualizationScene } from '../models/visualization.model';

declare const JSZip: any;

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
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().getTime()}.png`;
      link.href = canvasElement.toDataURL('image/png');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Export PNG réussi');
    } catch (error) {
      console.error('❌ Erreur export PNG:', error);
    }
  }

  /**
   * Export PNG de toutes les vues 2D
   */
  async exportAllViewsToPNG(filename: string = 'simulation'): Promise<void> {
    try {
      console.log('🎯 Début export PNG de toutes les vues...');

      // Capturer toutes les vues 2D
      const allViews = await this.captureAll2DViews();
      const timestamp = new Date().getTime();

      Object.entries(allViews).forEach(([viewName, viewData]) => {
        if (viewData) {
          const link = document.createElement('a');
          link.download = `${filename}-${viewName}-${timestamp}.png`;
          link.href = viewData;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log(`✅ Export PNG ${viewName} réussi`);
        }
      });

    } catch (error) {
      console.error('❌ Erreur export PNG multiple:', error);
    }
  }

  /**
   * Export ZIP avec toutes les vues PNG
   */
  async exportAllViewsAsZIP(filename: string = 'simulation-all-views'): Promise<void> {
    try {
      console.log('🎯 Début export ZIP de toutes les vues...');

      // Charger JSZip
      if (typeof JSZip === 'undefined') {
        console.error('JSZip not loaded');
        alert('JSZip library not available');
        return;
      }

      const zip = new JSZip();
      const timestamp = new Date().getTime();

      // Capturer toutes les vues 2D
      const allViews = await this.captureAll2DViews();

      // Ajouter chaque vue au ZIP
      Object.entries(allViews).forEach(([viewName, viewData]) => {
        if (viewData) {
          // Convertir le data URL en blob
          const base64Data = viewData.split(',')[1];
          zip.file(`${filename}-${viewName}-${timestamp}.png`, base64Data, {base64: true});
          console.log(`✅ Vue ${viewName} ajoutée au ZIP`);
        }
      });

      // Générer et télécharger le ZIP
      const zipBlob = await zip.generateAsync({type: 'blob'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${filename}-${timestamp}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Export ZIP réussi');
    } catch (error) {
      console.error('❌ Erreur export ZIP:', error);
      alert('Erreur lors de l\'export ZIP');
    }
  }

  /**
   * Capture toutes les vues 2D du canvas
   */
  async captureAll2DViews(): Promise<{ [key: string]: string | null }> {
    const views = {
      top: null as string | null,
      bottom: null as string | null,
      side: null as string | null,
      'side-opposite': null as string | null,
      front: null as string | null,
      back: null as string | null
    };

    const viewNames = Object.keys(views) as Array<keyof typeof views>;

    try {
      console.log('🎯 Début capture de toutes les vues 2D...');

      // S'assurer qu'on est en mode 2D
      const currentViewElement = document.querySelector('[data-current-view]');
      const currentView = currentViewElement?.getAttribute('data-current-view') || '3d';
      
      if (currentView !== '2d') {
        console.log('🔄 Passage en mode 2D...');
        const toggleButton = document.querySelector('[data-toggle-view="2d"]') as HTMLButtonElement;
        if (toggleButton) {
          toggleButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Capturer chaque vue
      for (const viewMode of viewNames) {
        console.log(`📸 Capture de la vue: ${viewMode}`);
        
        // Trouver le composant canvas et changer la vue
        const canvasComponent = document.querySelector('app-canvas');
        if (canvasComponent && (canvasComponent as any).changeView) {
          // Changer la vue programmatiquement
          (canvasComponent as any).changeView(viewMode);
          
          // Attendre que le rendu soit terminé
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Capturer le canvas
          const canvas = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
          if (canvas && canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = imageData ? Array.from(imageData.data).some(pixel => pixel !== 0) : false;
            
            if (hasContent) {
              views[viewMode] = canvas.toDataURL('image/png');
              console.log(`✅ Vue ${viewMode} capturée avec succès`);
            } else {
              console.warn(`⚠️ Vue ${viewMode} capturée mais vide`);
            }
          }
        } else {
          console.warn(`⚠️ Impossible de changer vers la vue ${viewMode}`);
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors de la capture des vues 2D:', error);
    }

    return views;
  }

  /**
   * Export PDF avec toutes les vues 2D
   */
  async exportToPDFWithAll2DViews(scene: VisualizationScene): Promise<void> {
    try {
      console.log('🎯 Début export PDF avec toutes les vues...');
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page de titre
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Rapport de Simulation - Toutes Vues 2D', 105, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, 45, { align: 'center' });

      // Statistiques de la simulation
      if (scene.containers && scene.containers.length > 0) {
        let yPos = 70;
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Résumé de la simulation:', 20, yPos);
        yPos += 15;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        scene.containers.forEach((container, index) => {
          pdf.text(`Conteneur ${index + 1}: ${container.type}`, 25, yPos);
          pdf.text(`- Dimensions: ${container.dimensions.longueur} × ${container.dimensions.largeur} × ${container.dimensions.hauteur} cm`, 25, yPos + 5);
          pdf.text(`- Volume: ${(container.dimensions.longueur * container.dimensions.largeur * container.dimensions.hauteur / 1000000).toFixed(2)} m³`, 25, yPos + 10);
          pdf.text(`- Nombre de colis: ${container.items?.length || 0}`, 25, yPos + 15);
          
          if (container.utilization) {
            pdf.text(`- Taux d'utilisation: ${container.utilization.volume.toFixed(1)}%`, 25, yPos + 20);
          }
          
          yPos += 35;
        });
      }

      // Capturer toutes les vues 2D
      const allViews = await this.captureAll2DViews();

      // Ajouter chaque vue sur une nouvelle page
      const viewLabels = {
        top: 'Vue Plan (dessus)',
        bottom: 'Vue Dessous',
        side: 'Vue Côté',
        'side-opposite': 'Vue Côté Opposé',
        front: 'Vue Avant',
        back: 'Vue Arrière'
      };

      Object.entries(allViews).forEach(([viewKey, viewData]) => {
        if (viewData) {
          pdf.addPage();
          
          // Titre de la vue
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text(viewLabels[viewKey as keyof typeof viewLabels] || viewKey, 20, 30);
          
          // Ajouter l'image de la vue
          pdf.addImage(viewData, 'PNG', 20, 40, 170, 120);
          
          console.log(`✅ Vue ${viewKey} ajoutée au PDF`);
        }
      });

      // Télécharger le PDF
      const filename = `rapport-simulation-${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
      console.log('✅ Export PDF réussi');
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    }
  }

  /**
   * Export PDF simple (alias pour compatibilité)
   */
  async exportToPDF(scene: VisualizationScene, options?: any): Promise<void> {
    return this.exportToPDFWithAll2DViews(scene);
  }

  /**
   * Export PNG de toutes les vues 2D (alias pour compatibilité)
   */
  async exportAll2DViewsToPNG(filename: string = 'simulation'): Promise<void> {
    return this.exportAllViewsToPNG(filename);
  }

  /**
   * Export JSON des données de simulation
   */
  exportDataToJSON(scene: VisualizationScene, filename: string = 'simulation-data'): void {
    try {
      const jsonData = JSON.stringify(scene, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().getTime()}.json`;
      link.href = URL.createObjectURL(blob);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Export JSON réussi');
    } catch (error) {
      console.error('❌ Erreur export JSON:', error);
      alert('Erreur lors de l\'export JSON');
    }
  }

  /**
   * Export complet (ZIP avec PNG + PDF + JSON)
   */
  async exportCompletePackage(scene: VisualizationScene, filename: string = 'simulation-complete'): Promise<void> {
    try {
      console.log('🎯 Début export package complet...');

      if (typeof JSZip === 'undefined') {
        console.error('JSZip not loaded');
        alert('JSZip library not available');
        return;
      }

      const zip = new JSZip();
      const timestamp = new Date().getTime();

      // 1. Capturer toutes les vues 2D
      const allViews = await this.captureAll2DViews();
      
      // Ajouter les images PNG au ZIP
      Object.entries(allViews).forEach(([viewName, viewData]) => {
        if (viewData) {
          const base64Data = viewData.split(',')[1];
          zip.file(`images/${filename}-${viewName}.png`, base64Data, {base64: true});
        }
      });

      // 2. Générer le PDF et l'ajouter au ZIP
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      const pdf = new jsPDF();
      
      // Créer un PDF simple avec les vues
      pdf.setFontSize(16);
      pdf.text('Rapport de Simulation Complet', 20, 30);
      
      Object.entries(allViews).forEach(([viewKey, viewData], index) => {
        if (viewData && index > 0) {
          pdf.addPage();
        }
        if (viewData) {
          pdf.addImage(viewData, 'PNG', 20, 50, 170, 120);
        }
      });

      const pdfBlob = pdf.output('blob');
      zip.file(`${filename}-rapport.pdf`, pdfBlob);

      // 3. Ajouter les données JSON
      const jsonData = JSON.stringify(scene, null, 2);
      zip.file(`${filename}-donnees.json`, jsonData);

      // 4. Générer et télécharger le ZIP complet
      const zipBlob = await zip.generateAsync({type: 'blob'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${filename}-${timestamp}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Export package complet réussi');
    } catch (error) {
      console.error('❌ Erreur export package complet:', error);
      alert('Erreur lors de l\'export package complet');
    }
  }
}