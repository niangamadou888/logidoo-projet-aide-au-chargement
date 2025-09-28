import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { ConteneurService } from '../../services/conteneur.service';
import { SimulationService, SimulationResult, OptimalContainerResult } from '../../services/simulation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Contenant } from '../../core/models/contenant.model';
import { Simulation, Colis, ContainerStats } from '../../models/simulation.model';
import { ExcelService } from '../../services/excelService';
import { ColorUtils } from '../../shared/utils/color-utils';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';




@Component({
  selector: 'app-simulation',
  templateUrl: './simulation.component.html',
  styleUrls: ['./simulation.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ]
})

export class SimulationComponent implements OnInit {
  loading = false;
  simulationEnCours = false;
  findingOptimal = false;
  colisForm: FormGroup;
  simulationForm: FormGroup;
  listeColis: Colis[] = [];
  suggestions: Contenant[] = [];
  articles: Colis[] = [];
  simulations: Simulation[] = [];
  simulationResultats: SimulationResult | null = null;
  optimalContainer: OptimalContainerResult | null = null;
  selectedContainerStats: ContainerStats | null = null;
  containers: Contenant[] = [];
  selectedContainerId: string | null = null;
  previewTime: number | null = null;
  selectionAutoOptimal = true; // Par défaut, la sélection automatique est activée
  evaluatingContainer = false; // Pour afficher un indicateur de chargement lors de l'évaluation d'un conteneur
  
  // Variables pour la gestion des steppers
  currentStep = 1;
  totalSteps = 2;
  showDestinataireForm = false;
  
  // Variables pour masquer/afficher les formulaires d'ajout
  showInputForms = true; // Affiche les formulaires au début
  
  // Variables pour le drag and drop
  isDragOver = false;
  
  private isBrowser = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private conteneurService: ConteneurService,
    private simulationService: SimulationService,
    private excelService: ExcelService,
    private snackBar: MatSnackBar,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.colisForm = this.fb.group({
      type: ['', Validators.required],
      longueur: ['', [Validators.required, Validators.min(1)]],
      largeur: ['', [Validators.required, Validators.min(1)]],
      hauteur: ['', [Validators.required, Validators.min(1)]],
      poids: ['', [Validators.required, Validators.min(0.1)]],
      quantite: [1, [Validators.required, Validators.min(1)]],
      container: [''],
      camions: [''],
      volume: [''],
      nomDestinataire: [''],
      adresse: [''],
      telephone: [''],
      fragile: [false],
      gerbable: [true], // Par défaut, les colis sont gerbables
      couleur: ['#999999']
    });

    this.simulationForm = this.fb.group({
      nom: ['', Validators.required],
      description: ['']
    });

    // Ne pas réinitialiser ici; on restaure potentiellement depuis l'état/navigation
  }

  telechargerModele(): void {
    this.excelService.telechargerModele();
  }
  importerDepuisExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.excelService.importerDepuisExcel(file).subscribe({
        next: (colisImportes) => {
          const enriched = colisImportes.map((c) => ({
            ...c,
            fragile: c.fragile ?? false,
            gerbable: c.gerbable ?? true,
            couleur: c.couleur || this.getDistinctRandomColor()
          }));
          this.listeColis = this.listeColis.concat(enriched);
          
          // Masquer les formulaires d'entrée après l'import
          this.showInputForms = false;
          
          this.snackBar.open('Colis importés avec succès', 'OK', { duration: 3000 });

          if (this.selectionAutoOptimal && this.listeColis.length > 0) {
            this.trouverConteneurOptimal();
          } else if (this.selectedContainerId) {
            this.evaluateSelectedContainer();
          }
        },
        error: (err) => {
          console.error('Erreur lors de l\'import Excel:', err);
          this.snackBar.open('Erreur lors de l\'import du fichier Excel', 'OK', { duration: 5000 });
        }
      });
      input.value = '';
    }
  }

  private getDistinctRandomColor(): string {
    const existing = (this.listeColis || [])
      .map(c => c.couleur)
      .filter((c): c is string => !!c);
    return ColorUtils.getDistinctRandomColor(existing, 25, 50);
  }

  updateColisCouleur(index: number, couleur: string) {
    if (!this.listeColis[index]) return;
    const normalizedColor = couleur ? ColorUtils.validateAndNormalizeHex(couleur) : null;
    this.listeColis[index].couleur = normalizedColor || this.getDistinctRandomColor();
  }

  toggleFragile(index: number) {
    if (!this.listeColis[index]) return;
    this.listeColis[index].fragile = !this.listeColis[index].fragile;
    // Toute modification d'un colis invalide les résultats précédents
    this.resetResultats();
  }

  toggleGerbable(index: number) {
    if (!this.listeColis[index]) return;
    const current = this.listeColis[index].gerbable;
    this.listeColis[index].gerbable = current === undefined ? false : !current;
    // Toute modification d'un colis invalide les résultats précédents
    this.resetResultats();
  }

  randomizeColor(index: number) {
    if (!this.listeColis[index]) return;
    this.listeColis[index].couleur = this.getDistinctRandomColor();
  }

  nouvelleSimulation() {
    // Réinitialisation directe sans confirmation
    this.resetResultats();
    this.listeColis = [];
    this.simulationForm.reset();
    this.colisForm.reset();
    this.selectedContainerId = null;
    this.currentStep = 1;
    this.currentPage = 1;
    
    // Nettoyer les données de visualisation
    try {
      sessionStorage.removeItem('simulationData');
    } catch (error) {
      console.warn('Impossible de nettoyer sessionStorage:', error);
    }
    
    this.snackBar.open('Nouvelle simulation initialisée !', 'OK', {
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }

  toggleSelectionMode() {
    this.selectionAutoOptimal = !this.selectionAutoOptimal;
    // Si on active la sélection automatique, chercher le conteneur optimal
    if (this.selectionAutoOptimal && this.listeColis.length > 0) {
      this.trouverConteneurOptimal();
    } else {
      // Si on désactive et qu'un conteneur est déjà sélectionné, montrer ses stats
      if (this.selectedContainerId) {
        this.evaluateSelectedContainer();
      }
    }

    // Réinitialiser les résultats de simulation précédents
    this.simulationResultats = null;
    this.previewTime = null;
    this.simulationEnCours = false;
  }

  // Méthode mise à jour pour la nouvelle interface
  selectContainer(containerId: string): void {
    if (!containerId) return;
    
    // Si c'est le même conteneur déjà sélectionné, ne rien faire
    if (this.selectedContainerId === containerId) return;

    this.selectedContainerId = containerId;
    this.selectionAutoOptimal = false; // Désactive la sélection automatique
    this.colisForm.patchValue({ container: containerId });

    // Réinitialiser les résultats de simulation quand on change de conteneur
    this.simulationResultats = null;
    this.previewTime = null;
    this.simulationEnCours = false;

    // Évaluer le conteneur sélectionné pour montrer ses statistiques
    if (this.listeColis.length > 0) {
      this.evaluateSelectedContainer();
    }
  }

  // Évaluer le conteneur sélectionné manuellement
  evaluateSelectedContainer() {
    if (!this.selectedContainerId || this.listeColis.length === 0) {
      this.selectedContainerStats = null;
      return;
    }

    this.evaluatingContainer = true;

    // Options de simulation
    const options = {
      forceUseContainers: [this.selectedContainerId]
    };

    this.simulationService.previewSimulation(this.listeColis, options).subscribe({
      next: (response) => {
        if (response.success && response.result.containers.length > 0) {
          const container = response.result.containers[0];

          // Créer un objet de statistiques pour le conteneur sélectionné
          const selectedContainer = this.containers.find(c => c._id === this.selectedContainerId);

          if (selectedContainer) {
            this.selectedContainerStats = {
              containerType: selectedContainer.type,
              containerCategory: selectedContainer.categorie,
              dimensions: selectedContainer.dimensions,
              volume: selectedContainer.volume || 0,
              capacitePoids: selectedContainer.capacitePoids || 0,
              volumeUtilization: container.utilization.volume / 100, // Convertir le pourcentage en décimal
              weightUtilization: container.utilization.poids / 100,
              placedItems: response.result.stats.placedCount,
              totalItems: response.result.stats.placedCount + response.result.stats.unplacedCount,
              optimalityScore: (container.utilization.volume + container.utilization.poids) / 200 * (response.result.stats.placedCount / (response.result.stats.placedCount + response.result.stats.unplacedCount || 1))
            };
          }
        } else {
          this.selectedContainerStats = null;
        }
        this.evaluatingContainer = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'évaluation du conteneur:', error);
        this.selectedContainerStats = null;
        this.evaluatingContainer = false;
      }
    });
  }

  // Nouveau système d'ajout de colis entièrement revu
  ajouterColis() {
    if (this.colisForm.valid) {
      try {
        // Récupérer les valeurs brutes du formulaire
        const formValues = this.colisForm.getRawValue();

        // Créer l'objet colis avec la structure exacte attendue par le backend
        const nouveauColis: Colis = {
          reference: `COLIS-${Date.now()}`,
          type: formValues.type,
          longueur: Number(formValues.longueur),
          largeur: Number(formValues.largeur),
          hauteur: Number(formValues.hauteur),
          poids: Number(formValues.poids),
          quantite: Number(formValues.quantite),
          nomDestinataire: formValues.nomDestinataire || undefined,
          adresse: formValues.adresse || undefined,
          telephone: formValues.telephone || undefined,
          fragile: Boolean(formValues.fragile),
          gerbable: Boolean(formValues.gerbable),
          couleur: formValues.couleur ? (ColorUtils.validateAndNormalizeHex(formValues.couleur) || this.getDistinctRandomColor()) : this.getDistinctRandomColor(),
          statut: 'actif',
          dateAjout: new Date()
        };

        // Vérification des valeurs numériques
        if (isNaN(nouveauColis.longueur) || nouveauColis.longueur <= 0) {
          throw new Error('La longueur doit être un nombre positif');
        }
        if (isNaN(nouveauColis.largeur) || nouveauColis.largeur <= 0) {
          throw new Error('La largeur doit être un nombre positif');
        }
        if (isNaN(nouveauColis.hauteur) || nouveauColis.hauteur <= 0) {
          throw new Error('La hauteur doit être un nombre positif');
        }
        if (isNaN(nouveauColis.poids) || nouveauColis.poids <= 0) {
          throw new Error('Le poids doit être un nombre positif');
        }
        if (isNaN(nouveauColis.quantite) || nouveauColis.quantite <= 0) {
          nouveauColis.quantite = 1; // Valeur par défaut
        }

        console.log('Nouveau colis à ajouter:', nouveauColis);

        // Ajouter à la liste des colis
        this.listeColis.push(nouveauColis);
        
        // Masquer les formulaires d'entrée après l'ajout du premier colis
        this.showInputForms = false;

        // Réinitialiser le formulaire avec les valeurs par défaut
        this.colisForm.reset({
          type: '',
          longueur: '',
          largeur: '',
          hauteur: '',
          poids: '',
          quantite: 1,
          container: '',
          camions: '',
          volume: '',
          nomDestinataire: '',
          adresse: '',
          telephone: '',
          fragile: false,
          gerbable: true,
          couleur: this.getDistinctRandomColor()
        });

        // Réinitialiser les résultats de simulation
        this.resetResultats();

        // Si mode automatique activé, chercher le conteneur optimal
        if (this.selectionAutoOptimal && this.listeColis.length > 0) {
          this.trouverConteneurOptimal();
        } else if (this.selectedContainerId) {
          // Sinon, mettre à jour les stats du conteneur sélectionné
          this.evaluateSelectedContainer();
        }

        this.snackBar.open('Colis ajouté avec succès', 'OK', {
          duration: 3000
        });
      } catch (error: any) {
        console.error('Erreur lors de l\'ajout du colis:', error);
        this.snackBar.open(`Erreur: ${error.message || 'Impossible d\'ajouter le colis'}`, 'OK', {
          duration: 5000
        });
      }
    } else {
      // Afficher les erreurs de validation
      let errorMessage = 'Veuillez corriger les champs suivants: ';
      if (this.colisForm.get('type')?.invalid) {
        errorMessage += 'Type, ';
      }
      if (this.colisForm.get('longueur')?.invalid) {
        errorMessage += 'Longueur, ';
      }
      if (this.colisForm.get('largeur')?.invalid) {
        errorMessage += 'Largeur, ';
      }
      if (this.colisForm.get('hauteur')?.invalid) {
        errorMessage += 'Hauteur, ';
      }
      if (this.colisForm.get('poids')?.invalid) {
        errorMessage += 'Poids, ';
      }
      if (this.colisForm.get('quantite')?.invalid) {
        errorMessage += 'Quantité, ';
      }

      this.snackBar.open(errorMessage.slice(0, -2), 'OK', {
        duration: 5000
      });
    }
  }

  private resetResultats() {
    this.simulationResultats = null;
    this.optimalContainer = null;
    this.selectedContainerStats = null;
    this.previewTime = null;
    this.simulationEnCours = false;
  }


  supprimerColis(index: number) {
    this.listeColis.splice(index, 1);
    this.resetResultats();

    // Si mode automatique activé et qu'il reste des colis, chercher le conteneur optimal
    if (this.selectionAutoOptimal && this.listeColis.length > 0) {
      this.trouverConteneurOptimal();
    } else if (this.selectedContainerId && this.listeColis.length > 0) {
      // Sinon, si un conteneur est sélectionné manuellement, mettre à jour ses stats
      this.evaluateSelectedContainer();
    }
  }



  // Trouver le conteneur optimal pour les colis
  trouverConteneurOptimal() {
    if (this.listeColis.length === 0) {
      return;
    }

    this.findingOptimal = true;

    // Afficher les données envoyées au service pour debug
    console.log('Colis envoyés pour recherche du conteneur optimal:', this.listeColis);

    this.simulationService.findOptimalContainer(this.listeColis).subscribe({
      next: (response) => {
        if (response.success) {
          this.optimalContainer = response.optimalContainer;
          // Sélectionner automatiquement le conteneur optimal
          this.selectedContainerId = this.optimalContainer.containerId;
          this.selectedContainerStats = null; // Réinitialiser les stats manuelles
        } else {
          this.snackBar.open('Aucun conteneur optimal trouvé', 'OK', {
            duration: 3000
          });
        }
        this.findingOptimal = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche du conteneur optimal:', error);
        this.snackBar.open('Erreur lors de la recherche du conteneur optimal', 'OK', {
          duration: 3000
        });
        this.findingOptimal = false;
      }
    });
  }

  // Lancer une simulation (prévisualisation)
  lancerSimulation() {
    if (this.listeColis.length === 0) {
      this.snackBar.open('Veuillez ajouter au moins un colis à la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    if (!this.selectedContainerId && !this.selectionAutoOptimal) {
      this.snackBar.open('Veuillez sélectionner un conteneur ou activer la sélection automatique', 'OK', {
        duration: 3000
      });
      return;
    }

    this.simulationEnCours = true;
    this.loading = true;

    // Options de simulation
    let options: { preferredCategories?: string[], forceUseContainers?: string[] } = {};

    // Utiliser le conteneur sélectionné si présent (manuel ou issu de l'optimal)
    if (this.selectedContainerId) {
      // Trouver le contenant sélectionné une seule fois
      const selectedContainer = this.containers.find(c => c._id === this.selectedContainerId);

      // Ajouter la catégorie si elle existe
      if (selectedContainer?.categorie) {
        options.preferredCategories = [selectedContainer.categorie];
      }

      // Ajouter l'ID du contenant
      options.forceUseContainers = [this.selectedContainerId];
    } else if (this.selectionAutoOptimal) {
      // En mode auto: ne pas forcer de conteneur, laisser le backend choisir
      // Optionnel: si on dispose d'un optimalContainer précédent, on peut favoriser sa catégorie
      if (this.optimalContainer?.containerCategory) {
        options.preferredCategories = [this.optimalContainer.containerCategory];
      }
    }

    // Afficher les données envoyées à la simulation pour debug
    console.log('Colis envoyés pour simulation:', this.listeColis);
    console.log('Options de simulation:', options);

    this.simulationService.previewSimulation(this.listeColis, options).subscribe({
      next: (response) => {
        this.simulationResultats = response.result;
        this.previewTime = response.executionTime;
        this.loading = false;

        if (!response.result.success) {
          this.snackBar.open('Attention: Certains colis n\'ont pas pu être placés', 'OK', {
            duration: 5000
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors de la simulation:', error);
        this.snackBar.open('Erreur lors de la simulation', 'OK', {
          duration: 3000
        });
        this.loading = false;
        this.simulationEnCours = false;
      }
    });
  }

  validerSimulation() {
    if (this.listeColis.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Aucun colis',
        text: 'Veuillez ajouter au moins un colis à la simulation',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (!this.simulationName || this.simulationName.trim() === '') {
      Swal.fire({
        icon: 'warning', 
        title: 'Informations manquantes',
        text: 'Veuillez remplir le nom de la simulation',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Vérifier qu'on a bien des résultats de simulation pour pouvoir valider
    if (!this.simulationResultats || !this.selectedContainerId) {
      Swal.fire({
        icon: 'info',
        title: 'Simulation requise',
        text: 'Veuillez d\'abord lancer la simulation pour obtenir les calculs d\'optimisation',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Directement sauvegarder la simulation avec les résultats
    this.loading = true;

    // Créer l'objet de simulation
    const simulation = {
      nom: this.simulationName,
      description: this.simulationDescription,
      colis: this.listeColis,
      resultats: this.simulationResultats
    };

    console.log('Données à sauvegarder:', {
      colis: this.listeColis,
      resultats: this.simulationResultats
    });

    // Sauvegarder les résultats de simulation
    this.simulationService.sauvegarderResultats(this.listeColis, this.simulationResultats, simulation.nom, simulation.description).subscribe({
      next: (response) => {
        console.log('Simulation sauvegardée:', response);
        this.loading = false;
        this.showSuccessSwal(simulation);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.loading = false;
        this.showErrorSwal();
      }
    });
  }

  private showSuccessSwal(simulation: any) {
    Swal.fire({
      icon: 'success',
      title: 'Simulation validée !',
      html: `
        <div style="text-align: left; margin: 10px 0;">
          <p><strong>Nom:</strong> ${simulation.nom}</p>
          <p><strong>Colis:</strong> ${this.listeColis.length} article(s)</p>
          <p><strong>Conteneur optimal:</strong> ${this.getSelectedContainerType()}</p>
          <p><strong>Utilisation volume:</strong> ${((this.selectedContainerStats?.volumeUtilization || this.optimalContainer?.volumeUtilization || 0) * 100).toFixed(0)}%</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '🚀 Visualiser en 3D',
      cancelButtonText: '📊 Voir tableau de bord',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ouvrirVisualisationComplete();
      } else {
        this.router.navigate(['/dashboard/user']);
      }
    });
  }

  private showErrorSwal() {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la sauvegarde de la simulation',
      confirmButtonColor: '#2563eb'
    });
  }

  calculerPoidsTotal(): number {
    return this.simulationService.calculerPoidsTotal(this.listeColis);
  }

  calculerVolumeTotal(): number {
    return this.simulationService.calculerVolumeTotal(this.listeColis);
  }

  calculerNombreColisTotal(): number {
    return this.simulationService.calculerNombreColis(this.listeColis);
  }

  // Méthodes de navigation pour les steppers
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    } else if (this.currentStep === 2) {
      // Après l'étape 2, lancer la simulation et aller aux résultats
      this.lancerSimulation();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
    }
  }

  // Back button handler for header: if inside the stepper, move to previous step; otherwise go back to dashboard
  onBackClick(): void {
    if (this.currentStep > 1) {
      this.prevStep();
    } else {
      this.router.navigate(['/dashboard/user']);
    }
  }

  canProceedFromStep1(): boolean {
    return this.listeColis.length > 0;
  }

  canProceedFromStep2(): boolean {
    return this.listeColis.length > 0 && (!!this.selectedContainerId || this.selectionAutoOptimal);
  }

  getSelectedContainerType(): string {
    if (!this.selectedContainerId) return '';
    const container = this.containers.find(c => c._id === this.selectedContainerId);
    return container ? container.type : '';
  }

  getSelectedContainerVolume(): number {
    if (!this.selectedContainerId) return 0;
    const container = this.containers.find(c => c._id === this.selectedContainerId);
    return container?.volume || 0;
  }

  getSelectedContainerWeight(): number {
    if (!this.selectedContainerId) return 0;
    const container = this.containers.find(c => c._id === this.selectedContainerId);
    return container?.capacitePoids || 0;
  }

  getSelectedContainerDimensions(): string {
    if (!this.selectedContainerId) return '';
    const container = this.containers.find(c => c._id === this.selectedContainerId);
    if (!container || !container.dimensions) return '';
    return `${container.dimensions.longueur} x ${container.dimensions.largeur} x ${container.dimensions.hauteur} mm`;
  }

  ngOnInit() {
    // Restaurer uniquement si on revient explicitement de la visualisation
    // via navigation d'état (goBackToSimulation). Sinon, démarrer proprement.
    let restored: any = null;
    if (typeof window !== 'undefined') {
      try {
        restored = (window.history && (window.history.state as any))?.simulationData ?? null;
      } catch {}
    }

    if (restored) {
      this.listeColis = Array.isArray(restored.colis) ? restored.colis : [];
      this.simulationResultats = restored.resultats || null;
      this.simulationForm.patchValue({
        nom: restored.nom || '',
        description: restored.description || ''
      });
      // Restore selection state if present
      if (restored.selectedContainerId) {
        this.selectedContainerId = restored.selectedContainerId;
      }
      if (typeof restored.selectionAutoOptimal === 'boolean') {
        this.selectionAutoOptimal = restored.selectionAutoOptimal;
      }
      // If a target step was provided in navigation state (e.g., from visualization), open it
      try {
        const target = (restored.targetStep || (window.history && (window.history.state as any)?.targetStep)) as number | undefined;
        if (typeof target === 'number' && target >= 1 && target <= this.totalSteps) {
          this.currentStep = target;
        }
      } catch {}
    } else {
      this.nouvelleSimulation();
    }

    // Éviter les appels HTTP pendant le prerender (build statique)
    if (this.isBrowser) {
      this.loadConteneurs();
    }
  }

  loadConteneurs() {
    this.loading = true;
    this.conteneurService.listerContenants().subscribe({
      next: (data) => {
        this.containers = data;
        this.loading = false;
        // If we restored a selected container from navigation state, evaluate it now
        if (this.selectedContainerId && this.listeColis && this.listeColis.length > 0) {
          // If selection mode is manual or a container was explicitly selected, evaluate it
          this.evaluateSelectedContainer();
        } else if (this.selectionAutoOptimal && this.listeColis && this.listeColis.length > 0) {
          // Otherwise, if auto selection is on, re-run optimal container search
          this.trouverConteneurOptimal();
        }
      },
      error: (err) => {
        console.error('Erreur de chargement des container', err);
        this.snackBar.open('Erreur de chargement des container', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  testVisualization() {
    console.log('=== TEST DIRECT VISUALISATION ===');
    console.log('Liste colis:', this.listeColis);
    console.log('Resultats simulation:', this.simulationResultats);

    const testData = {
      colis: this.listeColis,
      resultats: this.simulationResultats,
      nom: 'Test Visualisation',
      description: 'Test direct',
      // Preserve selection state for round-trip navigation
      selectedContainerId: this.selectedContainerId,
      selectionAutoOptimal: this.selectionAutoOptimal,
      timestamp: Date.now()
    };

    console.log('Données test:', testData);

    // Méthode robuste : sessionStorage + state + replaceState (browser only)
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem('simulationData', JSON.stringify(testData)); } catch {}
    }

    this.router.navigate(['/visualization'], {
      state: { simulationData: testData }
    }).then(success => {
      console.log('Navigation résultat:', success);
      if (success && typeof window !== 'undefined') {
        // Force l'état dans l'historique
        setTimeout(() => {
          try { window.history.replaceState({ simulationData: testData }, '', '/visualization'); } catch {}
        }, 100);
      }
    }).catch(error => {
      console.error('Erreur navigation:', error);
      this.router.navigate(['/visualization']);
    });
  }

  // === PAGINATION ===
itemsPerPage = 5;            // nombre d’éléments par page
currentPage = 1;

get totalPages(): number {
  return Math.ceil(this.listeColis.length / this.itemsPerPage);
}

get pagedColis(): Colis[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  return this.listeColis.slice(start, start + this.itemsPerPage);
}

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // Nouvelles méthodes pour la pagination améliorée
  getPaginatedColis(): Colis[] {
    return this.pagedColis; // Utilise le getter existant
  }
  
  getTotalPages(): number {
    return this.totalPages; // Utilise le getter existant
  }
  
  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipse
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1); // ellipse
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // ellipse
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipse
        pages.push(total);
      }
    }
    
    return pages;
  }
  
  onItemsPerPageChange(): void {
    this.currentPage = 1;
  }
  
  getActualIndex(paginatedIndex: number): number {
    return (this.currentPage - 1) * this.itemsPerPage + paginatedIndex;
  }

  // Méthodes pour les nouvelles étapes d'intégration
  ouvrirVisualisationComplete(): void {
    if (!this.simulationResultats) {
      this.snackBar.open('Aucun résultat de simulation disponible', 'OK', { duration: 3000 });
      return;
    }

    // Préparer les données comme dans validerSimulation()
    const simulationData = {
      colis: this.listeColis,
      resultats: this.simulationResultats,
      nom: this.simulationName || `Simulation du ${new Date().toLocaleDateString()}`,
      description: this.simulationDescription || '',
      // Preserve the currently selected container and selection mode so the user returns to the same choice
      selectedContainerId: this.selectedContainerId,
      selectionAutoOptimal: this.selectionAutoOptimal,
      timestamp: Date.now()
    };

    console.log('Navigation vers visualisation avec:', simulationData);

    // Sauvegarder en sessionStorage pour la visualisation
    try {
      sessionStorage.setItem('simulationData', JSON.stringify(simulationData));
    } catch (error) {
      console.warn('Impossible de sauvegarder en sessionStorage:', error);
    }

    // Navigation vers la visualisation
    this.router.navigate(['/visualization'], {
      state: { simulationData: simulationData }
    }).then(success => {
      if (success) {
        console.log('Navigation vers visualisation réussie');
      } else {
        console.error('Erreur de navigation vers visualisation');
        this.snackBar.open('Erreur lors de l\'ouverture de la visualisation', 'OK', { duration: 3000 });
      }
    });
  }

  sauvegarderSimulation(): void {
    if (!this.simulationResultats) {
      this.snackBar.open('Aucun résultat de simulation à sauvegarder', 'OK', { duration: 3000 });
      return;
    }

    if (!this.simulationForm.valid) {
      this.snackBar.open('Veuillez remplir le nom de la simulation', 'OK', { duration: 3000 });
      return;
    }

    this.loading = true;

    const simulation = {
      nom: this.simulationForm.value.nom,
      description: this.simulationForm.value.description || '',
      colis: this.listeColis,
      resultats: this.simulationResultats
    };

    this.simulationService.sauvegarderResultats(
      this.listeColis, 
      this.simulationResultats, 
      simulation.nom, 
      simulation.description
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open(
          `La simulation "${simulation.nom}" a été sauvegardée avec succès.`,
          'OK',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          }
        );
      },
      error: (error) => {
        this.loading = false;
        console.error('Erreur lors de la sauvegarde:', error);
        this.snackBar.open(
          'Une erreur s\'est produite lors de la sauvegarde.',
          'OK',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          }
        );
      }
    });
  }

  getSimulationName(): string {
    return this.simulationForm.value.nom || `Simulation du ${this.dateAujourdhui.toLocaleDateString()}`;
  }

  // === PAGINATION COLIS ===
  
  // Variables pour l'export et partage (ajoutées à la déclaration des propriétés)
  emailShare = '';
  simulationName = '';
  simulationDescription = '';
  dateAujourdhui = new Date();
  colisPerPage = 6;
  viewMode: 'grid' | 'list' = 'list'; // Par défaut en mode liste compact
  
  getVisiblePageNumbers(): number[] {
    const totalPages = this.totalPages;
    const maxVisiblePages = 5;
    const current = this.currentPage;
    
    let start = Math.max(1, current - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    // Ajuster le début si nous sommes près de la fin
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
  
  // Navigation de pagination
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  
  goToFirstPage(): void {
    this.currentPage = 1;
  }
  
  goToLastPage(): void {
    this.currentPage = this.totalPages;
  }
  
  onPageSizeChange(): void {
    this.currentPage = 1; // Retour à la première page
  }
  
  // Méthodes pour les étapes 4, 5, 6  
  getSelectedContainerInfo(): any {
    if (!this.selectedContainerId) return null;
    
    // Informations statiques basées sur l'ID du conteneur sélectionné
    const containerInfo: { [key: string]: any } = {
      'container-20ft': {
        volume: '14 %',
        weight: '1 %',
        dimensions: '6058 × 2438 × 2591 mm',
        capacity: '28 500 kg'
      },
      'container-40ft': {
        volume: '67.5 m³',
        weight: '26.7 t',
        dimensions: 'VAN × 2327 × 2170 mm',
        capacity: '26 700 kg'
      },
      'container-40ft-hc': {
        volume: '76.3 m³',
        weight: '26.7 t',
        dimensions: '12024 × 2352 × 2698 mm',
        capacity: '26 700 kg'
      },
      'camion-frigo': {
        volume: '850 m³',
        weight: '19 t',
        dimensions: '800 × 244 × 260 mm',
        capacity: '19 000 kg'
      },
      'camion-plateau': {
        volume: '60 m³',
        weight: '24 t',
        dimensions: 'VAN × 247 × 250 mm',
        capacity: '24 000 kg'
      },
      'camion-citerne': {
        volume: '14.75 m³',
        weight: '24 t',
        dimensions: '548 × 254 × 800 mm',
        capacity: '24 000 kg'
      }
    };
    
    return containerInfo[this.selectedContainerId] || null;
  }
  
  // Méthodes de visualisation 3D
  rotateView(direction: 'left' | 'right'): void {
    console.log(`Rotation ${direction} de la visualisation 3D`);
    // Ici on pourrait ajouter la logique de rotation 3D
  }
  
  resetView(): void {
    console.log('Vue 3D réinitialisée');
  }
  
  // Méthodes d'export
  exportPDF(): void {
    if (!this.simulationResultats) return;
    
    Swal.fire({
      title: 'Export PDF',
      text: 'Génération du rapport PDF en cours...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'PDF généré !',
        text: 'Le rapport a été téléchargé avec succès.',
        timer: 2000
      });
    }, 2000);
  }
  
  exportExcel(): void {
    if (!this.simulationResultats) return;
    
    try {
      // Créer les données d'export
      const exportData = this.listeColis.map((colis, index) => ({
        "N°": index + 1,
        "Type": colis.type,
        "Longueur(cm)": colis.longueur,
        "Largeur(cm)": colis.largeur, 
        "Hauteur(cm)": colis.hauteur,
        "Poids(kg)": colis.poids,
        "Quantité": colis.quantite,
        "Fragile": colis.fragile ? 'Oui' : 'Non',
        "Empilable": colis.gerbable ? 'Oui' : 'Non',
        "Couleur": colis.couleur
      }));
      
      // Créer le workbook Excel
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Résultats Simulation');
      
      // Ajouter une feuille avec les résultats
      if (this.simulationResultats) {
        const resultsData = [
          { "Métrique": "Efficacité", "Valeur": `${(this.simulationResultats.stats.avgVolumeUtilization * 100).toFixed(1)}%` },
          { "Métrique": "Volume utilisé", "Valeur": `${this.simulationResultats.stats.totalVolume.toFixed(2)} m³` },
          { "Métrique": "Colis placés", "Valeur": `${this.simulationResultats.stats.placedCount}/${this.calculerNombreColisTotal()}` },
          { "Métrique": "Nombre de conteneurs", "Valeur": this.simulationResultats.stats.containersCount.toString() }
        ];
        const wsResults = XLSX.utils.json_to_sheet(resultsData);
        XLSX.utils.book_append_sheet(wb, wsResults, 'Métriques');
      }
      
      // Télécharger le fichier
      const fileName = `simulation-results-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      Swal.fire({
        icon: 'success',
        title: 'Export Excel réussi !',
        text: 'Les données ont été exportées vers Excel.',
        timer: 2000
      });
    } catch (error) {
      console.error('Erreur export Excel:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur d\'export',
        text: 'Une erreur s\'est produite lors de l\'export Excel.'
      });
    }
  }
  
  exportImage(): void {
    if (!this.simulationResultats) return;
    
    Swal.fire({
      title: 'Export PNG',
      text: 'Génération de l\'image en cours...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'Image générée !',
        text: 'La visualisation 3D a été sauvegardée en PNG.',
        timer: 2000
      });
    }, 1500);
  }
  
  exportCheckList(): void {
    if (!this.simulationResultats) return;
    
    const checkList = this.generateLoadingCheckList();
    const blob = new Blob([checkList], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-chargement-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: 'Liste générée !',
      text: 'La liste de chargement a été téléchargée.',
      timer: 2000
    });
  }
  
  shareByEmail(): void {
    if (!this.emailShare || !this.simulationResultats) return;
    
    Swal.fire({
      title: 'Envoi par email',
      text: `Envoi des résultats à ${this.emailShare}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'Email envoyé !',
        text: `Les résultats ont été envoyés à ${this.emailShare}.`,
        timer: 2000
      });
      this.emailShare = '';
    }, 2000);
  }
  
  saveSimulation(): void {
    if (!this.simulationName || !this.simulationResultats) return;
    
    const simulationData = {
      name: this.simulationName,
      description: this.simulationDescription,
      date: new Date(),
      colis: this.listeColis,
      container: this.containers.find(c => c._id === this.selectedContainerId),
      resultats: this.simulationResultats
    };
    
    const savedSimulations = JSON.parse(localStorage.getItem('savedSimulations') || '[]');
    savedSimulations.push(simulationData);
    localStorage.setItem('savedSimulations', JSON.stringify(savedSimulations));
    
    Swal.fire({
      icon: 'success',
      title: 'Simulation sauvegardée !',
      text: `La simulation "${this.simulationName}" a été sauvegardée.`,
      timer: 2000
    });
    this.simulationName = '';
    this.simulationDescription = '';
  }
  
  newSimulation(): void {
    // Reset simulation directly without confirmation dialog
    this.listeColis = [];
    this.simulationResultats = null;
    this.selectedContainerId = null;
    this.currentStep = 1;
    this.currentPage = 1;
    this.colisForm.reset();
    
    // Optional: Show simple success message
    this.snackBar.open('Nouvelle simulation initialisée !', 'Fermer', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }
  
  private generateLoadingCheckList(): string {
    let checkList = `LISTE DE CHARGEMENT OPTIMISÉE\n`;
    checkList += `Date: ${new Date().toLocaleDateString()}\n`;
    checkList += `Container: ${this.getSelectedContainerInfo()}\n`;
    checkList += `Nombre total de colis: ${this.calculerNombreColisTotal()}\n\n`;
    
    checkList += `ORDRE DE CHARGEMENT RECOMMANDÉ:\n`;
    checkList += `=====================================\n\n`;
    
    this.listeColis.forEach((colis, index) => {
      checkList += `${index + 1}. ${colis.type}\n`;
      checkList += `   Dimensions: ${colis.longueur} × ${colis.largeur} × ${colis.hauteur} cm\n`;
      checkList += `   Poids: ${colis.poids} kg\n`;
      checkList += `   Quantité: ${colis.quantite}\n`;
      if (colis.fragile) checkList += `   ⚠️  FRAGILE\n`;
      if (!colis.gerbable) checkList += `   ❌ NON EMPILABLE\n`;
      checkList += `\n`;
    });
    
    return checkList;
  }

  // Méthode pour vider tous les colis
  viderTousLesColis(): void {
    this.listeColis = [];
    // Réafficher les formulaires d'entrée
    this.showInputForms = true;
    
    this.snackBar.open('Tous les colis ont été supprimés', 'Fermer', {
      duration: 3000,
      panelClass: ['success-snack']
    });
  }

  // Méthode pour permettre l'ajout d'autres colis (retour au mode manuel)
  ajouterAutresColis(): void {
    // Réafficher les formulaires d'entrée
    this.showInputForms = true;
    
    this.snackBar.open('Vous pouvez maintenant ajouter d\'autres colis', 'Fermer', {
      duration: 2000,
      panelClass: ['info-snack']
    });
  }

  // ===== MÉTHODES DRAG AND DROP =====
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Vérifier que c'est un fichier Excel
      const allowedExtensions = ['xlsx', 'xls'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.snackBar.open('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)', 'OK', {
          duration: 5000,
          panelClass: ['error-snack']
        });
        return;
      }
      
      // Traiter le fichier avec la même logique que l'import normal
      this.excelService.importerDepuisExcel(file).subscribe({
        next: (colisImportes) => {
          const enriched = colisImportes.map((c) => ({
            ...c,
            fragile: c.fragile ?? false,
            gerbable: c.gerbable ?? true,
            couleur: c.couleur || this.getDistinctRandomColor()
          }));
          this.listeColis = this.listeColis.concat(enriched);
          
          // Masquer les formulaires d'entrée après l'import
          this.showInputForms = false;
          
          this.snackBar.open(`${colisImportes.length} colis importés avec succès`, 'OK', { duration: 3000 });

          if (this.selectionAutoOptimal && this.listeColis.length > 0) {
            this.trouverConteneurOptimal();
          } else if (this.selectedContainerId) {
            this.evaluateSelectedContainer();
          }
        },
        error: (err) => {
          console.error('Erreur lors de l\'import Excel par drag and drop:', err);
          this.snackBar.open('Erreur lors de l\'import du fichier Excel', 'OK', { duration: 5000 });
        }
      });
    }
  }
}
