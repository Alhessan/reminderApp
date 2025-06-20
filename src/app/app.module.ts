import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Config } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';

const ionicConfig: Config = {
  mode: 'ios', // Use iOS mode for consistent behavior
  animated: true,
  backButtonText: '',
  hardwareBackButton: true,
  menuIcon: 'menu-outline',
  backButtonIcon: 'chevron-back-outline',
  // Navigation configurations
  navAnimation: true,
  swipeBackEnabled: false, // Disable swipe to prevent component stacking
  // Accessibility configurations
  a11yLiveRegion: true, // Enable live regions for screen readers
  // Focus trap and management
  focusVisible: true,
  // Action Sheet configurations
  actionSheetEnter: 'action-sheet-slide-in',
  actionSheetLeave: 'action-sheet-slide-out'
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(ionicConfig), 
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [
    { 
      provide: RouteReuseStrategy, 
      useClass: IonicRouteStrategy 
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {} 