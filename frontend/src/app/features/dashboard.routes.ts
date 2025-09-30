import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';
import { userRoleGuard } from '../core/guards/user-role.guard';
import { ConteneursPageComponent } from './conteneurs/conteneurs-page.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AdminProfileComponent } from './admin-profile/admin-profile.component';
import { HistoryComponent } from './history/history.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'admin' }
  },
  {
    path: 'admin/profile',
    component: AdminProfileComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'admin' }
  },
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'admin' }
  },
  {
    path: 'admin/conteneurs',
    component: ConteneursPageComponent,
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
    path: 'user/profile',
    component: UserProfileComponent,
    canActivate: [userRoleGuard],
    data: { requiredRole: 'user' }
  },
  {
    path: 'user/history',
    component: HistoryComponent,
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
