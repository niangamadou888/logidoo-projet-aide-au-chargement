import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';
import { authGuard, adminGuard } from '../core/guards/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'user',
    component: UserDashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'user',
    pathMatch: 'full'
  }
]; 