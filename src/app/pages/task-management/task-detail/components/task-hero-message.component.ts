import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-task-hero-message',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="hero-message" *ngIf="message">
      <p class="hero-text">{{ message }}</p>
    </div>
  `,
  styles: [`
    .hero-message {
      padding: 16px 20px;
      margin-bottom: 8px;
      background: var(--ion-color-primary-tint);
      border-radius: 12px;
      border-left: 4px solid var(--ion-color-primary);
    }
    .hero-text {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      color: var(--ion-text-color);
      line-height: 1.4;
    }
  `],
})
export class TaskHeroMessageComponent {
  @Input() message = '';
}
