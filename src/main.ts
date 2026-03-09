import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app/app.routes';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';
import { defineCustomElements } from '@ionic/core/loader';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';

// Ensure Ionic Web Components are defined in all runtimes (incl. WebView)
defineCustomElements(window);

// Prevent unhandled errors from killing the app (e.g. on Android)
window.addEventListener('error', (e) => {
  console.error('[Uncaught error]', e.error ?? e.message, e.filename, e.lineno, e.colno);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled promise rejection]', e.reason);
});

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
}).then(() => {
  // Log in case WebView is not hydrating components
  const ionContentDefined = !!customElements.get('ion-content');
  console.log('[Bootstrap] ion-content defined:', ionContentDefined);
}).catch(err => console.error(err));
