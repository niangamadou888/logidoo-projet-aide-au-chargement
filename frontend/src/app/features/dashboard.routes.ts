import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';
import { userRoleGuard } from '../core/guards/user-role.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'admin' }
  },
  {
    path: 'user',
    component: UserDashboardComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'user' }
  },
  {
    path: '',
    component: UserDashboardComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'user' }
  }
]; 