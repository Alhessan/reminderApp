import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { TaskFormComponent } from './pages/task-management/task-form/task-form.component';
import { CustomerFormComponent } from './pages/customer-management/customer-form/customer-form.component';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'task-list',
    pathMatch: 'full'
  },
  {
    path: 'customer-list',
    loadChildren: () => import('./pages/customer-management/customer-list/customer-list.module').then( m => m.CustomerListPageModule)
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
    loadChildren: () => import('./pages/task-management/task-list/task-list.module').then( m => m.TaskListPageModule)
  },
  {
    path: 'task-detail',
    loadChildren: () => import('./pages/task-management/task-detail/task-detail.module').then( m => m.TaskDetailPageModule)
  },
  {
    path: 'task-detail/:id',
    loadChildren: () => import('./pages/task-management/task-detail/task-detail.module').then( m => m.TaskDetailPageModule)
  },
  {
    path: 'task-form',
    component: TaskFormComponent
  },
  {
    path: 'task-form/:id',
    component: TaskFormComponent
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
