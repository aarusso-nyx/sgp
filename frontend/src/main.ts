import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ADMIN_I18N_MESSAGES } from './app/core/i18n/admin-messages';

void ADMIN_I18N_MESSAGES;
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
