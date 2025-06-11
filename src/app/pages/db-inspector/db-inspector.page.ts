import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-db-inspector',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Database Inspector</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()">
            <ion-icon name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item-group *ngFor="let table of Object.keys(schema)">
          <ng-container *ngIf="!table.endsWith('_count') && !table.endsWith('_last_row')">
            <ion-item-divider>
              <ion-label>
                {{ table }}
                <span *ngIf="schema[table + '_count'] !== undefined">
                  ({{ schema[table + '_count'] }} rows)
                </span>
              </ion-label>
            </ion-item-divider>
            
            <ion-item *ngIf="schema[table].error">
              <ion-label color="danger">{{ schema[table].error }}</ion-label>
            </ion-item>
            
            <ion-item *ngIf="!schema[table].error">
              <ion-grid>
                <ion-row>
                  <ion-col size="3"><b>Column</b></ion-col>
                  <ion-col size="2"><b>Type</b></ion-col>
                  <ion-col size="2"><b>Null</b></ion-col>
                  <ion-col size="5"><b>Default</b></ion-col>
                </ion-row>
                <ion-row *ngFor="let column of schema[table]">
                  <ion-col size="3">{{ column.name }}</ion-col>
                  <ion-col size="2">{{ column.type }}</ion-col>
                  <ion-col size="2">{{ column.notnull ? 'No' : 'Yes' }}</ion-col>
                  <ion-col size="5">{{ column.dflt_value || 'NULL' }}</ion-col>
                </ion-row>
              </ion-grid>
            </ion-item>

            <!-- Last Row Section -->
            <ion-item *ngIf="schema[table + '_last_row']">
              <ion-grid>
                <ion-row>
                  <ion-col size="12">
                    <ion-text color="medium">
                      <h3>Last Row:</h3>
                    </ion-text>
                  </ion-col>
                </ion-row>
                <ion-row *ngFor="let key of Object.keys(schema[table + '_last_row'])">
                  <ion-col size="4">
                    <ion-text color="primary">{{ key }}:</ion-text>
                  </ion-col>
                  <ion-col size="8">
                    <ion-text>{{ schema[table + '_last_row'][key] }}</ion-text>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-item>
          </ng-container>
        </ion-item-group>
      </ion-list>
    </ion-content>
  `,
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