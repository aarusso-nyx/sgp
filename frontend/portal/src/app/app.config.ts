import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { errorInterceptor, traceContextInterceptor } from '@sgp/shared';
import { provideSgpStynxWeb } from '@sgp/shared/stynx-runtime-config';

import { routes } from './app.routes';
import { authTokenInterceptor } from './core/http/auth-token-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideSgpStynxWeb(),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([traceContextInterceptor, authTokenInterceptor, errorInterceptor]),
    ),
  ],
};
