import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DASHBOARD_ROUTES } from './features/dashboard.routes';
import { authGuard } from './core/guards/auth.guard';
import { SimulationComponent } from './features/simulation/simulation.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { TestLoggerComponent } from './test-logger.component';
import { ConteneursPageComponent } from './features/conteneurs/conteneurs-page.component';
import { VisualizationComponent } from './features/visualization/visualization.component';
import { HistoryComponent } from './features/history/history.component';


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
        redirectTo: '/dashboard/user',
        pathMatch: 'full'
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

  // ✅ Route alternative pour visualiser directement sans ID
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
