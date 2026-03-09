import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CycleDisplayStatus, STATUS_CONFIG } from '../../models/cycle-display.model';

@Component({
  selector: 'app-cycle-status-badge',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <span *ngIf="config" class="cycle-status-badge" [attr.data-status]="status">
      <ion-icon [name]="config.icon" [color]="config.color"></ion-icon>
      <span class="label">{{ config.label }}</span>
    </span>
  `,
  styles: [`
    .cycle-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
    }
    .cycle-status-badge ion-icon {
      font-size: 18px;
    }
  `],
})
export class CycleStatusBadgeComponent {
  @Input() status: CycleDisplayStatus | string = 'upcoming';

  get config() {
    const s = this.status as CycleDisplayStatus;
    return STATUS_CONFIG[s] ?? null;
  }
}
