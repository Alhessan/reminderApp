import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app/app.routes';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withComponentInputBinding()),
    provideIonicAngular({
      mode: 'ios',
      animated: true,
      backButtonText: '',
      hardwareBackButton: true,
      menuIcon: 'menu-outline',
      backButtonIcon: 'chevron-back-outline',
      swipeBackEnabled: false
    }),
    provideAnimations(),
    provideHttpClient()
  ]
}).catch(err => console.error(err));
