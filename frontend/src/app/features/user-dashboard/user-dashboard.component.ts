import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatMenuModule,
    RouterModule,
],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss'
})
export class UserDashboardComponent implements OnInit {
  currentUser: User | null = null;
//  users = [
//     { rang: 1, name: 'Modou', count: 78 },
//     { rang: 2, name: 'Fatou', count: 65 },
//     { rang: 3, name: 'Codou', count: 52 }
//   ];

  //  simulations = [
  //   { label: "Aujourd'hui", value: 126 },
  //   { label: "Semaine", value: 135 },
  //   { label: "Mois", value: 425 }
  // ];


  //  containers = [
  //   { label: "Conteneur 20’", value: "37%" },
  //   { label: "Conteneur 40’", value: "31%" },
  //   { label: "Camion", value: "23%" },
  //   { label: "Autres", value: "9%" }
  // ];
 // Données dynamique
//users :UserActive[]= [];
  // User dashboard statistics
  userStats = {
    totalSimulations: 28,
    avgFillRate: {
      volume: 83,
      weight: 76
    },
    preferredContainer: "Container 20'",
    recentSimulations: [] as any[]
  };
  recentSimulations: any[] = [];
  loading = false;
  error: string | null = null;
  

  
  constructor(
    private authService: AuthService,
    private router: Router,
    private simulationService: SimulationService,
    
  ) {}
  
  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && this.authService.isAuthenticated()) {
        this.loadRecentSimulations();
      }
    });
  }
  
  logout(): void {
    this.authService.logout();
  }

  private loadRecentSimulations(): void {
    if (!this.authService.isAuthenticated()) return;
    this.loading = true;
    this.simulationService.recupererSimulations().subscribe({
      next: (sims) => {
        // sims expected sorted by backend; take latest 5
        const list = Array.isArray(sims) ? sims : [];
        this.recentSimulations = list.slice(0, 5);
        this.userStats.totalSimulations = list.length;
        // Best-effort averages if available
        const withStats = list.filter(s => s?.resultats?.stats);
        if (withStats.length) {
          const avgVol = withStats.reduce((a: number, s: any) => a + ((s.resultats.stats.avgVolumeUtilization ?? 0) * 100), 0) / withStats.length;
          const avgW = withStats.reduce((a: number, s: any) => a + ((s.resultats.stats.avgWeightUtilization ?? 0) * 100), 0) / withStats.length;
          this.userStats.avgFillRate.volume = Math.round(avgVol);
          this.userStats.avgFillRate.weight = Math.round(avgW);
        }
      },
      error: (err) => {
        console.error('Erreur de chargement des simulations:', err);
        this.error = 'Impossible de charger les simulations récentes';
      },
      complete: () => this.loading = false
    });
  }

  loadSimulation(sim: any): void {
    const id = sim?._id || sim?.id;
    if (!id) return;
    this.simulationService.recupererSimulation(id).subscribe({
      next: (full) => {
        if (!full) return;
        const simulationData = {
          colis: full.colis || [],
          resultats: full.resultats || null,
          nom: full.nom || `Simulation ${id}`,
          description: full.description || '',
          timestamp: new Date(full.date || Date.now()).getTime()
        };
        // Persist to sessionStorage for visualization component
        try { sessionStorage.setItem('simulationData', JSON.stringify(simulationData)); } catch {}
        this.router.navigate(['/visualization'], { state: { simulationData } });
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la simulation:', err);
      }
    });
  }
}
