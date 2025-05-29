import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CustomerListPage } from './customer-list.page';

const routes: Routes = [
  {
    path: '',
    component: CustomerListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerListPageRoutingModule {}
