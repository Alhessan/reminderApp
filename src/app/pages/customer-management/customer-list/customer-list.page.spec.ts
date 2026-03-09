import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerListPage } from './customer-list.page';

describe('CustomerListPage', () => {
  let component: CustomerListPage;
  let fixture: ComponentFixture<CustomerListPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomerListPage, RouterTestingModule],
    });
    fixture = TestBed.createComponent(CustomerListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
