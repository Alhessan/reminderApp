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
      <!-- <ion-icon [name]="config.icon" ></ion-icon> -->
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
    .cycle-status-badge[data-status="missed"] {
      background: var(--ion-color-missed-surface, #fff);
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid var(--ion-color-light-shade);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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
