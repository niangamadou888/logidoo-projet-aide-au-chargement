import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DASHBOARD_ROUTES } from './features/dashboard.routes';
import { authGuard } from './core/guards/auth.guard';
import { SimulationComponent } from './features/simulation/simulation.component';
import { AuthService } from './core/services/auth.service';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { TestLoggerComponent } from './test-logger.component';
import { ConteneursPageComponent } from './features/conteneurs/conteneurs-page.component';
import { VisualizationComponent } from './features/visualization/visualization.component';
import { HistoryComponent } from './features/history/history.component';
import { LandingPageComponent } from './landing-page/landing-page.component';


export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      ...DASHBOARD_ROUTES,
       
      {
        path: '',
        canActivate: [authGuard],
        resolve: {
          redirectToDashboard: () => {
            const authService = inject(AuthService);
            const router = inject(Router);

            if (authService.isAdmin()) {
              router.navigate(['/dashboard/admin']);
            } else {
              router.navigate(['/dashboard/user']);
            }
            return true;
          }
        },
        component: LandingPageComponent
      }
    ]
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
    canActivate: [authGuard]
  },
  {
  path: '',
  component: LandingPageComponent,
  pathMatch: 'full'
},
{
  path: 'history',
  component: HistoryComponent,
  canActivate: [authGuard]
},
{
  path: 'test-logger',
  component: TestLoggerComponent
},
 {
  path: 'simulation',
  component: SimulationComponent,
  canActivate: [authGuard] 
},
{
  path: 'container',
  component: ConteneursPageComponent,
  canActivate: [authGuard]
},
  {
    path: 'visualization/:simulationId',
    component: VisualizationComponent,
    canActivate: [authGuard]
  },

  {
    path: 'visualization',
    component: VisualizationComponent,
    canActivate: [authGuard]
  },

  {
    path: '**',
    redirectTo: '/'
  }
];
