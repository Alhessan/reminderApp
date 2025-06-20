import { Routes } from '@angular/router';
import { TaskFormComponent } from './pages/task-management/task-form/task-form.component';
import { CustomerFormComponent } from './pages/customer-management/customer-form/customer-form.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
    pathMatch: 'full'
  },
  {
    path: 'tasks',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/task-management/task-list/task-list.page').then(m => m.TaskListPage)
      },
      {
        path: 'archive',
        loadComponent: () => import('./pages/task-management/task-archive/task-archive.page').then(m => m.TaskArchivePage)
      },
      {
        path: 'detail/:id',
        loadComponent: () => import('./pages/task-management/task-detail/task-detail.page').then(m => m.TaskDetailPage)
      },
      {
        path: 'new',
        component: TaskFormComponent
      },
      {
        path: 'edit/:id',
        component: TaskFormComponent
      }
    ]
  },
  {
    path: 'settings',
    children: [
      {
        path: 'task-types',
        loadComponent: () => import('./pages/settings/task-types/task-types.page').then(m => m.TaskTypesPage)
      },
      {
        path: 'notification-types',
        loadComponent: () => import('./pages/notification-types/notification-types.page').then(m => m.NotificationTypesPage)
      }
    ]
  },
  {
    path: 'customers',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/customer-management/customer-list/customer-list.page').then(m => m.CustomerListPage)
      },
      {
        path: 'new',
        component: CustomerFormComponent
      },
      {
        path: 'edit/:id',
        component: CustomerFormComponent
      }
    ]
  },
  {
    path: 'db-inspector',
    loadComponent: () => import('./pages/db-inspector/db-inspector.page').then(m => m.DbInspectorPage)
  },
  {
    path: '**',
    redirectTo: 'tasks'
  }
]; 