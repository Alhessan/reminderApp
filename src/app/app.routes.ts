import { Routes } from '@angular/router';
import { TaskFormComponent } from './pages/task-management/task-form/task-form.component';
import { CustomerFormComponent } from './pages/customer-management/customer-form/customer-form.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'task-list',
    pathMatch: 'full'
  },
  {
    path: 'customer-list',
    loadComponent: () => import('./pages/customer-management/customer-list/customer-list.page').then(m => m.CustomerListPage)
  },
  {
    path: 'customer-form',
    component: CustomerFormComponent
  },
  {
    path: 'customer-form/:id',
    component: CustomerFormComponent
  },
  {
    path: 'task-list',
    loadComponent: () => import('./pages/task-management/task-list/task-list.page').then(m => m.TaskListPage)
  },
  {
    path: 'task-detail/:id',
    loadComponent: () => import('./pages/task-management/task-detail/task-detail.page').then(m => m.TaskDetailPage)
  },
  {
    path: 'task-form',
    component: TaskFormComponent
  },
  {
    path: 'task-form/:id',
    component: TaskFormComponent
  },
  {
    path: 'task-management/task-types',
    loadComponent: () => import('./pages/task-management/task-types/task-types.page').then(m => m.TaskTypesPage)
  },
  {
    path: 'notification-types',
    loadComponent: () => import('./pages/notification-types/notification-types.page').then(m => m.NotificationTypesPage)
  },
  {
    path: 'db-inspector',
    loadComponent: () => import('./pages/db-inspector/db-inspector.page').then(m => m.DbInspectorPage)
  },
  {
    path: 'tasks',
    loadComponent: () => import('./pages/task-management/task-list/task-list.page').then(m => m.TaskListPage)
  },
  {
    path: 'tasks/archive',
    loadComponent: () => import('./pages/task-management/task-archive/task-archive.page').then(m => m.TaskArchivePage)
  },
  {
    path: '**',
    redirectTo: 'task-list'
  }
]; 