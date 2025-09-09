import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ConteneurService } from '../../services/conteneur.service';
import { Contenant } from '../../core/models/contenant.model';
import { AjouteConteneurComponent } from '../ajoute-conteneur/ajoute-conteneur.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { RouterModule } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-conteneurs-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    AjouteConteneurComponent
  ],
  templateUrl: './conteneurs-page.component.html',
  styleUrl: './conteneurs-page.component.scss'
})
export class ConteneursPageComponent implements OnInit {
  loading = false;
  contenants: Contenant[] = [];
  currentUser: User | null = null;
  private isBrowser = true;

  constructor(
    private conteneurService: ConteneurService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    // Pas d'appel API pendant le prerender
    if (this.isBrowser) {
      this.fetchContenants();
    }
  }

  fetchContenants(): void {
    this.loading = true;
    this.conteneurService.listerContenants().subscribe({
      next: (data) => {
        this.contenants = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement des contenants', err);
        this.loading = false;
      }
    });
  }

  deleteContenant(id?: string): void {
    if (!id) return;
    const confirmed = window.confirm('Supprimer ce contenant ?');
    if (!confirmed) return;

    this.conteneurService.deleteContenant(id).subscribe({
      next: () => {
        this.snackBar.open('Contenant supprimé', 'OK', { duration: 2000 });
        this.contenants = this.contenants.filter(c => c._id !== id);
      },
      error: (err) => {
        console.error('Erreur suppression contenant', err);
        this.snackBar.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
      }
    });
  }
}
