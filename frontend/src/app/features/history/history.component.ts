import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { SimulationService } from '../../services/simulation.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatMenuModule
  ],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  simulations: any[] = [];
  loading = false;
  error: string | null = null;
  currentUser: User | null = null;

  constructor(
    private simulationService: SimulationService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && this.authService.isAuthenticated()) {
        this.fetchSimulations();
      }
    });
  }

  fetchSimulations(): void {
    if (!this.authService.isAuthenticated()) return;
    this.loading = true;
    this.simulationService.recupererSimulations().subscribe({
      next: (sims) => {
        this.simulations = Array.isArray(sims) ? sims : [];
      },
      error: (err) => {
        console.error('Erreur de chargement de l\'historique:', err);
        this.error = 'Impossible de charger l\'historique des simulations';
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
        try { sessionStorage.setItem('simulationData', JSON.stringify(simulationData)); } catch {}
        this.router.navigate(['/visualization'], { state: { simulationData } });
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la simulation:', err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
