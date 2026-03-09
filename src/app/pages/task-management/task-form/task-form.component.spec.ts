import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

import { TaskFormComponent } from './task-form.component';
import { TaskCycleService } from '../../../services/task-cycle.service';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TaskFormComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        provideHttpClient(),
        { provide: TaskCycleService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Phase 8 US6 T037: customer selection preserved', () => {
    it('should have customerId in form and allow null', () => {
      expect(component.taskForm.contains('customerId')).toBe(true);
      component.taskForm.patchValue({ customerId: 5 });
      expect(component.taskForm.get('customerId')?.value).toBe(5);
      component.taskForm.patchValue({ customerId: null });
      expect(component.taskForm.get('customerId')?.value).toBeNull();
    });
  });
});
