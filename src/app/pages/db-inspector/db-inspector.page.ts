import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-db-inspector',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tasks"></ion-back-button>
        </ion-buttons>
        <ion-title>Database Inspector</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()">
            <ion-icon name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Page Header -->
      <div class="unified-page-header">
        <div class="header-icon-container">
          <ion-icon name="build-outline" style="color: var(--ion-color-primary-shade)"></ion-icon>
        </div>
        <h2>Database Inspector</h2>
        <p>View current database structure and data</p>
      </div>

      <div *ngIf="Object.keys(schema).length === 0" class="loading-state">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading database schema...</p>
      </div>

      <ion-list *ngIf="Object.keys(schema).length > 0">
        <ion-item-group *ngFor="let table of Object.keys(schema)">
          <ng-container *ngIf="!table.endsWith('_count') && !table.endsWith('_last_row')">
            <ion-item-divider color="primary">
              <ion-label>
                <h3>{{ table }}</h3>
                <p *ngIf="schema[table + '_count'] !== undefined">
                  {{ schema[table + '_count'] }} rows
                </p>
              </ion-label>
            </ion-item-divider>
            
            <ion-item *ngIf="schema[table].error">
              <ion-label color="danger">
                <ion-icon name="alert-circle-outline"></ion-icon>
                {{ schema[table].error }}
              </ion-label>
            </ion-item>
            
            <!-- Schema Structure -->
            <ion-card *ngIf="!schema[table].error" class="schema-card">
              <ion-card-header>
                <ion-card-subtitle>Table Structure</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-grid>
                  <ion-row class="header-row">
                    <ion-col size="3"><strong>Column</strong></ion-col>
                    <ion-col size="2"><strong>Type</strong></ion-col>
                    <ion-col size="2"><strong>Null</strong></ion-col>
                    <ion-col size="5"><strong>Default</strong></ion-col>
                  </ion-row>
                  <ion-row *ngFor="let column of schema[table]" class="data-row">
                    <ion-col size="3">{{ column.name }}</ion-col>
                    <ion-col size="2">
                      <ion-chip color="secondary" outline>{{ column.type }}</ion-chip>
                    </ion-col>
                    <ion-col size="2">
                      <ion-badge [color]="column.notnull ? 'danger' : 'success'">
                        {{ column.notnull ? 'No' : 'Yes' }}
                      </ion-badge>
                    </ion-col>
                    <ion-col size="5">
                      <code>{{ column.dflt_value || 'NULL' }}</code>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-card-content>
            </ion-card>

            <!-- Last Row Section -->
            <ion-card *ngIf="schema[table + '_last_row']" class="last-row-card">
              <ion-card-header>
                <ion-card-subtitle>Latest Record</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-grid>
                  <ion-row *ngFor="let key of Object.keys(schema[table + '_last_row'])" class="data-row">
                    <ion-col size="4">
                      <ion-text color="primary"><strong>{{ key }}:</strong></ion-text>
                    </ion-col>
                    <ion-col size="8">
                      <code>{{ schema[table + '_last_row'][key] }}</code>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-card-content>
            </ion-card>
          </ng-container>
        </ion-item-group>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      
      ion-spinner {
        margin-bottom: 16px;
      }
      
      p {
        color: var(--ion-color-medium);
        font-size: 14px;
      }
    }
    
    .schema-card, .last-row-card {
      margin: 12px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      ion-card-header {
        padding-bottom: 8px;
        
        ion-card-subtitle {
          font-weight: 600;
          color: var(--ion-color-primary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
      
      ion-card-content {
        padding-top: 0;
      }
    }
    
    .header-row {
      background: var(--ion-color-light);
      border-radius: 8px;
      margin-bottom: 8px;
      padding: 8px 0;
      
      ion-col {
        font-weight: 600;
        color: var(--ion-color-dark);
        font-size: 13px;
      }
    }
    
    .data-row {
      border-bottom: 1px solid var(--ion-color-light-shade);
      padding: 8px 0;
      
      &:last-child {
        border-bottom: none;
      }
      
      ion-col {
        font-size: 13px;
        display: flex;
        align-items: center;
      }
      
      code {
        background: var(--ion-color-light);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        color: var(--ion-color-dark);
        font-family: 'Courier New', monospace;
      }
    }
    
    ion-item-divider {
      margin: 20px 0 8px 0;
      border-radius: 8px;
      
      ion-label h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      ion-label p {
        margin: 4px 0 0 0;
        font-size: 12px;
        opacity: 0.8;
      }
    }
    
    ion-chip {
      font-size: 11px;
      height: 24px;
      font-weight: 500;
    }
    
    ion-badge {
      font-size: 10px;
      font-weight: 600;
      min-width: 32px;
      height: 20px;
    }
    
    // Dark mode support
    @media (prefers-color-scheme: dark) {
      .header-row {
        background: var(--ion-color-dark-tint);
        
        ion-col {
          color: var(--ion-color-light);
        }
      }
      
      .data-row {
        border-bottom-color: var(--ion-color-dark-shade);
        
        code {
          background: var(--ion-color-dark-tint);
          color: var(--ion-color-light);
        }
      }
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DbInspectorPage implements OnInit {
  schema: any = {};
  Object = Object; // Make Object available in template

  constructor(private dbService: DatabaseService) {}

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    this.schema = await this.dbService.getDatabaseSchema();
  }
} 