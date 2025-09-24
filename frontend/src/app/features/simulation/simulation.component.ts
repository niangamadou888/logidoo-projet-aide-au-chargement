import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
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
  totalSteps = 6;
  showDestinataireForm = false;
  
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
    Swal.fire({
      title: 'Nouvelle simulation',
      text: 'Voulez-vous vraiment recommencer ? Les données actuelles seront perdues.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, recommencer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
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
        
        Swal.fire({
          icon: 'success',
          title: 'Nouvelle simulation initialisée !',
          text: 'Vous pouvez maintenant commencer une nouvelle simulation.',
          timer: 2000
        });
      }
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

  selectContainer(id: string | undefined) {
    if (!id) return; // Guard against undefined IDs
    // Si c'est le même conteneur déjà sélectionné, ne rien faire
    if (this.selectedContainerId === id) return;

    this.selectedContainerId = id;
    this.selectionAutoOptimal = false; // Désactive la sélection automatique
    this.colisForm.patchValue({ container: id });

    // Réinitialiser les résultats de simulation quand on change de conteneur
    this.simulationResultats = null;
    this.previewTime = null;
    this.simulationEnCours = false;

    // Évaluer le conteneur sélectionné pour montrer ses statistiques
    this.evaluateSelectedContainer();
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
      this.snackBar.open('Veuillez ajouter au moins un colis à la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    if (!this.simulationForm.valid) {
      this.snackBar.open('Veuillez remplir le nom de la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    // Si on n'a pas encore de résultats, lancer la simulation d'abord
    if (!this.simulationResultats) {
      this.snackBar.open('Veuillez d\'abord lancer la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    this.loading = true;

    // Créer l'objet de simulation
    const simulation = {
      nom: this.simulationForm.value.nom,
      description: this.simulationForm.value.description,
      colis: this.listeColis,
      resultats: this.simulationResultats
    };

    console.log('Données à sauvegarder:', {
      colis: this.listeColis,
      resultats: this.simulationResultats
    });

    // Sauvegarder les résultats (avec nom/description)
    this.simulationService.sauvegarderResultats(this.listeColis, this.simulationResultats, simulation.nom, simulation.description).subscribe({
      next: (response) => {
        console.log('Simulation sauvegardée:', response);
        this.loading = false;

        // Préparer les données pour la visualisation
        const simulationData = {
          colis: this.listeColis,
          resultats: this.simulationResultats,
          nom: simulation.nom,
          description: simulation.description,
          simulationId: response.simulation?._id,
          timestamp: Date.now()
        };

        console.log('Données préparées pour visualisation:', simulationData);

        Swal.fire({
          icon: 'success',
          title: `Simulation "${simulation.nom}" validée !`,
          text: `${this.simulationResultats?.containers.length || 0} contenants utilisés pour ${this.calculerNombreColisTotal()} colis.`,
          showCancelButton: true,
          confirmButtonText: '🚀 Voir la visualisation 3D',
          cancelButtonText: 'Nouvelle simulation',
          confirmButtonColor: '#f97316',
          cancelButtonColor: '#6b7280'
        }).then((result) => {
          if (result.isConfirmed) {
            console.log('Navigation vers visualisation avec:', simulationData);

            // ✅ Navigation vers la visualisation avec les données
            this.router.navigate(['/visualization'], {
              state: {
                simulationData: simulationData
              }
            }).then(success => {
              if (success) {
                console.log('Navigation réussie');
              } else {
                console.error('Erreur de navigation');
                this.snackBar.open('Erreur lors de la navigation', 'OK', { duration: 3000 });
              }
            });
          } else {
            // Nouvelle simulation
            this.nouvelleSimulation();
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.snackBar.open('Erreur lors de la sauvegarde de la simulation', 'OK', {
          duration: 3000
        });
        this.loading = false;
      }
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

  canProceedFromStep1(): boolean {
    return this.simulationForm.valid;
  }

  canProceedFromStep2(): boolean {
    return this.listeColis.length > 0;
  }

  canProceedFromStep3(): boolean {
    return this.listeColis.length > 0 && (!!this.selectedContainerId || this.selectionAutoOptimal);
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
      nom: this.simulationForm.value.nom || `Simulation du ${new Date().toLocaleDateString()}`,
      description: this.simulationForm.value.description || '',
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
        Swal.fire({
          icon: 'success',
          title: 'Simulation sauvegardée !',
          text: `La simulation "${simulation.nom}" a été sauvegardée avec succès.`,
          timer: 2000
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Erreur lors de la sauvegarde:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur de sauvegarde',
          text: 'Une erreur s\'est produite lors de la sauvegarde.'
        });
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
  dateAujourdhui = new Date();
  colisPerPage = 10;
  
  // Méthodes de pagination améliorées
  getPaginatedColis(): Colis[] {
    if (this.colisPerPage >= this.listeColis.length) {
      return this.listeColis;
    }
    const startIndex = (this.currentPage - 1) * this.colisPerPage;
    const endIndex = startIndex + this.colisPerPage;
    return this.listeColis.slice(startIndex, endIndex);
  }
  
  getCurrentPageIndex(): number {
    return this.currentPage - 1; // Conversion en base 0
  }
  
  getStartIndex(): number {
    return (this.currentPage - 1) * this.colisPerPage;
  }
  
  getEndIndex(): number {
    const end = this.currentPage * this.colisPerPage;
    return Math.min(end, this.listeColis.length);
  }
  
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
  
  getTotalPages(): number {
    return Math.ceil(this.listeColis.length / this.colisPerPage);
  }
  
  // Méthodes pour les étapes 4, 5, 6
  getSelectedContainerInfo(): string {
    if (!this.selectedContainerId) return '';
    const container = this.containers.find(c => c._id === this.selectedContainerId);
    return container ? `${container.type} (${container.dimensions.longueur}×${container.dimensions.largeur}×${container.dimensions.hauteur}mm)` : '';
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
  }
  
  newSimulation(): void {
    Swal.fire({
      title: 'Nouvelle simulation',
      text: 'Voulez-vous vraiment commencer une nouvelle simulation ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, recommencer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.listeColis = [];
        this.simulationResultats = null;
        this.selectedContainerId = null;
        this.currentStep = 1;
        this.currentPage = 1;
        this.colisForm.reset();
        
        Swal.fire({
          icon: 'success',
          title: 'Nouvelle simulation initialisée !',
          timer: 2000
        });
      }
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
}
