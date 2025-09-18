// src/app/features/visualization/services/export.service.ts

import { Injectable } from '@angular/core';
import { VisualizationScene, VisualizationContainer } from '../models/visualization.model';
import jsPDF from 'jspdf';

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
   * Export PNG de toutes les vues (2D et 3D)
   */
  async exportAllViewsToPNG(filename: string = 'simulation'): Promise<void> {
    try {
      const timestamp = new Date().getTime();
      
      // Capturer la vue 2D
      const canvas2D = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      if (canvas2D) {
        const link2D = document.createElement('a');
        link2D.download = `${filename}-2D-${timestamp}.png`;
        link2D.href = canvas2D.toDataURL('image/png');
        document.body.appendChild(link2D);
        link2D.click();
        document.body.removeChild(link2D);
        console.log('✅ Export PNG 2D réussi');
      }

      // Attendre un peu puis capturer la vue 3D
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas3D = this.findThreeJSCanvas();
      if (canvas3D) {
        const link3D = document.createElement('a');
        link3D.download = `${filename}-3D-${timestamp}.png`;
        link3D.href = canvas3D.toDataURL('image/png');
        document.body.appendChild(link3D);
        link3D.click();
        document.body.removeChild(link3D);
        console.log('✅ Export PNG 3D réussi');
      }

    } catch (error) {
      console.error('❌ Erreur export PNG toutes vues:', error);
    }
  }

  /**
   * Export PNG de la vue 3D
   */
  exportThreeJSToPNG(renderer: any, filename: string = 'simulation-3d'): void {
    try {
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
   * Capture toutes les vues 2D (plan, dessous, côté, côté opposé, avant, arrière)
   */
  async captureAll2DViews(): Promise<{ [key: string]: string | null }> {
    const views = {
      top: null as string | null,      // Plan
      bottom: null as string | null,   // Dessous  
      side: null as string | null,     // Côté
      'side-opposite': null as string | null, // Côté opposé
      front: null as string | null,    // Avant
      back: null as string | null      // Arrière
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
  async captureAllViews(): Promise<{ view2D: string | null, view3D: string | null }> {
    const result = {
      view2D: null as string | null,
      view3D: null as string | null
    };

    try {
      // Attendre un peu pour que les rendus soient terminés
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturer la vue 3D (toujours disponible)
      const canvas3D = this.findThreeJSCanvas();
      if (canvas3D && canvas3D.width > 0 && canvas3D.height > 0) {
        const ctx = canvas3D.getContext('webgl') || canvas3D.getContext('webgl2');
        if (ctx) {
          result.view3D = canvas3D.toDataURL('image/png');
          console.log('✅ Vue 3D capturée', {
            width: canvas3D.width,
            height: canvas3D.height,
            dataURL_length: result.view3D.length
          });
        } else {
          console.warn('⚠️ Canvas 3D trouvé mais pas de contexte WebGL');
        }
      } else {
        console.warn('⚠️ Canvas 3D non trouvé ou dimensions invalides:', {
          found: !!canvas3D,
          width: canvas3D?.width,
          height: canvas3D?.height
        });
      }

      // Pour capturer la vue 2D, nous devons nous assurer qu'elle est active
      console.log('🔍 Recherche du canvas 2D...');
      let canvas2D = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      
      if (!canvas2D) {
        console.log('Canvas 2D non trouvé, vérification si nous sommes en mode 2D...');
        // Vérifier si nous sommes déjà en mode 2D
        const currentViewElement = document.querySelector('[data-current-view]');
        const currentView = currentViewElement?.getAttribute('data-current-view') || '3d';
        
        if (currentView !== '2d') {
          console.log('🔄 Passage en mode 2D pour capturer la vue...');
          // Déclencher le passage en mode 2D
          const toggleButton = document.querySelector('[data-toggle-view="2d"]') as HTMLButtonElement;
          if (toggleButton) {
            toggleButton.click();
            // Attendre que le DOM se mette à jour
            await new Promise(resolve => setTimeout(resolve, 1000));
            canvas2D = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
          }
        }
      }

      if (canvas2D && canvas2D.width > 0 && canvas2D.height > 0) {
        // Vérifier si le canvas a du contenu en examinant les pixels
        const ctx = canvas2D.getContext('2d');
        const imageData = ctx?.getImageData(0, 0, canvas2D.width, canvas2D.height);
        const hasContent = imageData ? Array.from(imageData.data).some(pixel => pixel !== 0) : false;
        
        if (hasContent) {
          result.view2D = canvas2D.toDataURL('image/png');
          console.log('✅ Vue 2D capturée avec contenu', {
            width: canvas2D.width,
            height: canvas2D.height,
            dataURL_length: result.view2D.length,
            hasContent: true
          });
        } else {
          console.warn('⚠️ Canvas 2D trouvé mais vide (pas de pixels non-noirs)');
        }
      } else {
        console.warn('⚠️ Canvas 2D non trouvé ou dimensions invalides:', {
          found: !!canvas2D,
          width: canvas2D?.width,
          height: canvas2D?.height
        });
      }

    } catch (error) {
      console.error('❌ Erreur capture des vues:', error);
    }

    return result;
  }

  /**
   * Export PDF avec toutes les vues 2D - Version améliorée
   */
  async exportToPDFWithAll2DViews(scene: VisualizationScene): Promise<void> {
    try {
      console.log('🎯 Démarrage export PDF avec design amélioré...');
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Couleurs du thème
      const colors = {
        primary: '#f97316',      // Orange
        secondary: '#1f2937',    // Gris foncé
        accent: '#3b82f6',       // Bleu
        text: '#374151',         // Gris texte
        light: '#f3f4f6',        // Gris clair
        success: '#10b981'       // Vert
      };

      // === PAGE DE COUVERTURE ===
      this.addCoverPage(pdf, colors, scene);

      // === PAGE RÉSUMÉ EXÉCUTIF ===
      pdf.addPage();
      this.addExecutiveSummary(pdf, colors, scene);

      // === TABLEAU DES COLIS ===
      pdf.addPage();
      this.addItemsTable(pdf, colors, scene);

      // === VUES 2D ===
      const allViews = await this.captureAll2DViews();
      this.addVisualizationPages(pdf, colors, allViews);

      // === PIED DE PAGE ET FINALISATION ===
      this.addFootersToAllPages(pdf, colors);

      // Télécharger le PDF
      const filename = `rapport-simulation-logidoo-${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
      console.log('✅ Export PDF professionnel réussi');
    } catch (error) {
      console.error('❌ Erreur export PDF professionnel:', error);
      alert('Erreur lors de l\'export PDF professionnel.');
    }
  }

  /**
   * Ajoute la page de couverture
   */
  private addCoverPage(pdf: any, colors: any, scene: VisualizationScene): void {
    // Fond dégradé simulé
    pdf.setFillColor(colors.primary);
    pdf.rect(0, 0, 210, 80, 'F');
    
    pdf.setFillColor(colors.secondary);
    pdf.rect(0, 80, 210, 217, 'F');

    // Logo/Titre principal
    pdf.setTextColor('#ffffff');
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LOGIDOO', 105, 40, { align: 'center' });
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Rapport de Simulation de Chargement', 105, 55, { align: 'center' });

    // Informations principales
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Résumé de la simulation', 30, 110);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const totalContainers = scene.containers?.length || 0;
    const totalItems = scene.containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0;
    
    pdf.text(`📦 Conteneurs: ${totalContainers}`, 30, 130);
    pdf.text(`📋 Colis: ${totalItems}`, 30, 145);
    pdf.text(`📅 Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 30, 160);
    
    // Statistiques principales
    if (scene.containers && scene.containers.length > 0) {
      const avgUtilization = scene.containers.reduce((sum, c) => 
        sum + (c.utilization?.volume || 0), 0) / scene.containers.length;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance', 30, 190);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`📊 Taux d'utilisation moyen: ${avgUtilization.toFixed(1)}%`, 30, 210);
    }

    // Encadré informatif
    pdf.setDrawColor(colors.accent);
    pdf.setLineWidth(2);
    pdf.rect(25, 240, 160, 40);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Ce rapport présente une analyse complète de la simulation', 30, 250);
    pdf.text('de chargement avec toutes les vues 2D disponibles et', 30, 260);
    pdf.text('un tableau détaillé de tous les colis traités.', 30, 270);
  }

  /**
   * Ajoute la page de résumé exécutif
   */
  private addExecutiveSummary(pdf: any, colors: any, scene: VisualizationScene): void {
    let yPos = 30;
    
    // En-tête de section
    pdf.setFillColor(colors.primary);
    pdf.rect(0, 20, 210, 15, 'F');
    
    pdf.setTextColor('#ffffff');
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RÉSUMÉ EXÉCUTIF', 20, 30);
    
    yPos = 50;
    pdf.setTextColor(colors.text);

    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, index) => {
        // Titre du conteneur
        pdf.setFillColor(colors.light);
        pdf.rect(15, yPos - 5, 180, 10, 'F');
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.secondary);
        pdf.text(`Conteneur ${index + 1}: ${container.type}`, 20, yPos);
        
        yPos += 15;
        
        // Détails du conteneur
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colors.text);
        
        const details = [
          `Dimensions: ${container.dimensions.longueur} × ${container.dimensions.largeur} × ${container.dimensions.hauteur} cm`,
          `Volume total: ${(container.dimensions.longueur * container.dimensions.largeur * container.dimensions.hauteur / 1000000).toFixed(2)} m³`,
          `Nombre d'items: ${container.items?.length || 0}`,
        ];
        
        if (container.utilization) {
          details.push(`Utilisation volume: ${container.utilization.volume.toFixed(1)}%`);
          details.push(`Utilisation poids: ${container.utilization.poids.toFixed(1)}%`);
        }
        
        details.forEach(detail => {
          pdf.text(`• ${detail}`, 25, yPos);
          yPos += 6;
        });
        
        yPos += 10;
        
        if (yPos > 250) {
          pdf.addPage();
          yPos = 30;
        }
      });
    }
  }

  /**
   * Ajoute le tableau détaillé des colis
   */
  private addItemsTable(pdf: any, colors: any, scene: VisualizationScene): void {
    let yPos = 30;
    
    // En-tête de section
    pdf.setFillColor(colors.accent);
    pdf.rect(0, 20, 210, 15, 'F');
    
    pdf.setTextColor('#ffffff');
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DÉTAIL DES COLIS', 20, 30);
    
    yPos = 50;
    pdf.setTextColor(colors.text);

    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, containerIndex) => {
        // Titre du conteneur
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.secondary);
        pdf.text(`Conteneur ${containerIndex + 1} - ${container.type}`, 15, yPos);
        yPos += 10;
        
        if (container.items && container.items.length > 0) {
          // En-têtes du tableau
          const headers = ['ID', 'Dimensions (L×l×h)', 'Volume', 'Poids', 'Type', 'Statut'];
          const colWidths = [20, 45, 25, 20, 30, 40];
          let xPos = 15;
          
          // Fond d'en-tête
          pdf.setFillColor(colors.light);
          pdf.rect(15, yPos - 3, 180, 8, 'F');
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.secondary);
          
          headers.forEach((header, i) => {
            pdf.text(header, xPos, yPos);
            xPos += colWidths[i];
          });
          
          yPos += 10;
          
          // Lignes du tableau
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          
          container.items.forEach((item, itemIndex) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 30;
            }
            
            xPos = 15;
            pdf.setTextColor(colors.text);
            
            // Alternance de couleur pour les lignes
            if (itemIndex % 2 === 0) {
              pdf.setFillColor('#fafafa');
              pdf.rect(15, yPos - 3, 180, 6, 'F');
            }
            
            const rowData = [
              item.id || `C${containerIndex + 1}-${itemIndex + 1}`,
              `${item.dimensions.longueur}×${item.dimensions.largeur}×${item.dimensions.hauteur}`,
              `${(item.dimensions.longueur * item.dimensions.largeur * item.dimensions.hauteur / 1000).toFixed(1)}L`,
              item.poids ? `${item.poids}kg` : 'N/A',
              item.fragile ? 'Fragile' : 'Standard',
              (typeof item.gerbable !== 'undefined' ? (item.gerbable ? 'Empilable' : 'Non empilable') : 'N/A')
            ];
            
            rowData.forEach((data, i) => {
              pdf.text(data, xPos, yPos);
              xPos += colWidths[i];
            });
            
            yPos += 7;
          });
          
          yPos += 15;
        } else {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor('#9ca3af');
          pdf.text('Aucun colis dans ce conteneur', 20, yPos);
          yPos += 15;
        }
      });
    }
  }

  /**
   * Ajoute les pages de visualisation
   */
  private addVisualizationPages(pdf: any, colors: any, allViews: { [key: string]: string | null }): void {
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
        
        // En-tête de section
        pdf.setFillColor(colors.success);
        pdf.rect(0, 20, 210, 15, 'F');
        
        pdf.setTextColor('#ffffff');
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VISUALISATIONS 2D', 20, 30);
        
        // Titre de la vue
        pdf.setTextColor(colors.secondary);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(viewLabels[viewKey as keyof typeof viewLabels] || viewKey, 20, 50);
        
        // Bordure pour l'image
        pdf.setDrawColor(colors.light);
        pdf.setLineWidth(2);
        pdf.rect(18, 58, 174, 104);
        
        // Image de la vue
        pdf.addImage(viewData, 'PNG', 20, 60, 170, 100);
        
        // Description
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colors.text);
        pdf.text(`Cette vue présente la disposition des colis selon la perspective ${viewLabels[viewKey as keyof typeof viewLabels]?.toLowerCase()}.`, 20, 175);
        
        console.log(`✅ Vue ${viewKey} ajoutée au PDF avec design amélioré`);
      }
    });
  }

  /**
   * Ajoute les pieds de page à toutes les pages
   */
  private addFootersToAllPages(pdf: any, colors: any): void {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Ligne de séparation
      pdf.setDrawColor(colors.light);
      pdf.setLineWidth(0.5);
      pdf.line(20, 285, 190, 285);
      
      // Pied de page
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor('#9ca3af');
      pdf.text('Généré par Logidoo - Système de simulation de chargement', 20, 290);
      pdf.text(`Page ${i} sur ${pageCount}`, 190, 290, { align: 'right' });
    }
  }
  async exportToPDF(scene: VisualizationScene, options?: { 
    includeAllViews?: boolean, 
    view2D?: string, 
    view3D?: string 
  }): Promise<void> {
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // En-tête
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Rapport de Simulation - Visualisation', 20, 30);
      
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

      // Si on doit inclure toutes les vues ou si les vues sont fournies
      if (options?.includeAllViews || options?.view2D || options?.view3D) {
        // Capturer les vues si elles ne sont pas fournies
        const views = options?.view2D && options?.view3D 
          ? { view2D: options.view2D, view3D: options.view3D }
          : await this.captureAllViews();

        // Ajouter les vues au PDF
        if (views.view2D || views.view3D) {
          pdf.addPage();
          yPosition = 30;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.text('Aperçus visuels', 20, yPosition);
          yPosition += 20;

          // Vue 2D
          if (views.view2D) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text('Vue 2D', 20, yPosition);
            yPosition += 10;
            
            pdf.addImage(views.view2D, 'PNG', 20, yPosition, 170, 85);
            yPosition += 95;
          }

          // Vue 3D
          if (views.view3D) {
            // Vérifier s'il faut une nouvelle page
            if (yPosition > 180) {
              pdf.addPage();
              yPosition = 30;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text('Vue 3D', 20, yPosition);
            yPosition += 10;
            
            pdf.addImage(views.view3D, 'PNG', 20, yPosition, 170, 85);
          }
        }
      }

      // Télécharger le PDF
      const filename = `simulation-complete-${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
      console.log('✅ Export PDF complet réussi');
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF. Vérifiez que jsPDF est installé.');
    }
  }

  /**
   * Export des données au format JSON avec informations étendues
   */
  exportDataToJSON(scene: VisualizationScene, filename: string = 'simulation-data'): void {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        exportType: 'complete',
        containers: scene.containers,
        viewMode: scene.viewMode,
        renderMode: scene.renderMode,
        stats: {
          totalContainers: scene.containers?.length || 0,
          totalItems: scene.containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0,
          averageUtilization: this.calculateAverageUtilization(scene.containers)
        },
        metadata: {
          exportedViews: ['2D', '3D'],
          timestamp: new Date().getTime()
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

  /**
   * Export complet avec ZIP contenant toutes les vues et données
   */
  async exportCompletePackage(scene: VisualizationScene, filename: string = 'simulation-complete'): Promise<void> {
    try {
      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const timestamp = new Date().getTime();
      const baseFilename = `${filename}-${timestamp}`;

      // Capturer toutes les vues
      const views = await this.captureAllViews();

      // Ajouter les images au ZIP
      if (views.view2D) {
        const view2DData = views.view2D.split(',')[1]; // Enlever le préfixe data:image/png;base64,
        zip.file(`${baseFilename}-2D.png`, view2DData, { base64: true });
      }

      if (views.view3D) {
        const view3DData = views.view3D.split(',')[1];
        zip.file(`${baseFilename}-3D.png`, view3DData, { base64: true });
      }

      // Ajouter les données JSON
      const jsonData = {
        exportDate: new Date().toISOString(),
        containers: scene.containers,
        viewMode: scene.viewMode,
        renderMode: scene.renderMode,
        stats: {
          totalContainers: scene.containers?.length || 0,
          totalItems: scene.containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0,
          averageUtilization: this.calculateAverageUtilization(scene.containers)
        }
      };

      zip.file(`${baseFilename}-data.json`, JSON.stringify(jsonData, null, 2));

      // Créer et télécharger le ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.download = `${baseFilename}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(link.href);
      console.log('✅ Export package complet réussi');
    } catch (error) {
      console.error('❌ Erreur export package complet:', error);
      alert('Erreur lors de l\'export du package complet. Vérifiez que JSZip est installé.');
    }
  }

  /**
   * Export PNG de toutes les vues 2D (plan, dessous, côtés, etc.)
   */
  async exportAll2DViewsToPNG(filename: string = 'simulation-2d-views', canvasComponent?: any): Promise<void> {
    try {
      console.log('📸 Export de toutes les vues 2D...');
      
      const views = [
        { name: 'plan', mode: 'top', label: 'Vue de dessus (Plan)' },
        { name: 'dessous', mode: 'bottom', label: 'Vue de dessous' },
        { name: 'cote', mode: 'side', label: 'Vue de côté' },
        { name: 'cote-oppose', mode: 'side-opposite', label: 'Vue côté opposé' },
        { name: 'avant', mode: 'front', label: 'Vue de face (Avant)' },
        { name: 'arriere', mode: 'back', label: 'Vue arrière' }
      ];

      const timestamp = new Date().getTime();

      // Sauvegarder la vue actuelle pour la restaurer à la fin
      const originalView = canvasComponent?.getCurrentView() || 'top';

      for (const view of views) {
        await this.captureAndExport2DView(view.mode as any, `${filename}-${view.name}`, timestamp, canvasComponent);
        // Attendre un peu entre les captures pour éviter les problèmes
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Restaurer la vue originale
      if (canvasComponent && canvasComponent.changeView) {
        canvasComponent.changeView(originalView);
      }

      console.log('✅ Export de toutes les vues 2D terminé');
    } catch (error) {
      console.error('❌ Erreur export toutes vues 2D:', error);
      throw error;
    }
  }

  /**
   * Capture et exporte une vue 2D spécifique
   */
  private async captureAndExport2DView(
    viewMode: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back',
    filename: string,
    timestamp: number,
    canvasComponent?: any
  ): Promise<void> {
    try {
      if (canvasComponent && canvasComponent.changeView) {
        // Utiliser la référence directe au composant
        canvasComponent.changeView(viewMode);
      } else {
        // Méthode de fallback avec événement personnalisé
        const canvasComponentElement = document.querySelector('app-canvas');
        if (canvasComponentElement) {
          const changeViewEvent = new CustomEvent('changeView', {
            detail: { viewMode }
          });
          canvasComponentElement.dispatchEvent(changeViewEvent);
        }
      }

      // Attendre que la vue soit mise à jour
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturer le canvas
      const canvas = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas non trouvé dans le composant');
      }

      // Exporter l'image
      const link = document.createElement('a');
      link.download = `${filename}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Vue ${viewMode} exportée`);
    } catch (error) {
      console.error(`❌ Erreur export vue ${viewMode}:`, error);
    }
  }

  /**
   * Export PDF avec toutes les vues 2D
   */
  async exportAll2DViewsToPDF(
    scene: VisualizationScene, 
    options: { filename?: string } = {},
    canvasComponent?: any
  ): Promise<void> {
    try {
      console.log('📄 Export PDF avec toutes les vues 2D...');
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const views = [
        { name: 'plan', mode: 'top', label: 'Vue de dessus (Plan)' },
        { name: 'dessous', mode: 'bottom', label: 'Vue de dessous' },
        { name: 'cote', mode: 'side', label: 'Vue de côté' },
        { name: 'cote-oppose', mode: 'side-opposite', label: 'Vue côté opposé' },
        { name: 'avant', mode: 'front', label: 'Vue de face (Avant)' },
        { name: 'arriere', mode: 'back', label: 'Vue arrière' }
      ];

      // Page de titre
      pdf.setFontSize(20);
      pdf.text('Simulation - Toutes les vues 2D', 20, 30);
      
      pdf.setFontSize(12);
      pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 20, 45);
      pdf.text(`Nombre de conteneurs: ${scene.containers?.length || 0}`, 20, 55);

      // Sauvegarder la vue actuelle pour la restaurer à la fin
      const originalView = canvasComponent?.getCurrentView() || 'top';

      let pageCount = 0;

      for (const view of views) {
        pageCount++;
        
        // Nouvelle page pour chaque vue (sauf la première)
        if (pageCount > 1) {
          pdf.addPage();
        }

        // Titre de la vue
        pdf.setFontSize(16);
        pdf.text(view.label, 20, 80);

        try {
          // Capturer la vue
          const canvasDataUrl = await this.capture2DView(view.mode as any, canvasComponent);
          
          if (canvasDataUrl) {
            // Ajouter l'image au PDF
            pdf.addImage(canvasDataUrl, 'PNG', 20, 90, 170, 120);
          } else {
            pdf.setFontSize(12);
            pdf.text('Vue non disponible', 20, 100);
          }
        } catch (error) {
          console.error(`Erreur capture vue ${view.mode}:`, error);
          pdf.setFontSize(12);
          pdf.text(`Erreur lors de la capture de la vue ${view.label}`, 20, 100);
        }

        // Attendre entre les captures
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Restaurer la vue originale
      if (canvasComponent && canvasComponent.changeView) {
        canvasComponent.changeView(originalView);
      }

      // Sauvegarder le PDF
      const filename = options.filename || `simulation-toutes-vues-2d-${new Date().getTime()}`;
      pdf.save(`${filename}.pdf`);

      console.log('✅ Export PDF toutes vues 2D terminé');
    } catch (error) {
      console.error('❌ Erreur export PDF toutes vues 2D:', error);
      throw error;
    }
  }

  /**
   * Capture une vue 2D spécifique et retourne le dataURL
   */
  private async capture2DView(
    viewMode: 'top' | 'bottom' | 'side' | 'side-opposite' | 'front' | 'back',
    canvasComponent?: any
  ): Promise<string | null> {
    try {
      if (canvasComponent && canvasComponent.changeView) {
        // Utiliser la référence directe au composant
        canvasComponent.changeView(viewMode);
      } else {
        // Méthode de fallback avec événement personnalisé
        const canvasComponentElement = document.querySelector('app-canvas');
        if (canvasComponentElement) {
          const changeViewEvent = new CustomEvent('changeView', {
            detail: { viewMode }
          });
          canvasComponentElement.dispatchEvent(changeViewEvent);
        }
      }

      // Attendre la mise à jour
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturer le canvas
      const canvas = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
      return canvas ? canvas.toDataURL('image/png') : null;
    } catch (error) {
      console.error(`Erreur capture vue ${viewMode}:`, error);
      return null;
    }
  }

  /**
   * Trouve le canvas Three.js avec plusieurs stratégies
   */
  private findThreeJSCanvas(): HTMLCanvasElement | null {
    // Méthode 1: Sélecteur direct
    let canvas = document.querySelector('app-scene canvas') as HTMLCanvasElement;
    if (canvas) return canvas;

    // Méthode 2: Chercher dans le container de scène
    const sceneContainer = document.querySelector('.scene-container');
    if (sceneContainer) {
      canvas = sceneContainer.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) return canvas;
    }

    // Méthode 3: Chercher un canvas avec des dimensions importantes
    const allCanvas = Array.from(document.querySelectorAll('canvas'));
    canvas = allCanvas.find(c => c.width > 100 && c.height > 100) as HTMLCanvasElement;
    if (canvas) return canvas;

    // Méthode 4: Prendre le dernier canvas (Three.js crée souvent le dernier)
    if (allCanvas.length > 0) {
      return allCanvas[allCanvas.length - 1] as HTMLCanvasElement;
    }

    return null;
  }

  /**
   * Calcule l'utilisation moyenne des conteneurs
   */
  private calculateAverageUtilization(containers: VisualizationContainer[]): { volume: number, poids: number } {
    if (!containers || containers.length === 0) {
      return { volume: 0, poids: 0 };
    }

    const totalVolume = containers.reduce((sum, c) => sum + (c.utilization?.volume || 0), 0);
    const totalPoids = containers.reduce((sum, c) => sum + (c.utilization?.poids || 0), 0);

    return {
      volume: totalVolume / containers.length,
      poids: totalPoids / containers.length
    };
  }
}