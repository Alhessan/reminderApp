import { Component, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { ModalController, IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskListItem } from '../../models/task-cycle.model';
import { addIcons } from 'ionicons';
import { close, checkmarkCircleOutline, trendingUpOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-progress-slider',
  templateUrl: './progress-slider.component.html',
  styleUrls: ['./progress-slider.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ]
})
export class ProgressSliderComponent implements OnInit, OnDestroy {
  @Input() taskItem!: TaskListItem;
  
  currentProgress = 0;
  previousProgress = 0;

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private elementRef: ElementRef
  ) {
    // Register required icons
    addIcons({
      'close': close,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'trending-up-outline': trendingUpOutline,
      'time-outline': timeOutline
    });
  }

  ngOnInit() {
    if (this.taskItem) {
      this.currentProgress = this.taskItem?.currentCycle?.progress || 0;
      this.previousProgress = this.currentProgress;
    }
  }

  ngOnDestroy() {
    // Clean up any subscriptions or listeners if needed
  }

  async onProgressChange(event: any) {
    const newProgress = parseInt(event.detail.value);
    this.currentProgress = newProgress;
    // No auto-completion trigger - user must explicitly use "Mark Complete" button
  }

  // Quick progress button handler
  setProgress(progress: number) {
    this.currentProgress = progress;
    // No auto-completion trigger - user must explicitly use "Mark Complete" button
  }

  async showCompletionConfirmation() {
    const alert = await this.alertController.create({
      header: 'Complete Task?',
      message: `Would you like to mark "${this.taskItem.task.title}" as completed? This will create a new cycle for the next occurrence.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Mark as Completed',
          handler: () => {
            this.completeTask();
          }
        }
      ]
    });

    await alert.present();
  }

  async completeTask() {
    await this.modalController.dismiss({
      action: 'complete',
      progress: 100
    }, 'confirm');
  }

  async markAsComplete() {
    // Allow completing task at any progress level
    const alert = await this.alertController.create({
      header: 'Complete Task?',
      message: `Mark "${this.taskItem.task.title}" as completed? This will create a new cycle for the next occurrence.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Complete Task',
          handler: () => {
            this.completeTask();
          }
        }
      ]
    });

    await alert.present();
  }

  async onSave() {
    // Always just update progress, don't auto-complete at 100%
    await this.modalController.dismiss({
      action: 'update_progress',
      progress: this.currentProgress
    }, 'confirm');
  }

  async onCancel() {
    await this.modalController.dismiss(null, 'cancel');
  }

  // Handle keyboard navigation for accessibility
  onKeyDown(event: KeyboardEvent) {
    // Handle Escape key to close modal
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'primary';
    if (progress >= 50) return 'warning';
    return 'medium';
  }

  getProgressIcon(progress: number): string {
    if (progress >= 100) return 'checkmark-circle-outline';
    return 'trending-up-outline';
  }
}